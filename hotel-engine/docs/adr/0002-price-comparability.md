# ADR-0002 — Price comparability and cheapest-deal selection

**Status:** Accepted · **Date:** 2026-08-13

## Context

Two independent defects made the reference system's "cheapest supplier" claim
untrue.

**Incommensurable inputs (D-1).** Platform markup was applied to TripJack
(`tripJackAdapter.ts:278`) and not to RateGain (`rateGainAdapter.ts:474`). The
function that would have priced RateGain correctly, `enrichRateGainPrice()`, had
zero callers. The comparison therefore ran *TJ net + markup* against *RG net*.
Worse, `hotel-booking-service` **did** mark up RateGain, so an RG stay was quoted
without the margin and validated with it.

**No notion of comparability (D-2).** `deduplicator.ts:89` compared
`currentPrice < existingPrice` and nothing else — not meal plan, refundability,
cancellation deadline, room type, occupancy, or whether the two totals even
meant the same thing (`taxesIncluded` was inferred one way for one supplier and
hardcoded contradictorily for the other).

## Decision

**1. Adapters return cost; one engine produces price.**
`SupplierCost` (base, taxes, fees, total, explicit `taxesIncludedInBase`) is the
only thing a supplier adapter can express. `SupplierContext` carries no markup
rules, no channel and no pricing config. `priceFromCost()` is the sole producer
of `CustomerPrice`. **An adapter cannot add margin even by mistake.**

**2. `CustomerPrice.total` is the only comparable number,** and
`comparePrices()` throws on a currency mismatch rather than degrading to raw
arithmetic.

**3. Two price identities are asserted at construction, not in tests:**

```
displayBase + taxesAndFees === total
sum(breakdown)             === total
```

`taxesAndFees` is *derived* (`total − displayBase`), never summed from named
parts. This is inherited directly from the reference `buildPublicPricing`, whose
comment records the failure it prevents: when each screen summed its own idea of
the components, the breakdown fell short of the total and the B2C margin
disappeared between the search card and the review page.

**4. Money is integer minor units.** Not a style preference: a comparison engine
whose totals drift by rounding artefacts picks a "cheapest" that flips between
identical requests.

**5. Deals compete only within an equivalence class:**

```
(occupancySignature, board.code, refundTier, roomCategory)
```

Group first, take the cheapest within each group, then feature the winner of the
group that best matches what the customer searched for. Every other group's
winner is surfaced as a real alternative rate.

**6. `ABSOLUTE_CHEAPEST` exists as an explicit `SelectionPolicy`,** never as a
default. The brief is emphatic that ignoring board and refundability must be a
stated business decision.

**7. Selection is a total order ending in a `dealId` tiebreak.** Price →
refund tier → board richness → supplier reliability → supplier code → deal id.
Without the final tiebreak, equal-priced deals could reorder between requests
and the "cheapest" badge would appear to move on its own.

## Consequences

- A cheaper non-comparable rate no longer takes the headline; it appears as an
  alternative. Some customers will see a headline price higher than the lowest
  number in the payload. That is correct, and the UI should label the
  alternatives so it reads as choice rather than inconsistency.
- Every markup step is recorded in `breakdown[]`, so any historical price can be
  explained. This matters for the D-1 remediation, where quoted and charged
  prices have been diverging on RateGain.
- Per-night display is rounded and therefore indicative; `perNightLines()`
  provides a split that sums exactly, for invoices.
- **Open commercial item:** applying platform markup uniformly changes what
  RateGain stays are quoted. Flagged in ADR-0000 §2 for sign-off before Phase 4.

## Alternatives rejected

- **Normalise prices only at comparison time.** Leaves each adapter free to
  produce a "price", which is exactly how D-1 arose.
- **Compare on supplier net and add markup after selection.** Breaks whenever
  markup is not a uniform percentage — per-supplier overrides and fixed fees
  both change the ordering.
- **Floating-point rupees with rounding at the boundary.** The reference did
  this. It survives display and does not survive comparison.
