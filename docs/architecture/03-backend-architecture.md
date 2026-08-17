# 03 — Backend architecture

## One shape, thirteen times

Every service is an independent Express + TypeScript application. They share no
code and no `node_modules`. What they share is a layout, so that knowing one
service means knowing all of them.

```
<service>/
├── src/
│   ├── server.ts          starts the HTTP listener, connects the database
│   ├── app.ts             builds the Express app: middleware, routes, errors
│   ├── routes/            URL → controller
│   ├── controllers/       HTTP in, HTTP out
│   ├── services/          business logic
│   ├── repositories/      database access
│   ├── models/            Mongoose schemas
│   ├── providers/         supplier selection and result merging
│   ├── suppliers/         one directory per supplier
│   ├── clients/           raw HTTP against a supplier API
│   ├── middlewares/       auth, validation, rate limiting, error handling
│   ├── config/            environment parsing, CORS, database connection
│   ├── cron/ workers/     scheduled and background jobs
│   ├── templates/         email and PDF templates
│   ├── utils/             helpers
│   └── types/             shared TypeScript types
├── .env.example           every variable this service reads
├── package.json
└── tsconfig.json
```

Not every service has every directory — `visa-service` has no suppliers because
it sells KLAR's own catalogue. The directories that exist mean the same thing
everywhere.

### Known naming deviations

Left alone deliberately: renaming them is a wide, risky diff for no functional gain.

| Service | Deviation |
|---|---|
| `charter-service`, `passport-service`, `tour-package-service` | `model/` rather than `models/` |
| `visa-service` | `repository/` and `service/` (singular) |
| `flight-service`, `payment-service` | entry point is `src/index.ts` |
| `email-service` | entry point is `src/main.ts` |
| `hotel-engine` | ESM, `vitest`, its own conventions — a separate codebase in the same repository |

## The layers

The layering exists so that a change has exactly one correct home.

**`routes/`** — mount path, HTTP verb, middleware chain. No logic.

**`controllers/`** — read the request, call one service function, shape the
response. A controller that queries Mongoose or calls a supplier is in the wrong
layer.

**`services/`** — all business logic: pricing, markup, validation, orchestrating
several suppliers, deciding a booking is unsafe. This is where domain rules live.

**`repositories/`** — all database access. Nothing outside this layer imports a
Mongoose model directly, so a query change has one home.

**`models/`** — Mongoose schemas and their indexes.

**`providers/`** — decides which supplier answers a request, calls them,
merges and dedupes their results. Business logic asks the provider layer for
"hotels"; it never asks for "TripJack hotels".

**`suppliers/<name>/`** — everything specific to one supplier: its request
shapes, its quirks, and the transformer that turns its response into KLAR's
normalised shape.

**`clients/`** — raw authenticated HTTP against a supplier API. Knows about
timeouts, retries and that supplier's auth header. Knows nothing about KLAR.

**`middlewares/`** — JWT verification, request validation, rate limiting, and
the error handler that turns a thrown error into a response.

**`config/`** — the *only* place `process.env` is read. Everything else imports
the parsed config object.

## The two rules that matter

**1. Business logic never knows which supplier it is talking to.**

Supplier responses are normalised inside `suppliers/`. Above that layer, code
sees only KLAR's shape. This is what makes adding RateGain alongside TripJack a
new directory rather than a rewrite. See [05](05-integration-architecture.md).

**2. `process.env` is read only in `config/`.**

Services validate their environment at boot and fail loudly, listing what is
missing, rather than throwing `undefined is not a function` twenty minutes later
in a supplier call. Three different helper styles exist across the services
(`requiredEnv`, `getEnvVar`, `getEnv`) but the contract is the same.

## Cross-cutting concerns

**Authentication.** Product services verify the JWT locally with their own
`JWT_SECRET`; they do not call auth-service per request.

**Service-to-service calls.** Background work has no user JWT, so routes like
wallet credit and automatic refunds are gated on `INTERNAL_SERVICE_KEY` instead.
Unset, refunds are disabled and bookings park in `MANUAL_REVIEW`.

**Booking safety.** Booking services (`hotel-booking`, `cabs`) guard the money
path with:

| Control | Purpose |
|---|---|
| `PRICE_TOLERANCE_FIXED` / `PRICE_TOLERANCE_PERCENT` | Reject a booking whose price drifted upward between search and book. |
| `STRICT_ROOM_VALIDATION` / `STRICT_VEHICLE_VALIDATION` | Refuse to book something that is not exactly what was quoted. |
| Redis distributed lock, `LOCK_FAIL_OPEN` | Prevent double-booking. `LOCK_FAIL_OPEN` decides whether an unreachable Redis blocks bookings or is ignored. |
| `ENABLE_AUTO_REFUNDS` | Whether a supplier failure after successful payment refunds automatically or waits for ops. |

These are load-bearing. Weakening one is a money bug.

**Caching.** hotel-search-service caches a search's deduplicated master result
set in an in-process L1 and then Redis, and slices pages from it. Its
`src/config/env.ts` documents the cost of every knob — read it before changing
any of them.

**Errors.** Each service has an error-handling middleware at the end of its
middleware chain. Throw from a service; do not build error responses in
controllers.

**Logging.** `console` with emoji prefixes in the twelve original services;
`hotel-engine` has a structured logger. Not unified — see
[OPEN-ISSUES](../../hotel-engine/docs/OPEN-ISSUES.md).

## Build and run

| | |
|---|---|
| Dev | `nodemon`/`ts-node-dev` over `ts-node`, watching `src/` |
| Build | `tsc` to `dist/`, never committed |
| Start | `node dist/<entry>.js` |
| Production | pm2, per service, via each service's `pm2:*` and `deploy` scripts |
| Typecheck | `tsc --noEmit` |

`hotel-engine` differs: ESM, tested with `vitest`, backed by PostgreSQL rather
than MongoDB, and it builds through its own `tsconfig.build.json`. Its source
imports siblings with `.js` specifiers — correct TypeScript-ESM style — which
Node's type stripping does not rewrite to `.ts`, so it must be compiled before
it can run. `npm run dev:engine` builds and then starts it.

There is no linter in this repository.
