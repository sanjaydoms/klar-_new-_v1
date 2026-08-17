# 07 — Local development

## From nothing to running

```bash
git clone https://github.com/sanjaydoms/klar-_new-_v1.git KLAR
cd KLAR

# Node 20+ (nvm picks up .nvmrc)
nvm use

# MongoDB and Redis must be up first
brew services start mongodb-community
brew services start redis

npm run setup     # root tooling + all 13 services + .env from every template
npm run doctor    # what is still missing
npm run dev       # frontend + backend, one terminal
```

`npm run setup` is idempotent. Re-run it after pulling.

## The commands

| Command | Does |
|---|---|
| `npm run setup` | Install root tooling, install all services, create missing `.env` files |
| `npm run install:all` | Just the installs |
| `npm run setup:env` | Just the `.env` creation |
| `npm run doctor` | Diagnose without starting anything |
| `npm run dev` | Every service in watch mode, labelled logs |
| `npm run dev -- flight auth` | Only those services |
| `npm run dev -- --list` | What is available |
| `npm run dev:flight` | One service, directly |
| `npm run build` | `tsc` in every service, pass/fail table |
| `npm run typecheck` | `tsc --noEmit` in every service |
| `npm run test` | The services that have real tests |
| `npm run stubs` | Fake auth, payment and email on 5910 / 5914 / 5915 |

`build`, `typecheck` and `test` run everything and report a summary rather than
stopping at the first failure, so one broken service does not hide the state of
the other twelve.

## Start with `npm run doctor`

It checks, in order: the Node version; that MongoDB and Redis are reachable;
that each service's dependencies are installed; that each `.env` exists; which
keys the `.env` is missing relative to its template; which required values are
still blank; and whether anything already holds a service's port.

It exits non-zero with a deduplicated list of fixes. Most "it will not start"
problems are on that list.

## Working on one service

Starting all twelve is rarely what you want. Two narrower options:

**Just the services you need:**

```bash
npm run dev -- hotel-search hotel-book auth
```

**One service against stubs.** `backend/local-dev/collab-stubs.cjs` fakes auth, payment
and email — enough to drive a booking end to end without real credentials or the
other services:

```bash
npm run stubs        # 5910 auth, 5914 payment, 5915 email
```

Then point that service's `.env` at the stub ports. Every `.env.example` for a
service that calls them has the exact lines, commented out:

```bash
AUTHENTICATION_SERVICE=http://127.0.0.1:5910/user
PAYMENT_SERVICE=http://127.0.0.1:5914/api/pay
EMAIL_SERVICE=http://127.0.0.1:5915/api/v1
```

The stubs append wallet operations to a ledger you can inspect, so wallet flows
are observable without auth-service.

## What you can do without credentials

| Works with no supplier keys | Needs real credentials |
|---|---|
| Every service boots (except payment and email, which validate up front) | Any actual supplier search or booking |
| Typecheck, build, unit tests | End-to-end booking flows |
| Auth, wallet, and anything reading KLAR's own catalogue (visa, tour packages, charter, passport) | Payment capture, refunds, outbound email |

TripJack UAT credentials, not production ones, are what you want locally.

## Working with the frontend

The frontend is `frontend/`, started by `npm run dev` along with everything
else, or on its own with `npm run dev:frontend`. It serves on `:5008`; its `VITE_*` variables
fall back to the `localhost:501x` ports these services use, so a locally running
backend needs no extra configuration. Every service allows any localhost origin
in non-production, so CORS is not in your way.

## When something will not start

`npm run doctor` first. Then:

| Symptom | Fix |
|---|---|
| `EADDRINUSE` | `lsof -ti:<port> \| xargs kill`. A previous `npm run dev` may have survived. |
| `Missing required environment variable: X` | Copy the key from that service's `.env.example`. |
| `Missing ENV variables:` with a long list | payment-service validates everything at boot; it will not start partially configured. |
| Every authenticated call 401s | `JWT_SECRET` differs between auth-service and the service you are calling. |
| `ECONNREFUSED 27017` / `6379` | MongoDB or Redis is not running. |
| email-service exits immediately | It requires both Redis and complete SMTP settings. |
| `npm install` hangs on puppeteer | flight-service and cabs-service download Chromium (~150 MB each). `PUPPETEER_SKIP_DOWNLOAD=true` skips it; PDF generation then will not work. |

## Conventions worth knowing before your first change

- `process.env` is read only in `src/config/`.
- Business logic never learns which supplier answered — see [05](05-integration-architecture.md).
- New environment variables go into `.env.example` in the same commit.
- There is no linter. `npm run typecheck` is the check.
- `dist/` and `.env` are never committed; lockfiles always are.
