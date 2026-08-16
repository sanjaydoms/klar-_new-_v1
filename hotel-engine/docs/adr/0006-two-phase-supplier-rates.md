# ADR-0006 — Two-phase rates and targeted enrichment

**Status:** Accepted · **Date:** 2026-08-13
**Amends:** ADR-0004 (supplier contract), ADR-0002 (comparability)

## Context

ADR-0002 assumed every supplier returns bookable rates from search, so a merged
hotel always has at least one deal and a comparable price.

The RateGain Smart Distribution specification v1.5.3 contradicts that. Its
`bestproperties` hotel object carries a single indicative `price` — "Starting
price of the hotel (per night or package)" — and **no rate key**. Nothing it
returns can be booked or re-priced. Bookable rates require a second
`getproducts` call, per property.

This is not a RateGain quirk to work around; it is the normal shape of a
two-phase supplier, and the next supplier we add may well be one too.

The naive responses are both bad:

- **Enrich everything.** One HTTP call per property. Forty results is forty
  calls; at RateGain's observed latency that is several times the entire search
  deadline.
- **Drop what has no rate.** Silently discards a whole supplier's inventory —
  precisely the bug an earlier version of our own adapter had, which would have
  removed every RateGain result from every search.

## Decision

**1. `searchReturnsRates` is a load-bearing capability, not documentation.**
The orchestrator plans around it, and the shared contract suite asserts that a
supplier's search matches what it declares. Declaring it wrongly is caught at
test time rather than by an empty result page in production.

**2. `SupplierHotel.indicativeCost` carries the lead-in figure.** It is a
`SupplierCost` like any other and is priced through the same engine, so it is
directly comparable with a real quote. It is never bookable.

**3. `MergedHotel.featuredDeal` becomes optional,** paired with:

```ts
bestPrice: CustomerPrice        // the figure the hotel is ranked and shown on
priceKind: 'BOOKABLE' | 'INDICATIVE'
indicativeOffers: IndicativeOffer[]
```

A hotel nobody has quoted is still worth showing. It just must not claim a price
we have not secured, and its `comparison.priceGuarantee` is always `PARTIAL`.

**4. Enrichment is targeted: call only where the answer could change.**

A candidate earns a `getRates` call when either
- no supplier has quoted a bookable rate for that hotel at all, or
- its marked-up indicative price is **below** the best bookable price we hold.

An indicative price already dearer than the incumbent cannot become the winner
once quoted, so the call would buy nothing. Candidates are ranked with
hotels-without-any-bookable-price first, then cheapest, and run under a budget
(`maxCalls`, `concurrency`, `minRemainingMs`) inside the same absolute deadline.

**5. What was skipped is reported.** `diagnostics.enrichmentSkipped` counts
candidates that deserved a call and did not get one. That is the difference
between "no cheaper rate exists" and "we stopped looking", and hiding it would
be the same dishonesty ADR-0003 rejects for supplier timeouts.

## Consequences

- A mixed-supplier search costs one fan-out plus a bounded number of detail
  calls, rather than one call per result. The bound is configuration.
- Consumers must handle `featuredDeal === undefined`. The compatibility
  projection maps `price` from `bestPrice` either way and exposes `priceKind` so
  the UI can label a lead-in figure as "from".
- The enrichment decision depends on prices, so it runs **after** matching and
  pricing and **before** merge. That ordering is now load-bearing: enriching
  before matching would compare against the wrong incumbent.
- Latency is now sensitive to how many hotels both suppliers cover. Worth
  watching once real traffic exists; `enrichmentCallsIssued` is emitted for
  exactly that.

## Alternatives rejected

- **Treat the indicative price as bookable.** Fast, and it means quoting a price
  with no rate behind it — the customer discovers the real figure at the payment
  step. Precisely the quote-versus-charge divergence this rebuild exists to end.
- **Enrich the whole first page before responding.** Correct and far too slow:
  ~30 sequential-ish calls on top of a 15-second search.
- **Defer all enrichment to the detail page.** Cheap, but RateGain could then
  never win a price comparison at search time, which defeats the point of
  running it as a supplier.
