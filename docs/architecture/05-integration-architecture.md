# 05 — Integration architecture

KLAR resells other companies' inventory. The integration layer exists so that
adding the next supplier is a new directory, not a rewrite.

## The layering

```
services/          business logic — asks for "hotels", never "TripJack hotels"
    │
    ▼
providers/         picks which suppliers to ask, calls them, merges + dedupes
    │
    ├──► suppliers/tripjack/   request shapes, quirks, transformer
    │        └──► clients/     raw authenticated HTTP
    │
    └──► suppliers/rategain/   request shapes, quirks, transformer
             └──► clients/     raw authenticated HTTP
                     │
                     ▼
              normalised KLAR shape
```

**The rule:** a supplier's response format never escapes `suppliers/`. Everything
above sees KLAR's internal shape. If a controller or service ever branches on
"is this TripJack or RateGain", the abstraction has been bypassed — fix that
rather than adding a second branch.

## Current suppliers

| Supplier | Services | Products |
|---|---|---|
| **TripJack** | flight, hotel-search, hotel-booking, cabs, insurance | flights, hotels (HMS/OMS), cabs, TripSafe insurance |
| **RateGain** | hotel-search, hotel-booking | hotel inventory and rates |
| **Razorpay** | payment | payments, refunds, webhooks |
| **Cashfree** | payment | payments |
| **OpenCage** | hotel-search | geocoding for city and landmark search |

TripJack uses a different base URL per product — `apitest-hms` for hotels,
`apitest-oms` for hotel order management, `apitest-cabs` for cabs, `apitest` for
flights and insurance — which is why each service configures its own
`TRIPJACK_BASE_URL` rather than sharing one.

### TripJack gotchas

Both are load-bearing and both are documented as boot warnings in the code:

- **`TRIPJACK_AGENCY_ID` must be the numeric agency id that owns
  `TRIPJACK_API_KEY`.** If it is not, bookings are created successfully and
  *then* fail at payment with *Access Denied* — a failure mode that looks like a
  payment bug and is not.
- **The published TripJack documentation has diverged from the live API more
  than once.** Probe the UAT endpoint before writing code against the spec.

## Choosing suppliers at runtime

`hotel-search-service` reads `HOTEL_PROVIDER_MODE`:

| Value | Behaviour |
|---|---|
| `tripjack` | TripJack only |
| `rategain` | RateGain only |
| `both` | query both, merge and dedupe |

This is how a misbehaving supplier gets taken out of the path without a deploy.

## Two-phase supplier rates

Hotel suppliers return a cheap list price during search and a firm price only on
a second call. KLAR therefore re-prices the exact room at booking time and
rejects the booking if the price drifted upward beyond
`PRICE_TOLERANCE_FIXED` / `PRICE_TOLERANCE_PERCENT`. The customer never books at
a price KLAR cannot honour, and KLAR never absorbs a silent supplier increase.

`hotel-engine/docs/adr/0006-two-phase-supplier-rates.md` records the reasoning.

## Adding a supplier

1. **`src/suppliers/<name>/`** — the client calls, the request builders, and a
   transformer producing KLAR's normalised shape. Everything that supplier-
   specific lives here.
2. **`src/clients/`** — raw authenticated HTTP if the supplier needs its own auth
   handshake, timeouts or retry behaviour.
3. **`src/providers/`** — register it so the provider layer can select it.
4. **`src/config/`** — read its credentials, and add them to `.env.example` with
   a comment saying what breaks without them.
5. **Nothing in `services/`, `controllers/` or `routes/` should change.** If
   something does, that is the signal the normalised shape is missing a concept —
   extend the shape rather than leaking the supplier upward.

## hotel-engine

`hotel-engine/` is a ground-up rewrite of the hotel domain around a stricter
supplier contract: canonical hotel identity across suppliers, price
comparability, deadline-based partial results, and a two-phase rate flow.

**It runs alongside `hotel-search-service` and `hotel-booking-service`, not in
place of them, and nothing calls it yet.** It is ESM, tested with `vitest`, and
backed by **PostgreSQL** rather than MongoDB — it refuses to start without
`DATABASE_URL` and `KLAR_MARKUP_RULES`. It is excluded from `npm run dev` for
that reason; start it on its own with `npm run dev:engine`, which builds first.

Known to be missing before it could replace the live services: payment
integration, email/PDF vouchers, and migration of existing bookings.

Its design decisions are recorded as ADRs in `hotel-engine/docs/adr/`, and its
gaps in `hotel-engine/docs/OPEN-ISSUES.md`. Read those before touching it, and
do not merge it into the live hotel services without an explicit instruction.
