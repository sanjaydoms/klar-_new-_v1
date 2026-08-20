# AGENTS.md — orientation for coding agents

Read this before changing anything. It is the shortest path from "I have a task"
to "I know which file to open".

---

## What this repository is

Two halves, one repository:

- **`frontend/`** — the B2C customer web application. Vite + React + TypeScript,
  Tailwind, dev server on `:5008`. UI work lives here: pages, components,
  styling, anything a user sees.
- **`admin/`** — the Super Admin console, on `:5009`. A separate app from
  `frontend/` on purpose: it ships to staff, and nothing an operator sees
  belongs in a customer bundle. Supplier health, routing, credentials,
  incidents.
- **`backend/`** — fourteen independent Express + TypeScript microservices.
  Business logic, persistence, supplier integrations, payments.

If a task says "change the hotel card", it is in `frontend/`. If it says "fix
hotel search", the UI is in `frontend/` and the logic is in
`backend/hotel-search-service/` — follow the chain in
[docs/architecture/04-api-architecture.md](docs/architecture/04-api-architecture.md).

There is no shared code between the halves, and none between services. Each
package has its own `package.json`, `node_modules`, `.env` and `tsconfig`, and
each backend service deploys independently.

Do not add a workspace, a shared library package, or a build graph. The root
`package.json` orchestrates by shelling out with `npm --prefix`; it holds no
application code and no dependencies beyond `concurrently`. Each service's
`deploy` script runs `npm install` in its own directory.

The B2B agent portal is a separate working copy and is not in this repository.

---

## Running it

```bash
npm run setup       # install everything, create .env files from templates
npm run doctor      # diagnose why something will not start
npm run dev         # frontend + all services, one terminal, labelled logs
npm run dev -- web flight auth
npm run dev -- --backend-only
npm run typecheck   # the check that must pass; ESLint exists in frontend/ only
npm run build
```

MongoDB (`:27017`) and Redis (`:6379`) must be running first. The web app is
then on http://localhost:5008.

---

## Finding things

| Task | Where |
|---|---|
| Change a page or screen | `frontend/src/pages/` |
| Change a shared UI component | `frontend/src/components/` |
| Change how the app calls a service | `frontend/src/api/` |
| Change a backend base URL or feature flag | `frontend/src/config/` + `frontend/.env.example` |
| Change routing in the web app | `frontend/src/routes/` |
| Change an API's URL or method | `backend/<service>/src/routes/` |
| Change request/response handling | `backend/<service>/src/controllers/` |
| Change business rules | `backend/<service>/src/services/` |
| Change a database query | `backend/<service>/src/repositories/` |
| Change a schema | `backend/<service>/src/models/` (or `model/` in charter, passport, tour-package) |
| Add or change a supplier call | `backend/<service>/src/suppliers/<name>/` and `clients/` |
| Change how suppliers are selected | `backend/<service>/src/providers/` |
| Change env parsing or CORS | `backend/<service>/src/config/` |
| Change auth, validation, rate limits | `backend/<service>/src/middlewares/` |
| Change an email or PDF template | `backend/<service>/src/templates/` |
| Change a scheduled job | `backend/<service>/src/cron/` or `workers/` |

Which backend service owns what:

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

**Add a page to the web app**
1. `frontend/src/pages/<area>/` — the page component.
2. `frontend/src/routes/` — register the route.
3. `frontend/src/api/` — if it calls a backend, add or extend the client module
   for that service. Do not call `fetch` directly from a component.
4. Any new base URL goes in `frontend/src/config/` **and** `frontend/.env.example`.
5. `npm --prefix ./frontend run typecheck`.

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
1. Copy the structure of an existing small service (`backend/visa-service` is the simplest).
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

- TypeScript everywhere, `strict: true`. Backend is CommonJS (except
  `hotel-engine`, which is ESM); the frontend is ESM via Vite.
- Backend entry point is `src/server.ts`, except flight-service and payment-service
  (`src/index.ts`) and email-service (`src/main.ts`).
- Filenames are `<domain>.<layer>.ts` — `hotel.controller.ts`, `hotel.service.ts`.
- Build output goes to `dist/`, which is never committed.
- Env variable names are `SCREAMING_SNAKE_CASE`.

---

## Things not to change casually

| Thing | Why |
|---|---|
| Port numbers in `scripts/services.mjs` | `frontend/src/config/` and several components hardcode these as fallbacks. Move a port and you must move it there too, in the same change. |
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

ESLint exists in `frontend/` only. For the backend, `npm run typecheck` is the check.

**Two red baselines, both pre-existing — do not "fix" them by weakening them:**

- `npm run typecheck` → `frontend` fails with **1363** errors. Every backend
  service is clean. Compare against 1363 before blaming your change.
- `npm run test` → `frontend` fails **13** tests, all in
  `src/__tests__/bug-exploration.test.ts`. That file is *written to fail*: each
  failure documents a real unfixed bug. Its header says "Do NOT fix the tests —
  fix the underlying source code."

Never make a failing check pass by deleting the assertion, loosening a type, or
adding `@ts-ignore`.

Non-trivial logic — anything touching money, booking state, or supplier
responses — should leave a runnable check behind. Follow the pattern already in
that service rather than introducing a new test framework.

---

## Do not

- Add a dependency for something a few lines of code or the standard library covers.
- Introduce a shared package, workspace, or build graph across services.
- Commit a `.env`, a `dist/`, or a lockfile-less dependency change.
- Add a `lint` or `format` script to a backend service without also adding the
  tool and its config — every such script there was fake and has been removed.
  (`frontend/` does have a real ESLint setup.)
- Put anything confidential in a `VITE_*` variable. They are inlined into the
  browser bundle and are readable by anyone.
- Silence a boot-time warning by deleting it. Those warnings describe real
  degraded states.
