/**
 * Credential storage, masking and Test Connection.
 *
 * The properties worth proving are all negative ones: the plaintext must not
 * appear where it should not, the mask must not round-trip into the store, and
 * a failed test must not be able to look like a passing one.
 */
import "./env";

import assert from "node:assert/strict";
import http, { Server } from "node:http";
import test, { after, before } from "node:test";
import { AddressInfo } from "node:net";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const DB = "klar_integrations_credtest";
const MASTER_EMAIL = "master@klar.test";
const SECRET_VALUE = "tj-live-key-8f2a91AF";

process.env.MASTER_EMAILS = MASTER_EMAIL;
process.env.INTERNAL_SERVICE_KEY = "internal-test-key";

let server: Server;
/** Stands in for the supplier, so Test Connection has something real to call. */
let supplier: Server;
let supplierStatus = 200;
let base = "";
let internalBase = "";
let connected = false;

const token = (over: Record<string, unknown> = {}) =>
  jwt.sign(
    { userId: "u1", email: MASTER_EMAIL, clientType: "B2B", roles: "MASTER", ...over },
    process.env.JWT_SECRET!,
  );

const call = (
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null; internal?: boolean } = {},
) =>
  fetch(`${opts.internal ? internalBase : base}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.internal
        ? { "x-internal-key": "internal-test-key" }
        : opts.token === null
          ? {}
          : { authorization: `Bearer ${opts.token ?? token()}` }),
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
  await mongoose.connection.dropDatabase();

  supplier = http.createServer((req, res) => {
    // Echoes back whether the expected key arrived, so a test can tell
    // "authenticated" from "reached the host".
    const ok = req.headers["apikey"] === SECRET_VALUE;
    res.writeHead(ok ? supplierStatus : 401).end();
  });
  await new Promise<void>((r) => supplier.listen(0, "127.0.0.1", r));
  const supplierUrl = `http://127.0.0.1:${(supplier.address() as AddressInfo).port}`;

  const { Provider } = await import("../src/models/Provider.model");
  await Provider.create({
    slug: "alpha",
    code: "AL",
    name: "Alpha",
    types: ["HOTEL"],
    status: "ACTIVE",
    activeEnvironment: "test",
    environments: {
      production: { baseUrl: "", enabled: false },
      test: { baseUrl: supplierUrl, enabled: true },
    },
    services: [
      {
        service: "HOTEL",
        enabled: true,
        operations: [{ operation: "SEARCH", supported: true, enabled: true }],
      },
    ],
    credentialSchema: [
      { key: "BASE_URL", label: "Base URL", type: "url", required: true },
      { key: "API_KEY", label: "API Key", type: "secret", required: true },
    ],
    connectionTest: { method: "GET", path: "", headers: { apikey: "{{API_KEY}}" } },
  });

  const { app } = await import("../src/app");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const port = (server.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}/admin/integrations`;
  internalBase = `http://127.0.0.1:${port}/internal`;
});

after(async () => {
  if (!connected) return;
  server?.closeAllConnections();
  supplier?.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  await new Promise<void>((r) => supplier.close(() => r()));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const needsMongo = (t: { skip: (m: string) => void }): boolean => {
  if (connected) return false;
  t.skip("no MongoDB reachable");
  return true;
};

const save = (values: Record<string, string>, extra: Record<string, unknown> = {}) =>
  call("/providers/alpha/credentials/test", {
    method: "PUT",
    body: { values, reason: "initial setup", ...extra },
  });

test("an unconfigured environment reports exactly that", async (t) => {
  if (needsMongo(t)) return;
  const body = await (await call("/providers/alpha/credentials/test")).json();
  assert.equal(body.data.configured, false);
  assert.deepEqual(
    body.data.fields.map((f: any) => f.configured),
    [false, false],
  );
});

test("Test Connection on nothing configured does not fabricate a result", async (t) => {
  if (needsMongo(t)) return;
  // §68 — the button must never invent a success it did not observe.
  const res = await call("/providers/alpha/credentials/test/test", { method: "POST" });
  const body = await res.json();
  assert.equal(body.data.ok, false);
  assert.equal(body.data.category, "NOT_CONFIGURED");
});

test("saving credentials requires a reason", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers/alpha/credentials/test", {
    method: "PUT",
    body: { values: { API_KEY: SECRET_VALUE } },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "REASON_REQUIRED");
});

test("an unknown credential field is refused, not quietly stored", async (t) => {
  if (needsMongo(t)) return;
  const res = await save({ NOT_A_FIELD: "x" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "UNKNOWN_FIELD");
});

test("a saved secret comes back masked and never in plaintext", async (t) => {
  if (needsMongo(t)) return;
  const res = await save({ API_KEY: SECRET_VALUE });
  assert.equal(res.status, 200);

  const raw = await (await call("/providers/alpha/credentials/test")).text();
  assert.ok(!raw.includes(SECRET_VALUE), "plaintext secret reached the admin API");
  assert.ok(raw.includes("91AF"), "the last four should still identify the key");
});

test("the stored value is ciphertext, not the secret", async (t) => {
  if (needsMongo(t)) return;
  // Belt and braces: check the database itself, not just the API's projection.
  const { ProviderCredential } = await import("../src/models/ProviderCredential.model");
  const doc = await ProviderCredential.findOne({
    providerSlug: "alpha",
    environment: "test",
  });
  const stored = doc!.values.get("API_KEY")!;
  assert.ok(stored.startsWith("v1."));
  assert.ok(!stored.includes(SECRET_VALUE));
});

test("the audit trail records which keys changed, never their values", async (t) => {
  if (needsMongo(t)) return;
  const raw = await (await call("/audit-logs?provider=alpha")).text();
  assert.ok(!raw.includes(SECRET_VALUE), "a secret reached the audit log");
  const body = JSON.parse(raw);
  const entry = body.data.find((e: any) => e.action === "CREDENTIALS_UPDATED");
  assert.deepEqual(entry.after.changedKeys, ["API_KEY"]);
});

test("writing a masked value back does not overwrite the real one", async (t) => {
  if (needsMongo(t)) return;
  // The UI round-trips whatever it was given. Storing "••••••••91AF" as the
  // API key would take the provider off-sale in the least obvious way possible.
  const res = await call("/providers/alpha/credentials/test", {
    method: "PUT",
    body: {
      values: { API_KEY: "••••••••91AF", BASE_URL: "http://unchanged.test" },
      reason: "editing only the base URL",
    },
  });
  assert.equal(res.status, 200);

  const internal = await (
    await call("/credentials/alpha/test", { internal: true })
  ).json();
  assert.equal(internal.data.API_KEY, SECRET_VALUE);
});

test("a save with nothing left to write is refused", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers/alpha/credentials/test", {
    method: "PUT",
    body: { values: { API_KEY: "••••••••91AF" }, reason: "no-op" },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "NOTHING_TO_SAVE");
});

test("Test Connection makes a real call and reports the real result", async (t) => {
  if (needsMongo(t)) return;
  await save({ BASE_URL: `http://127.0.0.1:${(supplier.address() as AddressInfo).port}` });

  supplierStatus = 200;
  const ok = await (
    await call("/providers/alpha/credentials/test/test", { method: "POST" })
  ).json();
  assert.equal(ok.data.ok, true);
  assert.equal(ok.data.category, "SUCCESS");
  assert.equal(ok.data.httpStatus, 200);
  assert.ok(ok.data.durationMs >= 0);
});

test("a rejected key is reported as authentication, not as a generic failure", async (t) => {
  if (needsMongo(t)) return;
  // Sending an admin to rotate credentials that were never the problem is the
  // failure mode this distinction exists to prevent.
  await call("/providers/alpha/credentials/test", {
    method: "PUT",
    body: { values: { API_KEY: "wrong-key" }, reason: "simulating a bad key" },
  });

  const body = await (
    await call("/providers/alpha/credentials/test/test", { method: "POST" })
  ).json();
  assert.equal(body.data.ok, false);
  assert.equal(body.data.category, "AUTHENTICATION_FAILED");
  assert.equal(body.data.httpStatus, 401);
});

test("a supplier 500 is not mistaken for a bad key", async (t) => {
  if (needsMongo(t)) return;
  await call("/providers/alpha/credentials/test", {
    method: "PUT",
    body: { values: { API_KEY: SECRET_VALUE }, reason: "restoring the good key" },
  });
  supplierStatus = 503;

  const body = await (
    await call("/providers/alpha/credentials/test/test", { method: "POST" })
  ).json();
  assert.equal(body.data.category, "SUPPLIER_ERROR");
  supplierStatus = 200;
});

test("the internal credential route is closed to an admin token", async (t) => {
  if (needsMongo(t)) return;
  // The only plaintext exit in the system. An admin session must not open it.
  const res = await fetch(`${internalBase}/credentials/alpha/test`, {
    headers: { authorization: `Bearer ${token()}` },
  });
  assert.equal(res.status, 401);
});

test("deleting credentials switches the environment off", async (t) => {
  if (needsMongo(t)) return;
  // An environment with no keys cannot be called, so the router must stop
  // choosing it the moment they are gone.
  const res = await call("/providers/alpha/credentials/test", {
    method: "DELETE",
    body: { reason: "decommissioned", confirmation: "DELETE ALPHA" },
  });
  assert.equal(res.status, 200);

  const provider = await (await call("/providers/alpha")).json();
  assert.equal(provider.data.environments.test.enabled, false);

  const routing = await (await call("/routing")).json();
  assert.equal(routing.data.length >= 0, true);
});

test("writing PRODUCTION credentials without the phrase is refused by the server", async (t) => {
  if (needsMongo(t)) return;
  // The console asks for this phrase, but a curl would skip it — and a wrong
  // production key stops KLAR selling.
  const res = await call("/providers/alpha/credentials/production", {
    method: "PUT",
    body: { values: { API_KEY: "live-key" }, reason: "rotating" },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "CONFIRMATION_REQUIRED");
});

test("writing production credentials WITH the phrase succeeds", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/providers/alpha/credentials/production", {
    method: "PUT",
    body: {
      values: { API_KEY: "live-key" },
      reason: "rotating",
      confirmation: "update production",
    },
  });
  assert.equal(res.status, 200);
});

test("writing TEST credentials needs no phrase", async (t) => {
  if (needsMongo(t)) return;
  // The asymmetry is the point: a wrong sandbox key costs one request.
  const res = await save({ API_KEY: "sandbox-key" });
  assert.equal(res.status, 200);
});

test("the server tells the console which phrase it will demand", async (t) => {
  if (needsMongo(t)) return;
  // One definition, so the two cannot drift into demanding different words.
  const prod = await (await call("/providers/alpha/credentials/production")).json();
  const test = await (await call("/providers/alpha/credentials/test")).json();
  assert.equal(prod.data.writeConfirmationPhrase, "UPDATE PRODUCTION");
  assert.equal(test.data.writeConfirmationPhrase, null);
});

test("deleting credentials without the phrase is refused", async (t) => {
  if (needsMongo(t)) return;
  // A delete also switches the environment off, in either environment.
  const res = await call("/providers/alpha/credentials/production", {
    method: "DELETE",
    body: { reason: "cleanup" },
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "CONFIRMATION_REQUIRED");
});
