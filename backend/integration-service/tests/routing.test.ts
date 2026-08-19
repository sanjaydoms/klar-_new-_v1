/**
 * Routing administration.
 *
 * Two properties carry the weight here: routing can never name a provider that
 * cannot serve the operation, and failover on a booking-shaped operation
 * cannot be switched on casually.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const DB = "klar_integrations_routingtest";
const MASTER_EMAIL = "master@klar.test";

process.env.MASTER_EMAILS = MASTER_EMAIL;

let server: Server;
let base = "";
let connected = false;

const token = (over: Record<string, unknown> = {}) =>
  jwt.sign(
    { userId: "u1", email: MASTER_EMAIL, clientType: "B2B", roles: "MASTER", ...over },
    process.env.JWT_SECRET!,
  );

const call = (
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
) =>
  fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${opts.token ?? token()}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

const provider = (slug: string, code: string, name: string, supports: string[]) => ({
  slug,
  code,
  name,
  types: ["HOTEL"],
  status: "ACTIVE",
  activeEnvironment: "test",
  environments: {
    production: { baseUrl: "", enabled: false },
    test: { baseUrl: `https://${slug}.test`, enabled: true },
  },
  services: [
    {
      service: "HOTEL",
      enabled: true,
      operations: ["SEARCH", "BOOKING", "MODIFICATION"].map((operation) => ({
        operation,
        supported: supports.includes(operation),
        enabled: supports.includes(operation),
      })),
    },
  ],
});

before(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: DB,
      serverSelectionTimeoutMS: 1500,
    });
    connected = true;
  } catch {
    return;
  }

  await mongoose.connection.dropDatabase();

  // AFTER the drop, not before: dropping a database removes the indexes with
  // it, so building them first achieves nothing. This ordering is the whole
  // reason the concurrency test kept failing.
  const { ensureIndexes } = await import("../src/config/db.config");
  await ensureIndexes();

  const { Provider } = await import("../src/models/Provider.model");
  await Provider.create([
    provider("alpha", "AL", "Alpha", ["SEARCH", "BOOKING", "MODIFICATION"]),
    // Beta cannot modify — the asymmetry the real TripJack/RateGain pair has.
    provider("beta", "BT", "Beta", ["SEARCH", "BOOKING"]),
  ]);

  const { app } = await import("../src/app");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/integrations`;
});

after(async () => {
  if (!connected) return;
  server?.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const needsMongo = (t: { skip: (m: string) => void }): boolean => {
  if (connected) return false;
  t.skip("no MongoDB reachable");
  return true;
};

const setRouting = (operation: string, body: Record<string, unknown>) =>
  call(`/routing/HOTEL/${operation}`, { method: "PUT", body });

test("the catalogue is served so the UI needs no copy of it", async (t) => {
  if (needsMongo(t)) return;
  const body = await (await call("/catalogue")).json();
  const hotel = body.data.find((s: any) => s.service === "HOTEL");
  assert.ok(hotel.operations.includes("SEARCH"));
  assert.ok(hotel.operations.includes("BOOKING"));
});

test("priority comes from list order, not from the caller", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("SEARCH", {
    providers: [{ providerSlug: "beta" }, { providerSlug: "alpha" }],
    failoverEnabled: true,
    reason: "beta is cheaper on this route",
  });
  assert.equal(res.status, 200);
  const d = (await res.json()).data;
  assert.deepEqual(d.providers.map((p: any) => p.slug), ["beta", "alpha"]);
  assert.deepEqual(d.providers.map((p: any) => p.priority), [1, 2]);
});

test("routing to a provider that cannot serve the operation is refused", async (t) => {
  if (needsMongo(t)) return;
  // The failure would otherwise land on a customer mid-purchase rather than
  // here, where somebody is watching.
  const res = await setRouting("MODIFICATION", {
    providers: [{ providerSlug: "beta" }],
    failoverEnabled: false,
    reason: "trying it on",
  });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "OPERATION_UNSUPPORTED");
});

test("a provider cannot appear twice in one rule", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("SEARCH", {
    providers: [{ providerSlug: "alpha" }, { providerSlug: "alpha" }],
    failoverEnabled: false,
    reason: "duplicate",
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "DUPLICATE_PROVIDER");
});

test("an unknown provider is refused", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("SEARCH", {
    providers: [{ providerSlug: "ghost" }],
    failoverEnabled: false,
    reason: "typo",
  });
  assert.equal(res.status, 404);
});

test("routing changes need a reason", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("SEARCH", {
    providers: [{ providerSlug: "alpha" }],
    failoverEnabled: false,
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "REASON_REQUIRED");
});

test("failover on a booking operation cannot be enabled without confirmation", async (t) => {
  if (needsMongo(t)) return;
  // §21 — a search that fails over costs a retry; a booking that fails over
  // can charge a customer twice at two suppliers.
  const res = await setRouting("BOOKING", {
    providers: [{ providerSlug: "alpha" }, { providerSlug: "beta" }],
    failoverEnabled: true,
    reason: "seems useful",
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, "CONFIRMATION_REQUIRED");
  assert.match(body.message, /ENABLE FAILOVER HOTEL BOOKING/);
});

test("the confirmation phrase names the operation, so it cannot be reused", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("BOOKING", {
    providers: [{ providerSlug: "alpha" }],
    failoverEnabled: true,
    reason: "wrong phrase",
    confirmation: "ENABLE FAILOVER HOTEL SEARCH",
  });
  assert.equal(res.status, 400);
});

test("a confirmed booking failover is accepted and audited", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("BOOKING", {
    providers: [{ providerSlug: "alpha" }, { providerSlug: "beta" }],
    failoverEnabled: true,
    reason: "reconciliation is in place",
    confirmation: "enable failover hotel booking",
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.failoverEnabled, true);

  const audit = await (await call("/audit-logs?action=ROUTING_CREATED")).json();
  const entry = audit.data.find((e: any) => e.operation === "BOOKING");
  assert.equal(entry.after.failoverEnabled, true);
});

test("search failover needs no confirmation", async (t) => {
  if (needsMongo(t)) return;
  // The asymmetry is the point: only the operations that can double-charge
  // are made deliberately awkward.
  const res = await setRouting("SEARCH", {
    providers: [{ providerSlug: "alpha" }, { providerSlug: "beta" }],
    failoverEnabled: true,
    reason: "both suppliers healthy",
  });
  assert.equal(res.status, 200);
});

test("a routing change records what it replaced", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("SEARCH", {
    providers: [{ providerSlug: "beta" }],
    failoverEnabled: false,
    reason: "alpha degraded",
  });
  assert.equal(res.status, 200);

  const audit = await (await call("/audit-logs?action=ROUTING_CHANGED")).json();
  const entry = audit.data[0];
  assert.equal(entry.reason, "alpha degraded");
  assert.deepEqual(
    entry.before.providers.map((p: any) => p.providerSlug),
    ["alpha", "beta"],
  );
  assert.deepEqual(
    entry.after.providers.map((p: any) => p.providerSlug),
    ["beta"],
  );
});

test("the routing editor is told who else could serve the operation", async (t) => {
  if (needsMongo(t)) return;
  const body = await (await call("/routing/HOTEL/SEARCH")).json();
  // Alpha was just removed from SEARCH, so it is available to add back.
  assert.deepEqual(body.data.candidates.map((c: any) => c.slug), ["alpha"]);
  assert.equal(
    body.data.failoverConfirmationPhrase,
    "ENABLE FAILOVER HOTEL SEARCH",
  );
});

test("a disabled target stays in the rule but off the rotation", async (t) => {
  if (needsMongo(t)) return;
  const res = await setRouting("SEARCH", {
    providers: [
      { providerSlug: "alpha", enabled: false },
      { providerSlug: "beta" },
    ],
    failoverEnabled: false,
    reason: "parking alpha without forgetting the order",
  });
  const d = (await res.json()).data;
  assert.deepEqual(d.providers.map((p: any) => p.slug), ["beta"]);
  assert.deepEqual(d.excluded, [{ slug: "alpha", reason: "ROUTE_DISABLED" }]);
});
