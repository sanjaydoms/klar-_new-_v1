# AGENTS.md — orientation for coding agents

Read this before changing anything. It is the shortest path from "I have a task"
to "I know which file to open".

---

## What this repository is

**Backend only.** Thirteen independent Express + TypeScript microservices. There
is no frontend here — the B2C application is a separate repository
(`sanjaydoms/klar-b2c-frontend`). If a task says "change the hotel card", it is
not in this repository.

There is no shared code between services and no monorepo tooling that links
them. Each service has its own `package.json`, `node_modules`, `.env`, `tsconfig`
and deployment. They communicate over HTTP only.

Do not add a workspace, a shared library package, or a build graph. Services are
deployed independently and each `deploy` script runs `npm install` in its own
directory.

---

## Running it

```bash
npm run setup       # install everything, create .env files from templates
npm run doctor      # diagnose why something will not start
npm run dev         # all services, one terminal, labelled logs
npm run dev -- flight auth
npm run typecheck   # the real check — there is no linter in this repo
npm run build
```

MongoDB (`:27017`) and Redis (`:6379`) must be running first.

---

## Finding things

| Task | Where |
|---|---|
| Change an API's URL or method | `<service>/src/routes/` |
| Change request/response handling | `<service>/src/controllers/` |
| Change business rules | `<service>/src/services/` |
| Change a database query | `<service>/src/repositories/` |
| Change a schema | `<service>/src/models/` (or `model/` in charter, passport, tour-package) |
| Add or change a supplier call | `<service>/src/suppliers/<name>/` and `clients/` |
| Change how suppliers are selected | `<service>/src/providers/` |
| Change env parsing or CORS | `<service>/src/config/` |
| Change auth, validation, rate limits | `<service>/src/middlewares/` |
| Change an email or PDF template | `<service>/src/templates/` |
| Change a scheduled job | `<service>/src/cron/` or `workers/` |

Which service owns what:

| Domain | Service | Port |
|---|---|---|
| accounts, JWT, wallet, markup master config | `auth-service` | 5010 |
| flights | `flight-service` | 5011 |
| hotel search | `hotel-search-service` | 5012 |
| hotel booking | `hotel-booking-service` | 5013 |
| payments | `payment-service` | 5014 |
| transactional email | `email-service` | 5015 |
| cabs | `cabs-service` | 5016 |
| insurance | `insurance-service` | 5017 |
| visas | `visa-service` | 5018 |
| charters | `charter-service` | 5019 |
| tour packages | `tour-package-service` | 5020 |
| passports | `passport-service` | 5021 |
| hotel engine rewrite | `hotel-engine` | 5030 |

---

## The layers, and what belongs in each

```
routes/         URL shape only. Mount path, HTTP verb, middleware chain.
controllers/    Parse the request, call one service, shape the response.
                No business logic, no database, no supplier calls.
services/       All business logic. Pricing, markup, validation, orchestration.
repositories/   All database access. Nothing else touches Mongoose directly.
providers/      Chooses which supplier answers a request, merges their results.
suppliers/      One directory per supplier. Knows that supplier's quirks.
clients/        Raw HTTP against a supplier API. No KLAR concepts.
```

The rule that matters: **business logic never knows which supplier it is talking
to.** Supplier responses are normalised into KLAR's internal shape inside
`suppliers/`, and everything above that layer sees only the normalised shape.

---

## How to make common changes

**Add an endpoint to an existing service**
1. `src/routes/<domain>.routes.ts` — add the route and its middleware.
2. `src/controllers/` — add the handler. Keep it thin.
3. `src/services/` — put the actual logic here.
4. `src/repositories/` — if it reads or writes the database.
5. Run `npm run typecheck` in that service.

**Add a supplier** (e.g. a third hotel provider)
1. `src/suppliers/<name>/` — client calls plus a transformer to the normalised shape.
2. Register it in `src/providers/`.
3. Add its credentials to that service's `.env.example` **and** `src/config/`.
4. Nothing in `services/`, `controllers/` or `routes/` should need to change. If
   it does, the abstraction is being bypassed — fix that instead.

**Add a service**
1. Copy the structure of an existing small service (`visa-service` is the simplest).
2. Add it to `scripts/services.mjs` — that is the single source of truth for
   ports and for `npm run dev` / `npm run doctor`.
3. Add a `dev:<name>` script to the root `package.json`.
4. Write its `.env.example` before writing its config.

**Add an environment variable**
1. Read it in `src/config/` only. Never `process.env.X` scattered through the code.
2. Add it to that service's `.env.example` with a comment saying what breaks
   without it.
3. If it is required at boot, make the service fail loudly, not silently.

---

## Conventions

- TypeScript everywhere, `strict: true`, CommonJS (except `hotel-engine`, which is ESM).
- Entry point is `src/server.ts`, except flight-service and payment-service
  (`src/index.ts`) and email-service (`src/main.ts`).
- Filenames are `<domain>.<layer>.ts` — `hotel.controller.ts`, `hotel.service.ts`.
- Build output goes to `dist/`, which is never committed.
- Env variable names are `SCREAMING_SNAKE_CASE`.

---

## Things not to change casually

| Thing | Why |
|---|---|
| Port numbers in `scripts/services.mjs` | The frontends hardcode these as fallbacks. Changing one breaks local development for everyone. |
| `JWT_SECRET` handling | It must be identical across auth, hotel-search, hotel-booking, cabs and insurance, or everything 401s. |
| `INTERNAL_SERVICE_KEY` checks | These gate service-to-service refund and wallet routes. Weakening them is a money bug. |
| `TRIPJACK_AGENCY_ID` validation | If it is not the numeric id owning the API key, bookings are created and *then* fail payment. The warnings at boot are load-bearing. |
| Price-tolerance and lock logic in booking services | `PRICE_TOLERANCE_*`, `STRICT_*_VALIDATION`, `LOCK_FAIL_OPEN` guard against booking at a stale price or double-booking. |
| `deploy` / `pm2:*` scripts | They run against live infrastructure. |
| `hotel-engine` | A parallel rewrite, not yet wired to anything. Do not "merge" it into the live hotel services without an explicit instruction. |

---

## Testing expectations

Real test suites exist in `auth-service`, `cabs-service`, `hotel-booking-service`
and `hotel-search-service` (`node --test`) and in `hotel-engine` (`vitest`).
`npm run test` from the root runs them and skips services that have none.

There is no linter. `npm run typecheck` is the check that must pass.

Non-trivial logic — anything touching money, booking state, or supplier
responses — should leave a runnable check behind. Follow the pattern already in
that service rather than introducing a new test framework.

---

## Do not

- Add a dependency for something a few lines of code or the standard library covers.
- Introduce a shared package, workspace, or build graph across services.
- Commit a `.env`, a `dist/`, or a lockfile-less dependency change.
- Add a `lint` or `format` script without also adding the tool and its config —
  every such script in this repo was fake and has been removed.
- Silence a boot-time warning by deleting it. Those warnings describe real
  degraded states.
