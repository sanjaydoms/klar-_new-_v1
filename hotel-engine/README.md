# KLAR Hotel Engine

A supplier-agnostic hotel OTA engine. One KLAR search fans out to every enabled
supplier, matches properties to a canonical identity, prices every offer through
one engine, and features the cheapest *comparable* deal.

Clean-room rebuild. `_reference/` holds the previous implementation, extracted
for analysis only — nothing in `src/` imports from it.

## Status

| Phase | | |
|---|---|---|
| 1 | Reverse-engineering & target architecture | ✅ `docs/PHASE-1-REVERSE-ENGINEERING.md` |
| 2 | Domain model, supplier contract, ADRs | ✅ `src/domain`, `src/suppliers/contract`, `docs/adr` |
| 3 | Supplier layer — TripJack + RateGain adapters | ✅ `src/suppliers`, `docs/SUPPLIERS.md` |
| 4 | Search orchestrator | ✅ `src/modules` |
| 5 | Canonical catalogue & destinations | ✅ `src/infrastructure`, `docs/DATABASE.md` |
| 6 | Detail & rates | ✅ `src/modules/detail`, `src/modules/compat`, `src/api` |
| 7 | Revalidation | ✅ `src/modules/revalidation` |
| 8 | Booking | ✅ `src/modules/booking`, `src/domain/booking` |
| 9 | Caching & performance | ✅ `src/infrastructure/cache`, `src/modules/search/warming.ts` |
| 10 | Production hardening | 🚧 auth gate (with cancel-ownership check), booking reconciliation worker, Redis KV store, diagnostics logging + `/metrics`, payload-retention job all built — `src/infrastructure/auth`, `src/modules/booking/reconciler.ts`, `src/infrastructure/rate-token/redis-store.ts`, `src/infrastructure/metrics`, `src/modules/booking/payload-retention.ts`; only the payment gateway remains, blocked on real credentials this repo does not have |

Phase 8 books through TripJack and through RateGain on one code path, with no
supplier named anywhere above the registry. **It has no authentication and no
payment gateway** — see `docs/OPEN-ISSUES.md` §4 before deploying it.

## Commands

```bash
npm run check
```

Typecheck plus the full test suite. `npm run typecheck` and `npm test` run
either half on its own.

```bash
npm start
```

Runs `hotel-api`. Requires `DATABASE_URL` and `KLAR_MARKUP_RULES`; a supplier is
registered only when its credentials are present, so the service starts and
serves an empty result set with none. `KLAR_MARKUP_RULES` has no default —
absent means selling at cost, so it is refused rather than assumed.

| Variable | |
|---|---|
| `DATABASE_URL` | required |
| `KLAR_MARKUP_RULES` | required, JSON array of `MarkupRule` |
| `PORT` | 5012 |
| `KLAR_HOME_COUNTRY` | `IN` |
| `KLAR_CORS_ORIGINS` | comma-separated; empty disables CORS |
| `RUN_MIGRATIONS` | `true` to migrate on boot |
| `TRIPJACK_*` / `RATEGAIN_*` | per-supplier credentials |
| `KLAR_WARM_TARGETS` | optional, JSON array of `UnifiedHotelSearchRequest`; absent means no cache warming |
| `KLAR_AUTH_JWT_SECRET` | optional, HS256 secret; absent means every commit and cancel is refused |
| `REDIS_URL` | optional; absent means rate tokens and caches are in-memory — correct for one process only |
| `KLAR_PAYLOAD_RETENTION_DAYS` | optional; absent means `booking_supplier_payload` rows are kept forever |
| `KLAR_RATE_LIMIT_WINDOW_MS` / `KLAR_RATE_LIMIT_MAX_REQUESTS` | optional; default 300 requests / 60 s per IP |

Booking needs one thing the environment cannot supply: a `PaymentGateway`. None
is configured here, so `hotel-api` warns at boot and every commit declines at
the charge — deliberately, because a gateway that says yes would book real rooms
against payments nobody took.

Tests include a real PostgreSQL 16 running in-process (PGlite), so the
migrations, constraints and SQL are genuinely exercised — no database server
needed.

## Layout

```
src/domain/            Pure domain. No I/O, no clock, no randomness, no env.
                       Enforced by tests/domain-purity.test.ts.
  shared/              Money (integer minor units), branded ids, stay dates
  hotel/               Canonical hotel, match confidence, name normalisation
  destination/         Canonical destinations and supplier mappings
  rate/                Board, room, occupancy, cancellation terms
  pricing/             SupplierCost → CustomerPrice, markup rules
  deal/                SupplierDeal, equivalence classes, featured-deal selection
  search/              Unified request, merged result, supplier health
  revalidation/        Quote-vs-live comparison before booking
  booking/             Booking, deal snapshot, refund records, and the commit
                       decision: what a revalidation outcome permits, what the
                       customer's consent covers, who may pay a refund

src/modules/           The engine. Depends on ports, never on a concrete
                       database, clock or HTTP client.
  ports.ts             PropertyRepository, DestinationResolver, MarkupProvider,
                       RateTokenStore, Clock, IdGenerator — Phase 5 implements these
  supplier-isolation.ts  One supplier's throw stays one supplier's problem.
                       Every fan-out goes through it (ADR-0003 §3)
  matching/            Tiered identity resolution with confidence + write-back
  pricing/             The one place SupplierCost becomes CustomerPrice
  search/              fanout · enrichment · orchestrator · present
  detail/              One hotel, priced by every supplier that sells it
  revalidation/        The booking gate: ask the supplier to honour a quote
  booking/             Commit · confirm · cancel · refund, through one path for
                       every supplier. Two locks: the idempotency key stops a
                       retry becoming a second booking, the rate token stops two
                       requests booking the same rate
  compat/              LEGACY, with an expiry. Canonical → the shape the existing
                       frontend reads. One-way; nothing in the engine imports it
  testing/             In-memory ports and a scriptable fake supplier

src/suppliers/
  contract/            The HotelSupplier interface, context, DTOs, normalised
                       errors and the registry.
  common/              HTTP transport, circuit breaker, deadline+retry executor,
                       defensive payload readers, image resolution
  testing/             Stub transport and the shared contract suite every
                       supplier must pass before it is registered
  tripjack/            config · request · response · adapter · fixtures
  rategain/            config · request · response · adapter · fixtures

src/infrastructure/    Concrete implementations of the ports.
  db/                  Database abstraction, SQL migrations, migration runner
  repositories/        PostgreSQL property, destination and booking repositories
  rate-token/          Sealed opaque rate tokens over a key-value store
  testing/             PostgreSQL 16 in-process (PGlite) for tests

src/api/               The HTTP edge. `node:http`, no framework; handlers are
                       framework-agnostic and take parsed input, not sockets.
src/composition/       The one place concrete implementations meet the engine.
src/main.ts            `hotel-api`. Reads config, opens Postgres, listens.

docs/adr/              Architecture decisions. Read 0000 first.
docs/OPEN-ISSUES.md    Everything unresolved, and who has to resolve it.
docs/SUPPLIERS.md      Supplier contract, per-supplier quirks, adding a supplier.
docs/DATABASE.md       Schema, migrations, querying notes, backfill.
```

## The three rules the code exists to enforce

1. **Adapters return cost, never price.** `SupplierContext` carries no markup
   rules, so no supplier adapter can add margin. One engine prices everything,
   identically. (ADR-0002)
2. **Nothing merges on one signal.** Property matching is tiered and records its
   confidence; below `MEDIUM_CONFIDENCE` hotels stay separate. A duplicate is
   better than a customer sent to the wrong hotel. (ADR-0001)
3. **Nothing is discarded at merge.** `featuredDeal` is a reference into
   `deals[]`. Every alternative stays bookable. (ADR-0002)

## Adding a supplier

```
1. src/suppliers/<code>/     client · request mapper · response mapper · config
2. registry.register(supplier, config)
3. INSERT INTO supplier_config
4. Pass the shared contract test-suite
5. Backfill supplier_property_mapping and destination_mapping
```

Nothing in the orchestrator, matcher, pricing engine, booking engine, API
contract, frontend or schema changes. That property is the acceptance test for
the architecture.
