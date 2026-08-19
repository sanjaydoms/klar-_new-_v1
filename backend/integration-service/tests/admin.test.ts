/**
 * The admin surface, over real HTTP against a real Mongo.
 *
 * Driven through the actual express app rather than by calling the service
 * layer, because the things most worth proving here — who is refused, and what
 * a refusal costs — live in the middleware chain, not in the services.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const DB = "klar_integrations_admintest";
const MASTER_EMAIL = "master@klar.test";

process.env.MASTER_EMAILS = MASTER_EMAIL;

let server: Server;
let base = "";
let connected = false;

const token = (over: Record<string, unknown> = {}) =>
  jwt.sign(
    {
      userId: "u1",
      email: MASTER_EMAIL,
      clientType: "B2B",
      roles: "MASTER",
      ...over,
    },
    process.env.JWT_SECRET!,
  );

const call = (
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
) =>
  fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.token === null ? {} : { authorization: `Bearer ${opts.token ?? token()}` }),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
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

  // Indexes are built after connect. Without this the unique constraints that
  // make concurrent writes safe may not exist yet — see config/db.config.ts.
  const { ensureIndexes } = await import("../src/config/db.config");
  await ensureIndexes();
  await mongoose.connection.dropDatabase();

  const { Provider } = await import("../src/models/Provider.model");
  const { RoutingRule } = await import("../src/models/RoutingRule.model");

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
            { operation: "MODIFICATION", supported: true, enabled: true },
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
            { operation: "MODIFICATION", supported: false, enabled: false },
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
      // Only alpha supports it — disabling alpha orphans this operation.
      service: "HOTEL",
      operation: "MODIFICATION",
      failoverEnabled: false,
      providers: [{ providerSlug: "alpha", priority: 1, enabled: true }],
    },
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

test("an unauthenticated request is refused", async (t) => {
  if (needsMongo(t)) return;
  assert.equal((await call("/providers", { token: null })).status, 401);
});

test("a forged token is refused", async (t) => {
  if (needsMongo(t)) return;
  const forged = jwt.sign({ userId: "x", email: MASTER_EMAIL, roles: "MASTER" }, "wrong");
  assert.equal((await call("/providers", { token: forged })).status, 401);
});

test("a customer-facing role holds no permissions here", async (t) => {
  if (needsMongo(t)) return;
  // B2B_ADMIN is the admin of a customer AGENCY. Supplier health would tell
  // them who KLAR buys from — they get nothing.
  for (const roles of ["B2B_ADMIN", "AGENT", "RM", "USER"]) {
    assert.equal((await call("/providers", { token: token({ roles }) })).status, 403, roles);
  }
});

test("MASTER can list providers, and no secret is in the payload", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.data.map((p: any) => p.slug).sort(), ["alpha", "beta"]);
  assert.ok(!JSON.stringify(body).toLowerCase().includes("secret"));
});

test("a MASTER not on the email allowlist cannot disable anything", async (t) => {
  if (needsMongo(t)) return;
  // The second factor: the role alone is not enough for a destructive write.
  const res = await call("/providers/alpha/status", {
    method: "PATCH",
    token: token({ email: "someone-else@klar.test" }),
    body: { status: "DISABLED", reason: "nope", confirmation: "DISABLE ALPHA" },
  });
  assert.equal(res.status, 403);
});

test("disabling without a reason is refused", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers/alpha/status", {
    method: "PATCH",
    body: { status: "DISABLED", confirmation: "DISABLE ALPHA" },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "REASON_REQUIRED");
});

test("disabling without the typed confirmation is refused by the server", async (t) => {
  if (needsMongo(t)) return;
  // Enforced here, not only in the browser — otherwise a curl skips it.
  const res = await call("/providers/alpha/status", {
    method: "PATCH",
    body: { status: "DISABLED", reason: "supplier down" },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "CONFIRMATION_REQUIRED");
});

test("disable-impact names the fallback and what would be orphaned", async (t) => {
  if (needsMongo(t)) return;
  const body = await (await call("/providers/alpha/disable-impact")).json();
  assert.equal(body.data.confirmationPhrase, "DISABLE ALPHA");

  const search = body.data.affected.find((a: any) => a.operation === "SEARCH");
  assert.deepEqual(search.fallback.map((f: any) => f.slug), ["beta"]);
  assert.equal(search.wasPrimary, true);

  // Beta does not support MODIFICATION, so nothing would serve it.
  assert.deepEqual(
    body.data.orphaned.map((o: any) => o.operation),
    ["MODIFICATION"],
  );
});

test("a confirmed disable changes routing and is audited", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers/alpha/status", {
    method: "PATCH",
    body: {
      status: "DISABLED",
      reason: "error rate above threshold",
      confirmation: "disable alpha", // case-insensitive on purpose
    },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.status, "DISABLED");

  // The response carries the consequence rather than asserting it.
  const search = body.routing.find((d: any) => d.operation === "SEARCH");
  assert.deepEqual(search.providers.map((p: any) => p.slug), ["beta"]);

  const audit = await (await call("/audit-logs?provider=alpha")).json();
  const entry = audit.data[0];
  assert.equal(entry.action, "PROVIDER_DISABLED");
  assert.equal(entry.actorEmail, MASTER_EMAIL);
  assert.equal(entry.reason, "error rate above threshold");
  assert.equal(entry.before.status, "ACTIVE");
  assert.equal(entry.after.status, "DISABLED");
});

test("re-enabling needs a reason but no typed confirmation", async (t) => {
  if (needsMongo(t)) return;
  // Recovery is the direction you want to be fast during an outage.
  const res = await call("/providers/alpha/status", {
    method: "PATCH",
    body: { status: "ACTIVE", reason: "recovered" },
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.status, "ACTIVE");
});

test("an operation the supplier does not implement cannot be enabled", async (t) => {
  if (needsMongo(t)) return;
  // `supported` is a fact about beta's API, not a preference.
  const res = await call("/providers/beta/services/HOTEL/operations/MODIFICATION", {
    method: "PATCH",
    body: { enabled: true, reason: "trying it on" },
  });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).code, "OPERATION_UNSUPPORTED");
});

test("disabling one operation leaves the provider's others alone", async (t) => {
  if (needsMongo(t)) return;
  await call("/providers/alpha/services/HOTEL/operations/MODIFICATION", {
    method: "PATCH",
    body: { enabled: false, reason: "supplier endpoint erroring" },
  });
  const routing = await (await call("/routing")).json();
  const mod = routing.data.find((d: any) => d.operation === "MODIFICATION");
  const search = routing.data.find((d: any) => d.operation === "SEARCH");
  assert.deepEqual(mod.providers, []);
  assert.deepEqual(mod.excluded, [{ slug: "alpha", reason: "OPERATION_DISABLED" }]);
  assert.deepEqual(search.providers.map((p: any) => p.slug), ["alpha", "beta"]);
});

test("a new provider is created inert", async (t) => {
  if (needsMongo(t)) return;
  // §52 — never live the moment it is added.
  const res = await call("/providers", {
    method: "POST",
    body: {
      slug: "gamma",
      code: "GM",
      name: "Gamma",
      types: ["HOTEL"],
      services: [{ service: "HOTEL", operations: ["SEARCH"] }],
    },
  });
  assert.equal(res.status, 201);
  const p = (await res.json()).data;
  assert.equal(p.status, "DISABLED");
  assert.equal(p.activatedAt, null);
  assert.equal(p.environments.production.enabled, false);
  assert.equal(p.environments.test.enabled, false);
});

test("a provider declaring an operation that does not exist is refused", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers", {
    method: "POST",
    body: {
      slug: "delta",
      code: "DL",
      name: "Delta",
      types: ["HOTEL"],
      services: [{ service: "HOTEL", operations: ["TELEPORT"] }],
    },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "UNKNOWN_OPERATION");
});
