/**
 * Supplier routing — the one decision every booking endpoint now shares.
 *
 * Before the registry, precheck/commit/cancel/amend each sniffed the payload
 * with their own predicate and every one of them fell through to RateGain. Two
 * consequences this file pins down:
 *
 *  1. The predicates disagreed. precheck matched "TJ:" (with colon) where commit
 *     matched "TJ" — so a propertyId without the colon precheck'd against
 *     RateGain and then committed against TripJack.
 *  2. The fallback was silent. Anything unrecognised was booked, and later
 *     cancelled, against RateGain — which is how a third supplier would fail.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingSupplierRegistry } from "./index";
import { BookingProvider } from "../models/Booking.model";
import type { BookingSupplier } from "./types";

const codeFor = (ref: Parameters<typeof bookingSupplierRegistry.resolve>[0]) =>
  bookingSupplierRegistry.resolve(ref).code;

test("every TripJack signal the old predicates used still routes to TripJack", () => {
  // Union of the five predicates this replaced. Each was load-bearing in at
  // least one endpoint; dropping any one silently reroutes real bookings to RG.
  assert.equal(codeFor({ propertyId: "TJ:10000000012345" }), "TJ"); // precheck.service
  assert.equal(codeFor({ propertyId: "TJ10000000012345" }), "TJ"); // commit.service (no colon)
  assert.equal(codeFor({ bookingId: "TJ-BOOK-1" }), "TJ");
  assert.equal(codeFor({ bookingId: "TG12345" }), "TJ"); // TripJack hold ids
  assert.equal(codeFor({ confirmationNumber: "TG12345" }), "TJ");
  assert.equal(codeFor({ payloadType: "HOTEL" }), "TJ");
  // TripJack's unified payload: a bookingId with no RateGain envelope.
  assert.equal(
    codeFor({ bookingId: "abc123", hasBookReservation: false }),
    "TJ",
  );
});

test("RateGain stays the catch-all, exactly as the old `else` branches were", () => {
  assert.equal(codeFor({ propertyId: "RG:ChIJabc123" }), "RG");
  assert.equal(
    codeFor({ propertyId: "ChIJabc123", hasBookReservation: true }),
    "RG",
  );
  assert.equal(codeFor({}), "RG");
});

test("a stored provider decides, and is not merely OR'd with the payload", () => {
  // The bug this closes: cancel.service used `payloadSaysTJ || dbSaysTJ`, so a
  // client posting `type: "HOTEL"` sent a RateGain booking to TripJack's cancel
  // API — a cross-supplier cancel that can only fail at the supplier.
  assert.equal(
    codeFor({ dbProvider: BookingProvider.RATEGAIN, payloadType: "HOTEL" }),
    "RG",
  );
  assert.equal(
    codeFor({ dbProvider: BookingProvider.RATEGAIN, confirmationNumber: "TJ99" }),
    "RG",
  );
  // And the converse: the record wins even when the payload looks RateGain-shaped.
  assert.equal(
    codeFor({ dbProvider: BookingProvider.TRIPJACK, hasBookReservation: true }),
    "TJ",
  );
});

test("a third supplier wins over the catch-all, and is never guessed at", () => {
  const acme: BookingSupplier = {
    code: "AC",
    dbProvider: "acme" as BookingProvider,
    owns: (ref) =>
      ref.dbProvider === "acme" || !!ref.propertyId?.startsWith("AC:"),
    adapter: { precheck: async () => ({}) as any },
  };

  const suppliers = bookingSupplierRegistry.all();
  const catchAllIndex = suppliers.findIndex((s) => s.code === "RG");
  // Registration order is the whole contract: resolve() takes the first match,
  // so anything registered after the catch-all can never be reached.
  suppliers.splice(catchAllIndex, 0, acme);

  try {
    assert.equal(codeFor({ propertyId: "AC:555" }), "AC");
    assert.equal(codeFor({ dbProvider: "acme" }), "AC");
    // RG and TJ are untouched by the new registration.
    assert.equal(codeFor({ propertyId: "TJ:1" }), "TJ");
    assert.equal(codeFor({ propertyId: "ChIJabc" }), "RG");
    // An unregistered provider on a stored booking throws instead of being
    // silently committed or cancelled against RateGain.
    assert.throws(
      () => codeFor({ dbProvider: "hotelbeds" }),
      /No supplier owns this booking/,
    );
  } finally {
    suppliers.splice(suppliers.indexOf(acme), 1);
  }
});
