/**
 * Production hardening.
 *
 * Environment separation and error handling: the two places where a mistake is
 * expensive and invisible until it is not.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const DB = "klar_integrations_hardeningtest";
const MASTER_EMAIL = "master@klar.test";

process.env.MASTER_EMAILS = MASTER_EMAIL;
process.env.INTERNAL_SERVICE_KEY = "internal-test-key";

let server: Server;
let base = "";
let connected = false;

const token = () =>
  jwt.sign(
    { userId: "u1", email: MASTER_EMAIL, clientType: "B2B", roles: "MASTER" },
    process.env.JWT_SECRET!,
  );

const call = (path: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token()}`,
      ...(init.headers ?? {}),
    },
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
      test: { baseUrl: "https://alpha.test", enabled: true },
    },
    services: [
      {
        service: "HOTEL",
        enabled: true,
        operations: [{ operation: "SEARCH", supported: true, enabled: true }],
      },
    ],
    credentialSchema: [
      { key: "API_KEY", label: "API Key", type: "secret", required: true },
    ],
  });

  const { app } = await import("../src/app");
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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

const creds = (environment: string) =>
  `/admin/integrations/providers/alpha/credentials/${environment}`;

test("an unknown environment is refused, never defaulted", async (t) => {
  if (needsMongo(t)) return;
  // Defaulting a typo to production would write test keys over live ones.
  for (const bad of ["prod", "PRODUCTION", "staging", "", "test%20"]) {
    const res = await call(creds(bad));
    assert.notEqual(res.status, 200, `"${bad}" must not resolve`);
  }
});

test("production and test credentials are genuinely separate", async (t) => {
  if (needsMongo(t)) return;
  await call(creds("test"), {
    method: "PUT",
    body: JSON.stringify({ values: { API_KEY: "test-key-AAAA" }, reason: "setup" }),
  });
  await call(creds("production"), {
    method: "PUT",
    body: JSON.stringify({ values: { API_KEY: "live-key-ZZZZ" }, reason: "setup" }),
  });

  const t1 = await (await call(creds("test"))).json();
  const p1 = await (await call(creds("production"))).json();
  assert.equal(t1.data.fields[0].value, "••••••••AAAA");
  assert.equal(p1.data.fields[0].value, "••••••••ZZZZ");
});

test("deleting one environment's credentials leaves the other's intact", async (t) => {
  if (needsMongo(t)) return;
  // The mistake that would matter: a delete that took production with it.
  await call(creds("test"), {
    method: "DELETE",
    body: JSON.stringify({ reason: "decommissioned" }),
  });

  const gone = await (await call(creds("test"))).json();
  const kept = await (await call(creds("production"))).json();
  assert.equal(gone.data.configured, false);
  assert.equal(kept.data.fields[0].value, "••••••••ZZZZ");
});

test("an unknown endpoint answers 404 as JSON, not an HTML error page", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/admin/integrations/nonsense");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).success, false);
});

test("a malformed body is the caller's mistake, and says so", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/admin/integrations/providers", {
    method: "POST",
    body: "{not json",
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Malformed JSON/);
});

test("no error response carries a stack trace", async (t) => {
  if (needsMongo(t)) return;
  // In this service an uncaught error can come from the credential path, where
  // the message can carry a key, or from axios, whose errors carry headers.
  for (const path of ["/admin/integrations/nonsense", "/admin/integrations/providers/ghost"]) {
    const body = await (await call(path)).text();
    assert.ok(!body.includes("at "), `${path} leaked a stack`);
    assert.ok(!/node_modules|\.ts:\d+/.test(body), `${path} leaked a path`);
  }
});

test("rate-limit headers are present, so a client can back off", async (t) => {
  if (needsMongo(t)) return;
  const res = await call("/admin/integrations/providers");
  assert.ok(res.headers.get("ratelimit-limit"), "standard headers should be on");
});

test("the internal surface has a far higher limit than the admin one", async (t) => {
  if (needsMongo(t)) return;
  // Every service instance polls routing through it; throttling that would
  // degrade the thing the limit is meant to protect.
  const adminLimit = Number(
    (await call("/admin/integrations/providers")).headers.get("ratelimit-limit"),
  );
  const internalRes = await fetch(`${base}/internal/routing`, {
    headers: { "x-internal-key": "internal-test-key" },
  });
  const internalLimit = Number(internalRes.headers.get("ratelimit-limit"));
  assert.ok(internalLimit > adminLimit, `${internalLimit} should exceed ${adminLimit}`);
});
