# ADR-0007 — Confirmed commercial defaults

**Status:** Accepted · **Date:** 2026-08-13

## Context

Four settings in the engine are commercial choices wearing engineering clothes.
The code had to pick something in order to run at all, and each time it picked
the conservative answer.

[ADR-0000](0000-phase-2-assumptions.md) adopted those picks as *assumptions* —
explicitly, with a cost to reverse against each, so Phase 2 could start without
waiting. It also set a gate on one of them: decision 2 carried the note that
**someone with commercial authority must confirm it before Phase 4 ships**. Phase 4
shipped. The gate was carried rather than cleared, and §2 of
[OPEN-ISSUES.md](../OPEN-ISSUES.md) is where it was held.

KLAR confirmed all four on 2026-08-13, each one matching the behaviour already in
the code. This ADR therefore changes no line of `src/`. It exists to promote
those four from assumption to decision — an assumed default and a decided one are
indistinguishable from inside the repository, and only one of them survives
someone asking "why is it like this?" six months from now.

The two that were live risks are worth naming. Decision 1 governs what customers
are quoted **today** — the reference system omitted platform markup on RateGain
at search and applied it at booking, and the two had been diverging in
production. Decision 2 governs what the word "cheapest" means on the results page.

## Decision

**1. Platform markup applies uniformly to every supplier.** RateGain carries the
same margin as TripJack, at search and at booking, computed once by the same
engine.

Enforced structurally rather than by convention: `SupplierContext` carries no
markup rules (ADR-0002), so no adapter can add margin, and `PricingService` is
the only path from `SupplierCost` to `CustomerPrice`. `MarkupRule.supplierOverrides`
exists as the deliberate escape hatch for a future per-feed margin; it is
populated nowhere, and populating it is now a decision requiring this ADR to be
superseded.

*The alternative was not "a bit more margin on RateGain".* It was RateGain
winning the featured-deal slot against TripJack for reasons unrelated to the
deal, on a page whose entire claim is that it compares them.

**2. `EQUIVALENT_CLASS_PREFERRED` is the production selection policy.** The
featured deal is the cheapest deal that buys what the customer searched for —
same occupancy, board, refund tier and room category. Cheaper deals in other
classes stay bookable as alternatives (ADR-0002 §3: nothing is discarded at
merge).

`ABSOLUTE_CHEAPEST` remains implemented and tested, and remains a stated business
decision rather than a default anyone can drift into. `SearchOrchestratorConfig.selectionPolicy`
is deliberately required with no language-level default, so a composition root
cannot omit it and inherit one silently — Phase 6 must state it.

**3. `PARTIAL` searches say so, in the customer's words.** The UI reads "best of
the suppliers that responded", not a bare "lowest price". The deadline stays a
deadline; a slow supplier degrades one claim, not every search's latency.

This is the consequence ADR-0003 flagged and could not close on its own: without
the wording, the honesty is recorded in the payload and not delivered to anyone.

**4. `INDICATIVE` prices are shown as "from ₹X".** Hotels no supplier has quoted
a bookable rate for stay in results with an explicitly soft price, never as a
firm one. Showing an indicative figure as bookable would reintroduce the
quote-versus-charge divergence this rebuild exists to end.

## Consequences

- ADR-0000 rows 1, 2 and 3 are no longer assumptions. Their "cost to reverse"
  column still holds — the code reads all three through configuration — but
  reversing now means superseding this ADR, not editing that table.
- Phase 6's composition root must set `selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED'`
  explicitly. It cannot forget to — the type requires it.
- Decisions 3 and 4 are complete in the engine and incomplete as product. They
  need copy, and the compatibility projection for the existing frontend must
  carry `priceGuarantee` and `priceKind` through rather than flattening them to a
  number. That projection is Phase 6–8; these two fields are its acceptance test.
- Revisiting any of these is a new ADR superseding this one, not a config edit
  made quietly. That is the point of writing them down.

## Alternatives rejected

- **Zero or reduced markup on RateGain** (the reference's search-side behaviour).
  Makes the cheapest-supplier comparison a comparison of markup policies.
- **`ABSOLUTE_CHEAPEST` as default.** Better on price-comparison aggregators;
  higher risk of the customer discovering at checkout that the headline price
  bought a non-refundable room-only rate for a different party size.
- **Always claiming the guarantee**, by hard-waiting for every supplier.
  Converts one supplier's bad minute into every customer's slow search, and
  ADR-0003 already rejected buying latency with accuracy in the other direction.
- **Suppressing `priceGuarantee` entirely.** Cheapest to build. Returns the
  divergence as a trust problem instead of a data problem.
- **Hiding `INDICATIVE` hotels.** Cleanest promise, visibly thinner result pages
  on long-tail destinations, and it discards inventory the customer could book by
  asking.
