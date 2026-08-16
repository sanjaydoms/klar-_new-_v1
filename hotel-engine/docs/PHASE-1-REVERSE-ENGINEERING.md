# KLAR Hotel OTA — Phase 1: Reverse-Engineering & Target Architecture

**Status:** Phase 1 deliverable. No production code written yet, by design (brief §4, §50, §53).
**Sources analysed:** `KLAR_BACKENDSERVICES-main` (hotel-search-service 11,209 LOC · hotel-booking-service 9,595 LOC), `KLAR_B2C_FRONTEND_NEW-main` (hotel feature ~30 components + 3 service modules).
**Reference tree extracted to:** `_reference/` (read-only; nothing in the new build will import from it).

---

## 0. Executive summary

The existing system is **not** a naive first attempt. It already contains a supplier registry, a common adapter interface, Redis + L1 caching, request coalescing, circuit breakers, stale-while-revalidate, and a genuinely careful markup/region model. Several files carry excellent reasoning in their comments. That work is worth reading before rebuilding.

But the system **cannot satisfy the core business requirement** in §6/§11 — *one KLAR search across all suppliers, showing the genuinely lowest price* — and it cannot satisfy it for structural reasons, not because of bugs that could be patched.

Three structural failures, in order of severity:

| # | Failure | Why it is structural |
|---|---|---|
| **A** | **Cross-supplier prices are not commensurable.** Platform markup is applied to TripJack and *not* to RateGain, at both search and detail. The "cheapest supplier" comparison therefore compares `TJ net + platform markup` against `RG net`. | The comparison happens inside a deduplicator that receives already-mapped, already-priced hotels from two adapters that each own their own pricing. There is no layer where a commensurable total exists. |
| **B** | **There is no canonical hotel identity.** The only hotel catalogue (`Hotel.model.ts`) is keyed by `tjHotelId` — a TripJack ID space. Supplier IDs *are* the identity (`"TJ:123"`, `"RG:abc"`), and these prefixed IDs travel all the way into the frontend as `hotel.id`. | Matching the same property across suppliers is done by 100 m coordinate proximity + a substring name test, per search, in O(n²), with no persisted mapping and no confidence level. |
| **C** | **The winning deal is the only bookable deal.** Deduplication keeps `altDeal: { source, price }` — a number and a label. The losing supplier's rate key, room, board and cancellation terms are discarded at merge time. | §16, §30, §49 all require the alternative deals to be preserved as *bookable* objects. The current shape cannot be extended into that; it has to be replaced. |

Everything else in the defect register (§6 below) is downstream of these three.

**Recommendation:** proceed with the clean-room rebuild as briefed. The reference implementation is worth mining for *domain knowledge* — supplier quirks, real measured latencies, the region/markup failure semantics — and worth discarding as *structure*.

---

## 1. As-is system map

### 1.1 Services in scope

```
hotel-search-service   :5012   search · suggest · destinations · products(rates)
hotel-booking-service  :????   precheck · commit · confirm · cancel · refund · amend · vouchers
auth-service           :5010   JWT · agent markup rules · master markup config
payment-service                Razorpay verify / refund
email-service                  booking notifications
```

Out of scope for this rebuild: flight, cabs, insurance, visa, passport, tour-package, cruise, charter.

### 1.2 External dependencies

| Dependency | Used for | Notes |
|---|---|---|
| TripJack HMS v3 | `/hotel/listing`, `/hotel/pricing`, `/hotel/static-detail`, `/nationality-info` | ID-list based search — you must supply candidate `hids` |
| RateGain SmartDistribution | `/bestproperties`, `/getproducts`, `/getDestinations`, `/getSpecialRequests` | Destination-code or geofilter based search, 20 properties/page |
| OpenCage Geocoding | destination text → lat/lng/bbox → radius | **API key hardcoded in source** (§6, D-14) |
| MongoDB | hotel catalogue (~1.6 M docs), RG destinations, geo cache, bookings | |
| Redis | search master-list cache, TJ hid cache, commit locks | |

### 1.3 Layer inventory (the §41 problem, measured)

Ten files exist in **both** hotel services. Nine have **diverged**:

| File | search LOC | booking LOC | differing lines |
|---|---|---|---|
| `config/markup-config.ts` | 177 | 139 | 82 |
| `utils/pricing.util.ts` | 471 | 116 | 507 |
| `utils/region.util.ts` | 78 | 78 | **0 (identical)** |
| `clients/tripjack.client.ts` | 25 | 38 | 35 |
| `clients/rategain.client.ts` | 15 | 13 | 6 |
| `providers/tripjack.api.provider.ts` | 622 | 530 | 1040 |
| `providers/rategain.api.provider.ts` | 352 | 448 | 670 |
| `types/rategain.types.ts` | 101 | 101 | 6 |
| `suppliers/registry.ts` | 61 | 20 | 57 |
| `suppliers/types.ts` | 51 | 18 | 57 |

`region.util.ts` carries a 20-line comment explaining that it is duplicated on purpose and *must* be edited in both places in the same commit. It is the only one that has held. `markup-config.ts` — the file that decides how much money is added to a price — has drifted 82 lines apart between the service that **quotes** and the service that **charges**.

Per supplier, the same logic is spread across five layers with no clear ownership boundary:

```
suppliers/tripjack/index.ts   ← registry descriptor (thin, correct)
adapters/tripJackAdapter.ts   ← search: payload build + response map + pricing + geo filter + DB enrich
providers/tripjack.provider.ts← 2-line `new TripJackApiProvider()`  (pure indirection, no purpose)
providers/tripjack.api.provider.ts ← detail/rates: payload build + response map + pricing + static merge
clients/tripjack.client.ts    ← axios instance
```

`providers/*.provider.ts` in hotel-search-service are 2–3 line re-exports. They are a layer with no responsibility.

---

## 2. The frontend contract (binding specification)

This is what the rebuild **must** keep serving. It was derived from the frontend source, not from the backend, so it reflects what the UI actually reads.

### 2.1 Endpoints consumed

`src/config/api.config.ts`:

| Endpoint | Method | Consumer |
|---|---|---|
| `/api/search/hotels/search` | POST | HotelSearchPage, HotelsContent |
| `/api/search/hotels/suggestions?q=` | GET | DestinationAutocomplete, HotelAutocomplete |
| `/api/search/hotels/static?city&propertyType&page` | GET | landing-page browse tiles |
| `/api/search/hotels/:propertyId/products` | POST | HotelDetailPage |
| `/api/search/destinations`, `/popular`, `/cities` | GET | landing page |
| `/api/search/hotels/popular-areas` | GET | autocomplete sub-suggestions |
| `/api/booking/precheck` · `/commit` · `/confirm` · `/cancel` · `/cancel/charges` | POST/GET | HotelReviewBooking |
| `/api/booking/bookings`, `/bookings/:id`, `/bookings/check/:email` | GET | MyBookings, confirmation |
| `/api/booking/special-requests` | GET | HotelGuestForm |
| `/api/booking/templates/hotel/confirmation/{client,agent}/:id` | GET | voucher / invoice |

### 2.2 Search request (as sent, `hotelSearchService.ts:228-247`)

```jsonc
{
  "destination":     "Goa",            // OR "TJ:100000001234" for a direct hotel search
  "destinationCode": "12345",          // optional, RateGain destination code
  "hotelId":         "TJ:1000...",     // optional, echoed
  "checkin":  "2026-09-10",            // YYYY-MM-DD
  "checkout": "2026-09-13",
  "countryCode": "IN",                 // default IN
  "currency":    "INR",                // default INR
  "pageNo": 1,
  "providers": ["TJ","RG"],            // optional
  "sortBy": "price_asc",               // price_asc | price_desc | rating_desc | price_rating
  "filters": { /* see 2.4 */ },
  "rooms": [ { "adults": 2, "children": 0, "childAges": [] } ]
}
```

Note the frontend overloads `destination` with a supplier-prefixed hotel ID for hotel-name search. That is a contract quirk the new API should accept for compatibility but must not adopt internally.

### 2.3 Search response (as read, `hotelSearchService.ts:274-366`)

```jsonc
{
  "results": [ /* Hotel[] — also mirrored to "body" and "hotels" */ ],
  "total": 30,            // hotels on THIS page (misnamed)
  "hasMore": true,        // authoritative next-page flag
  "inventoryCount": 6179, // display only, "showing 40 of 6,179"
  "facets": { /* see 2.5 */ },
  "meta": { "tjCount": 118, "rgCount": 24 }
}
```

Per-hotel fields the UI reads (union of `hotelTypes.ts` and the mapper):

| Field | Type | Consumed by |
|---|---|---|
| `hotelId` | `"TJ:…"` / `"RG:…"` | primary key, routing to detail page |
| `name`, `address`, `city`, `country` | string | HotelCard, map |
| `starRating` | number | card, filters |
| `latitude`, `longitude` | number | HotelMapModal, InteractiveHotelMap |
| `images[]` | string[] | gallery — must be absolute URLs |
| `amenities[]` | string[] | card badges, filters |
| `price` | number | **the displayed total** — markup-inclusive |
| `basePrice` | number | per-night derivation |
| `taxAmount`, `taxesIncluded` | number/bool | breakdown |
| `currency` | string | |
| `pricing{}` | object | `HotelBookingSummary`, review page — see 2.6 |
| `mealBasis` | string | features chip |
| `isRefundable`, `refundableLabel`, `freeCancellationUntil` | bool/string | cancellation chip. **`undefined` = unknown**, must not become "Non-Refundable" |
| `source` | `"RG"｜"TJ"` | provider filter, PDF export |
| `altDeal` | `{source, price}` | "compare" chip, `showOnlyAltDeals` filter |
| `propertyCode`, `brandCode` | string | required by `/products` |
| `correlationId` | string | TripJack session reuse into `/products` |
| `accTypeDesc`, `accMultiDesc`, `accomodationType`, `hotelSegment` | string | property-type filter |
| `onHoldAllowed` | bool | hold flow |

### 2.4 Filters (`HotelFilters.tsx:20-31`, sent back to backend)

`starRatings[]` · `priceRange[min,max]` · `priceRanges[[min,max]…]` · `mealTypes[]` · `propertyTypes[]` · `amenities[]` (AND semantics) · `searchText` · `showOnlyAltDeals` · `providers[]` · `userRatings[]` · `selectedLocations[]`

### 2.5 Facets (`facets.service.ts:46-61`) — rendered verbatim, client derives nothing

`starRatingCounts` · `propertyTypeCounts` · `mealTypeCounts` · `amenityCounts` (top 60) · `providerCounts` · `minPrice` / `maxPrice` · `topLocations[{name,count}]` (top 10) · `priceBuckets[{min,max,count}]` (6) · `totalHotels` · `altDealCount`

Facets are **cumulative across pages** and computed on the geofenced-but-unfiltered set, so the panel only grows as the user scrolls. This behaviour is correct and must be preserved.

### 2.6 The pricing block the UI trusts (`ratePricing.ts`)

`resolveRatePricing()` is the single place the frontend reads a price, and its doc comment records exactly why: several competing totals existed and the detail page picked the pre-markup one, so the B2C margin silently vanished between the card and the review page. It reads, in order: `pricing.finalTotalPrice` → `price` → `pricing.totalPrice`.

The invariant it depends on — **`basePrice + taxesAndFees === totalPrice`** — is guaranteed by `buildPublicPricing()` (`pricing.util.ts:185-217`) by *deriving* `taxesAndFees` rather than summing named parts. Keep both the invariant and the reason.

### 2.7 Where the frontend contains supplier logic (must be removed)

This is the §38 violation, and it is extensive:

| Location | Supplier logic |
|---|---|
| `HotelReviewBooking.tsx:862-978` | Builds **two entirely different booking payloads**. The RateGain branch constructs a native `BookReservation` envelope — `ResStatus`, `DemandBookingId`, `EchoToken`, `RoomSelection[].RoomSelectionKey`, `RoomRate` as *price per room per night*, `Guest[].ProfileType`. Supplier protocol, in the browser. |
| `HotelReviewBooking.tsx` (10 more sites) | `hotelData.id.startsWith('TJ:')` gates postal-code validation, precheck shape, UI sections, provider label |
| `HotelDetailPage.tsx:493,525,2068,2216,2243-2245` | TJ/RG branching for products payload and ID normalisation |
| `hotelBookingService.ts:52-74` | Hardcoded **RateGain error-code table** (1999, 1001…1005) → user-facing copy |
| `tripjackBookingService.ts` | An entire second, TripJack-specific booking client |
| `MyBookingsPage.tsx` (12 sites), `HotelVoucher.tsx` | Reads `booking.rateGainRequest.BookReservation.RoomSelection[0].Property.Name` — the stored **raw supplier request** — to render room, guest, GST and cancellation info |
| `SearchResultsPdfTemplate.tsx:43-60` | `isTJ ? 'TripJack' : 'RateGain'` |
| `hotelSearchService.ts:576` | `propertyId.replace('TJ:','').replace('RG:','')` |

`MyBookings` reading the raw RateGain request object is the worst of these: the booking record's *display* data is the supplier's wire format. Adding Supplier C breaks the bookings list.

---

## 3. As-is flows

### 3.1 Search

```
POST /api/search/hotels/search
  │
  ├─ getClientType(req) / extractToken(req)                    hotels.controller.ts
  ├─ deriveRegion(countryCode) → resolveMarkupRules(...)        hotels.service.ts:115
  ├─ validate dates + rooms (else return empty)                 :130-156
  ├─ resolveGeoCenter(payload)  ── OpenCage + GeoCache          :455-517
  │                                mutates payload._geoCenter
  ├─ buildMasterKey(payload, clientType) → sha1                 :1193-1213
  ├─ loadMaster: L1 (20 s) → Redis (900 s)                      :253-275
  │     hit  → if age > 300 s, scheduleRefresh() in background
  │     miss → coalesce(key, fetchMasterList(blockingPages=1))
  │            then scheduleTopUp() to prefetchPages=3
  ├─ if master.length < pageNo*limit && providerHasMore
  │     → extendMasterList (≤5 rounds, coalesced)               :752-787
  └─ finalizeResponse(master, …)                                :889-1186
        1. accumulateFacets (cumulative, cached per search)
        2. apply filters
        3. apply sort
        4. slice page
        5. apply markup, build pricing block
```

`fetchMasterList` → `fetchOnePage` per supplier page (sequential across pages, "keeps TripJack's WAF happy"), and inside one page:

```
fetchOnePage(page)                                             :525-653
  ├─ registry.getEnabled({mode, destination, requestedCodes})
  ├─ one AbortController per page, signal threaded into axios
  ├─ Promise.allSettled over supplier.search(...)
  │     each .catch() → console.error, result silently dropped
  ├─ soft window  = SEARCH_BLOCKING_TIMEOUT_MS (8 s)
  │     ⚠ the "return as soon as we hold ≥1 hotel" line is COMMENTED OUT :635-637
  ├─ hard window  = soft + SEARCH_TIMEOUT_GRACE_MS (6 s) = 14 s
  └─ abortController.abort()
       ↓
  deduplicateHotels(union)   ← price comparison & altDeal happen HERE
       ↓
  geofence filter (drop beyond radiusKm)
```

**TripJack search** (`tripJackAdapter.ts`) is fundamentally different from RateGain's: TripJack has no destination search. The adapter resolves the destination to a list of candidate hotel IDs via a Mongo `$near` over the local catalogue (`resolveForTJ`), then *densifies* — each KLAR page maps to a fixed window of `TJ_HIDS_PER_PAGE=150` ids, split into `TJ_CHUNK_SIZE=50` chunks, run `TJ_CONCURRENCY=3` at a time, capped at `TJ_MAX_PER_PAGE=100` hotels. Yield is roughly 1 bookable hotel per 20 candidate ids. `total` returned is the candidate-id count (~6,179 for Goa), not a hotel count.

**RateGain search** (`rateGainAdapter.ts`) uses a geofilter (or destination code, with a fallback chain), 20 properties per API page, `RG_PAGES_PER_SEARCH=4` pages fetched concurrently per KLAR page.

### 3.2 Hotel detail / rates

```
POST /api/search/hotels/:propertyId/products
  → productsService.getProducts                    products.service.ts (clean, 21 lines)
  → supplierRegistry.resolveByPropertyId(id)       first-match; RG is catch-all
  → supplier.getProducts(payload)
```

This is the **one place the abstraction is honoured**. It is 21 lines, has no supplier knowledge, and adding a supplier requires no change to it. It is the model for the rebuild.

TripJack's implementation (`tripjack.api.provider.ts:62-621`) runs `/hotel/pricing` concurrently with a cached `/hotel/static-detail` (6 h LRU) and a Mongo lookup, merges room images by id then by fuzzy name match, applies platform + agent markup per option, and groups options into `products[]` by room name. It also has a well-handled sold-out path (TJ returns HTTP 400 with `options: []`).

### 3.3 Booking

```
POST /api/booking/precheck
  → precheck.service.ts:12   if (propertyId.startsWith("TJ:")) tripJack else rateGain
                             ⚠ hardcoded if/else — the registry exists but is not used

POST /api/booking/commit
  → RedisLockUtil.executeWithLock(commit_lock_…)
  → isTripJack = propertyId.startsWith("TJ") || bookingId.startsWith("TJ")
               || bookingId.startsWith("TG") || payload.type === "HOTEL"
               || (!payload.BookReservation && payload.bookingId)      commit.service.ts:189-194
  → #commitTripJack | #commitRateGain     (1,013 lines, two parallel implementations)
       PHASE 1  adapter.precheck() → ValidationEngine.validate(expected, fresh, {fixed:10, percent:0.5})
                  ├ !available            → ROOM_SOLD_OUT
                  ├ room name mismatch    → ROOM_CHANGED    (STRICT_ROOM_VALIDATION=false downgrades)
                  ├ meal plan mismatch    → MEAL_PLAN_CHANGED
                  ├ policy hash mismatch  → POLICY_CHANGED
                  ├ fresh > expected+tol  → PRICE_CHANGED
                  └ fresh < expected      → pass saving to customer
       PHASE 2  B2B: agent markup from wallet rules │ B2C: finalPrice = payload.sellingRate
       PHASE 3  B2B: wallet debit │ B2C: Razorpay verify against max(finalPrice, b2cPriceFloor(apiNet))
       PHASE 4  supplier book
       PHASE 5  TripJack async → poll /booking-details every 5 s × 36 (180 s)
                → CONFIRMED | HELD | MANUAL_REVIEW
```

The commit flow is the most mature part of the codebase: idempotency keys with a unique index, Redis locks, payment-reuse detection, a server-side B2C price floor so a tampered-low client price cannot book at cost, refund bookkeeping that makes concurrent refund paths idempotent, and a reconciliation worker. **This domain logic should be carried forward** — it is the supplier *routing* around it that must be replaced.

---

## 4. As-is data model

```
Hotel                (~1.6 M)   tjHotelId ⚠UNIQUE KEY IS A SUPPLIER ID
                                name, cityName, searchTokens[], countryName,
                                starRating, address, location{Point}, images[],
                                accTypeDesc, accMultiDesc, accomodationType
                     indexes:   tjHotelId(u), cityName, searchTokens, 2dsphere,
                                text(cityName,name), (countryName,cityName)

RGDestination                   destCode, destName, countryName   (+text index)
GeoCache                        query("geo:lat,lng"), lat, lng, radiusKm
PopularArea                     cityKey, name, description, tag
Nationality                     TripJack nationality id map

Booking                         klarBookingId, confirmationNumber,
                                hotelConfirmationNumber, idempotencyKey(u),
                                publicToken, reservationId, propertyId,
                                provider: enum{rategain,tripjack}  ⚠2-VALUE ENUM
                                status: enum{CONFIRMED,CANCELLED,PENDING,FAILED,
                                             HELD,PRECHECK_VALIDATED,PAYMENT_RESERVED,
                                             SUPPLIER_PENDING,MANUAL_REVIEW,
                                             CANCELLATION_PENDING}
                                totalAmount / netAmount / markupAmount / currencyCode
                                hotel display fields (denormalised)
                                rateGainRequest / tripJackRequest / tripJackResponse ⚠RAW SUPPLIER BLOBS
                                refund{status,method,kind,amount,…}
BookingEvent                    append-only audit
PrecheckResult                  PrecheckResultV1 + SupplierAdapter contract
```

Two schema-level blockers for §33 (add Supplier C without a rewrite):

- `BookingProvider` is a **two-value enum**. A third supplier requires a schema migration.
- Supplier payloads are stored in **named columns** (`rateGainRequest`, `tripJackRequest`, `tripJackResponse`) and are read directly by the frontend. A third supplier requires a new column *and* frontend changes.

There is **no** canonical hotel table, **no** supplier-mapping table, **no** destination-mapping table beyond `RGDestination`, and **no** supplier-configuration table (all supplier behaviour is env vars).

---

## 5. What the reference implementation gets right

Recorded deliberately, because the rebuild should not lose it:

1. **`products.service.ts`** — 21 lines, zero supplier knowledge, pure registry dispatch. The target shape for every orchestrator.
2. **`buildPublicPricing()`** — derives `taxesAndFees` from `total − base` so the breakdown *cannot* fail to add up. Carry the technique and the reasoning.
3. **`ratePricing.ts`** — one function, one place the client reads a price. Carry it.
4. **`deriveRefundable()`** — distinguishes "non-refundable" from "unknown", and the adapters deliberately emit `undefined` rather than a fabricated `false`. Carry both the function and the discipline.
5. **`markup-config.ts` failure semantics** — `fresh → live → stale → env`, *never* silently to zero, with "configured off" distinguished from "never configured". This is correct money handling.
6. **Region-keyed snapshots** rather than a module-level "current region", with the concurrency corruption explained in the comment. Correct.
7. **Facet accumulation** — cumulative across pages, computed on the unfiltered set. Correct UX and correct reasoning.
8. **Commit-path safety** — idempotency key + unique index, Redis lock, payment-reuse guard, `b2cPriceFloor`, idempotent refund claim, reconciliation worker.
9. **Measured supplier latencies in comments** — RateGain `bestproperties` ≈ 10.7 s domestic, ≈ 14.2 s international geofilter. TripJack yield ≈ 1 hotel per 20 candidate ids. This is real operational knowledge; it should drive the new deadline budget.
10. **Request coalescing** for both master builds and master extensions.

---

## 6. Defect register

Ordered by commercial impact. `file:line` refers to the reference tree.

### Critical — money / correctness

**D-1 · Platform markup applied to one supplier only**
`tripJackAdapter.ts:278,302-303` and `tripjack.api.provider.ts:336` apply `platformMarkupAmount()`. `rateGainAdapter.ts:474` and `rategain.api.provider.ts:228` do not. The function that *would* price RateGain correctly, `enrichRateGainPrice()` (`pricing.util.ts:416-471`), has **zero callers** — it is dead code.

Two consequences:
- The cheapest-deal comparison in the deduplicator compares `TJ net + platform markup` against `RG net`. With a 5 % platform markup, RateGain wins every tie it should lose, by exactly 5 %.
- `hotel-booking-service` **does** apply platform markup to RateGain (`rategain.adapter.ts:117`). So a RateGain booking is quoted without the markup and validated with it — a systematic quote-vs-charge divergence on one supplier.

**D-2 · Price comparison ignores rate equivalence** — `deduplicator.ts:89-92`
`currentPrice < existingPrice` and nothing else. Meal plan, refundability, cancellation deadline, room type, occupancy and `taxesIncluded` are not consulted. This is precisely the §48 scenario: a non-refundable room-only rate will beat a refundable breakfast-inclusive rate and the customer will never know a comparison happened.

**D-3 · `taxesIncluded` semantics are contradictory** — `tripJackAdapter.ts:300-305`, `rateGainAdapter.ts:445`
The TripJack comment says *"totalPrice already includes all taxes… taxesIncluded = true"* and the code on the next line sets `taxesIncluded: false`. RateGain infers it as `taxAmt === 0`, which conflates "tax-inclusive" with "tax field absent". Two suppliers with different, partly-wrong tax semantics feed one comparison.

**D-4 · The alternative deal is unbookable** — `deduplicator.ts:96,104`
`altDeal = { source, price }`. The loser's `rawPayload`, rate key, board, room and cancellation policy are discarded. §16/§30/§49 require the alternative to be a real deal object. It cannot be recovered without re-searching.

**D-5 · Region is derived and then discarded** — `tripJackAdapter.ts:289` vs `:278`
`deriveRegion(h.country)` is computed and stored as `markupRegion`, but `platformMarkupAmount(tjBase)` is called with **no region argument**, defaulting to `"ALL"`. The region-aware markup exists, is documented, is tested, and is not used at search time.

### High — architecture / scalability

**D-6 · Supplier IDs are the identity, everywhere**
`hotelId: "TJ:…"｜"RG:…"` is the frontend's primary key, the `/products` routing key, the precheck routing key, and the commit routing key. No canonical layer exists. Directly blocks §12, §13, §30, §33.

**D-7 · Naive property matching** — `deduplicator.ts:22-137`
O(n²) scan; merges on `latDiff < 0.001 && lngDiff < 0.001` plus `isNameSimilar` (substring containment where the shorter string exceeds 5 chars). "Marriott" ⊂ "Marriott Executive Apartments" merges two different properties. No confidence level, no persisted mapping, recomputed on every search and every list extension. §29 explicitly forbids reproducing this.

**D-8 · Supplier failures are invisible** — `hotels.service.ts:586-588`
`.catch(err => console.error(...))`. No supplier status, error, timing or result count reaches the response. The frontend type declares `meta.errors[]`; the backend never sends it. A search where RateGain timed out is indistinguishable from one where RateGain had no inventory — while the UI still implies the displayed price is the cheapest. §10, §20, §34, §35 all violated.

**D-9 · Booking service does not use its own registry** — `precheck.service.ts:12`, `commit.service.ts:189-194`
`suppliers/registry.ts` exists in hotel-booking-service and is bypassed. Commit's supplier detection is a five-clause heuristic including `payload.type === "HOTEL"` and `(!payload.BookReservation && payload.bookingId)` — it infers the supplier from the *shape of the request the frontend happened to send*.

**D-10 · Frontend speaks supplier protocol** — see §2.7. Adding Supplier C requires frontend work today.

**D-11 · Cross-supplier ID-space collision** — `rateGainAdapter.ts:217`
```ts
HotelModel.find({ tjHotelId: { $in: rgIds } })
```
RateGain property IDs looked up in the TripJack ID column. Usually returns nothing (so RG cards lose enrichment); where a numeric collision exists it silently attaches **the wrong hotel's** name, address, images and coordinates.

**D-12 · Filtered pagination can dead-end** — `hotels.service.ts:221-231` vs `:1084-1101`
The list is extended based on `pageNo × limit` measured against the **unfiltered** master, but the page is sliced from the **filtered** list. Under a selective filter, `filteredResults` can be shorter than the requested offset, yielding an empty page — and `hasMore` is then `false` because it is gated on `pageItems.length > 0`. The user is told there are no more hotels while suppliers still have inventory.

**D-13 · Double sorting** — backend `hotels.service.ts:1039-1082`, frontend `HotelSearchPage.tsx:1550-1563`
Both sort. The frontend sorts the *accumulated* list across pages while the backend sorted each page against the master. Ordering is not stable across scroll.

### Medium — security / operability

**D-14 · Hardcoded API key** — `destinationResolver.ts:43,180,272`
`process.env.OPENCAGE_API_KEY || "REDACTED"` — a live credential in three places in the source. §36 violation. **Rotate this key before the new service ships.**

**D-15 · Raw supplier errors leaked to the client** — `products.controller.ts:26-36`
`body: error.response?.data` returns the supplier's response verbatim. The search controller gets this right (`hotels.controller.ts:22-27`); the products controller does not.

**D-16 · WAF-evasion headers** — `clients/tripjack.client.ts:12-24`
The API key is sent under six header names (`apikey`, `apiKey`, `key`, `x-api-key`, `Authorization`, plus `agencyId` ×3) with a spoofed Chrome `User-Agent`. Six copies of a credential on every request, and a spoofed UA that will break the moment the supplier tightens its WAF. Confirm the correct header with TripJack and send exactly one.

**D-17 · PII in logs** — `precheck.service.ts:16-23`, `commit.service.ts` (247 `console.log` calls across the two services)
`JSON.stringify(payload, null, 2)` on payloads containing guest names, emails and phone numbers.

**D-18 · Fabricated amenities** — `rateGainAdapter.ts:542-573`
A 5-star hotel with no amenity data is given "Swimming Pool, Fitness Center, Spa, Restaurant, Bar"; any hotel with "beach" in its name gains a Spa. These invented facts then feed the **amenity filter**, so a user filtering for "Spa" gets hotels that were guessed to have one. `getTJFallbackAmenities` (`tripJackAdapter.ts:234-265`) is the same function, duplicated, and never called — dead code.

**D-19 · Environment sprawl** — 80 distinct `process.env.*` reads across the two hotel services; `config/env.ts` declares roughly 15. The rest are inline `process.env.X || default` in business logic (`hotels.service.ts:30,34,122,619`, `tripJackAdapter.ts:41-49`, `pricing.util.ts:99`, …). None documented.

**D-20 · Dead / debug code shipped**
`hotel-search-service/{temp.json,test-rg.ts,test-static.js,test-live-static.js,test-sync-format.js}`, `src/{check-env.ts,test-fixed-client.ts,test_rategain_api.ts}`, `hotel-booking-service/{test-tj.ts,verify.ts}`, `src/{check-db.ts,test-tripjack-cancel.ts}`; `getOfficialCityCenterMatch()` is a `@deprecated` function that always returns `null`; frontend root holds `HotelCard.orig.tsx` and `HotelDetailPage_old.tsx`.

**D-21 · Environment-specific hacks** — `destinationResolver.ts:672-674,722-729`
```ts
const isIndianQuery = q.includes("india") || q.includes("goa");
… hotels.filter(h => !h.countryName.toLowerCase().includes("germany"))
```
A hardcoded India/Germany rule inside generic destination resolution.

**D-22 · Dynamic prices cached for 15 minutes** — `env.ts:32` (`SEARCH_RESULT_CACHE_TTL=900`)
The cached master holds fully-priced hotels. A user can be shown a 14-minute-old rate. The cache *key* is correct — it includes destination, dates, rooms (with child ages), currency, country and provider set (`hotels.service.ts:1197-1207`), satisfying §22 — but the TTL does not distinguish static from dynamic data.

**D-23 · Partial-return logic contains a disabled branch** — `hotels.service.ts:635-637`
```ts
setTimeout(() => {
  softElapsed = true;
  // COMMENTED OUT: If you want RateGain, we must wait for it!
  // if (pageResults.length > 0) finish();
}, softMs);
```
The soft window still exists in code and in comments but no longer fires. Effective behaviour is: return when all settle, or at 14 s hard cap, or the moment results land past 8 s via the per-task hook. The written policy and the actual policy have diverged. (§21 favours the current *behaviour*; the code should say so.)

**D-24 · No search correlation ID** — §34 requires one `searchId` spanning all supplier calls. Only TripJack's own per-listing `correlationId` exists, and it leaks to the frontend as a hotel field.

---

## 7. Target architecture

### 7.1 Principles

1. **One commensurable price object.** No comparison ever happens on a number a supplier adapter produced. Adapters emit supplier *cost*; a single pricing engine converts cost → customer price; only customer prices are compared.
2. **Canonical identity before merge.** Hotels are matched to a persisted `klarHotelId` with an explicit confidence level. Unmatched is a valid, safe outcome (§29: duplicates beat false merges).
3. **Deals, not prices.** A merged hotel carries `deals[]` of complete, bookable offers. The winner is a selection over that set, not a mutation of it.
4. **Supplier code appears in exactly two places** — inside `suppliers/<code>/`, and as an opaque string in persisted records. Nowhere in orchestration, nowhere in the API contract, nowhere in the frontend.
5. **Honesty over optimism.** If a supplier did not answer, the response says so and does not claim the price is the lowest available.

### 7.2 Module layout

```
apps/
  hotel-api/                    HTTP edge: routing, validation, auth, error mapping
  hotel-worker/                 sync jobs, cache warming, reconciliation

modules/
  search/         orchestrator · deadline budget · merge · rank · paginate
  matching/       canonical identity resolution + confidence
  pricing/        cost → customer price · markup · comparability rules
  property/       canonical hotel catalogue + supplier mappings
  destination/    canonical destinations + supplier destination mappings + geo
  rate/           detail + room/rate normalisation
  revalidation/   precheck / price-change handling
  booking/        supplier-neutral book · confirm · cancel · refund
  availability/   caching policy (static vs dynamic)

suppliers/
  contract/       HotelSupplier interface + shared DTOs + error taxonomy
  tripjack/       client · request mapper · response mapper · config
  rategain/       client · request mapper · response mapper · config
  testing/        contract test-suite every supplier must pass

domain/           canonical entities, value objects, invariants (no I/O)
infrastructure/   db · cache · http · logging · metrics · config
shared/           errors · result types · money · dates
```

Each supplier folder is a **vertical slice**: one client, one request mapper, one response mapper, one config schema. No supplier logic anywhere else. The five-layer smear in §1.3 collapses to one.

### 7.3 Canonical domain model

```ts
// ─── Identity ────────────────────────────────────────────────────────────
interface CanonicalHotel {
  klarHotelId: string;              // KLAR-owned, stable, opaque
  name: string;
  normalizedName: string;           // for matching
  address?: string;
  city?: string; country?: string;  // ISO-2
  location?: { lat: number; lng: number };
  starRating?: number;
  propertyType?: string;
  brand?: string;
  chainCode?: string;
  images: HotelImage[];
  amenities: Amenity[];             // normalised vocabulary, never fabricated
  supplierMappings: SupplierPropertyMapping[];
}

interface SupplierPropertyMapping {
  supplier: string;                 // "TJ" | "RG" | …
  supplierHotelId: string;
  confidence: MatchConfidence;
  matchedBy: MatchSignal[];
  verifiedAt?: Date;                // human/ops confirmation
}

type MatchConfidence =
  | "EXACT_SUPPLIER_MAPPING"   // persisted, verified
  | "HIGH_CONFIDENCE"          // multi-signal agreement
  | "MEDIUM_CONFIDENCE"        // flagged, merged, auditable
  | "LOW_CONFIDENCE"           // NOT merged; recorded for review
  | "UNMATCHED";

// ─── Money ───────────────────────────────────────────────────────────────
interface Money { amount: number; currency: string }   // minor-unit safe

interface SupplierCost {                 // what the SUPPLIER charges KLAR
  base: Money;
  taxes: Money;
  fees: Money;
  total: Money;                          // base + taxes + fees, always
  taxesIncludedInBase: boolean;          // explicit, never inferred
  commission?: Money;
}

interface CustomerPrice {                // what the CUSTOMER pays
  currency: string;
  supplierTotal: number;
  platformMarkup: number;
  channelMarkup: number;                 // B2C margin / B2B agent margin
  taxesAndFees: number;
  total: number;                         // the ONLY comparable number
  perNight: number;
  nights: number;
  breakdown: PriceLine[];                // audit trail, sums to total
}

// ─── Offers ──────────────────────────────────────────────────────────────
interface SupplierDeal {
  dealId: string;                        // KLAR-issued, opaque, resolvable
  supplier: string;
  klarHotelId: string;
  supplierHotelId: string;

  room:   { code?: string; name: string; bedConfig?: string };
  board:  { code: BoardCode; name: string };   // normalised: RO|BB|HB|FB|AI
  occupancy: { rooms: number; adults: number; children: number; childAges: number[] };

  cancellation: CancellationTerms;       // normalised, with `unknown` state
  refundable: Tristate;                  // TRUE | FALSE | UNKNOWN — never guessed

  cost:  SupplierCost;
  price: CustomerPrice;

  rateToken: OpaqueRateToken;            // sealed supplier state (see 7.7)
  validUntil?: Date;
  onHoldAllowed: boolean;
}

// ─── Search result ───────────────────────────────────────────────────────
interface MergedHotel {
  klarHotelId: string;
  hotel: CanonicalHotel;
  featuredDeal: SupplierDeal;            // the winner
  deals: SupplierDeal[];                 // ALL deals, all suppliers, bookable
  comparison: {
    comparedAcross: string[];            // suppliers that actually answered
    incompleteSuppliers: string[];       // did NOT answer — see §7.6
    equivalenceClass: string;            // what "comparable" meant here
  };
  matchConfidence: MatchConfidence;
}
```

`featuredDeal` is a *pointer into* `deals`, not a copy. Nothing is discarded at merge time — D-4 becomes structurally impossible.

### 7.4 Supplier contract

```ts
interface HotelSupplier {
  readonly code: string;
  readonly capabilities: SupplierCapabilities;

  search(req: UnifiedSearchRequest, ctx: SupplierContext): Promise<SupplierSearchResult>;
  getHotelDetails(req: HotelDetailsRequest, ctx: SupplierContext): Promise<SupplierHotelDetails>;
  getRates(req: HotelRatesRequest, ctx: SupplierContext): Promise<SupplierRates>;

  precheck(req: PrecheckRequest, ctx: SupplierContext): Promise<PrecheckResult>;
  book(req: BookRequest, ctx: SupplierContext): Promise<BookResult>;
  confirm?(req: ConfirmRequest, ctx: SupplierContext): Promise<BookResult>;
  cancel(req: CancelRequest, ctx: SupplierContext): Promise<CancelResult>;
  getCancellationCharges?(req: CancelChargesRequest, ctx: SupplierContext): Promise<Money>;
}

interface SupplierContext {
  searchId: string;                      // §34
  correlationId: string;
  deadline: Deadline;                    // absolute, not a duration
  signal: AbortSignal;
  logger: Logger;                        // pre-tagged supplier+searchId
}

interface SupplierSearchResult {
  supplier: string;
  status: "SUCCESS" | "EMPTY" | "PARTIAL" | "ERROR" | "TIMEOUT" | "CIRCUIT_OPEN" | "DISABLED";
  hotels: SupplierHotel[];               // cost only — NO customer price
  pageInfo: { hasMore: boolean; cursor?: string; supplierPagesConsumed: number };
  responseTimeMs: number;
  error?: NormalizedSupplierError;
}
```

Two deliberate departures from the brief's sketch (§7):

- **`precheck`/`book`/`cancel` are required, not optional.** A supplier that cannot be booked has no place in a search that promises the lowest bookable price. Capability variation is expressed in `capabilities`, not by omitting methods.
- **Adapters return `SupplierCost`, never `CustomerPrice`.** This is the single change that makes D-1 impossible to reintroduce: there is no code path where an adapter can add markup.

Every supplier must pass the shared contract test-suite in `suppliers/testing/` before registration.

### 7.5 Search pipeline

```
POST /api/search/hotels/search
  │
  ├─ 1  Validate & canonicalise request        → UnifiedHotelSearchRequest
  ├─ 2  Resolve destination                    → CanonicalDestination
  │                                              (+ per-supplier destination refs)
  ├─ 3  Cache lookup (static/dynamic split)
  ├─ 4  Select suppliers: registry + admin config + capability + destination coverage
  ├─ 5  FAN OUT — Promise.allSettled under ONE absolute deadline
  │        TripJack ──▶ cost-only SupplierHotel[]
  │        RateGain ──▶ cost-only SupplierHotel[]
  │        (per-supplier timeout, retry, circuit breaker; failure is isolated)
  ├─ 6  Match      → klarHotelId + confidence          [modules/matching]
  ├─ 7  Price      → SupplierCost → CustomerPrice      [modules/pricing]
  ├─ 8  Merge      → MergedHotel { deals[] }
  ├─ 9  Compare    → equivalence classes → featuredDeal
  ├─ 10 Filter → Sort → Paginate (stable cursor)
  └─ 11 Respond, including supplier health for this search
```

Steps 6 and 7 are **separate and ordered**. Matching never sees a price; pricing never sees another supplier. Comparison (9) is the only step that sees both, and by then every number is a `CustomerPrice.total` in the same currency.

### 7.6 Deadline strategy (§20, §21)

Correctness first. Concretely:

- One **absolute deadline** per search (`searchDeadline`), not per supplier call, derived from measured supplier latency: RateGain international geofilter ≈ 14.2 s is the binding constraint.
- Suppliers run concurrently and are **not cancelled because another finished**. A supplier is cancelled only when it exhausts its own budget or the search deadline passes.
- On deadline, return what is held **and label it**:

```jsonc
"comparison": {
  "comparedAcross": ["TJ"],
  "incompleteSuppliers": ["RG"],
  "priceGuarantee": "PARTIAL"     // BEST_AVAILABLE | PARTIAL
}
```

The UI can then say "best of the suppliers that responded" instead of implying a guarantee the system did not earn. This is the direct answer to §20's *"do not falsely claim that the displayed price is globally cheapest if a supplier did not respond."*

- Late supplier results are **not discarded** — they land in the cache, so the next request (and the same user's scroll) sees the complete picture.

### 7.7 Rate tokens (§30, §32)

The frontend must never hold supplier state, and the backend must never re-search at booking time.

```
dealId  →  Redis: sealed RateToken
              { supplier, supplierHotelId, supplierRateRef,
                correlationId, reviewHash, occupancy, board,
                quotedCost, quotedPrice, pricingContext, issuedAt, expiresAt }
```

`dealId` is opaque, signed and short-lived. The client sends `dealId` to precheck/commit; the booking engine resolves it to the owning supplier and its native state. This kills D-6, D-9 and the frontend's `BookReservation` construction in one move — the client never learns which supplier it is booking.

### 7.8 Matching (§12, §29)

Ordered, short-circuiting, with confidence recorded on every result:

| Tier | Signal | Confidence | Merge? |
|---|---|---|---|
| 1 | Persisted `SupplierPropertyMapping` | `EXACT_SUPPLIER_MAPPING` | yes |
| 2 | Shared external ID (GIATA / chain+property code) where available | `EXACT_SUPPLIER_MAPPING` | yes |
| 3 | Normalised name ≥ threshold **AND** distance ≤ 150 m **AND** address token overlap | `HIGH_CONFIDENCE` | yes, and persist |
| 4 | Name ≥ threshold **AND** distance ≤ 500 m **AND** same city **AND** star rating within 1 | `MEDIUM_CONFIDENCE` | yes, flagged for review |
| 5 | Anything weaker | `LOW_CONFIDENCE` | **no** — kept separate, queued for ops review |

Rules that follow from §12/§29:
- Coordinates **alone** never merge. Name alone never merges. At least two independent signals are required.
- Name normalisation strips chain prefixes, punctuation, diacritics and legal suffixes, then compares by token-set ratio — not substring containment (which is what makes D-7 wrong).
- Matching runs against the **persisted catalogue**, not pairwise across the result set. Complexity is O(n) lookups, not O(n²).
- A confirmed tier-3/4 match is **written back**, so the second search for that destination is a tier-1 lookup.

### 7.9 Comparability (§48) — an explicit business rule, not an accident

Deals are grouped into **equivalence classes** before a winner is chosen. Default class key:

```
(occupancy, board.code, refundability tier, roomCategory)
```

Selection:
1. Group `deals[]` into equivalence classes.
2. Within each class, cheapest `CustomerPrice.total` wins.
3. `featuredDeal` = the winner of the class matching the **product's configured preference** (default: the class the search requested; ties broken by refundable > non-refundable, then by supplier reliability score).
4. All other class winners remain in `deals[]` and are surfaced as "other rates".

`ABSOLUTE_CHEAPEST` is available as a configured policy, not a silent default — exactly as §48 requires.

### 7.10 Pricing engine

```
SupplierCost
   → normalise currency (single FX source, rate + timestamp recorded)
   → normalise tax semantics (taxesIncludedInBase made explicit per supplier)
   → + platform markup      (region-aware, per supplier, from config)
   → + channel markup       (B2C margin | B2B agent rules)
   → + applicable fees
   = CustomerPrice          ← the ONLY comparable number
```

Non-negotiables:
- Applied **uniformly across all suppliers** by one engine. No adapter may call it (D-1).
- **Region is passed explicitly** through the whole chain, never defaulted (D-5).
- `base + taxesAndFees === total` enforced by construction and asserted in tests (carried from `buildPublicPricing`).
- Every markup step recorded in `breakdown[]` so any price can be explained after the fact.

### 7.11 Caching (§22)

| Layer | Contents | TTL |
|---|---|---|
| Static property | name, address, images, stars, amenities, coordinates | days, background-refreshed |
| Destination / geo | canonical destinations, radii, supplier destination codes | days |
| Supplier candidate sets | TripJack hid lists per centre+radius | hours |
| **Dynamic availability** | rates, prices, cancellation terms, allotment | **short — 60-180 s, and never served as fresh past it** |
| Rate tokens | sealed supplier state per `dealId` | minutes, ≤ supplier rate validity |

Dynamic cache key includes everything that materially affects price: `destination · checkin · checkout · rooms(with child ages) · nationality · currency · channel · supplierSet · markupConfigVersion`. The existing key (`hotels.service.ts:1197-1207`) is already close to this; the TTL is what must change.

### 7.12 Persistence

```
canonical_hotel            klarHotelId(pk) · name · normalizedName · location(geo)
                           address · city · countryCode · starRating · brand
                           propertyType · amenities[] · images[] · updatedAt
supplier_property_mapping  (supplier, supplierHotelId) UNIQUE
                           → klarHotelId · confidence · matchedBy[] · verifiedAt
                           idx (klarHotelId), idx (supplier, supplierHotelId)
match_candidate            unresolved/low-confidence pairs queued for ops review
canonical_destination      klarDestinationId · name · type · countryCode
                           centroid · radiusKm · aliases[]
destination_mapping        (supplier, supplierDestCode) → klarDestinationId
supplier_config            code · enabled · priority · timeouts · retry · concurrency
                           circuitBreaker · markupOverrides · countries[] · maintenanceMode
booking                    klarBookingId · supplierCode (STRING, not enum)
                           supplierBookingRef · klarHotelId · dealSnapshot
                           priceSnapshot · status · guests · payment · refund
booking_supplier_payload   bookingId → supplierCode → request/response blob
                           (audit only; NEVER read by any UI)
booking_event              append-only audit
```

Two changes that unblock §33 directly: `supplierCode` is a **string keyed to `supplier_config`**, not an enum; and raw supplier payloads move to a **side table** the UI cannot reach, replaced by a canonical `dealSnapshot` the voucher and bookings list render from.

### 7.13 Adding Supplier C — the acceptance test for the whole design

```
1. mkdir suppliers/supplierc/         client · request mapper · response mapper · config schema
2. supplierRegistry.register(supplierC)
3. INSERT INTO supplier_config (...)
4. Run the shared contract test-suite
5. Seed / backfill supplier_property_mapping and destination_mapping
```

Zero changes to: search orchestrator · matching · pricing · comparison · filters · sort · pagination · booking engine · API contract · frontend · database schema.

---

## 8. Compatibility strategy

The frontend is out of scope for this rebuild (§38), so the new API must serve the shape in §2 unchanged, while the internal model is canonical.

A **compatibility projection** at the API edge — one module, explicitly named as legacy, with an expiry — maps canonical → legacy:

| Legacy field | Canonical source |
|---|---|
| `hotelId: "TJ:123"` | `featuredDeal.supplier + ":" + featuredDeal.supplierHotelId` |
| `source: "TJ"` | `featuredDeal.supplier` |
| `price` | `featuredDeal.price.total` |
| `basePrice` / `taxAmount` / `taxesIncluded` | `featuredDeal.price` fields |
| `pricing{}` | `buildPublicPricing`-equivalent over `CustomerPrice` |
| `altDeal: {source, price}` | cheapest non-featured deal in `deals[]` |
| `isRefundable` / `refundableLabel` | `featuredDeal.refundable` (UNKNOWN → `undefined`) |
| `propertyCode` / `brandCode` / `correlationId` | from the deal's supplier mapping |

Alongside them, new canonical fields (`klarHotelId`, `dealId`, `deals[]`, `comparison{}`, `supplierHealth{}`) ship from day one. The frontend can migrate field by field; the projection is deleted when the last legacy reader is gone.

For booking, the new API accepts `dealId` **and** the legacy `BookReservation` envelope during transition, with the legacy path logged and metered so its retirement is measurable.

---

## 9. Delivery plan

| Phase | Output | Definition of done |
|---|---|---|
| **1** ✅ | This document | Reviewed and signed off |
| **2** | Domain model + contracts; ADRs for identity, comparability, deadlines | Types compile; no I/O in `domain/`; ADRs accepted |
| **3** | Supplier layer: contract, registry, error taxonomy, TJ + RG adapters, contract test-suite | Both adapters pass the suite against recorded fixtures |
| **4** | Search orchestrator: fan-out, match, price, merge, compare, filter, sort, paginate | §37 scenarios green, including the §52 price tests |
| **5** | Canonical catalogue, supplier mappings, destination service, sync jobs | Mapping coverage ≥ target for top destinations; backfill job idempotent |
| **6** | Detail + rates | Detail page renders from canonical model for both suppliers |
| **7** | Revalidation / precheck with explicit price-change contract | Price-increase path exercised end-to-end |
| **8** | Supplier-neutral booking, confirm, cancel, refund | Book via TJ and via RG through one code path |
| **9** | Caching, coalescing, connection pooling, warmers | Latency budget met with correctness tests still green |
| **10** | Observability, metrics, tracing, circuit breakers, rate limits, health, alerts | Every §34 field emitted; runbook written |

Test matrix required before Phase 4 is called done (§37, §52):

```
TJ only · RG only · TJ+RG · TJ timeout · RG timeout
TJ error + RG success · RG error + TJ success · both fail
same hotel different prices · same hotel same price
different hotels same coordinates · similar names near coordinates
different supplier IDs same property · non-comparable rates
TJ 12,000 / RG 11,500 → 11,500 RG      TJ 10,900 / RG 11,500 → 10,900 TJ
```

---

## 10. Decisions needed before Phase 2

These change the design, so I need answers rather than assumptions. Where I have a recommendation it is stated first.

1. **Comparability policy (§48).** Recommend: compare within equivalence classes, surface other classes as alternative rates. Confirm — or state that KLAR wants absolute cheapest regardless of board/refundability.
2. **RateGain platform markup (D-1).** Search omits it; booking applies it. Which is the intended commercial behaviour? This determines whether live RateGain revenue is currently being under-collected or the bookings are over-charging.
3. **Partial-result honesty (§20).** Confirm the UI may show "best of the suppliers that responded". If it must always claim a guarantee, the deadline has to be a hard wait and latency rises accordingly.
4. **Search deadline budget.** Measured RateGain international geofilter ≈ 14.2 s. What is the maximum acceptable time-to-first-result?
5. **Rebuild target.** Single `hotel-api` service, or keep the search/booking split? Recommend a single deployable with internal module boundaries — the split is what produced the divergence in §1.3.
6. **Stack constraints.** Node/TypeScript is given. Keep MongoDB, or move canonical identity + bookings to Postgres? Recommend Postgres for canonical/booking (relational integrity on mappings and money) with Mongo retained for the property catalogue, but this is a real operational decision.
7. **Static-data source.** The catalogue is TripJack-derived. Is a supplier-neutral content source (GIATA or equivalent) available? It would move most matching to tier 1–2 and is the single highest-leverage input to match quality.
8. **B2B scope.** The reference carries a full B2B/agent-wallet path. Is B2B in scope for this rebuild, or is it B2C-only with B2B to follow?

**Immediate action regardless of the above:** rotate the OpenCage key committed at `destinationResolver.ts:43,180,272` (D-14).
