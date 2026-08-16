# ADR-0005 — Service topology, persistence and caching

**Status:** Accepted · **Date:** 2026-08-13

## Context

The reference split hotels across `hotel-search-service` and
`hotel-booking-service`. The boundary did not hold: ten files were copy-pasted
across it and nine diverged, including the markup configuration that decides how
much money is added to a price. `region.util.ts` — the only file that stayed
identical — carries a 20-line comment begging future editors to change both
copies in the same commit. That comment is the evidence: the split created a
correctness hazard the team had to manage by hand.

Persistence had no canonical layer at all. The only catalogue was keyed by
`tjHotelId`, there was no supplier-mapping, destination-mapping or
supplier-config table, and `rateGainAdapter.ts:217` looked RateGain property ids
up in the TripJack id column — usually finding nothing, occasionally finding the
wrong hotel.

Caching held fully-priced hotels for **15 minutes** (`SEARCH_RESULT_CACHE_TTL=900`)
with no distinction between static property data and live rates.

## Decision

**1. One deployable, `hotel-api`, plus `hotel-worker` for jobs.** Module
boundaries are enforced in-repo (`modules/`, `suppliers/`, `domain/`,
`infrastructure/`) rather than by a network hop. A boundary that a copy-paste
can cross silently is not a boundary; a boundary the compiler enforces is.

Splitting later remains possible — the modules are already separable — but must
be justified by a scaling need, not by tidiness.

**2. PostgreSQL is the system of record.**

```
canonical_hotel            klarHotelId(pk) · normalizedName · location(PostGIS) · …
supplier_property_mapping  (supplier, supplierHotelId) UNIQUE → klarHotelId
                           confidence · matchedBy[] · verifiedAt
match_candidate            low-confidence pairs, queued for ops review
canonical_destination      centroid · radiusKm · aliases[]
destination_mapping        (supplier, supplierDestCode) → klarDestinationId
supplier_config            enabled · priority · timeouts · breaker · countries · …
booking                    supplierCode (STRING) · dealSnapshot · priceSnapshot · …
booking_supplier_payload   audit only; never read by a UI
booking_event              append-only
```

This refines Phase 1's "Postgres for identity and bookings, Mongo for the
catalogue". Working through ADR-0001 made the split untenable:
`supplier_property_mapping → canonical_hotel` is read for every hotel of every
search and written back whenever a tier-3 match is confirmed. Across two stores
there is no join, no referential integrity on the system's most important
invariant, and no transaction around the write-back.

The two matching signals are also native to Postgres — `pg_trgm` for name
similarity, PostGIS for proximity — so the split bought nothing.

**3. The existing ~1.6 M-document MongoDB catalogue becomes an upstream sync
source**, not a runtime dependency. Phase 5 backfills from it.

**4. Caching separates static from dynamic, which the reference did not:**

| Layer | Contents | TTL |
|---|---|---|
| Static property | name, address, images, stars, amenities, coordinates | days, background-refreshed |
| Destination / geo | destinations, radii, supplier codes | days |
| Supplier candidate sets | TripJack hid lists per centre+radius | hours |
| **Dynamic availability** | rates, prices, cancellation terms | **60–180 s** |
| Rate tokens | sealed supplier state per `dealId` | ≤ supplier rate validity |

The dynamic key is `dynamicCacheKeyParts()`: target, dates, occupancy signature
(child ages included — they change the price), currency, nationality, channel,
supplier set, and **`markupConfigVersion`**. The last is new: without it an
operator's margin change would not take effect until the TTL expired.

Filters, sort and page are deliberately **excluded** — they are applied after
the fan-out, so including them would fragment the cache for nothing. The
reference got this part right and it is carried forward.

**5. Redis holds rate tokens, the dynamic cache, commit locks and request
coalescing.** Redis being down degrades latency, never correctness.

## Consequences

- Introducing Postgres is real operational cost: a database the team does not
  run today, plus migrations and a backfill. It is the highest-cost decision in
  this ADR set and the one most worth revisiting if the team pushes back.
- A 60–180 s dynamic TTL means far more supplier traffic than a 15-minute one.
  Request coalescing and cache warming move from optimisation to necessity —
  Phase 9, after correctness is proven.
- One deployable means search traffic and booking traffic scale together. At
  current volumes that is fine; it is the first thing to revisit if it is not.
- `markupConfigVersion` in the cache key requires the config service to expose a
  version or content hash.

## Alternatives rejected

- **Keep the two services and extract a shared package.** Fixes duplication, not
  the divergence: versioning across two deployables reintroduces drift more
  slowly and less visibly.
- **All-MongoDB.** Avoids a new datastore, at the price of no referential
  integrity on supplier mappings and no transaction around match write-back —
  the two places where correctness matters most.
- **Keep the 15-minute price cache for latency.** It is precisely the
  "caching dynamic prices too aggressively" the brief lists as a thing not to
  repeat.
