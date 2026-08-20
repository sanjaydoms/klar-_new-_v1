/**
 * The measurement seam.
 *
 * It sits under every supplier call this service makes, so a mistake here is
 * either invisible data loss or a customer's details in a log — both of which
 * are quiet until they are not.
 */
import assert from "node:assert/strict";
import http, { Server } from "node:http";
import test, { after, before } from "node:test";
import { AddressInfo } from "node:net";

import axios from "axios";

import { __resetTelemetryForTests, __bufferedForTests } from "../config/telemetry";
import { newCorrelationId, runWith } from "../utils/observability";
import { observe } from "./observe";

let server: Server;
let status = 200;
let base = "";

before(async () => {
  server = http.createServer((_req, res) => res.writeHead(status).end("{}"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});

const client = () => observe(axios.create({ baseURL: base }), "TJ");

const inContext = <T>(operation: string, fn: () => Promise<T>) =>
  runWith({ operation, correlationId: newCorrelationId() }, fn);

test("a successful call is recorded against the route's operation", async () => {
  __resetTelemetryForTests();
  status = 200;
  await inContext("BOOKING", () => client().get("/oms/v1/book"));

  const [report] = __bufferedForTests();
  assert.equal(report.operation, "BOOKING");
  assert.equal(report.outcome, "SUCCESS");
  assert.equal(report.providerSlug, "tripjack");
  assert.equal(report.httpStatus, 200);
  assert.ok(report.durationMs >= 0);
  assert.ok(report.correlationId);
});

test("a failure is classified, not swallowed, and the error still propagates", async () => {
  // The interceptor must observe without changing behaviour: a caller that
  // handles a 500 has to keep receiving it.
  __resetTelemetryForTests();
  status = 500;
  await assert.rejects(() => inContext("BOOKING", () => client().get("/oms/v1/book")));

  const [report] = __bufferedForTests();
  assert.equal(report.outcome, "SUPPLIER_ERROR");
  assert.equal(report.httpStatus, 500);
  assert.match(report.reason!, /supplier error \(500\)/);
});

test("only the path is recorded — never the query string", async () => {
  // A query string carries booking ids and, on some endpoints, an email.
  __resetTelemetryForTests();
  status = 200;
  await inContext("BOOKING_STATUS", () =>
    client().get("/oms/v1/booking-details?id=BK123&email=guest@example.com"),
  );

  const [report] = __bufferedForTests();
  assert.equal(report.summary!.path, "/oms/v1/booking-details");
  assert.ok(!JSON.stringify(report).includes("guest@example.com"));
});

test("no request body reaches the report", async () => {
  __resetTelemetryForTests();
  status = 200;
  await inContext("BOOKING", () =>
    client().post("/oms/v1/book", {
      guest: { name: "A Real Person", passport: "X1234567" },
      card: { number: "4111111111111111" },
    }),
  );

  const raw = JSON.stringify(__bufferedForTests());
  assert.ok(!raw.includes("A Real Person"));
  assert.ok(!raw.includes("4111111111111111"));
});

test("a call outside any route context is not counted at all", async () => {
  // A worker, or a path nobody labelled. Counting it under the wrong operation
  // would be worse than not counting it — the health screen would blame an
  // operation that was never called.
  __resetTelemetryForTests();
  status = 200;
  await client().get("/oms/v1/book");
  assert.deepEqual(__bufferedForTests(), []);
});

test("every call in one request shares its correlation id", async () => {
  // A commit that prices, books and confirms is one customer action.
  __resetTelemetryForTests();
  status = 200;
  await inContext("BOOKING", async () => {
    const c = client();
    await c.get("/one");
    await c.get("/two");
  });

  const reports = __bufferedForTests();
  assert.equal(reports.length, 2);
  assert.equal(reports[0].correlationId, reports[1].correlationId);
  // But each attempt is its own row.
  assert.notEqual(reports[0].requestId, reports[1].requestId);
});
