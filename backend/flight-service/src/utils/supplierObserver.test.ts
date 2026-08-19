/**
 * The supplier observer.
 *
 * It sits on the GLOBAL axios instance, which this service also uses to call
 * auth-service and payment-service. The filtering is therefore load-bearing:
 * getting it wrong would put KLAR's own internal traffic into TripJack's health
 * numbers and make a supplier look responsible for an outage in payments.
 */
import assert from "node:assert/strict";
import http, { Server } from "node:http";
import test, { after, before } from "node:test";
import { AddressInfo } from "node:net";

let supplier: Server;
let internal: Server;
let supplierUrl = "";
let internalUrl = "";
let supplierStatus = 200;

// Both must be set before anything imports the config, which reads them once.
before(async () => {
  supplier = http.createServer((_r, res) => res.writeHead(supplierStatus).end("{}"));
  await new Promise<void>((r) => supplier.listen(0, "127.0.0.1", r));
  supplierUrl = `http://127.0.0.1:${(supplier.address() as AddressInfo).port}`;

  internal = http.createServer((_r, res) => res.writeHead(200).end("{}"));
  await new Promise<void>((r) => internal.listen(0, "127.0.0.1", r));
  internalUrl = `http://127.0.0.1:${(internal.address() as AddressInfo).port}`;

  process.env.NODE_ENV = "development";
  process.env.TRIPJACK_TEST_BASE_URL = supplierUrl;
  process.env.TRIPJACK_TEST_API_KEY ||= "test-key";
});

after(async () => {
  for (const s of [supplier, internal]) {
    s.closeAllConnections();
    await new Promise<void>((r) => s.close(() => r()));
  }
});

const load = async () => {
  const axios = (await import("axios")).default;
  const { observeSupplierCalls } = await import("./supplierObserver");
  const telemetry = await import("../config/telemetry");
  const observability = await import("./observability");
  observeSupplierCalls();
  return { axios, telemetry, observability };
};

test("a supplier call is measured against the route's operation", async () => {
  const { axios, telemetry, observability } = await load();
  telemetry.__resetTelemetryForTests();
  supplierStatus = 200;

  await observability.runWith(
    { operation: "SEARCH", correlationId: observability.newCorrelationId() },
    () => axios.post(`${supplierUrl}/fms/v1/air-search-all`, {}),
  );

  const [report] = telemetry.__bufferedForTests();
  assert.equal(report.service, "FLIGHT");
  assert.equal(report.operation, "SEARCH");
  assert.equal(report.providerSlug, "tripjack");
  assert.equal(report.outcome, "SUCCESS");
  assert.equal(report.summary!.path, "/fms/v1/air-search-all");
});

test("KLAR's own internal traffic is never counted as supplier traffic", async () => {
  // The whole reason the filter exists. Without it, an auth-service blip would
  // appear on the dashboard as TripJack failing.
  const { axios, telemetry, observability } = await load();
  telemetry.__resetTelemetryForTests();

  await observability.runWith(
    { operation: "SEARCH", correlationId: observability.newCorrelationId() },
    async () => {
      await axios.get(`${internalUrl}/user/auth/me`);
      await axios.post(`${internalUrl}/api/pay/charge`, {});
    },
  );

  assert.deepEqual(telemetry.__bufferedForTests(), []);
});

test("a supplier failure is classified and still thrown to the caller", async () => {
  // The observer must not change behaviour: a service handling a 500 has to
  // keep receiving it.
  const { axios, telemetry, observability } = await load();
  telemetry.__resetTelemetryForTests();
  supplierStatus = 503;

  await assert.rejects(() =>
    observability.runWith(
      { operation: "BOOKING", correlationId: observability.newCorrelationId() },
      () => axios.post(`${supplierUrl}/oms/v1/book`, {}),
    ),
  );

  const [report] = telemetry.__bufferedForTests();
  assert.equal(report.operation, "BOOKING");
  assert.equal(report.outcome, "SUPPLIER_ERROR");
  assert.equal(report.httpStatus, 503);
  supplierStatus = 200;
});

test("a supplier call outside a labelled route is not counted", async () => {
  // A cron job, or a mount nobody labelled. Filing it under the wrong
  // operation would make the health screen blame something never called.
  const { axios, telemetry } = await load();
  telemetry.__resetTelemetryForTests();
  supplierStatus = 200;

  await axios.post(`${supplierUrl}/fms/v1/air-search-all`, {});
  assert.deepEqual(telemetry.__bufferedForTests(), []);
});

test("no passenger detail reaches a report", async () => {
  // A flight booking body carries names, dates of birth and passport numbers.
  const { axios, telemetry, observability } = await load();
  telemetry.__resetTelemetryForTests();

  await observability.runWith(
    { operation: "BOOKING", correlationId: observability.newCorrelationId() },
    () =>
      axios.post(`${supplierUrl}/oms/v1/book?pnr=ABC123`, {
        travellers: [{ fN: "A Real Person", pid: "X1234567", dob: "1980-01-01" }],
      }),
  );

  const raw = JSON.stringify(telemetry.__bufferedForTests());
  assert.ok(!raw.includes("A Real Person"));
  assert.ok(!raw.includes("X1234567"));
  // The query string is dropped too — it carries the PNR.
  assert.ok(!raw.includes("ABC123"));
});

test("installing the observer twice does not double-count", async () => {
  const { axios, telemetry, observability } = await load();
  const { observeSupplierCalls } = await import("./supplierObserver");
  observeSupplierCalls();
  observeSupplierCalls();
  telemetry.__resetTelemetryForTests();

  await observability.runWith(
    { operation: "SEARCH", correlationId: observability.newCorrelationId() },
    () => axios.post(`${supplierUrl}/fms/v1/air-search-all`, {}),
  );

  assert.equal(telemetry.__bufferedForTests().length, 1);
});
