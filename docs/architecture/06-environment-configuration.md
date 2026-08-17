# 06 — Environment configuration

## How it works

Every service reads `process.env` in exactly one place — `src/config/` — and
exports a parsed config object. Everything else imports that object.

Every service ships a `.env.example` listing every variable it reads, with
comments saying which are required and what breaks without them. `npm run
setup:env` copies each template to `.env`; `npm run doctor` reports which keys
are missing or still blank.

`.env` files are never committed. `.env.example` files always are.

## Boot-time validation

Three styles, same intent — fail at startup with a clear message rather than
mid-request:

| Style | Services |
|---|---|
| `requiredEnv(key)` throws on the first missing variable | flight, visa, email |
| `getEnvVar(key)` / `getEnvVariable(key)` throws | charter, tour-package |
| `getEnv(key, required)` throws only when marked required | auth |
| A full validation pass listing *every* missing variable at once | payment |
| Warn loudly and continue degraded | hotel-booking, hotel-search, cabs, insurance |

The warn-and-continue services do so on purpose: a missing RateGain key should
not stop you working on TripJack. The warnings describe real degraded states —
do not silence them.

## Secrets that must match across services

| Variable | Must be identical in | Symptom when it is not |
|---|---|---|
| `JWT_SECRET` | auth, hotel-search, hotel-booking, cabs, insurance | Every authenticated request 401s, looking like an expired login |
| `INTERNAL_SERVICE_KEY` | auth, flight, hotel-booking, cabs, payment | Service-to-service routes answer 503; automatic refunds disabled; bookings park in `MANUAL_REVIEW` |

## Port map

Set explicitly in every `.env.example`. Five services previously had no default
at all and simply crashed if `PORT` was unset.

| Port | Service |
|---|---|
| 5010 | auth-service |
| 5011 | flight-service |
| 5012 | hotel-search-service |
| 5013 | hotel-booking-service |
| 5014 | payment-service |
| 5015 | email-service |
| 5016 | cabs-service |
| 5017 | insurance-service |
| 5018 | visa-service |
| 5019 | charter-service |
| 5020 | tour-package-service |
| 5021 | passport-service |
| 5030 | hotel-engine |
| 5910 / 5914 / 5915 | local-dev stubs for auth / payment / email |

`scripts/services.mjs` is the single source of truth. The frontends duplicate
5010, 5012, 5013, 5014 and 5016 as hardcoded fallbacks, so moving one of those
requires a matching frontend change.

### Ports changed during the cleanup

| Service | Was | Now | Why |
|---|---|---|---|
| insurance-service | 5014 | **5017** | Collided with payment-service. hotel-booking, cabs and the B2C frontend all resolve payment at 5014, so insurance moved. Nothing resolved insurance by a hardcoded default — the frontend reads `VITE_SEARCH_INSURANCE_API_URL`, which has no fallback — so this breaks nothing, but that variable must now point at 5017. |
| passport-service | 5000 | **5021** | Collided with email-service, which also defaulted to 5000. |
| email-service | 5000 | **5015** | Every caller already resolved email at 5015 (`EMAIL_SERVICE_URL` defaults in hotel-booking and cabs). The service's own default was the outlier. |
| hotel-engine | 5012 | **5030** | Collided with hotel-search-service. |

## Known inconsistencies

Documented rather than changed: renaming an environment variable silently breaks
every deployed `.env` outside this repository.

| Concern | Variants in use |
|---|---|
| Mongo connection string | `MONGODB_URI` (most) vs `MONGO_URI` (charter, passport, tour-package) |
| CORS allowlist | `CORS_ORIGIN` (most) vs `ALLOWED_ORIGINS` (hotel-search) vs `CORS_ORIGINS` (email) |
| Auth service URL | `AUTHENTICATION_SERVICE` (flight, visa) vs `AUTH_SERVICE_URL` (hotel-booking, cabs, hotel-search) |
| Email service URL | `EMAIL_SERVICE` (flight) vs `EMAIL_SERVICE_URL` (hotel-booking, cabs) vs `EMAIL_BASE_URL` (auth) |
| Payment service URL | `PAYMENT_SERVICE` (flight) vs `PAYMENT_SERVICE_URL` (hotel-booking, cabs) |
| RateGain secret | `RATEGAIN_SECRET_KEY` (hotel services) vs `RATEGAIN_API_SECRET` (hotel-engine) |

Unifying these is worth doing, but as a deliberate change coordinated with every
deployed environment — not as part of a repository cleanup.

## Known bug: visa-service `DB_NAME`

`visa-service/src/config/env.config.ts` defaults `DB_NAME` to `"flight_service"`
— a copy-paste from flight-service. Unset, visa data is written into the flight
database.

The code default was left alone because production may already depend on
whatever it currently resolves to; changing it would move a live database
underneath a running service. `visa-service/.env.example` sets `DB_NAME` explicitly
to `klar_visa`, so any new environment is correct. **Check what production
resolves this to before fixing the default.**

## Special loading behaviour

| Service | Behaviour |
|---|---|
| hotel-search-service | loads `.env.local` then `.env`, with `override: true` — `.env` wins |
| insurance-service | loads `.env.local` then `.env` |
| cabs-service | loads `.env` by absolute path from `__dirname`, so it works regardless of cwd |
| all others | plain `dotenv.config()`, relative to the process cwd |

`npm run dev` runs each service with its own directory as cwd, so the plain case
works.
