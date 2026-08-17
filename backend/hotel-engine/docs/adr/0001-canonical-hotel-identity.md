# ADR-0001 — Canonical hotel identity and property matching

**Status:** Accepted · **Date:** 2026-08-13 · **Supersedes:** the reference deduplicator

## Context

The reference system had no hotel identity of its own. `Hotel.model.ts` was keyed
by `tjHotelId` — a TripJack ID space — and a hotel's identity in flight was the
string `"TJ:100000001234"` or `"RG:abc"`, which travelled unchanged into the
frontend as `hotel.id`, into `/products` routing, into precheck, and into commit.

Cross-supplier matching happened once per search, in `deduplicator.ts`: an O(n²)
scan merging on `latDiff < 0.001 && lngDiff < 0.001` plus substring name
containment gated on the shorter name exceeding five characters. Nothing was
persisted, no confidence was recorded, and `"Marriott"` merged into
`"Marriott Executive Apartments"`.

## Decision

**1. KLAR issues its own opaque `klarHotelId`.** Supplier ids reach it only
through `supplier_property_mapping`. `KlarHotelId` and `SupplierHotelId` are
distinct branded types, so passing one where the other is expected is a compile
error rather than a convention.

**2. Matching is a persisted, tiered, confidence-bearing operation:**

| Tier | Signal | Confidence | Merge? |
|---|---|---|---|
| 1 | Persisted mapping | `EXACT_SUPPLIER_MAPPING` | yes |
| 2 | Shared external id (GIATA / chain+property code) | `EXACT_SUPPLIER_MAPPING` | yes |
| 3 | Name ≥ 0.85 **AND** ≤ 150 m **AND** address token overlap | `HIGH_CONFIDENCE` | yes, persist |
| 4 | Name ≥ 0.65 **AND** ≤ 500 m **AND** same city **AND** stars ±1 | `MEDIUM_CONFIDENCE` | yes, flag |
| 5 | Anything weaker | `LOW_CONFIDENCE` | **no** — queue for review |

**3. Two independent signals, minimum** (`hasEnoughSignals`). Coordinates alone
never merge; a name alone never merges. Tier 1 and 2 are the only single-signal
exceptions, because both are an identity assertion rather than an inference.

**4. A merged hotel reports the *weakest* confidence among its constituents**
(`weakest`), so one confident supplier cannot launder an uncertain one.

**5. Similarity is token-set Jaccard, not substring containment.** Extra tokens
in the longer name count *against* the match. Chain prefixes, punctuation,
diacritics, legal suffixes and generic words are stripped first — and if
stripping would leave nothing ("The Hotel"), the full token set is used, so
generically-named properties do not all compare equal to each other.

**6. Confirmed tier-3 and tier-4 matches are written back**, so the second
search of a destination resolves at tier 1.

## Consequences

- Matching becomes O(n) catalogue lookups instead of O(n²) pairwise comparison,
  and improves over time rather than recomputing the same guesses.
- Duplicates will appear in results where confidence is genuinely low. This is
  the intended trade: a false merge shows a customer a price for a property they
  will not be staying in.
- `match_candidate` requires an ops review surface. Until one exists, tier-5
  pairs accumulate unreviewed — acceptable, since they do not affect output.
- Tier 2 is inert until a neutral content source is licensed (ADR-0000 §7).
  `CanonicalHotel.externalIds` is reserved so activating it needs no model change.

## Alternatives rejected

- **Keep supplier ids as identity, map at the edge.** Every consumer still needs
  to know which supplier a hotel came from, which is the problem.
- **Merge on coordinates alone, tightened to 50 m.** Suppliers return a shared
  city-centre pin for properties they could not geocode; tightening the radius
  does not help when the inputs are identical.
- **A learned matcher.** Defensible later, unusable now: no labelled data, and
  no way to explain a merge to an operator investigating a mis-sold booking.
