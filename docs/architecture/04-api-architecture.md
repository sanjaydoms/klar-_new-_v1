# 04 — API architecture

## Call path

```
frontend
   │  HTTP + Authorization: Bearer <jwt>
   ▼
routes/          mount path, verb, middleware chain
   ▼
middlewares/     verify JWT, validate body, rate limit
   ▼
controllers/     parse request, call one service, shape response
   ▼
services/        business logic, markup, orchestration
   ├──────────────► repositories/  ──►  MongoDB
   └──────────────► providers/  ──►  suppliers/  ──►  clients/  ──►  supplier API
                                          │
                                   normalised KLAR shape
```

Errors thrown anywhere below `routes/` are caught by the service's error
middleware and turned into a response there — controllers do not build error
bodies.

## Mount points

Each service owns one prefix. The frontend builds a URL from that service's base
URL plus this prefix.

| Service | Port | Prefix |
|---|---|---|
| auth-service | 5010 | `/user` |
| flight-service | 5011 | `/api/flight` |
| hotel-search-service | 5012 | `/api/search` |
| hotel-booking-service | 5013 | `/api/booking` |
| payment-service | 5014 | `/api/pay`, plus `/api/pay/razorpay/webhook` |
| email-service | 5015 | `/api/v1` |
| cabs-service | 5016 | `/api/cabs` |
| insurance-service | 5017 | `/api/insurance` |
| visa-service | 5018 | `/api/visa` |
| charter-service | 5019 | `/api/charter` |
| tour-package-service | 5020 | `/api/tours` |
| passport-service | 5021 | `/api/passport` |

auth-service's `/user` prefix is the one that does not follow `/api/*`. It is
what the frontends and the other services already call; leave it.

Several services also mount health/utility routes at `/`.

To enumerate a service's actual endpoints, read its `src/routes/` directory —
that is the authoritative list, and it stays correct as the code changes in a
way a hand-maintained endpoint table here would not.

`cabs-service` and `hotel-search-service` additionally serve Swagger UI
(`swagger-jsdoc` + `swagger-ui-express`) from JSDoc annotations in their routes.

## Authentication

Product services verify the JWT locally against their own `JWT_SECRET`. They do
not call auth-service per request, which is why that secret must be identical
across auth-service, hotel-search-service, hotel-booking-service, cabs-service
and insurance-service.

Routes that act without a user — wallet credit, automatic refunds issued by a
background worker — are gated on `INTERNAL_SERVICE_KEY` instead of a JWT. Those
routes answer `503` when the key is unset, which is the intended safe failure:
no key, no unauthenticated money movement.

## Service-to-service calls

Services call each other by base URL from their own environment, never by
importing code:

| Caller | Callee | Variable |
|---|---|---|
| flight | auth | `AUTHENTICATION_SERVICE` |
| flight | payment | `PAYMENT_SERVICE` |
| flight | email | `EMAIL_SERVICE` |
| hotel-booking, cabs | auth | `AUTH_SERVICE_URL` |
| hotel-booking, cabs | payment | `PAYMENT_SERVICE_URL` |
| hotel-booking, cabs | email | `EMAIL_SERVICE_URL` |
| auth | flight (bookings) | `BOOKING_SERVICE_URL` |
| auth | email | `EMAIL_BASE_URL` |

The variable names are inconsistent between flight-service and the newer
services. Both are in use; see [06](06-environment-configuration.md).

## Payment and webhooks

payment-service holds every gateway credential. No other service talks to
Razorpay or Cashfree.

- **Razorpay** — separate key pairs per platform (B2B / B2C) and per environment
  (test / live). `RAZORPAY_ENVIRONMENT` selects the pair.
- **Cashfree** — `CASHFREE_ENVIRONMENT` is `sandbox` or `production`.
- **Webhooks** — `POST /api/pay/razorpay/webhook`, verified with
  `RAZORPAY_WEBHOOK_SECRET`. It is mounted before the JSON body parser because
  signature verification needs the raw body.

payment-service validates its entire environment at boot and refuses to start
with a list of everything missing, rather than failing on the first real payment.

## Email

email-service accepts a job over HTTP and queues it in BullMQ on Redis; a worker
sends it. Callers get a fast acknowledgement, and mail survives a restart.
Redis is therefore a hard requirement for this service — unlike the others,
which degrade without it.

## Conventions for new endpoints

- Mount under the service's existing prefix.
- Authenticate with the existing middleware, not in the controller.
- Validate the body in middleware (`zod` where the service already uses it,
  `joi` in auth-service).
- Return the service's existing response envelope — match the neighbouring
  controllers rather than inventing a shape.
- Throw on failure and let the error middleware answer.
