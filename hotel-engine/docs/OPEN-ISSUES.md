# Open issues

Everything unresolved, in one place. Updated 2026-08-14, after Phase 8
(booking) and the audit of the booking and cancel paths that preceded it (§1.7).

Split three ways, because the three need different things from different people:

- **§1 Closed** — found and fixed, with the test that keeps it closed.
- **§2 Decided by KLAR** — the commercial calls, now settled and recorded.
- **§3 Needs information I do not have** — blocked on a document or a credential.

**Nothing in §3 is blocked on engineering.** Phase 6 can proceed; those items are
tracked so they are settled before the engine takes real traffic, not forgotten.

---

## 1. Closed

### 1.1 Found during the pre-Phase-6 audit

| # | Issue | Why it mattered | Test |
|---|---|---|---|
| A-1 | **RateGain search dropped `PropertyCode` / `BrandCode`.** Both are Required on `getproducts`, and the spec says to take them from `bestproperties` — which returns no rates to hang them on. | **Every RateGain rate lookup would have been rejected.** From the outside this reads as "RateGain never has availability", which is exactly how the defect would have been mis-diagnosed. | Two: a contract-suite assertion that any two-phase supplier can price a hotel its own search returned, and a RateGain end-to-end check on the outbound body. Both verified to fail when the bug is reintroduced. |
| A-2 | **`quotedTotalMajor` was not on the rate**, so precheck sent `BookingRate: 0`. | Rejected, or accepted against a price nobody agreed to. | The adapter now refuses rather than defaulting; a test asserts the rate carries it. |
| A-3 | **Cancel sent only a confirmation number.** §8 also requires `ReservationId`, `PropertyId`, `PropertyCode`. | A booking that could be made and not unmade. | Asserts the outbound cancel body carries all four. |
| A-4 | **`reservationId` was reported as `hotelConfirmationNumber`.** It is RateGain's internal id; the commit response has no PMS number. | A meaningless reference printed on the voucher. | Asserts it is absent, and that the id goes to the state cancel needs. |
| A-5 | **Nationality was defaulted to `'IN'` inside the adapter.** | Silently re-prices for a different traveller than the one who searched. | Now required on `SupplierPrecheckRequest` and `SupplierBookRequest`; the compiler enforces it at every call site. |
| A-6 | Dead code and an unused parameter. | — | `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `allowUnreachableCode: false` now on. |

### 1.2 Found earlier, from the RateGain specification

Six defects in an adapter reverse-engineered from working code. Detailed in
[SUPPLIERS.md](SUPPLIERS.md); summarised here because they are the strongest
argument for obtaining the TripJack specification (§3.1).

`bestproperties` returns no bookable rates · excluded taxes and `Fees[]` are
payable on top · `sellingRate` is a selling floor, not a cost · page size is 10
· `categoryCode` is a string · the commit confirmation is nested and lower-camel.

### 1.3 Found by running one contract suite against two implementations

The in-memory `PropertyRepository` appended a duplicate mapping where the real
one upserts. The orchestrator's entire scenario suite runs against that fake, so
it had quietly stopped describing production.

### 1.4 Found by the Phase 1–5 cross-check

Seven defects, none of which the 439-test suite caught. Each fix carries a
regression test that was **verified to fail when the fix is reverted** — the
check that separates a test from a comment.

The first three share a root cause worth stating on its own: **Phase 3 built
careful guards inside supplier calls and nothing equivalent around what happens
after fan-out.** ADR-0003's "failure is data the orchestrator records, not an
exception that unwinds the fan-out" stopped at the fan-out edge, and three
separate trip-wires behind it could each fail a whole search.

| # | Issue | Why it mattered | Test |
|---|---|---|---|
| B-1 | **One malformed supplier value aborted the entire multi-supplier search.** Response mapping ran outside `callSupplier`'s guard, `money()` throws on a value that is not a safe integer once scaled, and `fanOut` used a bare `Promise.all`. | No results from *either* supplier and no `SupplierAttempt` for anyone — the search failing whole where one supplier should have been reported unavailable. Violated ADR-0003 §2 and §3. | Two: a throwing adapter is recorded as its own `ERROR` while the other supplier's results still return, and an unmappable property is dropped rather than failing the page. Isolation is now enforced in `runOne` instead of assumed of every adapter forever. |
| B-2 | **Match tier 2 compared a chain code against `externalIds`** and returned `EXACT_SUPPLIER_MAPPING` — ahead of the two-signal rule. | Dormant only because nothing writes `external_ids` yet; the column is already hydrated on read. Licensing a content source would have merged every hotel of a chain into one canonical record at top confidence, with the mapping persisted as tier 1 thereafter. The precise outcome ADR-0001 exists to prevent. | `matcher.test.ts`: two Marriotts in one city do not merge on their chain, a real property-level id still does, and the tier stays inert while no source is licensed. |
| B-3 | **`persistMapping`'s `ON CONFLICT` covered the primary key but not the `(klar_hotel_id, supplier)` unique index.** | Postgres raised `23505` and nothing caught it. The matcher's in-memory screen is a read then a write with no transaction, so two concurrent searches both pass it and one 500s. The in-memory fake meanwhile *overwrote* the incumbent — the two implementations disagreed about the one thing that index decides. | In the shared repository suite, so both implementations must agree: a second property from the same supplier is refused, returns `false`, and does not throw. |
| B-4 | **Nothing after the fan-out consulted the deadline, and the post-fan-out stage was serialised.** One `rateTokens.issue` round trip per rate, awaited in sequence, for every rate of every hotel — before filtering and pagination. | ADR-0003 budgets 14 s per supplier inside a 15 s hard deadline; hundreds of sequential round trips do not fit in what is left. | Tokens are now issued concurrently (a probe asserts more than one call in flight), and catalogue write-backs — an investment in the *next* search — are skipped once the deadline has gone, without changing what this customer sees. |
| B-5 | **`readTaxSplit` returned zero for a tax list that arrived as a bare array** — the shape its own comment said the commit response uses, and the one `readFeeSplit` already accepted. | A rate with a 250 excluded tax priced at 10,000 instead of 10,250. Silent, and in the direction that under-quotes — the §1.2 defect class re-entering through the parser rather than the arithmetic. | Both shapes are read, and the excluded tax reaches the cost total. |
| B-6 | **The markup region was read off the first returned hotel that carried a country.** | Order- and timeout-dependent, and a region selects a markup rule, which sets a price. One country's rules were applied to a result set that might span a border, and quoting and charging could disagree. | The destination is now the authority; where it has none (a bare coordinate search) the fallback is the *majority* country of the inventory — deterministic, and tie-broken by code. Tested both ways, including that reordering the inventory does not move the answer. |
| B-7 | **`fromMajor` did not round the way it documented.** `1.005 * 100` is `100.49999999999999`, so genuine decimal halves rounded down. | One paise — but a load-bearing claim in the file whose whole premise is exact money. | Decimal halves round away from zero, including negatives, zero-decimal currencies and exponential inputs. |

Two smaller observations were recorded and deferred to Phase 7, which has now
**closed both**. `precheckRate` matched the requested `supplierRateRef` before
returning, falling back to the first only when RateGain does not echo the key —
safe, because revalidation compares the result against the sealed quote anyway.
`applySort` now raises `SORT_CURRENCY_MISMATCH` instead of ordering a page by
currency code, so a mixed-currency result set fails loudly rather than producing
a plausible wrong order.

### 1.5 Found by the second cross-check — TripJack, sync, revalidation

The areas §1.4 explicitly did not reach. Nine defects; same rule, each fix
verified to fail when reverted. One suspicion was **disproved** and is recorded
because a checked assumption is worth as much as a fixed bug: TripJack's cost
split is correct — `totalPrice` stays authoritative and the base is derived
from it, so `mf`/`mft` cannot double-count.

Two of these sit at the booking gate, which had no test that could see them.

| # | Issue | Why it mattered | Test |
|---|---|---|---|
| C-1 | **Revalidation compared prices across currencies.** `delta` is a raw subtraction of minor units, with no currency check. | Quoting INR 11,800 (1,180,000 paise) and re-pricing at USD 140 (14,000 cents) read as a **1,166,000-unit decrease** — an outcome that proceeds *without consent* and charges the fresh figure. `comparePrices` throws on exactly this; the last gate before a charge was laxer than the search that led to it. | Throws on a currency switch; still compares normally within one currency. |
| C-2 | **The room-substitution check compared `category` only**, and `classifyRoom` returns `UNKNOWN` for every name missing its keyword list. | "Garden View Room" → "Pool Facing Room" is `UNKNOWN` → `UNKNOWN`, so it passed as `UNCHANGED` — a silent substitution at the booking gate, across a large share of real inventory. "Deluxe King" → "Deluxe Twin" passed too. | Both swaps now raise `ROOM_CHANGED`; the supplier room code wins when both sides carry one; spacing and case do not manufacture a false substitution. |
| C-3 | **TripJack's star rating was unbounded.** `rating` also carries review scores. | A `rating: 8.5` became `starRating: 8.5` → a phantom "9-star" facet bucket, a broken star filter, and a matcher `STAR_RATING` signal that can never sit within one of a real 5. RateGain's reader already bounded its own. | Only 1–5 is accepted; a real 5 still reads. |
| C-4 | **One unmappable rate option threw out of the whole hotel.** | The adapter-level guard from B-1 caught it, so the *search* survived — but the property vanished from results because one of its eight options had a bad price. | The mappable rates survive, and the dropped one is reported through `onSkippedRate` rather than lost silently. |
| C-5 | **TripJack's occupancy mapper defaulted a missing adult count to 2.** | Occupancy is part of the equivalence class, so an invented count files the deal in the wrong comparability bucket and prices a party nobody described. The same mistake as A-5, with the correct pattern already sitting two lines below it in the children branch. | Falls back to the requested occupancy; a supplied count still wins. |
| C-6 | **`matchDestination`'s exact-name branch used `find`.** The country gate — "hard", per the module — is skipped entirely when a supplier entry carries no country. | Two Springfields, no country: whichever was first in the list won, at score 1, bypassing the ambiguity check that exists for this. "A destination mapped to the wrong code sends every search for that city to a different city." | Two identical names report `AMBIGUOUS`; a country that narrows it to one still matches exactly. |
| C-7 | **Two supplier destinations resolving to one canonical destination silently collapsed.** `destination_mapping` is keyed `(supplier, klar_destination_id)`, so the second write *replaced* the first. | Whichever code the supplier happened to list last became the definition of that destination, and the run reported both as `mapped`. | The clash goes to review as a new `collided` count; the incumbent keeps the mapping. |
| C-8 | **`createFromSupplier` left an unreachable canonical hotel.** The row was inserted first and `ON CONFLICT DO NOTHING` then declined the mapping. | A hotel no supplier maps to — precisely what that transaction's own comment says must not happen. The backfill counted each as `created`, and every orphan then sat in the candidate pool as a duplicate name at the same coordinates that nothing could resolve to. | In the shared repository suite, so both implementations must agree — and the in-memory fake had the same defect. |
| C-9 | **The backfill deduplicated against the store but not within a batch**, and hand-rolled its own copy of `supplierRefKey`'s format. | A 1.6 M-document legacy collection repeats ids; each repeat became a second create. The private key copy is the §1.3 divergence pattern waiting to happen again. | One hotel for a thrice-repeated id, no hotel left unmapped, and the shared key function is used. |

**Still not audited to the same depth:** `enrichment.ts` beyond reading it (its
deadline handling and budget logic are correct as written), the TripJack booking
and cancel paths, and the circuit breaker. Nothing in Phase 6 depends on them.

### 1.6 Found by auditing the legacy request mapper

`compat/legacy-request.ts` reached the HTTP edge tested only *through* the API,
which is how nine defects survived a green suite. A multi-agent audit proposed
fourteen; each was then handed to an independent agent instructed to refute it,
and five were refuted — recorded here because a checked assumption is worth as
much as a fixed bug.

| # | Issue | Why it mattered | Test |
|---|---|---|---|
| D-1 | **Guest nationality was used as the destination lookup's country filter.** | `countryCode` on a legacy payload is the *traveller's* nationality; the resolver applies country as a hard SQL equality. An Indian customer searching Dubai, Paris or Bangkok matched no destination and got a 404. **All outbound international search was dead.** | Resolves a destination abroad for a domestic traveller, and the nationality still reaches the suppliers. |
| D-2 | **`priceRange: [0,0]` — the panel's "nothing selected" sentinel — was taken literally.** It ships on every request once any *other* filter is touched. | The result set emptied the moment a customer ticked a star rating: 200 OK, zero hotels, `hasMore: false`. | The sentinel produces no price bounds; a real range still does. |
| D-3 | **`userRatings` and `priceRanges` were silently dropped** though §2.4 lists both. | The client filters locally on what it asked for, so each page arrived full of hotels it discarded — the customer scrolled near-empty pages while `hasMore` promised more. | `priceRanges` becomes one covering span; `userRatings` is reported through a new `unsupportedFilters` field, because the canonical hotel has no review score to filter on. |
| D-4 | **Price bounds were scaled by a hardcoded ×100.** | Minor units per major unit is a property of the currency. A ¥8,000 filter became ¥800,000 and emptied every JPY search; a 3-decimal currency under-scaled by 10. | Both INR and JPY, via `exponentOf`. |
| D-5 | **Nothing type-checked the payload**, though this is the only parser between raw JSON and the domain. | `destination: 12345` became a `TypeError` several layers in and a 500 where the answer is 400. | Six wrong-shaped fields, each refused with a reason. |
| D-6 | **An unrecognised meal type became the `UNKNOWN` board code**, which is a real code meaning "the supplier did not say". | Filtering for "Lunch Included" returned every hotel whose board could not be classified — widening the filter instead of narrowing it. | Unrecognised boards are dropped and reported, not matched. |
| D-7 | **An absent `sortBy` defaulted to `RECOMMENDED`**; the frontend's own default is `price_asc`. | The server paginated in one order while the client re-sorted the page it was handed — the D-13 defect `present.ts` says it avoids. | The default is `PRICE_ASC`. |
| D-8 | **Provider codes were cast unvalidated.** | A typo queried nobody and returned 200 with zero hotels, indistinguishable from sold-out inventory. | An unknown code is a 400 naming it; known codes pass through. |
| D-9 | **The canonical-id branch tested for `KLAR-HOTEL`**, a prefix no minted id carries (Postgres mints `KLAR-<uuid>`), and cast the id through without checking the catalogue. | Dead code where a live affordance was intended, and an unverified id searched for a hotel nobody has. | A real canonical id resolves; an unknown one is `UNKNOWN_HOTEL`. Whitespace around a prefixed id no longer 404s a hotel that exists. |

### 1.7 Found by the pre-Phase-8 audit of the booking and cancel paths

The areas §1.5 named as "still not audited to the same depth": the TripJack
booking and cancel paths, and the circuit breaker. Phase 8 is built on all of
them, so they were audited before anything was built on top.

**Ten defects. Nine of the ten are only reachable by a customer who is paying** —
they sit between "the card is charged" and "the room is held", which is the one
stretch of this system where being wrong costs money in both directions at once.
Every fix carries a test verified to fail when the fix is reverted.

| # | Issue | Why it mattered | Test |
|---|---|---|---|
| E-1 | **A commit was retried like a search.** `callSupplier` retried any `retryable` failure, and `book` went through it with `maxRetries: 1`. | A timeout on a commit is the case where the supplier has most often *received* it. The retry books the room twice — at the hotel, on the customer's card and on our invoice. The supplier-side idempotency that would make it safe (TripJack's `x-idempotency-key`, RateGain's `EchoToken`) is sent but is unverified against either specification (§3.1). | Repeating is now opt-in (`CallOptions.repeatable`), so an author who forgets it on a search loses a retry and one who forgets it on a write loses nothing. In the contract suite: a commit that times out is sent exactly once. |
| E-2 | **An unknown outcome was reported as FAILED.** Both adapters answered every transport failure — timeout, 5xx, unparseable body — with `status: 'FAILED'`. | FAILED is what triggers a refund. So a commit that *succeeded* but did not answer refunded the customer, told them nothing was booked, and left KLAR paying for a room nobody would sleep in. The adapters already reasoned this way about an unknown *status string* ("unknown means unknown"); they did not apply it to the case where it matters most. | `mayHaveBooked()` in the shared error taxonomy, plus contract-suite assertions that a 500 is PENDING and a 400 is FAILED — a property every supplier must have, not a fact about these two. |
| E-3 | **`holdOnly` was silently ignored.** RateGain declares `supportsHold: false` and sent `ResStatus: 1` — Confirmed — regardless; TripJack's hold is a different call that is not implemented. | "Hold this room" was answered with a paid, confirmed booking the customer is liable for. | Both refuse, and the contract suite requires that a supplier declaring no hold support sends nothing at all. |
| E-4 | **The guest list was never checked against the occupancy that was priced**, and the two adapters disagreed about who the booking was under. Both walked a flat array with a positional cursor and filled any gap with `'Guest'`. | A party priced for four adults and submitted with two produced a real reservation whose third and fourth travellers were named "Guest Guest". And TripJack read `isPrimary` while RateGain assigned it positionally, so the same party in a different order put different names on the two suppliers' bookings. | One `allocateGuests` for every supplier, which refuses rather than pads; contract-suite assertions that a short party and a party with no primary guest are both refused **with nothing sent**. |
| E-5 | **A failed half-open probe did not re-open the breaker.** `openedAt` never moved, so `state()` kept reading HALF_OPEN and admitted the next call, and the next, until a whole fresh threshold of failures accumulated. | The class promises "exactly one probe" and delivered one probe per call for as long as the supplier stayed down. On the booking path those calls are commits, aimed at a supplier already known to be failing. | Re-opens immediately, and the new window is measured from the failed probe. (Also: `openedAt` was a number with `0` meaning "never opened", so a breaker that opened at clock zero read as closed for ever.) |
| E-6 | **TripJack reported every accepted cancellation as PENDING.** Its success signal is `status.success` and `status` is an OBJECT; the adapter read a top-level status *string*, found nothing, and fell through. | Nothing polls a pending cancellation. The booking stayed in `CANCELLATION_PENDING` and the customer was never refunded for a stay TripJack had already released. The existing test asserted `PENDING` — it documented the defect rather than catching it. | An accepted cancellation is CANCELLED; an acknowledgement with no reference to quote back stays PENDING. |
| E-7 | **RateGain's two calls return room codes from two different identifier spaces.** `getproducts` gives `roomCode: "483146225"`; `PreCheckReservation` gives `RoomCode: "DBL.ST"`. | `roomsDiffer` prefers a supplier's own code whenever both sides carry one (the C-2 fix), so it compared `"483146225"` with `"DBL.ST"` and reported ROOM_CHANGED. **Every RateGain booking would have been refused** at the last step before payment, for a substitution that never happened. | The reservation-side code is kept for the envelope and off the comparison; the room name decides. Caught by the end-to-end composition test, which books through Postgres and the real adapter. |
| E-8 | **The cancellation fingerprint compared formatting and price, not terms.** Two separate causes: RateGain stamps the same policy as `"2026-09-05 00:00:00"` on one endpoint and `"2026-09-05T00:00:00+05:30"` on another; and a penalty is an absolute amount derived from the rate, so a rate that re-prices restates it. | Either one reported CANCELLATION_CHANGED — which is refused outright — where nothing had changed. The second is worse than it looks: a price rise on a non-refundable rate became a dead end instead of the consent prompt the customer would have accepted. | The adapter normalises its own supplier's date formats; the fingerprint drops the *start* of a free window (not a term — "you may cancel from now") and compares penalty amounts only when both sides cost the same. |
| E-9 | **TripJack was sent an ISO country code where its API takes an internal country id.** The composition root passed `"IN"` through, marked `TODO(phase-8)` on the reasoning that only booking needed the real lookup. | It does not hold: nationality reaches every listing and pricing call and decides both price and availability, so *search* was asking TripJack to price a traveller it had not described — A-5 again, one layer out. | `/hms/v3/nationality-info`, fetched once and cached, with the reference implementation's recorded table as the fallback. An unknown country is **refused, not defaulted to India**, which is what the reference did. |
| E-10 | **A booking could be read with only its id.** A wrong `token` fell through to the owner check, and a booking with no `userId` was returned to anyone who asked with a token that did not match. | The id appears in logs, support tickets and URLs; the token does not. | The token must be the token *for that booking*; without one the caller must be the owner; and every refusal is the same 404, so the id space cannot be used as an oracle. |

**And a fourth fake/real divergence, found by the revert check.** The nationality
fix appeared to pass with the fix reverted, because `FakeDestinationResolver.lookup`
ignored `countryCode` while the Postgres resolver applies it as a hard filter —
so the test could not see the defect it was written for. The fake now applies it.
Every one of §1.3, B-3, C-8 and this has the same shape: **a fake that is more
permissive than the store it stands in for turns a passing suite into evidence of
nothing.**

---

## 2. Decided by KLAR

Settled 2026-08-13 and recorded in
[ADR-0007](adr/0007-confirmed-commercial-defaults.md). All four confirmed the
behaviour already in the code, so nothing in `src/` changed. They are written
down because an undecided default and a decided one are indistinguishable from
inside the repository, and only one of them survives the question "why is it
like this?".

| # | Question | Decision | Where it lives |
|---|---|---|---|
| 2.1 | RateGain platform markup — the reference omitted it at search and applied it at booking, and the two had diverged in production | **Uniform across every supplier**, search and booking alike | `PricingService` is the only cost→price path; `SupplierContext` carries no markup rules, so no adapter can add margin. `MarkupRule.supplierOverrides` is the deliberate escape hatch and is populated nowhere. |
| 2.2 | Comparability policy | **`EQUIVALENT_CLASS_PREFERRED`** — cheapest deal that buys what was searched for; cheaper other classes stay bookable as alternatives | `SearchOrchestratorConfig.selectionPolicy`, required with no language-level default so Phase 6's composition root must state it. `ABSOLUTE_CHEAPEST` stays implemented and tested, never inherited by accident. |
| 2.3 | Partial-result wording | **"Best of the suppliers that responded"** — the deadline stays a deadline | `priceGuarantee: 'PARTIAL'` is already emitted and tested. Outstanding work is copy, not engine. |
| 2.4 | Indicative prices | **"from ₹X"**, never shown as a firm price | `priceKind: 'INDICATIVE'` is already emitted and tested. Outstanding work is copy, not engine. |

**2.3 and 2.4 are complete in the engine and incomplete as product.** The
compatibility projection for the existing frontend (§4) has to carry
`priceGuarantee` and `priceKind` through rather than flattening them to a number.
Those two fields are that projection's acceptance test.

---

## 3. Needs information I do not have

### 3.1 The TripJack specification — highest value outstanding item

**`tripjack.com/page/api-doc` is a JavaScript shell with no fetchable content,
and there is no public documentation host.** The docs sit behind their partner
portal.

The TripJack adapter is therefore built from the reference implementation's
working integration. That is real evidence — it was booking against the live API
— but it is not a document, and three things remain unverified:

| # | Question | Current assumption | Risk |
|---|---|---|---|
| 3.1a | Is `apikey` the correct auth header? The reference sent six variants, so which one worked is unknown. | `apikey` + `agencyid`. Corroborated by TripJack's public integration notes. | Auth failure on every call — loud and immediate. Low. |
| 3.1b | Was the spoofed Chrome User-Agent load-bearing for the WAF? | Not sent. | 403s under burst. Mitigated by concurrency 3. |
| 3.1c | Is `totalPrice` genuinely all-in? | Yes — total authoritative, base derived. | A resort-fee equivalent charged at the hotel would be missing from the quote. This is the RateGain `Fees[]` defect in a different costume. |

**Ask TripJack for the HMS/OMS v3 specification.** The RateGain spec turned up
six defects in an adapter built exactly the same way, two of them money bugs.
There is no reason to expect a different yield here.

### 3.2 RateGain commissionable-model reconciliation

Does the B2C net-rate-plus-commission model expect KLAR to remit `sellingRate`
and reclaim commission, or to be invoiced `totalNet`?

Assumed: invoiced `totalNet`, commission recorded as revenue. Answerable with
**one test booking reconciled against an invoice** — which also settles 3.1c.

**One more question for the same test booking (new, from E-8):** RateGain's
shopping endpoint stamps cancellation deadlines as naive local datetimes
(`"2026-09-05 00:00:00"`) while its reservation endpoints stamp the same policy
with an offset (`"...+05:30"`). The adapter reads the naive form as IST, which
is the offset RateGain itself sends and the zone its platform runs in. It is an
assumption, and the alternative is not "no assumption" — it is reading the
timestamp in whatever zone the process happens to be deployed in, which would
make a cancellation deadline depend on the deploy region. **Confirm the zone.**

### 3.3 Credentials for live verification

Every adapter is verified against recorded payloads. Nothing has been run
against a live supplier. Sandbox credentials for both
(`sandbox-smartdistribution.rategain.com`, `apitest-hms.tripjack.com`) would let
the contract suite run against the real APIs.

---

## 4. Deliberately deferred

Not issues — scheduled work, listed so they are not mistaken for oversights.

| Item | Phase | Note |
|---|---|---|
| Caching, request coalescing, warming | 9 | **Built.** Dynamic availability caching, request coalescing and rate tokens (`src/modules/search/orchestrator.ts`, `src/infrastructure/cache`). Static property and destination/geo caching (`CachedPropertyRepository`, `CachedDestinationResolver`), cache-aside with no invalidation path — only a HIT is ever written, so nothing needs explicit invalidation. Cache warming (`CacheWarmer`, `src/modules/search/warming.ts`) runs an operator-stated list of searches (`KLAR_WARM_TARGETS`) through the same `SearchOrchestrator.search()` a customer uses, on an interval inside the dynamic cache's fresh window — reusing `search()` rather than a bespoke warming path means `isCacheable`'s "never cache a partial result" rule applies to a warmed entry exactly as it does to a real one. There is no popularity tracking to derive the list from (Phase 10, observability), so it is configuration, the same posture `KLAR_MARKUP_RULES` takes on markup. |
| Booking tables and persistence | 8 | **Built.** `002_booking.sql` — `booking`, `booking_supplier_payload`, `booking_event` — with a Postgres repository and an in-memory one held to one shared contract suite. |
| Rate-token resolution in the booking flow | 7–8 | **Complete.** `consume` is now called by commit, and it answers *whether this caller retired the token* — which is what stops two commits under different idempotency keys booking the same rate twice. |
| Detail and rates endpoints | 6 | **Built and served.** `src/modules/detail`, projected through `src/modules/compat`, served by `src/api` from the composition root in `src/composition`. |
| Compatibility projection for the existing frontend | 6–8 | **Built and served** — `src/modules/compat`, derived from the frontend source rather than the teardown summary. Carries `priceGuarantee` and `priceKind` per ADR-0007. |
| Observability, metrics, tracing | 10 | **Diagnostics logging and a metrics endpoint built.** `SearchOrchestrator.search()` logs the full `SearchDiagnostics` object per search, and now also records it into `MetricsRegistry` (`src/infrastructure/metrics/registry.ts`) — an in-process, dependency-free counter registry served at `GET /metrics` in Prometheus text format: searches total, cache hit/miss/stale, deadline hits, search duration sum+count, and supplier attempts by outcome. Always on, unauthenticated (access control is assumed to sit at the network/ingress layer, the ordinary posture for a scrape endpoint), and carries no customer data. **Still outstanding:** no tracing, and no exporter for anything outside the search path (booking, revalidation). |
| B2B channel | after B2C | `Channel` is first-class in the domain; B2B is a pricing configuration. |

### What Phase 7 left, and what Phase 8 did with it

| Item | Now |
|---|---|
| **The consent round-trip** | **Closed.** `decideCommit` is the other half: precheck reports, commit enforces. A price beyond tolerance is refused with the new figure; a commit carrying `consent` for *at least* that figure proceeds; a price that moved again after the customer accepted asks again. A substituted room, board or cancellation policy is refused at any price — a price consent is not agreement to a different product. |
| **`consume` is uncalled** | **Closed**, and strengthened: it now reports whether *this* caller retired the token, which is the lock that stops two commits under different idempotency keys booking the same rate. |
| **TripJack's precheck is unexercised against a real payload** | **Still open.** `hms/v3/hotel/review` has a fixture built from the reference integration, not from a document. §3.1 in miniature. |
| **`resolveNationality` for TripJack is a stub** | **Closed**, and it was worse than a Phase-8 stub — see E-9. |

### Carried into Phase 9 and beyond

| Item | Note |
|---|---|
| **No authentication on any endpoint** | **Closed (Phase 10).** `POST /api/booking/commit` and `/cancel` now require a verified bearer token (`AuthVerifier`, `HmacJwtVerifier` in `src/infrastructure/auth`) — absent config refuses every request, the same posture `PaymentGateway` takes on an unconfigured charge. The verified subject replaces anything the client claims about who it is; `commit`'s old, self-reported `userId` field is gone. `cancel` also checks that the authenticated caller owns the booking, the same oracle-safe way the read path (`bookingHandler`) does: a booking that belongs to someone else answers exactly like one that does not exist, not a 403 that would confirm it. A booking with no `userId` — one made before the auth gate existed — has no owner to check against and is left to the write itself. The reference used JWT via an auth-service; this verifies a token minted elsewhere, it does not issue one. |
| **No payment gateway** | `PaymentGateway` is a port with no implementation: KLAR's gateway credentials are not in this repository. A deployment without one declines every commit at the charge and warns at boot — deliberately, because a gateway that says yes would book real rooms against payments nobody took. |
| **Nothing polls a pending booking** | **Built (Phase 10).** `BookingReconciler` (`src/modules/booking/reconciler.ts`) sweeps `BookingRepository.findUnsettled` — backed by the `booking_unsettled` index — on an interval and calls `confirm()` on each, isolating one failure from the rest of the batch. Always running; `buildHotelApi` starts and returns it, `main.ts` stops it on shutdown. **Residual gap:** `confirm()` only actually settles `SUPPLIER_PENDING` — `CANCELLATION_PENDING`, `MANUAL_REVIEW` and `PAYMENT_HELD` are swept and passed to it but nothing today moves them, since polling a stuck cancellation or resolving a review needs its own decision (a fingerprint to re-ask, a human's judgement), not this worker reaching past the one settling operation that exists. A supplier that never declares async booking — RateGain, whose spec documents no status-poll endpoint — correctly stays in `MANUAL_REVIEW` rather than being polled with a fabricated call; that is ADR-0008 §7's design, not a gap. That queue is now at least visible: `GET /api/ops/unsettled-bookings` (gated the same way `commit`/`cancel` are) answers it, so the human judgement calls this residual gap describes have somewhere to be made from. |
| **Rate tokens default to in-memory** | **Closed at the code level (Phase 10).** `RedisKeyValueStore` (`src/infrastructure/rate-token/redis-store.ts`) implements `KeyValueStore` over a structural slice of an ioredis client — the same pattern `QueryableClient` uses for `pg`, so `ioredis` stays an optional, dynamically-imported dependency of the deployable, not the engine. `main.ts` connects it when `REDIS_URL` is set. **Still an operational task:** absent `REDIS_URL`, the in-memory fallback is correct for exactly one process; it warns, it is not enforced, and a multi-instance deployment must set the variable itself. |
| **A cancellation penalty in another currency is not refunded automatically** | It goes to review instead. Converting at a rate nobody quoted would return an amount that reconciles against neither the charge nor the invoice. |
| **`booking_supplier_payload` has no retention policy** | **Mechanism built (Phase 10); the window itself is still someone's call.** `BookingRepository.purgeSupplierPayloadsBefore` + `PayloadRetentionJob` (`src/modules/booking/payload-retention.ts`) sweep and delete rows older than a configured cutoff, on the same start/stop interval shape as the warmer and the reconciler. `KLAR_PAYLOAD_RETENTION_DAYS` is the only way to turn it on — absent, the job never starts and rows are kept forever, the same "no default that decides a policy" posture `KLAR_MARKUP_RULES` takes on markup. Someone still has to state the number. |
| **No rate limiting at the API edge** | **Closed (Phase 10).** A fixed-window per-IP limiter in `src/api/server.ts` — a `Map` and a comparison, no library — applies to every route except `/health` and `/metrics`, which are operational traffic rather than customer traffic to throttle. Defaults to 300 requests / 60 s per IP (`KLAR_RATE_LIMIT_WINDOW_MS` / `KLAR_RATE_LIMIT_MAX_REQUESTS` override it), a flood backstop rather than a tuned product limit — nothing about the number was a commercial decision the way the markup or retention windows are. `ponytail`: the map is keyed by every distinct address seen and is not swept independently of a key's own window rolling over, so an attacker rotating source addresses grows it unboundedly; add an LRU cap if that becomes a real vector. |

---

## 5. One action for KLAR, today

**Rotate the OpenCage API key** committed at
`_reference/.../destinationResolver.ts:43,180,272`. It is live in the reference
repository's history. Nothing in the new engine uses it, but rotating it is not
something the rebuild can do.
