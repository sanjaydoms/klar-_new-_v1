# ADR-0004 — The supplier contract and the rate token

**Status:** Accepted · **Date:** 2026-08-13

## Context

The reference system had a supplier registry and a common adapter interface, and
in one place — `products.service.ts`, 21 lines — the abstraction genuinely held.
Everywhere else it leaked:

- Per supplier, logic was smeared across five layers (`suppliers/`, `adapters/`,
  `providers/*.provider.ts`, `providers/*.api.provider.ts`, `clients/`), two of
  which were 2-line re-exports with no responsibility.
- Ten files were copy-pasted between the two hotel services; **nine had
  diverged**, including `markup-config.ts` — 82 lines apart between the service
  that quotes and the service that charges.
- `hotel-booking-service` had a registry and did not use it. `precheck.service`
  branched on `propertyId.startsWith("TJ:")`; commit's supplier detection was a
  five-clause heuristic including `payload.type === "HOTEL"` and
  `(!payload.BookReservation && payload.bookingId)` — it inferred the supplier
  from the shape of whatever the frontend sent.
- The frontend assembled a native RateGain `BookReservation` envelope —
  `ResStatus`, `EchoToken`, `RoomSelectionKey`, per-night `RoomRate` — and
  `MyBookings` rendered from the stored raw supplier request.

## Decision

**1. One vertical slice per supplier.** `suppliers/<code>/` holds a client, a
request mapper, a response mapper and a config schema. Nothing supplier-specific
exists outside it. The two pass-through `provider` layers are not recreated.

**2. `precheck`, `book` and `cancel` are required, not optional.** A supplier
whose rates cannot be booked has no business in a search that promises the
lowest *bookable* price. Variation lives in `SupplierCapabilities`, which is
declared rather than inferred — the registry rejects a supplier that claims
`asyncBooking` without implementing `getBookingStatus`.

**3. Adapters return `SupplierCost`, never `CustomerPrice`.** See ADR-0002.

**4. Nothing rejects.** Every method resolves with a status and a normalised
error. See ADR-0003.

**5. Raw supplier errors never leave the adapter.** `NormalizedSupplierError`
carries an internal code and message; `customerMessageFor()` produces the
customer-facing text. The reference products controller returned
`body: error.response?.data` verbatim (D-15), and the frontend grew a hardcoded
RateGain error-code table (1999, 1001…1005) to interpret it.

**6. Supplier state is sealed behind an opaque `DealId`.**

```
dealId → RateToken { supplier, supplierHotelId, supplierRateRef,
                     supplierState, quotedCost, quotedPrice,
                     pricingContext, issuedAt, expiresAt }
```

The client receives `dealId` and nothing else. Precheck and commit take a
`dealId`; the booking engine resolves the owning supplier from it. **The browser
cannot learn which supplier it is booking**, so adding a supplier changes nothing
in the UI. This is the single change that retires D-6, D-9 and D-10 together.

**7. Supplier behaviour is a `supplier_config` row, not an environment variable.**
Timeouts, retries, concurrency, breaker thresholds, market restrictions,
maintenance mode and reliability score are all operator-editable without a
deploy. The reference read 80 distinct `process.env` values across the two hotel
services, ~15 of them declared in a config module and the rest inline in
business logic.

**8. Bookings store a canonical `dealSnapshot`; raw supplier payloads go to a
side table no UI can reach.** `Booking.supplier` is a **string** keyed to
`supplier_config`, not a two-value enum — the reference enum meant a third
supplier required a schema migration.

**9. Every supplier passes a shared contract test-suite** (`suppliers/testing/`)
before registration.

## Consequences

- Adding Supplier C is: a folder, a `register()` call, a config row, contract
  tests, and mapping backfill. Nothing in the orchestrator, matcher, pricing
  engine, booking engine, API contract, frontend or schema changes.
- Rate tokens need a store with a TTL bounded by supplier rate validity, and a
  clear expiry path — an expired `dealId` must produce "this rate has expired,
  please search again", not a stack trace.
- During frontend migration the API must accept both `dealId` and the legacy
  `BookReservation` envelope. The legacy path is metered so its retirement is
  measurable.
- `SupplierContext` is injected, including the logger, so adapters are testable
  without global state and every log line carries the `searchId`.

## Alternatives rejected

- **Optional `book`/`cancel`, as the brief sketched.** Permits a supplier that
  can be searched and not booked — the failure mode is a customer selecting a
  price we cannot honour.
- **Let adapters price, and normalise afterwards.** This is D-1.
- **A shared npm package instead of one service.** Solves the divergence and not
  the five-layer smear; and versioning it across two deployables reintroduces
  drift by a slower route.
