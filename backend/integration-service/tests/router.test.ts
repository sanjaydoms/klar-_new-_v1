/**
 * The router's decisions, against a real Mongo.
 *
 * Uses a throwaway database so the seeded dev data is never touched, and skips
 * cleanly when no Mongo is reachable — the model and crypto tests still run.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import mongoose from "mongoose";

import { Provider } from "../src/models/Provider.model";
import { RoutingRule } from "../src/models/RoutingRule.model";
import { resolve, resolveAll } from "../src/services/router.service";

const DB = "klar_integrations_routertest";
let connected = false;

before(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: DB,
      serverSelectionTimeoutMS: 1500,
    });
    connected = true;
  } catch {
    return; // No Mongo here — every test below skips.
  }

  await mongoose.connection.dropDatabase();

  // AFTER the drop, not before: dropping a database removes the indexes with
  // it, so building them first achieves nothing.
  const { ensureIndexes } = await import("../src/config/db.config");
  await ensureIndexes();

  await Provider.create([
    {
      slug: "alpha",
      code: "AL",
      name: "Alpha",
      types: ["HOTEL"],
      status: "ACTIVE",
      activeEnvironment: "test",
      environments: {
        production: { baseUrl: "", enabled: false },
        test: { baseUrl: "https://alpha.test", enabled: true },
      },
      services: [
        {
          service: "HOTEL",
          enabled: true,
          operations: [
            { operation: "SEARCH", supported: true, enabled: true },
            { operation: "BOOKING", supported: true, enabled: true },
            { operation: "MODIFICATION", supported: false, enabled: false },
          ],
        },
      ],
    },
    {
      slug: "beta",
      code: "BT",
      name: "Beta",
      types: ["HOTEL"],
      status: "ACTIVE",
      activeEnvironment: "test",
      environments: {
        production: { baseUrl: "", enabled: false },
        test: { baseUrl: "https://beta.test", enabled: true },
      },
      services: [
        {
          service: "HOTEL",
          enabled: true,
          operations: [
            { operation: "SEARCH", supported: true, enabled: true },
            { operation: "BOOKING", supported: true, enabled: true },
          ],
        },
      ],
    },
  ]);

  await RoutingRule.create([
    {
      service: "HOTEL",
      operation: "SEARCH",
      failoverEnabled: true,
      providers: [
        { providerSlug: "alpha", priority: 1, enabled: true },
        { providerSlug: "beta", priority: 2, enabled: true },
      ],
    },
    {
      service: "HOTEL",
      operation: "BOOKING",
      failoverEnabled: false,
      providers: [
        { providerSlug: "alpha", priority: 1, enabled: true },
        { providerSlug: "beta", priority: 2, enabled: true },
      ],
    },
    {
      service: "HOTEL",
      operation: "MODIFICATION",
      failoverEnabled: false,
      providers: [
        { providerSlug: "alpha", priority: 1, enabled: true },
        { providerSlug: "ghost", priority: 2, enabled: true },
      ],
    },
  ]);
});

after(async () => {
  if (!connected) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

/**
 * Checked inside the test body, not via the `skip` option: node:test evaluates
 * that option when the test is DEFINED, which is before `before()` has had a
 * chance to connect — so it would skip everything even with Mongo running.
 */
const needsMongo = (t: { skip: (m: string) => void }): boolean => {
  if (connected) return false;
  t.skip("no MongoDB reachable");
  return true;
};

test("resolves both providers in priority order", async (t) => {
  if (needsMongo(t)) return;
  const d = await resolve("HOTEL", "SEARCH");
  assert.equal(d.configured, true);
  assert.deepEqual(d.providers.map((p) => p.slug), ["alpha", "beta"]);
  assert.equal(d.failoverEnabled, true);
  assert.equal(d.mutating, false);
});

test("an unconfigured operation is not the same as an empty one", async (t) => {
  if (needsMongo(t)) return;
  // The distinction the callers depend on: `configured:false` means fall back
  // to the caller's own default, not "serve nothing".
  const d = await resolve("HOTEL", "AVAILABILITY");
  assert.equal(d.configured, false);
  assert.deepEqual(d.providers, []);
});

test("disabling a provider removes it and records why", async (t) => {
  if (needsMongo(t)) return;
  // The kill switch, end to end: one field changes, routing changes.
  await Provider.updateOne({ slug: "alpha" }, { $set: { status: "DISABLED" } });
  const d = await resolve("HOTEL", "SEARCH");
  assert.deepEqual(d.providers.map((p) => p.slug), ["beta"]);
  assert.deepEqual(d.excluded, [{ slug: "alpha", reason: "PROVIDER_DISABLED" }]);
  await Provider.updateOne({ slug: "alpha" }, { $set: { status: "ACTIVE" } });
});

test("disabling one operation leaves the provider's others routable", async (t) => {
  if (needsMongo(t)) return;
  // §13 — one broken supplier operation must not cost the whole provider.
  await Provider.updateOne(
    { slug: "alpha", "services.service": "HOTEL" },
    { $set: { "services.$.operations.1.enabled": false } },
  );
  const booking = await resolve("HOTEL", "BOOKING");
  const search = await resolve("HOTEL", "SEARCH");
  assert.deepEqual(booking.providers.map((p) => p.slug), ["beta"]);
  assert.deepEqual(search.providers.map((p) => p.slug), ["alpha", "beta"]);
  await Provider.updateOne(
    { slug: "alpha", "services.service": "HOTEL" },
    { $set: { "services.$.operations.1.enabled": true } },
  );
});

test("an unsupported operation is never routed, and a missing provider is reported", async (t) => {
  if (needsMongo(t)) return;
  const d = await resolve("HOTEL", "MODIFICATION");
  assert.deepEqual(d.providers, []);
  assert.deepEqual(d.excluded, [
    { slug: "alpha", reason: "OPERATION_UNSUPPORTED" },
    { slug: "ghost", reason: "UNKNOWN_PROVIDER" },
  ]);
});

test("switching to an environment with no credentials drops the provider", async (t) => {
  if (needsMongo(t)) return;
  await Provider.updateOne({ slug: "alpha" }, { $set: { activeEnvironment: "production" } });
  const d = await resolve("HOTEL", "SEARCH");
  assert.deepEqual(d.excluded, [{ slug: "alpha", reason: "ENVIRONMENT_DISABLED" }]);
  await Provider.updateOne({ slug: "alpha" }, { $set: { activeEnvironment: "test" } });
});

test("booking operations are flagged mutating", async (t) => {
  if (needsMongo(t)) return;
  // Callers read this to know a timeout must be reconciled, not retried (§21).
  assert.equal((await resolve("HOTEL", "BOOKING")).mutating, true);
});

test("resolveAll returns every configured operation", async (t) => {
  if (needsMongo(t)) return;
  const all = await resolveAll();
  assert.deepEqual(
    all.map((d) => d.operation).sort(),
    ["BOOKING", "MODIFICATION", "SEARCH"],
  );
});
