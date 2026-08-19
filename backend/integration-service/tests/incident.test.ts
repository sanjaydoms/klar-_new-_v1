/**
 * Incident detection.
 *
 * The behaviours that matter are all about restraint: not opening a second
 * incident for the same outage, not closing one on the first good reading, and
 * not mistaking silence for recovery.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";

import mongoose from "mongoose";

const DB = "klar_integrations_incidenttest";
let connected = false;

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
  });
});

after(async () => {
  if (!connected) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  if (!connected) return;
  const { HealthBucket } = await import("../src/models/HealthBucket.model");
  const { Incident } = await import("../src/models/Incident.model");
  await Promise.all([HealthBucket.deleteMany({}), Incident.deleteMany({})]);
});

const needsMongo = (t: { skip: (m: string) => void }): boolean => {
  if (connected) return false;
  t.skip("no MongoDB reachable");
  return true;
};

/** Feed the health monitor a run of calls with a given failure share. */
const observe = async (total: number, failures: number) => {
  const { report } = await import("../src/services/health.service");
  const at = new Date();
  await report([
    ...Array.from({ length: total - failures }, () => ({
      providerSlug: "alpha", service: "HOTEL", operation: "SEARCH",
      environment: "test", outcome: "SUCCESS" as const, durationMs: 400, at,
    })),
    ...Array.from({ length: failures }, () => ({
      providerSlug: "alpha", service: "HOTEL", operation: "SEARCH",
      environment: "test", outcome: "SUPPLIER_ERROR" as const, durationMs: 400,
      reason: "supplier error (503)", at,
    })),
  ]);
};

const clearHealth = async () => {
  const { HealthBucket } = await import("../src/models/HealthBucket.model");
  await HealthBucket.deleteMany({});
};

test("a healthy operation opens no incident", async (t) => {
  if (needsMongo(t)) return;
  const { detect } = await import("../src/services/incident.service");
  await observe(100, 0);
  assert.deepEqual((await detect()).opened, []);
});

test("crossing into critical opens one, with the numbers that caused it", async (t) => {
  if (needsMongo(t)) return;
  const { detect } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  const { opened } = await detect();
  assert.equal(opened.length, 1);
  assert.match(opened[0], /^INC-\d{4}$/);

  const incident = (await Incident.findOne({ reference: opened[0] }))!;
  assert.equal(incident.status, "ACTIVE");
  assert.equal(incident.severity, "CRITICAL");
  // Kept on the incident so the record survives the logs expiring under it.
  assert.equal(incident.openedWith!.errorRate, 10);
  assert.equal(incident.openedWith!.requests, 100);
  assert.equal(incident.events[0].kind, "OPENED");
});

test("a continuing outage does not open a second incident", async (t) => {
  if (needsMongo(t)) return;
  // A supplier failing a hundred times is one incident with a timeline.
  const { detect } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  await detect();
  await detect();
  await detect();

  assert.equal(await Incident.countDocuments({}), 1);
});

test("too little traffic is not recovery", async (t) => {
  if (needsMongo(t)) return;
  // An operation that went quiet has not got better — it has stopped being
  // observed. Closing on that would be the dashboard congratulating itself.
  const { detect } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  const { opened } = await detect();

  await clearHealth();
  await observe(2, 0);
  await detect();
  await detect();
  await detect();
  await detect();

  const incident = (await Incident.findOne({ reference: opened[0] }))!;
  assert.equal(incident.status, "ACTIVE");
  assert.equal(incident.healthyChecks, 0);
});

test("one good reading records recovery but does not close the incident", async (t) => {
  if (needsMongo(t)) return;
  const { detect } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  const { opened } = await detect();

  await clearHealth();
  await observe(100, 0);
  await detect();

  const incident = (await Incident.findOne({ reference: opened[0] }))!;
  assert.equal(incident.status, "ACTIVE");
  assert.equal(incident.healthyChecks, 1);
  assert.ok(incident.events.some((e) => e.kind === "RECOVERED"));
});

test("sustained health closes it, and says it closed itself", async (t) => {
  if (needsMongo(t)) return;
  const { detect } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  const { opened } = await detect();

  await clearHealth();
  await observe(100, 0);
  await detect();
  await detect();
  const { resolved } = await detect();

  assert.deepEqual(resolved, opened);
  const incident = (await Incident.findOne({ reference: opened[0] }))!;
  assert.equal(incident.status, "RESOLVED");
  assert.equal(incident.autoResolved, true);
  assert.equal(incident.resolvedBy, undefined);
});

test("a resolved incident does not block the next one", async (t) => {
  if (needsMongo(t)) return;
  // The unique index is partial for exactly this: history must accumulate.
  const { detect } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  await detect();
  await clearHealth();
  await observe(100, 0);
  await detect();
  await detect();
  await detect();

  await clearHealth();
  await observe(100, 10);
  const { opened } = await detect();
  assert.equal(opened.length, 1);
  assert.equal(await Incident.countDocuments({}), 2);
});

test("a circuit opening lands in the timeline exactly once", async (t) => {
  if (needsMongo(t)) return;
  // The breaker re-reports its state on every flush; the timeline must not
  // gain an identical line every ten seconds for the whole outage.
  const { detect, noteCircuitChange } = await import("../src/services/incident.service");
  const { Incident } = await import("../src/models/Incident.model");

  await observe(100, 10);
  const { opened } = await detect();

  await noteCircuitChange("alpha", "HOTEL", "SEARCH", "OPEN", "request timed out");
  await noteCircuitChange("alpha", "HOTEL", "SEARCH", "OPEN", "request timed out");
  await noteCircuitChange("alpha", "HOTEL", "SEARCH", "OPEN", "request timed out");

  const incident = (await Incident.findOne({ reference: opened[0] }))!;
  assert.equal(incident.events.filter((e) => e.kind === "CIRCUIT_OPENED").length, 1);
});

test("acknowledging keeps the incident open and names who did it", async (t) => {
  if (needsMongo(t)) return;
  const { detect, acknowledge } = await import("../src/services/incident.service");

  await observe(100, 10);
  const { opened } = await detect();

  const req = { user: { email: "ops@klar.test" }, headers: {} } as never;
  const incident = await acknowledge(req, opened[0], "Looking at it");
  assert.equal(incident.status, "ACKNOWLEDGED");
  assert.equal(incident.acknowledgedBy, "ops@klar.test");
  assert.ok(incident.events.some((e) => e.kind === "ACKNOWLEDGED"));
});

test("resolving by hand needs a reason and is not marked automatic", async (t) => {
  if (needsMongo(t)) return;
  const { detect, resolve } = await import("../src/services/incident.service");

  await observe(100, 10);
  const { opened } = await detect();
  const req = { user: { email: "ops@klar.test" }, headers: {} } as never;

  await assert.rejects(() => resolve(req, opened[0], "  "));

  const incident = await resolve(req, opened[0], "Supplier confirmed fixed");
  assert.equal(incident.status, "RESOLVED");
  assert.equal(incident.autoResolved, false);
  assert.equal(incident.resolvedBy, "ops@klar.test");
});

test("incident references never collide", async (t) => {
  if (needsMongo(t)) return;
  // Counted from a counter, not from a row count: two detectors in the same
  // second would otherwise both claim the same number.
  const { nextReference } = await import("../src/models/Incident.model");
  const refs = await Promise.all(Array.from({ length: 25 }, () => nextReference()));
  assert.equal(new Set(refs).size, 25);
});
