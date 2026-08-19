/**
 * The API log.
 *
 * The properties worth proving are about what does NOT get written — a log is
 * only safe to give people if the unsafe things cannot reach it — and about
 * correlation, which is the whole reason it exists.
 */
import "./env";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import mongoose from "mongoose";

const DB = "klar_integrations_apilogtest";
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

const base = {
  service: "HOTEL",
  operation: "SEARCH",
  environment: "test",
  durationMs: 500,
};

test("a report with no requestId feeds health but writes no log row", async (t) => {
  if (needsMongo(t)) return;
  // Some measurements are worth counting without being worth a row; inventing
  // an id for those would produce records nobody can correlate.
  const { write, list } = await import("../src/services/apilog.service");
  const written = await write([
    { ...base, providerSlug: "alpha", outcome: "SUCCESS" },
  ]);
  assert.equal(written, 0);
  assert.equal((await list({ provider: "alpha" })).length, 0);
});

test("the log row starts when the call started, not when it ended", async (t) => {
  if (needsMongo(t)) return;
  // The report timestamps the END. A log ordered by a finish time would
  // interleave a fast late call ahead of a slow earlier one.
  const { write, list } = await import("../src/services/apilog.service");
  const ended = new Date("2026-01-01T12:00:10Z");
  await write([
    {
      ...base,
      providerSlug: "beta",
      outcome: "SUCCESS",
      durationMs: 4_000,
      requestId: "BT-1",
      at: ended,
    },
  ]);
  const [row] = await list({ requestId: "BT-1" });
  assert.equal(row.startedAt.toISOString(), "2026-01-01T12:00:06.000Z");
});

test("objects and arrays never reach the summary", async (t) => {
  if (needsMongo(t)) return;
  // A nested value is how a whole request payload ends up in the log by
  // accident. Only small scalars survive.
  const { write, list } = await import("../src/services/apilog.service");
  await write([
    {
      ...base,
      providerSlug: "beta",
      outcome: "SUCCESS",
      requestId: "BT-2",
      summary: {
        destination: "Goa",
        rooms: 2,
        b2c: true,
        guest: { name: "Real Person", passport: "X1234567" },
        rates: [{ price: 100 }],
        token: undefined,
      },
    },
  ]);
  const [row] = await list({ requestId: "BT-2" });
  assert.deepEqual(row.summary, { destination: "Goa", rooms: 2, b2c: true });
});

test("an oversized summary value is truncated rather than stored whole", async (t) => {
  if (needsMongo(t)) return;
  const { write, list } = await import("../src/services/apilog.service");
  await write([
    {
      ...base,
      providerSlug: "beta",
      outcome: "SUCCESS",
      requestId: "BT-3",
      summary: { blob: "x".repeat(10_000) },
    },
  ]);
  const [row] = await list({ requestId: "BT-3" });
  assert.equal(String(row.summary!.blob).length, 200);
});

test("a redelivered batch does not lose the rows it had not delivered", async (t) => {
  if (needsMongo(t)) return;
  // A client that retried a partly-delivered flush must not be punished for it.
  const { write, list } = await import("../src/services/apilog.service");
  const rows = [
    { ...base, providerSlug: "beta", outcome: "SUCCESS" as const, requestId: "BT-4" },
    { ...base, providerSlug: "beta", outcome: "SUCCESS" as const, requestId: "BT-5" },
  ];
  await write([rows[0]]);
  await write(rows);
  assert.equal((await list({ requestId: "BT-5" })).length, 1);
});

test("a failover is one correlation with two attempts", async (t) => {
  if (needsMongo(t)) return;
  // §42 exactly: the user pressed search once.
  const { write, correlation } = await import("../src/services/apilog.service");
  const started = new Date("2026-01-01T13:00:00Z");

  await write([
    {
      ...base,
      providerSlug: "rategain",
      outcome: "TIMEOUT",
      reason: "request timed out",
      httpStatus: 504,
      durationMs: 8_000,
      correlationId: "KLAR-REQ-X",
      requestId: "RG-9",
      attempt: 1,
      at: new Date(started.getTime() + 8_000),
    },
    {
      ...base,
      providerSlug: "tripjack",
      outcome: "SUCCESS",
      durationMs: 900,
      correlationId: "KLAR-REQ-X",
      requestId: "TJ-9",
      attempt: 2,
      isFailover: true,
      failedOverFrom: "rategain",
      at: new Date(started.getTime() + 9_000),
    },
  ]);

  const view = (await correlation("KLAR-REQ-X"))!;
  assert.equal(view.attempts.length, 2);
  assert.deepEqual(view.providersTried, ["rategain", "tripjack"]);
  assert.equal(view.succeeded, true);
  assert.equal(view.servedBy, "tripjack");
  // First attempt's start to last attempt's end — NOT 8000 + 900. Overlapping
  // attempts summed would report a 9-second search as nearly nine seconds
  // longer than it was.
  assert.equal(view.totalMs, 9_000);
});

test("a correlation where nobody answered says so", async (t) => {
  if (needsMongo(t)) return;
  const { write, correlation } = await import("../src/services/apilog.service");
  await write([
    {
      ...base,
      providerSlug: "rategain",
      outcome: "SUPPLIER_ERROR",
      reason: "supplier error (503)",
      correlationId: "KLAR-REQ-Y",
      requestId: "RG-10",
    },
  ]);
  const view = (await correlation("KLAR-REQ-Y"))!;
  assert.equal(view.succeeded, false);
  assert.equal(view.servedBy, null);
});

test("failures record their reason and successes do not", async (t) => {
  if (needsMongo(t)) return;
  const { list } = await import("../src/services/apilog.service");
  const [failed] = await list({ requestId: "RG-9" });
  const [ok] = await list({ requestId: "TJ-9" });
  assert.equal(failed.errorReason, "request timed out");
  assert.equal(failed.httpStatus, 504);
  assert.equal(ok.errorReason, undefined);
});

test("the failover filter finds only the fallback attempts", async (t) => {
  if (needsMongo(t)) return;
  const { list } = await import("../src/services/apilog.service");
  const rows = await list({ failoverOnly: true });
  assert.deepEqual(rows.map((r) => r.requestId), ["TJ-9"]);
});
