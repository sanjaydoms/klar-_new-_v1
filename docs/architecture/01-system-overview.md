# 01 — System overview

## What KLAR is

A travel platform selling flights, hotels, cabs, insurance, visas, passports,
charters and tour packages, to both consumers (B2C) and agents (B2B).

KLAR does not own inventory. It resells supplier inventory — principally
**TripJack** and **RateGain** — under its own pricing, its own booking flow and
its own brand. Most of the backend's real work is: normalising supplier
responses into a single internal shape, applying KLAR's markup, and holding a
booking together across a payment gateway and a supplier that can each fail
independently.

## Repository layout

| Directory | Contents |
|---|---|
| `frontend/` | B2C consumer web application (Vite + React), dev server `:5008` |
| `backend/` | thirteen independent Express + TypeScript services |

Both halves live in `sanjaydoms/klar-_new-_v1`. The frontend was merged in from
`sanjaydoms/klar-b2c-frontend` with its history preserved; that repository is no
longer the source of truth.

The B2B agent portal is still a separate working copy and is not here.

## The services

Thirteen independent Express + TypeScript applications. They share no code.

**Platform services** — used by every product:

| Service | Port | Responsibility |
|---|---|---|
| `auth-service` | 5010 | Accounts, JWT issue/verify, wallet balance and ledger, the master markup configuration |
| `payment-service` | 5014 | Razorpay and Cashfree order creation, verification, refunds, webhooks |
| `email-service` | 5015 | Transactional mail, queued through BullMQ on Redis |

**Product services** — one per sellable thing:

| Service | Port | Supplier |
|---|---|---|
| `flight-service` | 5011 | TripJack |
| `hotel-search-service` | 5012 | TripJack + RateGain |
| `hotel-booking-service` | 5013 | TripJack + RateGain |
| `cabs-service` | 5016 | TripJack Cabs |
| `insurance-service` | 5017 | TripJack TripSafe |
| `visa-service` | 5018 | none — KLAR's own catalogue |
| `charter-service` | 5019 | none — enquiry capture |
| `tour-package-service` | 5020 | none — KLAR's own catalogue |
| `passport-service` | 5021 | none — assistance workflow |

**In-progress rewrite:**

| Service | Port | Status |
|---|---|---|
| `hotel-engine` | 5030 | A supplier-agnostic hotel engine built from scratch. It runs *alongside* `hotel-search-service` and `hotel-booking-service`, not in place of them, and nothing calls it yet. See [05](05-integration-architecture.md). |

## Why hotel search and hotel booking are separate

They have opposite performance shapes. Search is high-volume, read-only, heavily
cached, and its whole design is about time-to-first-result — it returns one
supplier page and warms the rest in the background. Booking is low-volume,
transactional, and must be strictly correct about price and availability. Fusing
them would force one set of trade-offs onto both.

## Request flow

A hotel booking, end to end:

```
frontend
  │ POST /api/search/hotels          (JWT bearer)
  ▼
hotel-search-service ─── providers ──┬── TripJack HMS
  │                                  └── RateGain
  │  normalises both into KLAR's shape, dedupes, applies markup, caches
  ▼
frontend renders results, user picks a room
  │ POST /api/booking/price          re-price the exact room
  ▼
hotel-booking-service
  │  rejects the booking if the price drifted beyond tolerance
  │ POST /api/pay/...                create the payment order
  ▼
payment-service ──► Razorpay / Cashfree
  │  webhook confirms payment
  ▼
hotel-booking-service ──► supplier book
  │  on supplier failure: automatic refund via INTERNAL_SERVICE_KEY,
  │  or park in MANUAL_REVIEW if that key is unset
  ▼
email-service (queued) ──► voucher PDF to the customer
```

The same shape holds for flights, cabs and insurance.

## Shared state

| Store | Used for |
|---|---|
| **MongoDB** `:27017` | Every service's persistent data. Each service owns its own collections; none reads another's. |
| **Redis** `:6379` | Search result caching (hotel-search), distributed booking locks (hotel-booking, cabs), the BullMQ job queue (email). |

There is no shared database schema and no cross-service joins. A service that
needs another service's data asks over HTTP.

## Trust boundaries

Two secrets couple the services and both must be identical wherever they appear:

- **`JWT_SECRET`** — auth-service signs, the product services verify. A mismatch
  makes every authenticated request 401.
- **`INTERNAL_SERVICE_KEY`** — gates service-to-service routes that act without a
  user's JWT: wallet credit, and the automatic refunds a booking service issues
  when a supplier fails after payment succeeded. Unset, refunds are disabled and
  affected bookings are parked in `MANUAL_REVIEW` for a human.

## Next

- [02 — Frontend architecture](02-frontend-architecture.md)
- [03 — Backend architecture](03-backend-architecture.md)
- [04 — API architecture](04-api-architecture.md)
- [05 — Integration architecture](05-integration-architecture.md)
- [06 — Environment configuration](06-environment-configuration.md)
- [07 — Local development](07-local-development.md)
