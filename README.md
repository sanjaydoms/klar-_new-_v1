# KLAR

Clarity. Simplicity. Premium experiences.

KLAR's travel platform: the customer-facing web application and the
microservices behind it — flights, hotels, cabs, insurance, visas, passports,
charters, tour packages, payments, transactional email and accounts.

```
frontend/    the B2C web application (Vite + React)
backend/     13 independent Express + TypeScript services
docs/        how it all fits together
scripts/     one command to install, diagnose and run the stack
```

---

## Architecture

```
                    ┌──────────────────────────┐
                    │  frontend/  :5008        │
                    │  B2C web application     │
                    └────────────┬─────────────┘
                                 │  HTTP, JWT bearer token
   ┌─────────────────────────────┼──────────────────────────────────┐
   │                             │                                  │
┌──▼───────────┐   ┌─────────────▼──────────┐   ┌───────────────────▼──┐
│ auth-service │   │ product services       │   │ payment-service      │
│  :5010       │   │  flight   :5011        │   │  :5014               │
│  accounts,   │◄──┤  hotel-search  :5012   ├──►│  Razorpay, Cashfree  │
│  JWT, wallet │   │  hotel-booking :5013   │   └──────────────────────┘
└──────────────┘   │  cabs     :5016        │
                   │  insurance:5017        │   ┌──────────────────────┐
                   │  visa     :5018        ├──►│ email-service :5015  │
                   │  charter  :5019        │   │  BullMQ on Redis     │
                   │  tour     :5020        │   └──────────────────────┘
                   │  passport :5021        │
                   └───────────┬────────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
       ┌──────▼──────┐  ┌──────▼─────┐  ┌────────▼─────────┐
       │  MongoDB    │  │   Redis    │  │ Supplier APIs    │
       │  :27017     │  │   :6379    │  │ TripJack,        │
       └─────────────┘  └────────────┘  │ RateGain         │
                                        └──────────────────┘
```

Every service is an independent Express + TypeScript application with its own
`package.json`, its own `.env`, its own database collections and its own
deployment. They talk to each other over HTTP, never by importing each other's code.

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **≥ 20** | `.nvmrc` pins 20. Developed against 20–26. |
| npm | ≥ 9 | Ships with Node 20. |
| MongoDB | 6 or 7 | Listening on `127.0.0.1:27017`. |
| Redis | 6 or 7 | Listening on `127.0.0.1:6379`. |
| PostgreSQL | 15+ | **Only** for `hotel-engine`, which is excluded from `npm run dev`. Not needed for the twelve live services. |

MongoDB and Redis must be running locally *before* you start the services.

```bash
brew services start mongodb-community && brew services start redis
```

Or with Docker:

```bash
docker run -d -p 27017:27017 --name klar-mongo mongo:7 && docker run -d -p 6379:6379 --name klar-redis redis:7
```

---

## Installation

```bash
git clone https://github.com/sanjaydoms/klar-_new-_v1.git KLAR
cd KLAR
npm run setup
```

`npm run setup` does three things: installs the root tooling, installs
dependencies in the frontend and all 13 backend services, and creates a `.env`
in each from its `.env.example`.

It does **not** invent credentials. Everything now has a `.env` with the right
*keys*, and the supplier keys and secrets are blank. Fill them in before using
the features that need them.

---

## Environment setup

Every service ships a `.env.example` listing exactly the variables that service
reads, with comments explaining which are required and what breaks without them.

```bash
npm run setup:env    # create any missing .env from its .env.example
npm run doctor       # report what is still missing, without starting anything
```

`npm run doctor` is the first thing to run when something will not start. It
checks the Node version, that MongoDB and Redis are reachable, that dependencies
are installed, that each `.env` exists, which keys are missing or blank, and
whether any port is already occupied — and prints one list instead of thirteen
stack traces.

Secrets that must be filled in before the corresponding feature works:

| Variable | Used by | Without it |
|---|---|---|
| `JWT_SECRET` | auth, hotel-search, hotel-booking, cabs, insurance | Authenticated calls 401. Must be **identical** across these services. |
| `INTERNAL_SERVICE_KEY` | auth, flight, hotel-booking, cabs, payment | Automatic refunds are disabled; stuck bookings park in `MANUAL_REVIEW`. Must be identical across these services. |
| `TRIPJACK_API_KEY` + `TRIPJACK_AGENCY_ID` | flight, hotel-*, cabs, insurance | Supplier calls fail. The agency id must be the numeric id owning the key, or bookings are created and then fail payment with *Access Denied*. |
| `RATEGAIN_API_KEY` + `RATEGAIN_SECRET_KEY` | hotel-search, hotel-booking | RateGain hotel inventory is unavailable. |
| `RAZORPAY_*` / `CASHFREE_*` | payment | payment-service refuses to boot — it validates its whole environment up front. |
| `SMTP_*` | email | email-service refuses to boot. |
| `OPENCAGE_API_KEY` | hotel-search | Geocoding city/landmark searches fail. |

Never commit a `.env`. `.gitignore` excludes them; only `.env.example` is tracked.

---

## Start development

```bash
npm run dev
```

Starts the web application **and** every backend service in watch mode, in one
terminal, with a coloured per-process log prefix:

```
[web]          http://localhost:5008
[auth]         listening on 5010
[flight]       listening on 5011
[hotel-search] listening on 5012
...
```

Open http://localhost:5008 and you have the whole stack.

A process that crashes does **not** take the others down — you can work on
flights while insurance is missing its API key.

Start only what you need:

```bash
npm run dev -- web auth flight        # just these three
npm run dev -- --backend-only         # no web app
npm run dev -- --list                 # what is available
npm run dev:frontend                  # web app on its own
npm run dev:flight                    # one service, direct
```

### Working on one service without the others

`backend/local-dev/collab-stubs.cjs` fakes auth, payment and email on ports
5910 / 5914 / 5915 so a product service can be exercised end to end on its own:

```bash
npm run stubs
```

Then point that service's `.env` at the stub ports — each `.env.example` shows
the exact lines, commented out.

---

## Build, typecheck, test

```bash
npm run build       # frontend bundle + tsc in every service, pass/fail table
npm run typecheck   # tsc --noEmit everywhere, no output written
npm run test        # only the packages that define real tests
```

These run across the frontend and all services and report a summary rather than
stopping at the first failure.

### Known red baselines

Two of these are **expected to fail today**. Both predate the monorepo merge and
neither is a regression — check against these numbers before assuming your change
broke something:

| Command | State | Why |
|---|---|---|
| `npm run typecheck` | `frontend` fails with **1363 errors** | Long-standing. Every backend service passes clean. |
| `npm run test` | `frontend` fails **13 tests** | `frontend/src/__tests__/bug-exploration.test.ts` is written to fail on purpose: each failure documents a real, unfixed bug (stale filter closure, negative base price, `Math.random()` ratings, hardcoded `agentMarkup: 0`, unvalidated traveller fields). Its header says so. **Fix the source, not the tests.** |

They are deliberately not suppressed. A green run should mean green.

**Linting is frontend-only.** `frontend/` has ESLint installed with an
`eslint.config.js`, so `npm --prefix ./frontend run lint` works. No backend
service has ESLint as a dependency or a config — the `lint` scripts that used to
sit in them referenced a binary that was never installed, and have been removed.
For the backend, `npm run typecheck` is the check that must pass.

---

## Ports

| Port | Service | Mounts at |
|---|---|---|
| 5008 | **frontend** — B2C web application | |
| 5010 | auth-service | `/user` |
| 5011 | flight-service | `/api/flight` |
| 5012 | hotel-search-service | `/api/search` |
| 5013 | hotel-booking-service | `/api/booking` |
| 5014 | payment-service | `/api/pay` |
| 5015 | email-service | `/api/v1` |
| 5016 | cabs-service | `/api/cabs` |
| 5017 | insurance-service | `/api/insurance` |
| 5018 | visa-service | `/api/visa` |
| 5019 | charter-service | `/api/charter` |
| 5020 | tour-package-service | `/api/tours` |
| 5021 | passport-service | `/api/passport` |
| 5030 | hotel-engine | not yet wired to any frontend |
| 5910 / 5914 / 5915 | backend/local-dev stubs for auth / payment / email | |

Ports 5017 (insurance) and 5021 (passport) changed during the repository
cleanup because their previous defaults collided with payment-service (5014)
and email-service (5000). See
[docs/architecture/06-environment-configuration.md](docs/architecture/06-environment-configuration.md).

---

## Project structure

```
KLAR/
├── frontend/                    B2C web application (Vite + React), :5008
│   ├── src/
│   │   ├── pages/               one directory per route
│   │   ├── components/          shared and feature components
│   │   ├── api/                 one client module per backend service
│   │   ├── config/              env parsing, backend base URLs
│   │   ├── routes/              route definitions
│   │   └── ...
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── auth-service/            accounts, JWT, wallet, markup master config
│   ├── flight-service/          flight search / booking / ticketing
│   ├── hotel-search-service/    hotel search, suggest, static content
│   ├── hotel-booking-service/   hotel pricing, booking, cancellation
│   ├── hotel-engine/            supplier-agnostic hotel engine (parallel rewrite)
│   ├── cabs-service/            airport transfers, intercity cabs
│   ├── insurance-service/       travel insurance
│   ├── visa-service/            visa products and applications
│   ├── passport-service/        passport assistance
│   ├── charter-service/         private charter enquiries
│   ├── tour-package-service/    tours and holiday packages
│   ├── payment-service/         Razorpay + Cashfree
│   ├── email-service/           transactional mail via BullMQ
│   └── local-dev/               stub servers and sample payloads
│
├── docs/architecture/           how the system fits together
├── scripts/                     tooling (dev, doctor, per-package runner)
├── AGENTS.md                    orientation for AI coding agents
└── package.json                 orchestration only — no application code
```

Inside a backend service the layout is consistent:

```
<service>/src/
├── routes/          URL → controller
├── controllers/     HTTP in, HTTP out. No business logic.
├── services/        business logic
├── repositories/    database access
├── models/          Mongoose schemas
├── providers/       supplier abstraction (hotel/cab services)
├── suppliers/       one directory per supplier implementation
├── clients/         raw HTTP clients for supplier APIs
├── middlewares/     auth, validation, rate limiting, errors
├── config/          env parsing, CORS, database connection
├── utils/           helpers
└── types/           shared TypeScript types
```

See [docs/architecture/03-backend-architecture.md](docs/architecture/03-backend-architecture.md)
for what belongs in each layer, and
[docs/architecture/05-integration-architecture.md](docs/architecture/05-integration-architecture.md)
for how to add a new supplier.

---

## Integrations

Suppliers are reached through a provider abstraction, never called directly from
business logic:

```
service  →  providers/  →  suppliers/<name>/  →  clients/  →  supplier HTTP API
                                    ↓
                          normalised KLAR shape
```

| Supplier | Used by | Products |
|---|---|---|
| **TripJack** | flight, hotel-search, hotel-booking, cabs, insurance | flights, hotels, cabs, TripSafe insurance |
| **RateGain** | hotel-search, hotel-booking | hotel inventory and rates |
| **Razorpay** | payment | payments, refunds, webhooks |
| **Cashfree** | payment | payments |
| **OpenCage** | hotel-search | geocoding |

Adding a provider means adding a directory under `suppliers/` and registering it
with the provider layer. No business logic, controller or route should change.

---

## How the frontend reaches the backend

Directly over HTTP, one base URL per service. There is no API gateway and no
BFF. `frontend/src/api/` holds one client module per backend service, and
`frontend/src/config/` resolves each base URL from a `VITE_*` variable with a
`localhost:501x` fallback — so a locally running stack needs no configuration.

**Every `VITE_*` variable is inlined into the browser bundle and is public.**
Vite substitutes them at build time; anyone can read them with devtools. Nothing
confidential belongs in `frontend/.env` — supplier keys and gateway secrets live
in a backend service's `.env`, behind an API. See
[frontend/.env.example](frontend/.env.example), which flags the two variables
currently violating this.

The B2B agent portal is still a separate working copy and is not in this
repository.

---

## Troubleshooting

**Run `npm run doctor` first.** It diagnoses most of the following.

| Symptom | Cause and fix |
|---|---|
| `EADDRINUSE` on startup | Another process owns the port. `lsof -ti:5011 \| xargs kill`, or check nothing from a previous `npm run dev` survived. |
| `Missing required environment variable: X` | That service validates its environment at boot. Copy the key from its `.env.example` and set it. |
| `Missing ENV variables:` with a long list | payment-service. It validates everything up front and will not start partially configured. |
| Every authenticated request 401s | `JWT_SECRET` differs between auth-service and the service you are calling. It must be byte-identical. |
| Refunds do nothing, bookings sit in `MANUAL_REVIEW` | `INTERNAL_SERVICE_KEY` is unset or mismatched. The services warn about this at boot. |
| `MongoNetworkError` / `ECONNREFUSED 27017` | MongoDB is not running. See [Requirements](#requirements). |
| Redis connection errors from email-service | email-service *requires* Redis — BullMQ is its queue backend. Other services degrade gracefully without it. |
| CORS errors in the browser | The frontend origin is not in that service's `CORS_ORIGIN` / `ALLOWED_ORIGINS`. Localhost on any port is allowed automatically in non-production. |
| Bookings created, then payment fails with *Access Denied* | `TRIPJACK_AGENCY_ID` is not the numeric agency id that owns `TRIPJACK_API_KEY`. |
| `npm install` fails on puppeteer | flight-service and cabs-service pull Chromium (~150 MB each). Behind a proxy, set `PUPPETEER_SKIP_DOWNLOAD=true` — PDF generation will not work. |
| Node version errors | `nvm use` picks up `.nvmrc`. Services declare `engines.node >= 20`. |

---

## Contributing

Before changing anything, read [AGENTS.md](AGENTS.md) — it covers where each
kind of change belongs, the naming conventions, and what not to touch casually.
It is written for AI coding agents but is the shortest orientation for humans too.
