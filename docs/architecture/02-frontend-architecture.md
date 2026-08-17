# 02 — Frontend architecture

## What it is

`frontend/` is the B2C customer web application: Vite + React + TypeScript with
Tailwind, dev server on `:5008`, tested with Vitest and linted with ESLint.

It was developed as its own repository (`sanjaydoms/klar-b2c-frontend`) and was
merged in here with its history intact. That repository is no longer the source
of truth.

The B2B agent portal is still a separate working copy and is not here.

## Layout

```
frontend/src/
├── pages/           one directory per route area
├── components/      shared and feature components
├── api/             one client module per backend service
├── config/          env parsing, backend base URLs
├── routes/          route definitions
├── hooks/           shared React hooks
└── assets/
```

The rule that matters: **components do not call `fetch` directly.** Every
backend call goes through a client module in `src/api/`, which resolves its base
URL from `src/config/`. That is what keeps the port map in one place instead of
scattered through JSX.

## How it reaches the backend

Directly over HTTP, one base URL per service. No API gateway, no BFF, no proxy
in development — each service sets permissive CORS for localhost instead.

Each base URL comes from a `VITE_*` variable with a `localhost:501x` fallback:

| Variable | Falls back to | Service |
|---|---|---|
| `VITE_BACKEND_AUTH_URL` | `http://localhost:5010` | auth-service |
| `VITE_BACKEND_FLIGHT_URL` | `http://localhost:5011` | flight-service |
| `VITE_SEARCH_API_URL` | `http://localhost:5012` | hotel-search-service |
| `VITE_BOOKING_API_URL` | `http://localhost:5013` | hotel-booking-service |
| `VITE_PAYMENT_API_URL` | `http://localhost:5014` | payment-service |
| `VITE_BACKEND_CABS_URL` | `http://localhost:5016` | cabs-service |
| `VITE_SEARCH_INSURANCE_API_URL` | *(none — must be set)* | insurance-service, now `:5017` |
| `VITE_VISA_BASE_URL` … `VITE_PASSPORT_BASE_URL` | *(various)* | the smaller services |

**Those fallbacks are a second copy of the port map.** `scripts/services.mjs` is
the source of truth; if a port moves it must move here in the same change.
Insurance moving from 5014 to 5017 is the live example — it had no fallback, so
`VITE_SEARCH_INSURANCE_API_URL` must now point at 5017.

## Every VITE_ variable is public

Vite inlines `import.meta.env.VITE_*` into the bundle at build time. They end up
as plain strings in JavaScript any visitor can read. There is no such thing as a
secret in the frontend.

Two variables currently violate this and should be removed:

| Variable | Why it is a problem |
|---|---|
| `VITE_BACKEND_TRIPJACK_API_KEY` | A supplier credential in the browser. Anyone can extract it and call TripJack as KLAR. That call belongs behind a backend endpoint. |
| `VITE_SECRET_COUPON` | Overrides pricing. Public means anyone can apply it. The check belongs server-side, where hotel-booking-service already has `SECRET_SYSTEM_COUPON`. |

Both are left unset in `frontend/.env.example`, with the reason recorded there.
Google's client ID and Maps key are also public, but that is by design — restrict
them by HTTP referrer in the provider console rather than trying to hide them.

## Authentication

1. The app authenticates against auth-service and receives a JWT.
2. It sends `Authorization: Bearer <token>` to every product service.
3. Each service verifies the token locally with its own `JWT_SECRET` — it does
   not call auth-service per request.

So `JWT_SECRET` must be byte-identical across auth-service, hotel-search-service,
hotel-booking-service, cabs-service and insurance-service. A mismatch produces a
401 that looks like an expired login.

`INTERNAL_SERVICE_KEY` must never reach the browser: it is the service-to-service
secret gating wallet credit and automatic refunds.

## CORS

Each service configures CORS from its own environment — `CORS_ORIGIN` in most,
`ALLOWED_ORIGINS` in hotel-search-service, `CORS_ORIGINS` in email-service. The
templates set these to `http://localhost:5008`.

In non-production every service allows any `http://localhost:*` or
`http://127.0.0.1:*` origin regardless, so a Vite server on another port still
works. In production the origin must be in the allowlist.

## What the frontend never does

- Talk to TripJack, RateGain or any other supplier directly.
- Compute or apply markup. Prices arrive already marked up.
- Talk to MongoDB or Redis.
- Hold `INTERNAL_SERVICE_KEY`.

## Commands

```bash
npm run dev:frontend                     # just the web app
npm run dev                              # web app + every backend service
npm --prefix ./frontend run build        # production bundle
npm --prefix ./frontend run typecheck
npm --prefix ./frontend run lint         # ESLint — frontend only
npm --prefix ./frontend run test         # Vitest
```
