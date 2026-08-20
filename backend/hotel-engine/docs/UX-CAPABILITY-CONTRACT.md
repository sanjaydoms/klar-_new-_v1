# KLAR Hotels — Customer Experience & Data Capability Specification

**What KLAR is allowed to say about a hotel, at each stage of the customer's
journey, and the engine predicate that permits it.**

This is a *target-state* specification. It describes the contract the customer
experience is built against, not a snapshot of whichever implementation is live
today. Where today's code differs, that difference is recorded in Part D as a
violation with a required correction — it is never smuggled into Part A as if it
were the target.

Status: Draft 1 · 2026-08-20 · Source of truth for the hotel UX contract.

---

## The governing rule

> **Never render a fact the canonical model reports as `UNKNOWN`, and never
> render an `INDICATIVE` figure using the grammar of a firm price.**

Both halves are mechanically checkable against fields that exist on the wire
today, which is the point. An earlier draft of this rule said "when the model
does not know it with sufficient confidence"; that phrasing was rejected because
"sufficient" is resolved differently by whoever is under deadline, and a rule
that cannot be tested is a rule that decays into a preference.

The rule exists because of a specific, repeated failure. Every money and trust
defect in this system's recorded history was an **existing field read wrongly**,
not a missing field:

- `sellingRate` exists, and is a selling *floor*, not an acquisition cost.
- `taxes[].included` exists, and means "inside the quoted total", not "applicable".
- `categoryCode` exists, and is a string (`"4EST"`), not a number.
- `price` on `bestproperties` exists, and is per-night *or* package — RateGain does not say which.
- `rating` on a TripJack hotel exists, and sometimes holds a review score, not a star count.

Nothing was absent. Everything was misread. That is why Part B carries a
**semantic** column with a citation, and why no cell in this document may state
a meaning it cannot source.

---

## The companion rule: fix the earliest responsible layer

> **Trace a customer-visible claim upstream to the earliest layer that creates
> its semantic meaning. Fix that layer, then guard every downstream
> representation.**

This is not a style preference. It is the finding of the remediation pass that
closed D-0, D-1, D-2, D-3 and D-5, where the reported site was downstream of the
cause **four times out of four**:

| Reported as | Actually created in |
|---|---|
| A guest-rating filter behaving oddly (D-1) | `hotelSearchService` emitting one number under two names |
| A dormant review-score UI (D-2) | the same service assigning `reviewScore` from `starRating` |
| One component parsing a cancellation label (D-3) | five surfaces doing it, one of them the service that *generates* the label |
| One card claiming free Wi-Fi (D-5) | a generator in `rateGainAdapter` inventing amenities from star rating and hotel name |

D-5 is the clearest case for why the rule matters. Those invented amenities were
not merely decorating a card: `facets.service.ts` counts `hotel.amenities` into
`amenityCounts`, so the fabrication had become **search and filter behaviour**.
Removing the card's claim would have left the product wrong and the symptom
hidden.

The path to walk is always the same:

```
supplier → adapter/service transformation → canonical model
        → derived business data (facets, filters, ranking) → UI
```

And the corollary, which cost D-0 a false closure: **a violation fixed at the
site where it was noticed is not closed on the sibling paths that never came
up.** D-0 was recorded as closed on the strength of one component; two other
screens were still rendering the defect, one of them the last screen before
payment.

### The standard a closure has to meet

1. Source traced before editing.
2. Downstream consumers identified — including derived data, not just screens.
3. Fix applied at the earliest responsible layer.
4. Absence left as absence; no fabrication replaced by an explicit negative.
5. A regression test at every layer the claim passes through.
6. **Deliberate reversion probes** — reintroduce the prohibited pattern and
   confirm the suite fails. A guard that has never failed is a comment.
7. This document updated with the *traced* scope, not the reported scope.

Step 6 is what makes the rest enforcement rather than documentation. It has also
repaid itself directly: two D-5 probes passed against the first version of their
guards, because the adapter holds its star rating in a local called `rating` and
because an indirect two-line assignment evaded a per-line check. Both guards were
widened as a result of a probe, not a review.

---

## Status vocabulary

Two independent axes. Do not collapse them.

### Source confidence — how well do we know what a supplier field means?

Applied per supplier, per field. Both suppliers use the same vocabulary; neither
is uniformly "confirmed".

| Value | Meaning |
|---|---|
| `SPEC_CONFIRMED` | Established by a specification document we hold. |
| `ADAPTER_DERIVED` | Established by a working integration, not by a document. Decent evidence; not a spec. |
| `PROVISIONAL` | An explicit assumption recorded in `OPEN-ISSUES`, awaiting a document or a test booking. |
| `NO_CANONICAL_FIELD` | The canonical model has no such field, because no supplier provides it. Document metadata only — **never a runtime enum value**. |

`NO_CANONICAL_FIELD` is deliberately not modelled at runtime. Putting
`guestRating: NOT_APPLICABLE` on every hotel would invite a UI that renders
"Guest rating: not available" on every card, which advertises a hole. Per-instance
`UNKNOWN` handles what varies; schema-level absence handles what never exists.

### Implementation status — can the target rule be built?

| Value | Meaning |
|---|---|
| **A · Buildable** | Implementable against `hotel-engine` contracts as they stand, and consumable by the current frontend without a backend change. |
| **B · Backend gap** | The target behaviour is defined but the engine does not expose the contract yet. |
| **C · Legacy dependency** | The behaviour exists today, but only in `hotel-search-service` / `hotel-booking-service` and needs migration. |

---

## Render predicates

Every guard in Part A cites an **exported predicate**, not a re-spelling of its
condition. A guard written as `isBookable(deal, now)` stays correct when the
definition changes; one written as `allotment != undefined && price > 0 &&
!expired` is stale the moment someone adds a clause — and is already incomplete,
because it omits token expiry.

| Predicate | Module | Answers |
|---|---|---|
| `isKnown(t)` | `domain/shared/tristate.ts` | Is this tristate anything other than `UNKNOWN`? |
| `toOptionalBoolean(t)` | `domain/shared/tristate.ts` | Tristate → `boolean \| undefined` for the legacy DTO. |
| `isBookable(deal, now)` | `domain/deal/supplier-deal.ts` | Token unexpired, price positive, allotment not exhausted. |
| `proceedsWithoutConsent(report)` | `domain/revalidation/revalidation-report.ts` | May this flow continue straight to booking? |
| `isMergeable(c)` | `domain/hotel/match-confidence.ts` | May these supplier properties be merged *internally*? |
| `needsReview(c)` | `domain/hotel/match-confidence.ts` | Does this merge want a human look? |
| `confidenceRank(c)` | `domain/hotel/match-confidence.ts` | Ordering over `MatchConfidence`. |
| `priceGuaranteeFor(attempts)` | `domain/search/result.ts` | `BEST_AVAILABLE` or `PARTIAL`. |
| `hasUsableLocation(p)` | `domain/hotel/canonical-hotel.ts` | Real geocode, or the `[0,0]` sentinel? |
| `refundTierRank(t)` | `domain/rate/cancellation.ts` | Ordering over `RefundTier`. |
| `perNightLines(price)` | `domain/pricing/customer-price.ts` | Nightly split that sums *exactly* to the total. |
| `hasBookableRates(hotel)` | `suppliers/tripjack/response.ts` | Did TripJack return any options for this property? |

---

# PART A — Target UX contract

One table per stage. Each answers only: **what may KLAR honestly say here, and
under what predicate?**

---

## Stage 1 — Search results

The customer is asking *"what hotels might work for me?"* Only search-time facts
belong here.

Two supplier asymmetries govern this entire stage:

- **TripJack** declares `searchReturnsRates: true`. Its listing returns priced
  options, so board, room and price are real — but its listing returns **no
  cancellation block**, so refundability is genuinely `UNKNOWN`.
- **RateGain** declares `searchReturnsRates: false`. `bestproperties` returns
  `rates: []` and one indicative `price` with no rate key. Board, room,
  cancellation and a firm price are all **structurally unavailable** here, not
  merely missing.

| May KLAR say | Render guard | Grammar | Status |
|---|---|---|---|
| Hotel name, address, city | field present | plain | A |
| Star classification | `starRating` present (1–5 only) | `★★★★★` | A |
| Location on a map | `hasUsableLocation(location)` | pin | A |
| Distance from the searched point | `distanceMetres` present | `2.4 km from your search` | A |
| Images | `images.length > 0` | gallery | A |
| Amenities | `amenities.length > 0` | chips — **reported only** | A |
| Firm price | `priceKind === 'BOOKABLE'` | `₹8,100 total` | A |
| Indicative price | `priceKind === 'INDICATIVE'` | `From ₹8,100` | A |
| Meal plan | board present **and** `priceKind === 'BOOKABLE'` | `Breakfast included` | A |
| Refundable | `isRefundable === true` | `Free cancellation` | A |
| Non-refundable | `isRefundable === false` | `Non-refundable` | A |
| Rooms remaining | `allotment !== undefined` | `Only 2 left` | A |
| Incomplete supplier coverage | `priceGuarantee === 'PARTIAL'` | quiet disclosure | A |
| "Also available from N suppliers" | `matchConfidence` ∈ {`EXACT_SUPPLIER_MAPPING`, `HIGH_CONFIDENCE`} | comparison row | **B** |

### Never render at this stage

| Never | Because |
|---|---|
| A cancellation claim when `isRefundable === undefined` | `undefined` means UNKNOWN. TripJack's listing carries no cancellation block; RateGain's search carries no rate at all. |
| A cancellation claim inferred from a display string | Parsing `"FREE CANCELLATION"` out of a label manufactures a fact the tristate exists to withhold. See Part D-3. |
| A meal plan on an `INDICATIVE` card | RateGain's `bestproperties` returns `rates: []`; there is no board to read. |
| A room type | Same reason. A room promise at search is premature for TripJack and impossible for RateGain. |
| `₹8,100 / night` for an `INDICATIVE` price | The spec calls it "Starting price of the hotel (per night or package)". The unit is unknown. |
| Any guest rating, review score or review count | No supplier provides one and there is no canonical field. |
| A "Best available rate" badge | See below. |
| A result count derived from `supplierReportedTotal` | TripJack reports **candidate ids scanned** (~6,179 for Goa, of which ~20 are bookable). Never shown as a count, never summed across suppliers. |

### On completeness claims

`priceGuaranteeFor(attempts)` returns `BEST_AVAILABLE` only when every eligible
supplier answered — suppliers that do not serve the destination, or that an
operator disabled, correctly do not count as gaps.

But read what that proves: *everyone we asked replied*. It does not prove we saw
the market. RateGain is fixed at **ten properties per page**, so "everyone
answered" can still be a thin comparison.

**Therefore the flag is used negatively.** `BEST_AVAILABLE` earns *no badge*.
`PARTIAL` earns a quiet disclosure. KLAR has already settled the wording —
"Best of the suppliers that responded" (`OPEN-ISSUES` §2.3) — and records that
the outstanding work there is copy, not engine.

Generic promotional badges (`Popular`, `Best Value`, `KLAR Choice`) are out of
scope for the initial system: each needs measurable data KLAR does not hold.
Factual descriptors that *are* computable — star classification, distance, price
rank within this result set stated as such — are permitted.

---

## Stage 2 — Hotel details

The customer is asking *"is this hotel right for me?"* This is where the second
supplier call earns its cost: static content and, for two-phase suppliers, the
first bookable rates.

| May KLAR say | Render guard | Status |
|---|---|---|
| Description | `description` present | A |
| Check-in / check-out times | field present | A |
| Hotel policies | `policies.length > 0` | A |
| Merged gallery | `images.length > 0` | A |
| Merged amenities | `amenities.length > 0` | A |
| Which supplier contributed content | `content.sourcedFrom` | A |

Content is merged across suppliers and each image and amenity records its
provenance (`HotelImage.sourcedFrom`, `Amenity.sourcedFrom`), so a page may
attribute a description to whichever supplier's marketing copy it is.

**Amenities are never synthesised.** The reference implementation inferred "Spa"
from a five-star rating and from the word "beach" in a hotel's name, then let
those inventions drive the amenity filter — a customer filtering for a spa was
shown hotels we had guessed had one. Absence of an amenity means *not reported*,
never *not present*, and the UI must not imply the list is complete.

---

## Stage 3 — Room / rate selection

The customer is asking *"which exact offer am I buying?"* Everything on this
screen is a real `SupplierDeal` addressed by an opaque `dealId`.

| May KLAR say | Render guard | Status |
|---|---|---|
| Room name and category | `room` present | A |
| Bed configuration | `room.bedConfig !== undefined` | A |
| Occupancy priced | `occupancy` present | A |
| Board | `board.code !== 'UNKNOWN'` | A |
| Firm total | always at this stage | A |
| Nightly split | `perNightLines(price)` | A |
| Taxes and fees | `taxesAndFees` (derived, never summed) | A |
| Full price breakdown | `breakdown[]` | A |
| Cancellation policy | `refundTierRank(tier) > 0` | A |
| Free-cancellation deadline | `freeUntil !== null` | A |
| Rooms remaining | `allotment !== undefined` | A |
| Hold / pay-later | `onHoldAllowed === true` | A |
| Compared across suppliers | `matchConfidence` ∈ {`EXACT_SUPPLIER_MAPPING`, `HIGH_CONFIDENCE`} | **B** |

### Rules specific to this stage

**Rows are equivalence classes, not supplier groupings.** A `RoomProduct` is one
room, one board, one refund tier, one occupancy. The reference grouped TripJack's
options by room name, which put a refundable and a non-refundable rate for the
same room in one bucket and let the cheaper one represent both.

**`rateStatus === 'RECHECK'` must not be rendered with the finality of
`BOOKABLE`.** The supplier itself is saying this rate needs re-pricing before it
can be committed. That is advance warning that Stage 5 is coming, available
before the customer commits to it.

**`rateStatus === 'UNAVAILABLE'` is not selectable inventory.**

**The cheapest cost is not always the cheapest price.** `priceFromCost()` raises
a price to meet a mandatory minimum selling price and records the gap as an
`MSP_UPLIFT` breakdown line. So the featured deal can flip between suppliers for
reasons that have nothing to do with the hotel. This is correct behaviour, not a
bug to design around.

**Bed configuration is optional and supplier-dependent.** Do not design a layout
that requires it to be present.

**`MIXED` room category is real.** TripJack's `CRSM`/`CRCM` options bundle
differing rooms or meal plans into one offer. They are labelled "Mixed rooms" and
kept out of equivalence classes they do not belong in — the UI must not present
one as a single room type.

### The time axis

`RateTokenRef` carries `expiresAt`, and both suppliers declare
`rateValidityMs: 15 * 60 * 1000` — **fifteen minutes**. A room list has a shelf
life, and the customer who deliberates past it is holding a deal that can no
longer be acted upon.

This is a *pre-revalidation* concern and must be handled client-side:

> **Before revalidation:** is this displayed deal still eligible to be acted
> upon? — `isBookable(deal, now)`
>
> **After revalidation:** what did the supplier say when we checked? —
> `RevalidationStatus`

Do not wait for the backend to answer this. Revalidation reports an expired deal
as `DEAL_NOT_FOUND`, and expired-versus-never-existed is **indistinguishable by
design**, so the backend cannot honestly tell the customer "your rate expired".
Refresh or warn before the token lapses; otherwise every slow customer is bounced
to search with no explanation available.

---

## Stage 4 — First firm price

**This is not a price-change screen.** It is the transition from an indicative
lead-in to a real quote, and for RateGain it is the *normal* path, not an
exception.

```
From ₹8,100          (priceKind === 'INDICATIVE')
      ↓  customer opens the hotel
   getproducts
      ↓
₹8,450 total          (priceKind === 'BOOKABLE')
```

| Situation | Grammar |
|---|---|
| Indicative → bookable, any direction | "Your price for these dates" |
| Indicative → no bookable rate at all | "This one isn't available for your dates" — see below |

**Never render this as a price increase.** There was never a firm ₹8,100 to lose.
Presenting a first real quote as a rise manufactures a price change out of KLAR's
own hedge and trains customers to distrust the `From` figure. KLAR has already
settled that indicative prices are shown as "from ₹X" and never as a firm price
(`OPEN-ISSUES` §2.4).

`priceKind` is the discriminator between this stage and Stage 5. That is its
second job.

### Inventory unavailable

A distinct state, and for RateGain a normal outcome: the lead-in price was real,
and `getproducts` returns nothing bookable for these dates.

This is neither Stage 4 nor Stage 5. It is *"this offer is no longer available"*
plus currently available alternatives. Rendering it as a failure, or as a price
change, reads as bait-and-switch for what is ordinary two-phase supplier
behaviour.

---

## Stage 5 — Revalidation change

Only reached when a **previously firm** quote changed and the customer's consent
is required. `RevalidationStatus` has four values and only one of them carries an
outcome; the flow has five branches, not two.

| Status | Consent | What the customer sees |
|---|---|---|
| `REVALIDATED` · `proceedsWithoutConsent(report)` true | — | Continue silently. **A decrease is passed on** without asking. |
| `REVALIDATED` · `requiresConsent` true | required | Explain what changed, then confirm |
| `DEAL_NOT_FOUND` | — | Return to search. Do **not** say "your rate expired" |
| `SUPPLIER_UNAVAILABLE` | — | Offer retry. This is transient, **not** sold out |
| `INCOMPLETE` | — | Block booking |

`INCOMPLETE` means the supplier says the rate is available but quoted no price.
It blocks deliberately: there is nothing to charge and nothing to compare, and
treating a missing price as "unchanged" would bill the customer the old number on
a supplier's say-so it never gave.

### The `unverified` list

`RevalidationReport.unverified` is typed `('room' | 'board' | 'cancellation')[]`
— dimensions the supplier did not describe, reported rather than assumed equal.

**A consent screen may not state "Room: Same" for a dimension in `unverified`.**
It was not compared. Three specific fallbacks are needed, not one generic
reassurance — a precheck that quietly treats an unstated room as the expected one
is exactly how a customer approves a price for a room that silently changed.

### Consent is required for

A price that rose beyond tolerance · a room, board or cancellation substitution ·
anything that could not be verified. Never for a decrease.

---

## Stage 6 — Checkout

**Specification basis:** target contract. **Status: partially served.**

The customer is giving KLAR exactly what this deal needs to be booked.

**The form is generated from the selected deal, not from the hotel.**

```
Hotel → Room → Deal → deal.compliance → checkout form
```

not

```
Hotel → generic hotel checkout form
```

`SupplierDeal.compliance` carries `{ panRequired, passportRequired, gstType }`
per deal. It cannot be read at hotel-detail time, which rules out the tempting
optimisation of preparing the form early.

| Requirement | Guard | Status |
|---|---|---|
| Lead guest, guest details, contact | always | A |
| PAN | `compliance.panRequired === true` | A |
| Passport | `compliance.passportRequired === true` | A |
| GST details | `compliance.gstType !== undefined` | A |
| Special requests | supplier support | C |
| Nationality | **required, never inferred** | A |
| Payment | — | **B** |

**Nationality is required and must never be defaulted.** It changes both price
and availability, and RateGain sends it on the reservation envelope. An adapter
that defaults it silently re-prices the stay for a different traveller than the
one who searched — the compiler now enforces it at every call site.

**Guest lists are validated before anything is sent.** A guest list that does not
fill the occupancy that was priced, or that names no primary guest, is refused
**with nothing sent to the supplier**. An adapter may not invent a traveller.

### Not yet served by `hotel-engine`

> **Payment.** The engine deliberately wires a refusing payment gateway, so every
> commit declines at the charge.
> **Currently served by:** `hotel-booking-service` (`PaymentUtil`, `WalletUtil`).
> **Target engine support:** payment gateway contract not implemented.

---

## Stage 7 — Booking processing & confirmation

**Specification basis:** target contract. **Status: partially served.**

```
SUBMITTED
    ↓
CONFIRMED  ·  PENDING  ·  REFUSED
```

**`PENDING` is not `FAILED`, and the distinction must exist visually and
operationally.**

TripJack declares `asyncBooking: true`: book returns an order that confirms
within roughly 180 seconds, polled every 5. RateGain declares `asyncBooking:
false`. So a pending state is not an edge case to hide behind a spinner — it is a
designed screen for one of the two live suppliers.

The engine's rule, enforced by the contract suite: **a commit whose outcome is
unknown is sent once and reported `PENDING`, never `FAILED`.** A timeout has very
often been received; retrying books the room twice, and reporting failure refunds
a booking that exists. Only a definite refusal is `FAILED`. A commit that returns
no confirmation number is also `PENDING` — a booking we cannot reference is one
we cannot cancel, and reconciliation must see it.

| State | Customer message | Status |
|---|---|---|
| `CONFIRMED` | Booking reference, voucher, full detail | C |
| `PENDING` | "We're confirming your booking" — received, supplier still processing, we will update | **B** |
| `REFUSED` | Could not be confirmed, with next action | **B** |

**Never show "Booking failed — refund initiated" when the supplier state is
unknown.**

### Not yet served by `hotel-engine`

> **Confirmation email and voucher PDF.**
> **Currently served by:** `hotel-booking-service`
> (`notificationService.sendBookingConfirmation`, `pdfmake` vouchers).
> **Target engine support:** neither dependency exists in the engine.

---

## Stage 8 — Manage booking

**Specification basis:** target contract. **Status: NOT YET SERVED BY
`hotel-engine`.**

> **Target definition required. The engine has no amend concept — this is an
> absent model, not a missing route.**

Supplier capability differs sharply and is declared, not assumed:

| Capability | TripJack | RateGain |
|---|---|---|
| `supportsAmendment` | `true` | `false` — `modificationPolicies.modification` is reported, but there is no amend endpoint |
| `supportsHold` | `true` | `false` |
| `asyncBooking` | `true` | `false` |

Existing old-service behaviour — amend, refund, special requests, pricing
summary, voucher — is documented here as **legacy behaviour**, not adopted as the
target contract. The future amend model is deliberately **not invented** to make
this stage look complete.

Cancellation is the one flow with real backing on both sides: a supplier that
declares no hold support **refuses** a hold rather than committing, and cancel
carries forward the supplier state it needs (RateGain's `CancelReservation`
requires `ReservationId`, `PropertyId` and `PropertyCode` alongside the
confirmation number — losing them leaves a booking that can be made and not
unmade).

---

# PART B — Field provenance

One row per customer-facing field. `TJ` = TripJack, `RG` = RateGain.

**Citation discipline:** every semantic claim cites its source. Where
verification is incomplete the cell reads *uncited* — it is never guessed. A
document that invented its own provenance would repeat the exact failure it
exists to prevent.

## Hotel identity and content

| Field | TJ basis | RG basis | Canonical field / type | Semantic | Evidence | Guard | TJ status | RG status |
|---|---|---|---|---|---|---|---|---|
| Hotel name | `name` / `hotelName` | `name` | `CanonicalHotel.name` · `string` | Display name; `normalizedName` is the match input | `domain/hotel/canonical-hotel.ts` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| KLAR hotel id | — | — | `klarHotelId` · `KlarHotelId` | KLAR's own identity. Minted `KLAR-<uuid>` | ADR-0001 | always | — | — |
| Supplier hotel id | `tjHotelId`/`hotelId`/`id`/`hid` | `PropertyId` | `SupplierPropertyMapping.supplierHotelId` | Internal only. Never customer-facing | `suppliers/contract/dto.ts` | never render | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Address | `address` | `address` | `CanonicalHotel.address` · `string?` | — | `suppliers/*/response.ts` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| City | `city` | `city` | `CanonicalHotel.city` · `string?` | — | `suppliers/*/response.ts` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Country | `country`/`countryName` | `country` | `countryCode` · `CountryCode?` | **ISO-2 only.** A country *name* is a display string and is not accepted here | `suppliers/tripjack/response.ts` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Geo location | `latitude`/`longitude` | `latitude`/`longitude` | `location` · `GeoPoint?` | `[0,0]` is a "no geocode" sentinel, not a coordinate | `hasUsableLocation`, `domain/hotel/canonical-hotel.ts` | `hasUsableLocation(p)` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Star classification | `rating`/`starRating` | `categoryCode` | `starRating` · `number?` | **TJ:** the same field shape also holds review scores; bounded to 1–5 or dropped. **RG:** a *string* (`"5S"`, `"4EST"`, `"4 Star Hotel"`) — reading it numerically loses the rating | `starRatingOf()` in `suppliers/tripjack/response.ts`; `OPEN-ISSUES` §1.5 C-3; `SUPPLIERS.md` RateGain | `1 ≤ star ≤ 5` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Property type | `accTypeDesc`, `accMultiDesc`, `accomodationType`, name | *uncited* | `propertyType` · `PropertyType?` | Classified into a closed 12-value vocabulary | `classifyPropertyType()` | present | ADAPTER_DERIVED | *uncited* |
| Chain / brand | `chainCode` | `BrandCode` | `chainCode`, `brand` · `string?` | **Never a match signal on its own** — a chain code identifies a brand, so matching on it merges every hotel of a chain | ADR-0001; `OPEN-ISSUES` §1.4 B-2; `domain/hotel/matching.test.ts` | internal | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Hotel images | `images` / `img` | `images` | `HotelImage[]` | Absolute URLs only; bare filenames resolved at ingest. Carries `sourcedFrom` for merged galleries | `suppliers/common/images.ts` | `length > 0` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Amenities | `amenities` | `amenities` | `Amenity[]` | **Reported only.** Adapters may not synthesise from star rating or hotel name | `canonical-hotel.ts`; `OPEN-ISSUES` D-18 | `length > 0` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Description | `descriptions.default` (static-detail) | `getproducts` | `HotelContent.description` · `string?` | Detail call only — absent from search | `toStaticDetail()`; `compat/legacy-products.ts` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Check-in time | `hotelInfo.checkInTime`/`checkIn` | `getproducts` | `HotelContent.checkInTime` · `string?` | Detail call only | `toStaticDetail()` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Check-out time | `hotelInfo.checkOutTime`/`checkOut` | `getproducts` | `HotelContent.checkOutTime` · `string?` | Detail call only | `toStaticDetail()` | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Hotel policies | `policies` / `hotelInfo.policies` | `getproducts` | `HotelContent.policies` · `string[]` | Free text, supplier-worded | `toStaticDetail()` | `length > 0` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| **Guest rating** | — | — | — | **No supplier provides one. No canonical field exists.** No neutral content source is licensed (ADR-0000 §7) | ADR-0000 §7; `OPEN-ISSUES` §1.6 D-3 | **never render** | `NO_CANONICAL_FIELD` | `NO_CANONICAL_FIELD` |
| **Review count / score** | — | — | — | As above | as above | **never render** | `NO_CANONICAL_FIELD` | `NO_CANONICAL_FIELD` |
| **Room images** | — | — | — | `Room` carries name, category, code, bedConfig, maxOccupancy — no images. Galleries are hotel-level | `domain/rate/room.ts` | **never render** | `NO_CANONICAL_FIELD` | `NO_CANONICAL_FIELD` |
| **Child / extra-bed policy** | — | — | — | Not modelled. Child *ages* are carried on occupancy; a policy is not | `domain/rate/occupancy.ts` | **never render** | `NO_CANONICAL_FIELD` | `NO_CANONICAL_FIELD` |
| External ids (GIATA etc.) | — | — | `externalIds` · `Record<string,string>?` | Reserved, not used. Populating it activates match tier 2 with no model change | ADR-0000 §7; ADR-0001 | internal | `NO_CANONICAL_FIELD` | `NO_CANONICAL_FIELD` |

## Room and rate

| Field | TJ basis | RG basis | Canonical field / type | Semantic | Evidence | Guard | TJ status | RG status |
|---|---|---|---|---|---|---|---|---|
| Room name | `roomInfo[0].name` / `roomName` | **`products[].name`** | `Room.name` · `string` | **RG: the name is on the product, not the rate.** Reading it off the rate names every room "Room" | `SUPPLIERS.md` RateGain §Booking | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Room category | derived from name | derived from name | `RoomCategory` · 11-value enum | A bucket, not a parse. `UNKNOWN` when no keyword matches | `classifyRoom()`, `domain/rate/room.ts` | `!== 'UNKNOWN'` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Room code | `roomInfo[0].id` | **two disjoint spaces** | `Room.code` · `string?` | **RG: `products[].roomCode` is `"483146225"`; reservation endpoints return `"DBL.ST"`. They never match** — comparing them reported ROOM_CHANGED on every RateGain booking | `SUPPLIERS.md` RateGain §Booking | internal | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Bed configuration | `roomInfo[0].bed_config` | *uncited* | `Room.bedConfig` · `string?` | Optional, supplier-dependent | `suppliers/tripjack/response.ts` | `!== undefined` | ADAPTER_DERIVED | *uncited* |
| Occupancy priced | `roomInfo[].numberOfAdults`, `childAge` | not echoed | `Occupancy` | **Never defaulted.** TJ falls back to the *requested* occupancy when it does not say; RG does not echo it | `optionOccupancy()`; `OPEN-ISSUES` §1.5 C-5 | present | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Board / meal plan | `roomInfo[].mealBasis` / `mealBasis` | `boardName`/`boardCode` on **products** | `Board` · `{code: BoardCode, label}` | Closed 6-value set. **Not available from RG search** — `bestproperties` returns `rates: []` | `classifyBoard()`; `toSearchHotel()`; `SUPPLIERS.md` RateGain | `code !== 'UNKNOWN'` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Mixed-room bundles | `optionType` `CRSM`/`CRCM` | — | `RoomCategory.MIXED` | One offer bundling differing rooms or meal plans. Kept out of equivalence classes | `suppliers/tripjack/response.ts` | `category === 'MIXED'` | ADAPTER_DERIVED | — |
| Refundable | `cancellation.isRefundable` (explicit) | derived from windows | `CancellationTerms.refundable` · `Tristate` | **TJ listing returns no cancellation block → `UNKNOWN`.** An explicit supplier flag beats inference from windows | `deriveCancellationTerms()`; `SUPPLIERS.md` TripJack | `isKnown(t)` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Refund tier | as above | as above | `RefundTier` · 4-value enum | `PARTIALLY_REFUNDABLE` is a distinct product, not a rounding of the other two | `domain/rate/cancellation.ts` | `refundTierRank(t) > 0` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Free-cancellation deadline | `cancellation.penalties[].fromDate`/`from`/`startDate` | `cancellationPolicies[].from` | `freeUntil` · `string \| null` | **RG sends two spellings of one deadline:** `"2026-09-05 00:00:00"` from `getproducts`, `"...T00:00:00+05:30"` from reservation endpoints. Naive form read as IST | `SUPPLIERS.md` RateGain; **`OPEN-ISSUES` §3.2 (E-8) — zone unconfirmed** | `!== null` | ADAPTER_DERIVED | **PROVISIONAL** |
| Cancellation windows | `penalties[]` | `cancellationPolicies[]` | `CancellationWindow[]` | Sorted; each is "cancel from here and this penalty applies" | `domain/rate/cancellation.ts` | `length > 0` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Rate status | *uncited* | `rateType` | `rateStatus` · `BOOKABLE \| RECHECK \| UNAVAILABLE` | `RECHECK` must be re-priced before commit | `SUPPLIERS.md` RateGain | `=== 'BOOKABLE'` | *uncited* | SPEC_CONFIRMED |
| Allotment | `allotment`/`availableRooms` | *uncited* | `allotment` · `number?` | Optional. **Drives urgency messaging only** | `domain/deal/supplier-deal.ts` | `!== undefined` | ADAPTER_DERIVED | *uncited* |
| On-hold allowed | `option.onHoldAllowed` / `cancellation.onHoldAllowed` | `supportsHold: false` | `onHoldAllowed` · `boolean` | A supplier declaring no hold support **refuses** a hold rather than committing | `suppliers/*/config.ts`; contract suite | `=== true` | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Compliance | `compliance.panRequired`, `passportRequired`, `gstType` | *uncited* | `compliance` · object | **Per deal**, not per hotel. Drives the checkout form | `domain/deal/supplier-deal.ts` | field true | ADAPTER_DERIVED | *uncited* |

## Money

| Field | TJ basis | RG basis | Canonical field / type | Semantic | Evidence | Guard | TJ status | RG status |
|---|---|---|---|---|---|---|---|---|
| Supplier cost total | `totalPrice`/`tp`/`total` | `totalPrice` / `totalNet` | `SupplierCost.total` · `Money` | **TJ: the total is authoritative and the base is derived from it** — the total is what TripJack invoices and what cancellation liability is measured against | `toSupplierCost()`; `SUPPLIERS.md` TripJack; `OPEN-ISSUES` §1.5 | internal | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Excluded taxes / fees | n/a (all-in) | `taxes[].included`, `Fees[].Included` | folded into `SupplierCost` | **RG: `included` means "inside the total". Anything `false` is payable on top.** `payable = totalPrice + excludedTaxes + excludedFees` | `SUPPLIERS.md` RateGain; `OPEN-ISSUES` §1.2, §1.4 B-5 | internal | — | SPEC_CONFIRMED |
| Multi-currency tax repetition | — | `taxes[]` repeats per currency | — | Only entries in the requested currency count. Summing both double-charges | `SUPPLIERS.md` RateGain | internal | — | SPEC_CONFIRMED |
| Customer total | — | — | `CustomerPrice.total` · `Money` | **The only comparable figure.** Two identities asserted: breakdown sums to total; `displayBase + taxesAndFees === total` | `domain/pricing/customer-price.ts`; `customer-price.test.ts` | always | — | — |
| Display base | — | — | `displayBase` · `Money` | Room cost as shown. Margins folded in | as above | always | — | — |
| Taxes and fees | — | — | `taxesAndFees` · `Money` | **Derived, never summed.** Summing per-screen is how the B2C margin vanished between card and review page | as above | always | — | — |
| Per-night | — | — | `perNight` · `Money` | **Indicative — rounded.** Use `perNightLines()` wherever the split must reconcile with the total | `customer-price.ts`; `money.test.ts` | display only | — | — |
| Price breakdown | — | — | `PriceLine[]` · 8-value `PriceLineKind` | Includes `MSP_UPLIFT` | `customer-price.ts` | `length > 0` | — | — |
| Currency | `pricing.currency` | requested currency | `CurrencyCode` | Minor-unit exponent is per-currency; never hardcode ×100 | `domain/shared/money.ts`; `OPEN-ISSUES` §1.6 D-4 | always | ADAPTER_DERIVED | SPEC_CONFIRMED |
| Minimum selling price | — | `sellingRate` + `isMandatory` | `MinimumSellingPrice` | **A selling floor, not a cost.** "Partner must sell at or above the MSP". Kept out of `SupplierCost`; enforced by raising the price | `SUPPLIERS.md` RateGain; ADR-0002; `customer-price.ts` | internal | — | SPEC_CONFIRMED |
| Commission | — | `CommissionAmt` / `CommissionPct` | on `SupplierCost` | B2C commissionable model. Recorded as revenue | `SUPPLIERS.md` RateGain | never render | — | SPEC_CONFIRMED |
| Indicative price | — | `price` on `bestproperties` | `indicativeCost` → `PriceKind` | **"Starting price of the hotel (per night or package)" — the unit is ambiguous and RateGain does not say.** Never bookable | `toIndicativeCost()`; `SUPPLIERS.md` RateGain | `priceKind === 'INDICATIVE'` | — | SPEC_CONFIRMED |
| **Is `totalPrice` genuinely all-in?** | assumed yes | n/a | — | If wrong, a resort-fee equivalent charged at the hotel is missing from the quote | **`OPEN-ISSUES` §3.1c — open** | — | **PROVISIONAL** | — |

## Comparison and identity metadata

| Field | Canonical field / type | Semantic | Evidence | Guard | Status |
|---|---|---|---|---|---|
| Price kind | `PriceKind` · `BOOKABLE \| INDICATIVE` | Whether the headline figure is one we can honour | `domain/search/result.ts`; `OPEN-ISSUES` §2.4 | `=== 'INDICATIVE'` | A |
| Price guarantee | `PriceGuarantee` · `BEST_AVAILABLE \| PARTIAL` | **Every eligible supplier answered** — not "we saw the market" | `priceGuaranteeFor()`; `OPEN-ISSUES` §2.3 | `=== 'PARTIAL'` → disclose | A |
| Compared across | `HotelComparison.comparedAcross` | Suppliers that returned a usable deal | `domain/search/result.ts` | — | A |
| Incomplete suppliers | `HotelComparison.incompleteSuppliers` | Eligible suppliers that did not answer. `DISABLED`/`NOT_ELIGIBLE` correctly excluded | `incompleteSuppliers()` | — | A |
| Match confidence | `MatchConfidence` · 5-value enum | **Weakest** among merged properties — reporting the best would let one confident supplier launder an uncertain one | `weakest()`, `domain/hotel/match-confidence.ts`; ADR-0001 | comparison UI ≥ `HIGH_CONFIDENCE` | **B** |
| Match signals | `MatchSignal[]` | **Two independent signals minimum.** Coordinates alone never merge; a name alone never merges | `MIN_INDEPENDENT_SIGNALS`; `matching.test.ts` | internal | A |
| Deal id | `DealId` | Opaque handle. Rate key, session id, review hash sealed server-side | ADR-0004; `domain/deal/supplier-deal.ts` | always | A |
| Token expiry | `RateTokenRef.expiresAt` | **15 minutes** (`rateValidityMs`) for both suppliers | `suppliers/*/config.ts` | `isBookable(deal, now)` | A |
| Equivalence key | `RoomProduct.key` | One room, one board, one refund tier, one occupancy | `domain/deal/equivalence.ts`; ADR-0002 | — | A |
| Supplier reported total | `SupplierPageInfo.supplierReportedTotal` | **TJ reports candidate ids scanned, RG a real property count.** Never a result count, never summed | `suppliers/contract/dto.ts`; `SUPPLIERS.md` TripJack | **never render** | A |
| Revalidation status | `RevalidationStatus` · 4 values | Only `REVALIDATED` carries an outcome | `revalidation-report.ts` | see Stage 5 | A |
| Unverified dimensions | `unverified` · `('room'\|'board'\|'cancellation')[]` | Not compared. **Never rendered as "Same"** | `revalidation-report.ts` | `length === 0` to claim equality | A |

---

# PART C — Implementation status

## The headline

**For Stages 1–5, the current wire contract already carries essentially the whole
target UX.** The compat layer ships canonical fields alongside the legacy ones
from day one, explicitly so the frontend can migrate field by field rather than
in one release.

On the wire today (`compat/legacy-search.ts`, `compat/legacy-products.ts`):

`klarHotelId` · `dealId` · `deals[]` · `priceKind` · `comparison{}` ·
`priceGuarantee` · `incompleteSuppliers` · `allotment` · `onHoldAllowed` ·
`equivalenceKey` · `offeredBy` · `isRefundable` as genuinely optional

So the `INDICATIVE`/`BOOKABLE` grammar rule, the `PARTIAL` disclosure, the
allotment rule and the hold-CTA gate are all **A · Buildable** — implementable
without a backend change.

## B · Backend gap

| Target rule | Gap | Size |
|---|---|---|
| Suppress cross-supplier comparison below `HIGH_CONFIDENCE` (Stages 1, 3) | **`matchConfidence` is not emitted by the compat layer.** It lives on `MergedHotel` but is not part of `HotelComparison`, and `LegacyHotel` does not carry it | One field added to an existing block |
| Payment (Stage 6) | Engine wires a refusing payment gateway | Contract not implemented |
| `PENDING` / `REFUSED` booking states (Stage 7) | Engine has no notification or voucher path | Two dependencies absent |

`matchConfidence` is the **only** new rule in Stages 1–5 requiring a backend
change.

## C · Legacy dependency

| Behaviour | Currently served by | Target |
|---|---|---|
| Payment and wallet | `hotel-booking-service` (`PaymentUtil`, `WalletUtil`) | Engine payment contract |
| Confirmation email | `hotel-booking-service` (`notificationService`) | Engine notification port |
| Voucher PDF | `hotel-booking-service` (`pdfmake`) | Engine document port |
| Amend | `hotel-booking-service` only | **Model required before migration** |
| Refund | `hotel-booking-service` (`cancellationRefund.util.ts`) | Target contract TBD |
| Special requests | `hotel-booking-service` | Target contract TBD |
| Live bookings | Mongo `Booking` collection | No migration path exists (catalogue backfill does) |

The engine also does not serve roughly seventeen routes the old pair does —
destinations, geo, sync, amend, refund, special-requests, pricing-summary,
`bookings/check/:email`.

---

# PART D — Violations

Current implementation measured against Part A. **The violation list is the
migration backlog.**

## Active

Only one remains, and it is a migration dependency rather than a correctness
defect.

### D-4 · Supplier identity reaches the frontend

**Current:** `LegacyHotel.source` and `hotelId: "TJ:123"` / `"RG:ChIJ..."`.

**Target:** supplier-neutral DTO; the client addresses hotels by `klarHotelId`
and deals by `dealId`.

**Impact:** low and bounded. This is **temporarily intentional** — the compat
layer emits both deliberately because the frontend routes on the old ids, and
`klarHotelId` ships alongside precisely so the migration is incremental. The
layer's own doc comment records the expiry condition: *deleted when the last
legacy reader is gone*.

**Correction:** migrate consumers to `klarHotelId` / `dealId`, then delete. A
scheduled deletion with a defined path, not an open design question.

---

## Closed

Kept in this document with their evidence. A violations list showing only open
items reads as a backlog; one that shows violations caught and closed shows the
rule doing its job — and is the concrete precedent for D-3 and D-5 beside them.

### D-5 · Amenities synthesised from the star rating and the hotel name — **CLOSED**

**Scope was expanded during remediation**, for the third time and in the same
direction. The entry named one expression in `HotelCard`. The card was the
symptom; the source was a **live generator in the RateGain adapter**.

**Was:** `hotel-search-service/src/adapters/rateGainAdapter.ts` filled every
empty amenity list with a guess, at two call sites:

```
starRating >= 5          → Swimming Pool, Fitness Center, Spa, Restaurant, Bar
starRating >= 4          → Swimming Pool, Fitness Center, Restaurant
starRating >= 3          → Restaurant, 24-hour Front Desk
otherwise                → 24-hour Front Desk
name contains "beach"    → Swimming Pool, Spa
name contains "airport"  → Free Parking
```

Downstream this is indistinguishable from a supplier's own list, and
`facets.service.ts` counts `hotel.amenities` into `amenityCounts` — so the
inventions became amenity **filter options**. A customer who filtered for a spa
was shown hotels we had guessed had one. This is the defect Stage 2 of this
contract cites from the reference implementation, still live in the service the
frontend actually calls.

`tripJackAdapter` held a **character-for-character twin**, `getTJFallbackAmenities`,
already bypassed at its call site and left in the file — a fix applied to one
supplier and not the other, waiting to be re-wired.

On the customer side the card rendered **"Free Wi Fi"** for any hotel with a star
rating, and **"Flexible Booking"** for every hotel unconditionally — the latter
sitting directly above the "✕ Non-Refundable" badge on the same card,
contradicting it.

**Fixed:** both generators deleted; `Array.isArray(bh.amenities) ? bh.amenities : []`
at each call site, so an empty list stays empty. Both fabricated card claims
removed. "Secure Payments" stays — it is a statement about KLAR's checkout, not
about the property.

**Absence stayed absence.** No explicit negative was introduced: a hotel that
reported no Wi-Fi is not a hotel without Wi-Fi, and the UI now says nothing
either way.

**Checked and found clean** — recorded because a checked assumption is worth as
much as a fixed bug: `extractFeatures` filters *reported* amenities rather than
inventing any; the review page's amenity badges were already empty stubs; and
`HotelDetailPage`'s `fallbackAm` falls back to the hotel's own reported list,
which is a legitimate re-use of real data.

**Noted, not fixed:** `RoomTypeGroup`'s `fallbackAmenities` prop has no caller,
so its room-level fallback to hotel-level amenities is inert. Dead flexibility,
not a live claim.

**Remains true because:** guards on both sides of the wire.
`hotel-search-service/src/adapters/amenities.test.ts` bans a fallback generator,
amenity literals, and any assignment to an `*amenities` identifier that mentions
a rating or a name — plus `lowerName`, `name.includes(...)` and
`name.toLowerCase()` outright, since a hotel's name is display text and never a
source of facts. `supplierNeutrality.test.ts` bans hardcoded amenity claims on
every customer-facing surface and bans gating any facility on the star rating.
**Nine reversion probes ran across both services and every one failed the
suite** — including two that initially slipped through and drove the guards to
be widened.

---

### D-0 · `undefined` refundability falling through to `false` — **CLOSED**

**Was:** the reference rendered `isRefundable ? … : 'Non-Refundable'`, turning
"no supplier signal" into a false "Non-Refundable" on every card.

**Fixed on both sides:**

- **Backend:** `CancellationTerms.refundable` is a `Tristate`, so there is no
  boolean to read past. The compat layer *omits* `isRefundable` rather than
  emitting `false` when the tier is `UNKNOWN`, and `legacy-search.ts` documents
  the requirement: *"`undefined` means UNKNOWN and must stay undefined."*
- **Frontend:** `HotelCard.tsx` checks `isRefundable === false` explicitly, with
  a comment naming the cause: *"RateGain hotels don't provide cancellation
  policies at search time, so don't show static Non-Refundable."*

**Correction to an earlier draft of this entry.** This was recorded as closed on
the strength of the backend tristate and the card's explicit `=== false` check.
Tracing D-3 found it **still live on two screens**: `HotelDetailPage` and
`HotelReviewBooking` derived the negative as `!isFreeCancel`, so the badge
condition `(isRefPolicy || isNonRefPolicy)` was *always true* and every UNKNOWN
rate rendered a hard "Non Refundable" — through to the payment step. UNKNOWN is
the common case on those paths, not a rare one.

The lesson is the same one D-2 recorded: a defect closed at the site where it was
noticed is not closed on the sibling paths that never came up. Closing a
violation should mean tracing every consumer, not fixing the reported one.

**Now genuinely closed** by the shared resolver introduced for D-3: the negative
requires `NON_REFUNDABLE`, which requires either an explicit `false` or policies
that actually price a charge. Guarded by a test banning `isNonRef… = !…`.

---

### D-3 · Refundability inferred from display strings — **CLOSED**

**Scope was expanded during remediation**, on the same lesson as D-2: the entry
named one file, and tracing the path found the pattern on **five** surfaces —
card, room list, detail page, review-and-pay screen, and the search service
itself.

**Was:** every surface derived refundability by reading back a display label
*this codebase generates* from structured policy data:

```
HotelCard           cancellationPolicy.toUpperCase().includes('FREE CANCELLATION')
HotelDetailPage     the same, twice
HotelReviewBooking  the same, on the screen before payment
RoomTypeGroup       !/non[-\s]?refundable/i.test(refundableLabel)
hotelSearchService  policy.toUpperCase().includes('NON-REFUNDABLE')
```

Reading the label back closes a loop and lets a supplier's wording decide a
contractual fact. RoomTypeGroup's variant was the worst: any label without the
exact phrase "non-refundable" was declared **free cancellation**, so
*"Cancellation charges apply from 5 Sep"* rendered as a free-cancellation
promise.

`getCancellationPolicyString` also returned the literal `'Non-Refundable'` when
a policy array was present but no amount parsed — inventing the harshest reading
of a payload we had failed to understand. It now returns `null`.

**Fixed:** one `resolveRefundability()` in `utils/hotelUtils.ts`, three-valued,
with the label not reachable as an input. Every surface routes through it.

**Remains true because:** guards ban uppercased label-sniffing, the phrase
"free cancellation" inside any `includes(...)`, `NFR`, and a regex over
`refundableLabel`; require each surface to *call* the resolver rather than merely
import it; and assert the resolver's three-valued type and that it never mentions
a label. Eight reversion probes were run and the suite failed on every one.

---

### D-1 · The guest-rating filter answered a different question — **CLOSED**

**Was:** `HotelSearchPage.tsx` filtered on
`const rating = hotel.rating || hotel.starRating || 0`. The `userRatings`
control did not fail — it silently answered a different question and appeared to
work. A customer filtering "Excellent: 4.5+" received a star-rating filter
wearing guest-review vocabulary.

**Fixed:** the control, its state, its chips and its local filter are removed
across `HotelFilters.tsx`, `hotelTypes.ts` and `HotelSearchPage.tsx`. The
initial and reset filter-state literals were also made symmetric — they had
drifted a second time, with `priceRanges` present only in the reset — so a
filter can no longer have one shape on first load and another after "Clear all".

**Remains true because:** three guards in
`features/hotels/__tests__/supplierNeutrality.test.ts` — no `userRating` token
on any hotel surface, and a key-set comparison of the two filter-state literals
that fails if either drifts in either direction.

---

### D-2 · The star / review-score conflation — **CLOSED**

**Scope was expanded during remediation.** This entry was written from two
visible UI locations. Tracing the data flow — source → transformation → DTO →
component — found **fourteen call sites across nine files**, and the root was
not in the UI at all: `hotelSearchService` was manufacturing the review score
from the star rating before either component saw it.

Recorded because it generalises. The first visible rendering site is where a
defect is *noticed*, not where it lives. Investigate a violation along the whole
path or the fix lands on a symptom and the cause keeps feeding it — which is
exactly how D-0 came to be half-fixed, and why D-3 sits open beside it.

**Was:** `rating` and `starRating` were separate fields carrying the same 1–5
scale, so a `rating || starRating` fallback grew between them at **fourteen call
sites** across nine files. `hotelSearchService` then fed the result into
`reviewScore`:

```ts
reviewScore: hotel.reviewScore ?? hotel.rating ?? hotel.starRating ?? 0
```

so every hotel arrived carrying a review score equal to its star count, and the
card held a complete 0–10 review pathway — bands, labels, MMT-style colours —
waiting to render it. A five-star hotel scored 5 on a 0–10 scale renders as
**"Fair"**.

Two further inventions rode the same variable: `{rating || 5} Star` on the card
and on the review-and-pay screen, and `|| 'New'` on the map pin — a hotel with
no star classification shown as five-star on the screen immediately before
payment.

**Fixed:** the `rating` property is retired. `starRating` is the only field, the
review pathway is deleted end to end (props, label ladder, colour bands,
service mapping, type fields), and every render site is guarded on `> 0` rather
than defaulting.

**Remains true because:** the guards in `supplierNeutrality.test.ts` ban any
read of a `.rating` property on a hotel surface — the strong form, which catches
the conflation however it is spelled, including behind a cast — ban
`reviewScore` / `reviewLabel` / `reviewCount` and the label ladder, and ban
defaulting `starRating` to any non-zero value or string.

**Verified by reversion.** Twelve prohibited patterns were reintroduced one at a
time and the suite failed on every one: the conflation in plain, cast-hidden and
reversed forms; a resynthesised review score; the label ladder; a shadow
`rating` field on the type; an invented star count and an invented star label; a
returning `userRatings` state and type field; and both directions of
filter-state divergence.

---

# PART E — Provisional and open

Nothing here blocks the specification. Each leaves a marked cell in Part B.

## E-1 · The TripJack specification — highest-value outstanding item

We do not hold one. `tripjack.com/page/api-doc` is a JavaScript shell with no
fetchable content and the API docs sit behind the partner portal. The TripJack
adapter is built from the reference implementation's working integration — decent
evidence, not a document.

**Why it matters:** when the RateGain specification arrived it turned up **six
defects in an adapter built exactly the same way**, including one that would have
dropped every RateGain search result.

| Item | Assumption | Risk if wrong | Customer-visible |
|---|---|---|---|
| §3.1a auth header | `apikey` + `agencyid` | Auth failure on every call — loud and immediate | No |
| §3.1b spoofed User-Agent | Not sent | 403s under burst; mitigated by concurrency 3 | Indirectly |
| §3.1c `totalPrice` all-in | Total authoritative, base derived | A resort-fee equivalent charged at the hotel would be missing from the quote | **Yes** |

Only §3.1c touches this document. It is the RateGain `Fees[]` defect in a
different costume.

**Action:** ask TripJack for the HMS/OMS v3 specification.

## E-2 · RateGain cancellation timestamp zone

`getproducts` stamps deadlines as naive local datetimes
(`"2026-09-05 00:00:00"`); the reservation endpoints stamp the same policy with
an offset (`"...+05:30"`). The adapter reads the naive form as **IST** — the
offset RateGain itself sends and the zone its platform runs in.

The alternative is not "no assumption": it is reading the timestamp in whatever
zone the process is deployed in, which would make a cancellation deadline depend
on the deploy region.

**Customer-visible, and the direction that matters** — a free-cancellation
deadline wrong by hours is a refund dispute. Answerable by **one test booking**
(`OPEN-ISSUES` §3.2, item E-8).

## E-3 · RateGain commissionable model — not customer-facing

Does the B2C net-rate-plus-commission model expect KLAR to remit `sellingRate`
and reclaim commission, or to be invoiced `totalNet`? Assumed invoiced
`totalNet`. Surfaces on the first invoice, never to a customer. Settled by the
same test booking as E-2 (`OPEN-ISSUES` §3.2).

## E-4 · Uncited cells in Part B

Fields where verification is incomplete and the cell reads *uncited*, to be
closed by reading the relevant adapter path or by the TripJack specification:

- RateGain property type
- RateGain bed configuration
- RateGain allotment
- RateGain compliance (PAN / passport / GST)
- TripJack `rateStatus`

---

## Audit procedure when the TripJack specification arrives

For every row marked `ADAPTER_DERIVED` or `PROVISIONAL` on the TripJack side:

```
current assumption  →  official specification  →  retain | revise
                                                      ↓
                                          affected UX rule + test
```

A revised semantic changes a Part B cell, which changes a Part A guard, which
changes a test. That chain is the reason the semantic column carries citations
rather than phrases.

---

## Related documents

| Document | What it holds |
|---|---|
| `SUPPLIERS.md` | Supplier contract, per-supplier behaviour, endpoint detail |
| `OPEN-ISSUES.md` | Closed defects with tests, KLAR's commercial decisions, open questions |
| `adr/0000` … `adr/0008` | The architectural decisions this contract rests on |
| `DATABASE.md` | Persistence model |
| `PHASE-1-REVERSE-ENGINEERING.md` | The reference implementation teardown |
