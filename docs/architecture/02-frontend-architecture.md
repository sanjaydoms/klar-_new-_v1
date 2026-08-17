# 02 — Frontend architecture

## The frontend is not in this repository

This repository contains backend services only. There is no `frontend/`
directory, and adding one is not planned — the applications are deployed
separately and version independently.

| Application | Repository | Dev server |
|---|---|---|
| B2C consumer web app | `sanjaydoms/klar-b2c-frontend` | Vite, `:5173` |
| B2B agent portal | separate working copy (`KLAR_B2B_FRONTEND-main`) | Vite |

This document covers only the part that *is* this repository's concern: the
contract between a frontend and these services.

## How a frontend reaches the backend

Directly, over HTTP, one base URL per service. There is no API gateway, no BFF
and no reverse proxy in front of the services in development.

The B2C application resolves each base URL from a `VITE_*` environment variable
with a `localhost` fallback:

| Frontend variable | Falls back to | Service |
|---|---|---|
| `VITE_BACKEND_AUTH_URL` | `http://localhost:5010` | auth-service |
| `VITE_SEARCH_API_URL` | `http://localhost:5012` | hotel-search-service |
| `VITE_BOOKING_API_URL` | `http://localhost:5013` | hotel-booking-service |
| `VITE_PAYMENT_API_URL` | `http://localhost:5014` | payment-service |
| `VITE_BACKEND_CABS_URL` | `http://localhost:5016` | cabs-service |
| `VITE_SEARCH_INSURANCE_API_URL` | *(no fallback — must be set)* | insurance-service |

**Those fallbacks are why the port numbers in this repository are not free to
change.** They are duplicated in the frontend's source. If a service's port
moves, the frontend's fallback must move with it in the same change.

## Authentication

1. The frontend authenticates against auth-service and receives a JWT.
2. It sends that JWT as `Authorization: Bearer <token>` to every product service.
3. Each product service verifies the token locally using its own `JWT_SECRET` —
   it does not call auth-service to validate.

Consequence: `JWT_SECRET` must be byte-identical in auth-service,
hotel-search-service, hotel-booking-service, cabs-service and insurance-service.
A mismatch produces a 401 that looks like an expired login.

## CORS

Every service configures CORS from its own environment
(`CORS_ORIGIN`, or `ALLOWED_ORIGINS` in hotel-search-service, or `CORS_ORIGINS`
in email-service — the name is not consistent; see [06](06-environment-configuration.md)).

In non-production, all services allow any `http://localhost:*` and
`http://127.0.0.1:*` origin unconditionally, so a locally running frontend on
any Vite port works without configuration. In production, the origin must be in
the allowlist or the request is rejected.

Credentials are enabled (`CORS_CREDENTIALS=true`), so the origin is echoed back
rather than answered with `*`.

## What the frontend never does

- Talk to TripJack, RateGain, or any other supplier directly. Supplier
  credentials exist only in backend `.env` files.
- Compute or apply markup. Prices arrive already marked up.
- Talk to MongoDB or Redis.
- Hold `INTERNAL_SERVICE_KEY`. It is a service-to-service secret and must never
  reach a browser.

## Adding an endpoint the frontend will call

1. Build it in the owning service (see [03](03-backend-architecture.md)).
2. Confirm it is mounted under that service's existing prefix — the frontend
   builds URLs from the base URL plus that prefix.
3. If it needs authentication, put it behind the service's existing auth
   middleware rather than verifying the token in the controller.
4. Nothing in this repository needs to know the frontend exists.
