# ADR-0000 — Phase 2 operating assumptions

**Status:** Accepted (by instruction: "proceed with Phase 2 using your recommended defaults")
**Date:** 2026-08-13
**Amended:** 2026-08-13 — decisions 1, 2 and 3 confirmed by KLAR and promoted from
assumption to decision in [ADR-0007](0007-confirmed-commercial-defaults.md). The
gate on decision 2 below is met. Decisions 4–8 stand as adopted here.

The eight open decisions from the Phase 1 teardown (§10) are resolved here with the
recommended default. Each is reversible at stated cost. If any is wrong, this is the
file to change — the code reads these decisions through configuration, not constants.

| # | Decision | Adopted default | Cost to reverse |
|---|---|---|---|
| 1 | Comparability | **Equivalence classes.** Deals compete only within `(occupancy, board, refund tier, room category)`. Other class winners surface as alternative rates. | Low — `SelectionPolicy.ABSOLUTE_CHEAPEST` already exists as a config value. |
| 2 | RateGain platform markup | **Applied uniformly to every supplier**, by one pricing engine. The booking service's current behaviour is the correct one; search is the side that is wrong. | Low at code level. **Commercially material** — see note below. |
| 3 | Partial results | **Labelled honestly.** Responses carry `priceGuarantee: BEST_AVAILABLE \| PARTIAL` and name the suppliers that did not answer. | Low. |
| 4 | Search deadline | **15 s hard**, 12 s soft target, 14 s per-supplier budget. Derived from the measured RateGain international geofilter (~14.2 s). All three are config. | Trivial. |
| 5 | Service topology | **One `hotel-api` deployable**, module boundaries enforced in-repo. `hotel-worker` for jobs. | Medium — modules are already separable. |
| 6 | Datastore | **PostgreSQL as system of record** for the new engine. See refinement below. | High after Phase 5. |
| 7 | Static content source | **No GIATA assumed.** `CanonicalHotel.externalIds` is reserved so match tier 2 activates without a model change if a neutral source is licensed. | Trivial. |
| 8 | B2B scope | **B2C implemented first**, but `Channel` is a first-class domain concept from day one. B2B is a pricing configuration, not a second code path. | Low. |

---

## Note on decision 2 — this one has a live commercial consequence

Search omits platform markup on RateGain; booking applies it. Choosing "apply
uniformly" is correct architecturally, but it changes what customers are quoted
for RateGain stays. **Before Phase 4 ships, someone with commercial authority
must confirm which side was intended.** The engine is built to apply it uniformly;
if the intent was the opposite, the change is a config value, not a redesign.

## Refinement to decision 6

Phase 1 recommended "Postgres for canonical identity and bookings, MongoDB retained
for the property catalogue." Working through the matching design in this phase, that
split is wrong, for one concrete reason:

`supplier_property_mapping → canonical_hotel` is read on **every hotel of every
search** and written back whenever a tier-3 match is confirmed. Across two datastores
there is no join, no referential integrity on the system's most important invariant,
and no transaction around the write-back.

The two signals the matcher needs are also both native to Postgres: `pg_trgm` for
name similarity (better than Mongo text search for this purpose) and PostGIS for
proximity. Splitting them buys nothing.

**Adopted:** one PostgreSQL instance holds canonical hotels, supplier mappings,
destinations, supplier config and bookings. The existing ~1.6 M-document MongoDB
catalogue becomes an **upstream sync source** for the Phase 5 backfill, not a runtime
dependency of the search path.

## What follows from these, structurally

- Supplier adapters return `SupplierCost`. They cannot express a customer price, so
  decision 2 cannot regress into D-1 again.
- `MergedHotel.featuredDeal` is a reference into `deals[]`, so decision 1 can change
  without discarding data — D-4 cannot regress.
- Every search carries a `SearchId` and a `SupplierAttempt[]`, so decision 3 is
  observable rather than aspirational — D-8 cannot regress.
