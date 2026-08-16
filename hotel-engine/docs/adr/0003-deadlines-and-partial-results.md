# ADR-0003 — Search deadlines, supplier isolation and partial results

**Status:** Accepted · **Date:** 2026-08-13

## Context

RateGain's `bestproperties` is slow, and the reference codebase measured it
honestly in its own comments: **≈ 10.7 s** for a domestic geofilter search,
**≈ 14.2 s** international. TripJack's listing call is faster but must be run
across a *window* of candidate ids (≈ 1 bookable hotel per 20 ids), with
concurrency held at 3 because its WAF answers bursts with 403s.

The reference response to this was a soft/hard window pair — return once the
soft window elapses and at least one hotel is held, hard-stop at soft + 6 s. The
soft branch was then commented out (`hotels.service.ts:635-637`) with the note
*"If you want RateGain, we must wait for it!"*, leaving code and comments
describing a policy that no longer ran.

More seriously, supplier failures were invisible. `fetchOnePage` caught every
supplier rejection into `console.error` and dropped it. Nothing in the response
distinguished "RateGain had no inventory" from "RateGain timed out" — while the
UI continued to imply the displayed price was the cheapest available.

## Decision

**1. One absolute deadline per search, not a per-call duration.**
`Deadline` carries an instant and derives sub-budgets with `withBudget()`, which
can only move the deadline *nearer*. A pipeline that spends 4 s resolving a
destination cannot then grant a supplier a fresh 14 s.

Defaults (all configuration, ADR-0000 §4):

| Budget | Value | Basis |
|---|---|---|
| Hard search deadline | 15 s | RG international ≈ 14.2 s + margin |
| Soft target | 12 s | RG domestic ≈ 10.7 s + enrichment |
| Per-supplier budget | 14 s | Inside the hard deadline |

**2. A supplier is never cancelled because another one finished.** It is
cancelled when it exhausts its own budget or the search deadline passes. Waiting
for the slower supplier is the entire point of a price comparison.

**3. Supplier calls never reject.** Every contract method resolves with a status
and, where relevant, a `NormalizedSupplierError`. A failure is data the
orchestrator records, not an exception that unwinds the fan-out.

**4. Every search reports supplier health.** `SupplierAttempt` carries status,
duration, counts, pages consumed and a normalised error code. `SearchDiagnostics`
carries the `searchId`, deadline, whether it was hit, and merge statistics.

**5. Partial results are labelled, not disguised.**

```
priceGuarantee: BEST_AVAILABLE | PARTIAL
incompleteSuppliers: [...]
```

`BEST_AVAILABLE` requires every *eligible* supplier to have answered. A supplier
that answered "nothing available" **has** answered; one that is disabled or does
not serve the market is not a gap. Anything else yields `PARTIAL`.

**6. Late results are kept, not discarded.** A supplier that misses the deadline
still writes to the dynamic cache, so the next request — often the same user's
next scroll — sees the complete picture.

**7. Circuit breakers do not count our own cancellations.**
`countsAgainstBreaker()` excludes `SUPPLIER_CANCELLED`, `SUPPLIER_NO_AVAILABILITY`,
`SUPPLIER_RATE_EXPIRED`, `SUPPLIER_SOLD_OUT` and `SUPPLIER_BAD_REQUEST`.
Counting them would open breakers on healthy feeds during exactly the busy
periods when deadlines bite.

## Consequences

- Worst-case time to first result is ~15 s on a cold international search. That
  is slower than the reference's aggressive early return, and it is the trade
  the brief asks for: a search that is one second faster and names the wrong
  cheapest hotel is not acceptable for an OTA.
- The UI needs a treatment for `PARTIAL` — "best of the suppliers that
  responded" rather than a bare "lowest price". Without it the honesty is
  recorded and not delivered.
- Caching and warming carry more weight than in the reference, because they are
  now the only levers on perceived latency. That is Phase 9, deliberately after
  correctness.

## Alternatives rejected

- **Return the first supplier that answers.** Fast, and structurally unable to
  make the claim the product is built on.
- **Per-call duration budgets.** They compound; the deadline drifts with every
  upstream step.
- **Throwing on supplier failure.** Familiar, and it is how the failures got
  swallowed: a `catch` that logs is the path of least resistance.
