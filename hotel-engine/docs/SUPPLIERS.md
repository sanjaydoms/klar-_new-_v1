# Supplier integration

How a supplier plugs into the KLAR hotel engine, what the two live ones do that
is unusual, and what still needs confirming against the real APIs.

---

## The contract

Every supplier implements [`HotelSupplier`](../src/suppliers/contract/hotel-supplier.ts).
Three rules make it an abstraction rather than a shared shape:

**1. Adapters return cost, never price.** `SupplierCost` has fields for base,
taxes, fees and total. It has no field a customer price could occupy, and
`SupplierContext` carries no markup rules, no channel and no pricing config. One
engine — `priceFromCost()` — turns cost into price, identically for every
supplier. This is the structural fix for the teardown's central defect, where
platform markup was applied to TripJack and not to RateGain and the
"cheapest supplier" comparison was therefore meaningless.

**2. Nothing throws.** Every method resolves with a status and, on failure, a
`NormalizedSupplierError`. A supplier failing is data the orchestrator records
and routes around, not an exception that unwinds a fan-out into a log line.

**3. `precheck`, `book` and `cancel` are required.** A supplier whose rates
cannot be booked has no place in a search that promises the lowest *bookable*
price. Variation lives in `capabilities`, which the registry validates — declare
`asyncBooking` without `getBookingStatus` and registration fails.

### Layout

```
src/suppliers/
  contract/    the interface, DTOs, error taxonomy, registry
  common/      HTTP transport, circuit breaker, deadline+retry executor,
               defensive payload readers, image resolution
  testing/     stub transport, test context, the shared contract suite
  tripjack/    config · request · response · adapter · fixtures
  rategain/    config · request · response · adapter · fixtures
```

One vertical slice per supplier. The reference spread each supplier across five
layers in two services — two of which were pass-through re-exports — and the two
copies of its TripJack provider ended up 1,040 lines apart.

---

## Adding a supplier

```
1. src/suppliers/<code>/
     config.ts     credentials, capabilities, supplier-specific tuning
     request.ts    KLAR request shapes  → supplier wire shapes
     response.ts   supplier wire shapes → domain values (cost, never price)
     adapter.ts    transport wiring; implements HotelSupplier
     fixtures.ts   recorded-shape payloads

2. Add a runContractSuite({...}) block to
   src/suppliers/contract-conformance.test.ts

3. registry.register(new SupplierCAdapter({...}), config)

4. INSERT INTO supplier_config (...)

5. Backfill supplier_property_mapping and destination_mapping
```

Nothing in the search orchestrator, matcher, pricing engine, booking engine, API
contract, frontend or database schema changes. That is the acceptance test for
the architecture, and step 2 is where it is enforced: a supplier that cannot
pass the same assertions as the existing two does not ship.

### What the contract suite checks

Thirty assertions per supplier, all of them properties that must hold
*identically* across suppliers — which is precisely what per-supplier tests
cannot show:

- **Registration** — accepted by the registry; declares a servable search
  target; implements the poll if it claims async booking; is prechecked,
  booked and cancelled.
- **Costs** — parts sum to the total; positive; one currency; every rate carries
  a re-priceable reference and sealed supplier state.
- **Cost, not price** — no `price`, `sellingRate` or `markup` field anywhere on
  a rate or its cost; a minimum selling price is kept out of the cost.
- **Capabilities are honest** — a supplier declaring `searchReturnsRates: true`
  must return rates from search, and one declaring `false` must not. The
  orchestrator plans around this flag, so a wrong declaration silently discards
  every result. Rate-level assertions run against `getRates` for the suppliers
  that declare `false`, exactly as the orchestrator will have to call it.
- **Honest data** — a hotel the supplier sent no amenities for reports none; a
  rate with no cancellation signal reports `UNKNOWN`, not "non-refundable";
  image URLs are absolute or absent.
- **Failure is data** — resolves rather than rejects on 500, 401, 429, timeout,
  network drop, garbage and null; a timeout is reported as `TIMEOUT` and not as
  no-availability; an already-passed deadline stops the call; an aborted search
  returns nothing.
- **Lifecycle** — precheck, book, cancel, getRates and getHotelDetails all
  resolve on failure.
- **Committing is a write, not a read** — added in Phase 8, after an audit found
  every one of these wrong in both adapters. A commit whose outcome is unknown
  is **sent once** and reported **PENDING**, never FAILED: a timeout has very
  often been received, retrying books the room twice, and reporting failure
  refunds a booking that exists. A definite refusal is FAILED. A supplier that
  declares no hold support **refuses** a hold rather than committing. A guest
  list that does not fill the occupancy that was priced, or that names no
  primary guest, is refused **with nothing sent** — an adapter may not invent a
  traveller. `poll` is returned only when there is something to poll for.
- **Credentials** — never appear in a result or an error.

---

## TripJack

**Endpoints.** HMS for shopping (`/hms/v3/hotel/listing`, `/pricing`,
`/static-detail`, `/review`), OMS for orders (`/oms/v3/hotel/book`,
`/booking-details`, `/cancel-booking/{id}`).

**No destination search.** A listing call prices only the hotel ids it is given.
The orchestrator resolves a place to candidate ids; the adapter scans a *window*
of them per KLAR page (`idsPerPage` 150, in calls of 50, three at a time). Yield
is roughly **one bookable hotel per twenty ids** — Goa resolves ~6,179 ids and
returns about 20 bookable hotels.

The window is a fixed function of the page number so page N+1 resumes exactly
where page N stopped. Truncating early on a hotel count would leave part of a
window unscanned and make the next page skip those ids.

**`supplierReportedTotal` is a candidate-id count, not a hotel count.** Never
show it as a result count and never sum it across suppliers.

**Pricing is all-in.** `totalPrice` with `basePrice`, `taxes`, `mf`, `mft`
beneath it. The adapter treats the **total as authoritative** and derives the
base, rather than trusting the parts to add up: the total is what TripJack
invoices and what cancellation liability is measured against, so a base that
disagrees with it is the field to bend.

**Listing returns no cancellation block.** Refundability from a listing call is
genuinely unknown and is reported as `UNKNOWN`. The reference derived a `false`
here, which rendered a hard "Non-Refundable" on every search card with no
evidence for it.

**Sold out is a 400 with an empty option list.** Mapped to `EMPTY`, not `ERROR`,
so a healthy hotel is not counted against the circuit breaker.

**Book is asynchronous.** Returns an order that confirms within ~180 s; poll
`getBookingStatus` every 5 s. An unrecognised status maps to `PENDING`, never
`FAILED` — calling it failed would refund a booking the hotel may still confirm.

**`CRSM`/`CRCM` options** bundle differing rooms or meal plans into one offer.
Classified as room category `MIXED` so they do not land in an equivalence class
they do not belong in.

**Credentials.** One header, `apikey`, plus `agencyid`. The reference sent the
key under six header names with a spoofed Chrome User-Agent to get past the WAF.

---

## RateGain

Implemented against the **Smart Distribution API Specification v1.5.3**
(23 Jan 2026). Where the spec and the earlier reverse-engineered implementation
disagreed, the spec won — several of those disagreements were money bugs.

**Base URLs.** Sandbox `https://sandbox-smartdistribution.rategain.com`,
production `https://smartdistribution.rategain.com`. Auth is `ApiKey` +
`ApiSecret` headers.

**Endpoints.** `/getDestinations`, `/bestproperties`, `/getproducts`,
`/getSpecialRequests`, `/PreCheckReservation`, `/CommitReservation`,
`/CancelReservation`.

### Search returns no bookable rates

The single most consequential thing in the spec. A `bestproperties` hotel object
carries **one indicative `price`** — "Starting price of the hotel (per night or
package)" — and **no rate key**. Nothing it returns can be booked.

So `capabilities.searchReturnsRates` is **false**, and the adapter returns
properties with `rates: []` plus an `indicativeCost`. Bookable rates require a
second `getproducts` call, which the orchestrator plans for by reading that
flag. An earlier version of this adapter looked for `roomRates`/`options` on the
search response and discarded any hotel without them — against the real API that
would have dropped **every result of every RateGain search**.

**Ten properties per page**, fixed: "Default page size is 10, no option to
change the page size." One KLAR page consumes four supplier pages concurrently,
so the extra pages cost quota rather than latency. Against TripJack's densified
~100 per page, asking for one page makes RateGain look like it never has the
cheapest rate when it was simply barely asked.

**Geofilter radius is 5–200 km**, clamped. A value outside the range is rejected,
and a rejected page is a supplier missing from the comparison.

**`PropertyId` takes a comma-separated list**, so an id-list search is a
first-class target alongside destination codes and geofilters.

**`categoryCode` is a string** — `"5S"`, `"4EST"`, `"4 Star Hotel"`. Reading it
numerically loses the star rating for every RateGain property.

### Taxes and fees are not all inside the price

`taxes[].included` and `Fees[].Included` mean *included in total price*. Anything
marked `false` is payable **on top** of `totalPrice`:

```
payable = totalPrice + excludedTaxes + excludedFees
taxes   = includedTaxes + excludedTaxes
fees    = includedFees  + excludedFees
base    = payable − taxes − fees
```

The earlier implementation subtracted every tax from the total, which is right
for included taxes and under-quotes by the whole amount for excluded ones. It
also ignored `Fees[]` entirely — the spec's own sample carries a 50.00 cleaning
fee and a 20.00 resort fee, both excluded.

**Taxes repeat across currencies.** The spec's sample lists one tax as USD 10.00
and EUR 12.00. Only entries in the requested currency are counted; summing both
double-charges the guest.

### `sellingRate` is a floor, not a cost

`sellingRate` is the **minimum selling price**: "Minimum selling price (Only For
B2C Partner)", with `isMandatory` meaning "Partner must sell at or above the
MSP". `CommissionAmt`/`CommissionPct` accompany it on the B2C commissionable
model.

So it is modelled as `SupplierRate.minimumSellingPrice`, kept out of
`SupplierCost`, and enforced by the pricing engine: `priceFromCost()` raises the
customer price to a mandatory floor and records the difference as an
`MSP_UPLIFT` breakdown line. Selling under it is a breach of the distribution
agreement, not merely thin margin.

`BookingRate` on commit is the `totalNet` precheck confirmed; spec revision
1.5.3 added `SellingRate` to the commit payload for this model, and the adapter
echoes it back.

### Booking

**`allocationDetails` is required** at precheck and commit whenever
`getproducts` returned one. Dropping it makes the supplier reject the booking.
It is carried through `supplierState`.

**Response paths are nested and lower-camel.** The booking is at
`body.booking.confirmationNumber`; the cancellation at
`body.cancellationNumber`; the confirmed rate at
`body.preCheckResponse.rooms[].rates[]`. Reading a top-level
`ConfirmationNumber` finds nothing and reports every successful booking as
pending.

**Room name and code live on the product**, not on the rate — `products[].name`
and `products[].roomCode`. Reading them off the rate names every room "Room".

**There are two room-code spaces, and they never match.** `getproducts` returns
`products[].roomCode` — an internal numeric id, `"483146225"` — while
`PreCheckReservation` and `CommitReservation` return `rooms[].RoomCode`, a
room-type code, `"DBL.ST"`. The substitution check at the booking gate prefers a
supplier's own code over the room name whenever both sides carry one, so
comparing these two reported ROOM_CHANGED on **every** RateGain booking. The
reservation-side code is kept for the envelope and off the comparison; the room
name decides.

**Cancellation deadlines are formatted differently per endpoint.**
`getproducts` sends `"2026-09-05 00:00:00"` — naive, no zone — and the
reservation endpoints send `"2026-09-05T00:00:00+05:30"` for the same policy.
The adapter reads the naive form as IST, which is the offset RateGain itself
sends; the assumption is recorded in OPEN-ISSUES §3.2 for the reconciliation
booking to confirm. Passing both through verbatim made two spellings of one
deadline compare unequal, which reads as a changed cancellation policy.

**`RoomRate` is price per room per night**, not the stay total. Sending the
total is a silent overcharge at the hotel's end. The envelope is built
server-side; in the reference the *browser* assembled it.

**A commit with no confirmation number is reported `PENDING`.** A commit we
cannot reference is a commit we cannot cancel; reconciliation should see it.

**`rateType`** is `BOOKABLE` or `RECHECK`; the latter must be re-priced before
commit. Surfaced as `SupplierRate.rateStatus`.

---

## Open items

### Resolved by the v1.5.3 specification

| # | Question | Answer |
|---|---|---|
| 1 | Is `sellingRate` or the net total what RateGain invoices? | **Net.** `totalPrice`/`totalNet` is the payable cost; `sellingRate` is the MSP floor. Commission is disclosed separately. Implemented and tested. |
| 2 | Does the quoted total include taxes marked `included: false`? | **No.** They are charged on top, along with excluded `Fees[]`. Implemented and tested. |
| 5 | Is `ResStatus` 1 for precheck and 2 for commit? | **Neither — 1 = Confirmed, 9 = Pending**, and both endpoints share the envelope. The adapter sends 1 on the happy path. |

### Still open

| # | Question | Current assumption | Risk if wrong |
|---|---|---|---|
| 3 | **TripJack: is `apikey` the correct header?** | `apikey`, plus `agencyid`. Corroborated by TripJack's public integration notes, not by a spec we hold. | Auth failures on every call — loud and immediate, so low risk. |
| 4 | **TripJack: is the spoofed User-Agent load-bearing for the WAF?** | Not sent. | 403s under burst. Mitigated by low concurrency; if it recurs the fix is a rate-limit conversation with TripJack, not a better disguise. |
| 6 | **RateGain: does the B2C commissionable model expect us to remit `sellingRate` and reclaim commission, or to be invoiced `totalNet`?** | Invoiced `totalNet`; commission is revenue recorded against the booking. | Reconciliation mismatch of the commission amount — visible on the first invoice, not to a customer. |
| 7 | **TripJack: is `totalPrice` genuinely all-in?** | Yes — the total is authoritative and the base is derived from it. | A resort-fee equivalent charged at the hotel would be missing from the quote. |

Items 3, 4 and 7 are the TripJack ones and stay open because **we do not hold a
TripJack specification**. `tripjack.com/page/api-doc` is a JavaScript shell with
no fetchable content, and the API docs sit behind their partner portal. The
TripJack adapter is built from the reference implementation's working
integration, which is decent evidence but not a document.

**Ask TripJack for the HMS/OMS v3 specification.** It is the single highest-value
outstanding item for supplier correctness — the RateGain spec turned up six
defects in an adapter built the same way.

---

## Testing a supplier locally

```bash
npm run check
```

Adapters take an `HttpTransport`, so the whole suite runs against recorded
payloads with no network and no mocking library. `src/suppliers/testing/harness.ts`
provides the stub transport, a frozen clock and an instant sleep, so retry and
deadline behaviour is tested without waiting for it.

To exercise a real supplier, construct the adapter with `createFetchTransport`
and real credentials from configuration management. Credentials are never read
from `process.env` inside an adapter and never defaulted to a literal — the
reference shipped a live geocoding key as a `||` fallback in three places.
