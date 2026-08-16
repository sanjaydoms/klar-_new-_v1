# Database

PostgreSQL is the system of record for the hotel engine (ADR-0005): canonical
hotels, supplier mappings, destinations and supplier configuration. Redis holds
rate tokens and, from Phase 9, the dynamic cache.

## Schema

`src/infrastructure/db/migrations/001_catalogue.sql`

```
canonical_hotel            klar_hotel_id (pk) · normalized_name · lat/lng
                           external_ids · images · amenities
supplier_property_mapping  (supplier, supplier_hotel_id) pk → klar_hotel_id
                           confidence · matched_by · verified_at
match_candidate            unresolved pairs, queued for review
canonical_destination      centroid · radius_km · aliases · property_count
destination_mapping        (supplier, klar_destination_id) pk → supplier_dest_code
supplier_config            enabled · priority · timeouts · breaker · countries
```

`src/infrastructure/db/migrations/002_booking.sql`

```
booking                    klar_booking_id (pk) · public_token · idempotency_key
                           supplier (STRING) · status · deal_snapshot · guests
                           supplier_state · payment · refund · currency/total_minor
booking_supplier_payload   what went over the wire. Audit only, never a UI's
booking_event              append-only: how a booking reached its status
```

The split between those three is the point. The reference stored
`rateGainRequest` / `tripJackRequest` / `tripJackResponse` as named columns on
the booking and rendered the bookings page out of them, so a third supplier
needed a migration **and** a frontend release. Here the display data is a
canonical `deal_snapshot` and the wire format lives in a side table keyed by
supplier code.

`supplier_state` exists because a confirmation number is not always enough to
cancel: RateGain's `CancelReservation` also requires `ReservationId`,
`PropertyId` and `PropertyCode`, and those exist only in the commit response
(A-3). Without somewhere on the booking to keep them, a booking can be made and
not unmade.

### Two constraints doing real work

```sql
CREATE UNIQUE INDEX supplier_property_mapping_one_per_supplier
  ON supplier_property_mapping (klar_hotel_id, supplier);
```

One supplier sells a given canonical hotel under exactly one id. This is the
false-merge failure mode — two distinct TripJack properties collapsing into one
hotel — refused by the database rather than by a code review. A test watches it
reject the second insert.

```sql
CREATE UNIQUE INDEX match_candidate_one_pending
  ON match_candidate (supplier, supplier_hotel_id) WHERE status = 'PENDING';
```

A property that fails to match will fail again on every subsequent search.
Without the partial index the review queue fills with one decision repeated.

```sql
CREATE UNIQUE INDEX booking_idempotency_key ON booking (idempotency_key);
```

The third, added in Phase 8, and the one that stops a double booking. A
double-clicked button, a retried submit and a client that reconnects mid-commit
all arrive with the same key, and exactly one of them may become a reservation.
It is also the commit path's **lock**: the booking row is written *before* the
charge, so two concurrent commits race to insert and the loser is handed the
winner's booking with no money moved.

Two more races are settled in SQL rather than in application code, because a
read followed by a write has a gap in it and both workers pass through the gap:

```sql
UPDATE booking SET status = $2 … WHERE klar_booking_id = $1 AND status = ANY($3)
UPDATE booking SET refund = $2 … WHERE … refund->>'status' IN ('NONE','FAILED')
```

The first is how a status poller and a reconciliation worker that both read
`SUPPLIER_PENDING` cannot both act on it. The second is how the in-request path,
the poller and the worker refund a failed booking **once** between them.

### No PostGIS

Candidate narrowing needs a bounding box, which a btree on `(lat, lng)` serves;
the exact great-circle distance is computed in the domain, where it is already
unit-tested. Skipping the extension keeps the schema runnable on any Postgres —
including the in-process one the tests use.

The only extension required is `pg_trgm`, for fuzzy name lookup in match
tiers 3–4.

## Migrations

```ts
import { migrate } from './infrastructure/db/migrate.js';
await migrate(db);
```

Idempotent: a `schema_migration` ledger records what has run, so calling it on
every boot is safe and a half-applied deploy resumes rather than double-applying.
Each migration is its own transaction, so one failing does not roll back the
ones before it and the ledger stays honest about where it stopped.

## Connecting

Repositories take a `Database`, not a driver. Production wires node-postgres:

```ts
import pg from 'pg';
import { createDatabase } from './infrastructure/db/database.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();       // a transaction needs one connection
const db = createDatabase(client);
```

`pg` is not a dependency of this package — `QueryableClient` is declared
structurally, and `pg.Pool` already satisfies it.

## Testing against a real Postgres

```ts
import { createTestDatabase } from './infrastructure/testing/pglite.js';
const pg = await createTestDatabase();     // PostgreSQL 16, in-process, migrated
```

PGlite runs the actual engine compiled to WASM. The migrations, the unique
indexes, the check constraints, the trigram similarity and the `ON CONFLICT`
clauses are all genuinely exercised — a repository verified only against a
hand-written stub is verified against the author's beliefs about SQL.

The `PropertyRepository` contract suite runs against **both** the in-memory fake
and the Postgres implementation. The fake is what the orchestrator's scenario
tests use, so if the two diverge those tests stop describing production. That
suite has already caught one such divergence: the fake appended a duplicate
mapping on every write where the real one upserts.

## Querying notes

**Batch, don't loop.** `findBySupplierRefs` resolves a whole search in one
round trip by joining against `unnest($1::text[], $2::text[])`. Matching the two
columns as a *pair* matters: matching them independently would join a TripJack id
onto a RateGain mapping that happened to share the same string, which is the
class of bug that had the reference looking RateGain ids up in a TripJack column.

**Narrow in SQL, decide in the domain.** `findMatchCandidates` uses the trigram
index and a bounding box to return at most 25 candidates; the tiered scoring and
the two-independent-signals rule live in `domain/hotel`. Narrowing in SQL and
deciding in the domain is what turns the reference's O(n²) per-search comparison
into O(n) indexed lookups.

**Trim the corners.** A bounding box around a 60 km radius reaches ~85 km at its
corners. `PostgresDestinationResolver` applies a Haversine term after the box —
those corners are the neighbouring towns that made the reference's results look
wrong.

**Everything numeric comes back as a string.** Postgres returns `numeric` as
text. Every numeric column goes through `asNumber()`.

## Backfill

`src/modules/sync/catalogue-backfill.ts` seeds the catalogue from the legacy
MongoDB collection — roughly 1.6 M TripJack-derived documents keyed by
`tjHotelId`, which is exactly the problem the canonical layer fixes. Mongo is an
**upstream source**, not a runtime dependency.

- **Idempotent.** A document whose supplier id already maps is counted and
  skipped, so a run interrupted at 900,000 documents resumes rather than minting
  a second identity for everything it already did.
- **Batched.** Lookups go 500 at a time, not one per document.
- **Honest about what it drops.** Skips are counted by reason. A backfill that
  quietly discards 40,000 documents looks exactly like one that succeeded.
- **Coordinates are `[lng, lat]`** in Mongo — the reverse of every other
  representation here. Reading them in order puts Goa in Somalia.
- **It never invents amenities.** The legacy collection has none.

```ts
await backfillCatalogue(cursor, { supplier: TRIPJACK, properties, logger });
// → { read, created, alreadyPresent, skipped: { NO_SUPPLIER_ID, ... } }
```

## Destination sync

`src/modules/sync/destination-sync.ts` reconciles a supplier's destination list
against KLAR's own. The country is a **hard gate**, not a signal — "Springfield"
exists in a dozen countries and a name match across a border is always wrong —
and two near-equal candidates are reported ambiguous rather than picked between.

An unmapped destination makes that supplier ineligible for the search, which is
visible in the response. A wrongly-mapped one silently searches the wrong city.
That asymmetry is why nothing uncertain is written.
