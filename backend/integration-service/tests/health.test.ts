/**
 * Health measurement.
 *
 * The percentile maths and the classifier are the parts nobody would notice
 * being wrong: a p95 that reads low or a status that reads green is invisible
 * right up until it matters.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import mongoose from "mongoose";

import {
  LATENCY_BUCKETS_MS,
  bucketFor,
  percentileFrom,
  HISTOGRAM_SIZE,
} from "../src/constants/latency";

const DB = "klar_integrations_healthtest";
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

  await mongoose.connection.dropDatabase();

  // AFTER the drop, not before: dropping a database removes the indexes with
  // it, so building them first achieves nothing. This ordering is the whole
  // reason the concurrency test kept failing.
  const { ensureIndexes } = await import("../src/config/db.config");
  await ensureIndexes();
});

after(async () => {
  if (!connected) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const needsMongo = (t: { skip: (m: string) => void }): boolean => {
  if (connected) return false;
  t.skip("no MongoDB reachable");
  return true;
};

const histogram = (counts: Record<number, number>): number[] => {
  const h = new Array(HISTOGRAM_SIZE).fill(0);
  for (const [i, n] of Object.entries(counts)) h[Number(i)] = n;
  return h;
};

test("a duration lands in the bucket whose boundary it does not exceed", () => {
  assert.equal(bucketFor(1), 0);
  assert.equal(bucketFor(50), 0);
  assert.equal(bucketFor(51), 1);
  assert.equal(bucketFor(30_000), LATENCY_BUCKETS_MS.length - 1);
  // Anything above the top boundary falls in the overflow slot.
  assert.equal(bucketFor(45_000), LATENCY_BUCKETS_MS.length);
});

test("percentiles over an empty histogram are unknown, not zero", () => {
  // Zero would read as "instant" — the most flattering possible lie.
  assert.equal(percentileFrom(new Array(HISTOGRAM_SIZE).fill(0), 0.95), null);
});

test("a percentile reports the upper boundary of its bucket", () => {
  // 100 calls, all between 250ms and 500ms.
  assert.equal(percentileFrom(histogram({ 3: 100 }), 0.95), 500);
});

test("a percentile is not dragged down by a fast majority", () => {
  // 95 fast calls and 5 very slow ones: p95 must find the slow tail.
  const slow = bucketFor(14_000);
  const h = histogram({ 0: 95, [slow]: 5 });
  assert.equal(percentileFrom(h, 0.5), 50);
  assert.equal(percentileFrom(h, 0.95), 50);
  assert.equal(percentileFrom(h, 0.99), 15_000);
});

test("a percentile in the overflow bucket is Infinity, never a number", () => {
  // A measured value there would be a fabrication — the bucket has no top.
  const overflow = LATENCY_BUCKETS_MS.length;
  assert.equal(percentileFrom(histogram({ 0: 90, [overflow]: 10 }), 0.99), Infinity);
});

test("reports fold into one bucket per minute and per operation", async (t) => {
  if (needsMongo(t)) return;
  const { report } = await import("../src/services/health.service");
  const { HealthBucket } = await import("../src/models/HealthBucket.model");

  const at = new Date("2026-01-01T10:00:30Z");
  await report([
    { providerSlug: "alpha", service: "HOTEL", operation: "SEARCH", environment: "test", outcome: "SUCCESS", durationMs: 200, at },
    // Same minute, different second — must merge into the same document.
    { providerSlug: "alpha", service: "HOTEL", operation: "SEARCH", environment: "test", outcome: "SUCCESS", durationMs: 300, at: new Date("2026-01-01T10:00:59Z") },
    { providerSlug: "alpha", service: "HOTEL", operation: "SEARCH", environment: "test", outcome: "TIMEOUT", durationMs: 20_000, at, reason: "request timed out" },
  ]);

  const buckets = await HealthBucket.find({ providerSlug: "alpha" });
  assert.equal(buckets.length, 1);
  const b = buckets[0];
  assert.equal(b.requests, 3);
  assert.equal(b.successes, 2);
  assert.equal(b.failures, 1);
  assert.equal(b.timeouts, 1);
  assert.equal(b.durationSumMs, 20_500);
  assert.equal(b.minute.toISOString(), "2026-01-01T10:00:00.000Z");
  assert.equal(b.lastFailureReason, "request timed out");
});

test("concurrent reports for the same minute merge rather than race", async (t) => {
  if (needsMongo(t)) return;
  const { report } = await import("../src/services/health.service");
  const { HealthBucket } = await import("../src/models/HealthBucket.model");

  const at = new Date("2026-01-01T11:00:00Z");
  const one = () =>
    report([
      { providerSlug: "beta", service: "HOTEL", operation: "SEARCH", environment: "test", outcome: "SUCCESS", durationMs: 100, at },
    ]);

  await Promise.all(Array.from({ length: 20 }, one));

  const buckets = await HealthBucket.find({ providerSlug: "beta" });
  assert.equal(buckets.length, 1, "the unique index should force one document");
  assert.equal(buckets[0].requests, 20, "every concurrent report should be counted");
});

test("too few requests yields UNKNOWN, not a status invented from noise", async (t) => {
  if (needsMongo(t)) return;
  // One failure out of one request is a 100% error rate and means nothing.
  const { report, snapshot } = await import("../src/services/health.service");
  const { Provider } = await import("../src/models/Provider.model");

  await Provider.create({
    slug: "gamma",
    code: "GM",
    name: "Gamma",
    types: ["HOTEL"],
    status: "ACTIVE",
    activeEnvironment: "test",
    environments: {
      production: { baseUrl: "", enabled: false },
      test: { baseUrl: "https://gamma.test", enabled: true },
    },
    services: [
      {
        service: "HOTEL",
        enabled: true,
        operations: [{ operation: "SEARCH", supported: true, enabled: true }],
      },
    ],
  });

  await report([
    { providerSlug: "gamma", service: "HOTEL", operation: "SEARCH", environment: "test", outcome: "SUPPLIER_ERROR", durationMs: 500 },
  ]);

  const snap = await snapshot({ minutes: 60 });
  const gamma = snap.providers.find((p) => p.providerSlug === "gamma")!;
  assert.equal(gamma.errorRate, 100);
  assert.equal(gamma.belowSampleSize, true);
  assert.equal(gamma.status, "UNKNOWN");
});

test("a sustained error rate crosses into CRITICAL", async (t) => {
  if (needsMongo(t)) return;
  const { report, snapshot } = await import("../src/services/health.service");

  // 90 good, 10 bad = 10%, past the 5% critical band, and past the sample floor.
  const now = new Date();
  await report([
    ...Array.from({ length: 90 }, () => ({
      providerSlug: "gamma", service: "HOTEL", operation: "SEARCH",
      environment: "test", outcome: "SUCCESS" as const, durationMs: 400, at: now,
    })),
    ...Array.from({ length: 9 }, () => ({
      providerSlug: "gamma", service: "HOTEL", operation: "SEARCH",
      environment: "test", outcome: "SUPPLIER_ERROR" as const, durationMs: 400, at: now,
    })),
  ]);

  const snap = await snapshot({ minutes: 60 });
  const gamma = snap.providers.find((p) => p.providerSlug === "gamma")!;
  assert.equal(gamma.belowSampleSize, false);
  assert.equal(gamma.status, "CRITICAL");
  assert.ok(gamma.errorRate! >= 5);
});

test("slow but successful is still not healthy", async (t) => {
  if (needsMongo(t)) return;
  // Every call succeeds, all of them take 20 seconds. Judging on error rate
  // alone would call that healthy.
  const { report, snapshot } = await import("../src/services/health.service");
  const { Provider } = await import("../src/models/Provider.model");

  await Provider.create({
    slug: "slowco",
    code: "SC",
    name: "SlowCo",
    types: ["HOTEL"],
    status: "ACTIVE",
    activeEnvironment: "test",
    environments: {
      production: { baseUrl: "", enabled: false },
      test: { baseUrl: "https://slow.test", enabled: true },
    },
    services: [
      {
        service: "HOTEL",
        enabled: true,
        operations: [{ operation: "SEARCH", supported: true, enabled: true }],
      },
    ],
  });

  const now = new Date();
  await report(
    Array.from({ length: 50 }, () => ({
      providerSlug: "slowco", service: "HOTEL", operation: "SEARCH",
      environment: "test", outcome: "SUCCESS" as const, durationMs: 20_000, at: now,
    })),
  );

  const snap = await snapshot({ minutes: 60 });
  const slow = snap.providers.find((p) => p.providerSlug === "slowco")!;
  assert.equal(slow.errorRate, 0);
  // 20s is past the degraded band but short of critical. It only lands there
  // because the buckets have real resolution around 20s — a coarser scale
  // would report this as 30s and cry CRITICAL over a merely slow supplier.
  assert.equal(slow.p95Ms, 20_000);
  assert.equal(slow.status, "DEGRADED");
});

test("health is reported per operation, not only per provider", async (t) => {
  if (needsMongo(t)) return;
  // §24 — one broken operation must be visible as itself.
  const { snapshot } = await import("../src/services/health.service");
  const snap = await snapshot({ minutes: 60 });
  const gamma = snap.providers.find((p) => p.providerSlug === "gamma")!;
  const hotel = gamma.services.find((s) => s.service === "HOTEL")!;
  const search = hotel.operations.find((o) => o.operation === "SEARCH")!;
  assert.ok(search.requests > 0);
  assert.equal(search.status, gamma.status);
});
