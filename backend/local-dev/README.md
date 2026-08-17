# local-dev

Tooling for running one service without standing up the rest of the platform.

## `collab-stubs.cjs`

Fake implementations of the three platform services a product service calls, so
flights, hotels or cabs can be driven end to end on their own.

```bash
npm run stubs        # from the repository root
```

| Stub | Port | Mount |
|---|---|---|
| auth-service | 5910 | `/user/*` |
| payment-service | 5914 | `/api/pay/*` |
| email-service | 5915 | `/api/v1/*` |

Deliberately on 59xx rather than the real 501x ports, so the stubs and the real
services can run at the same time and you choose per service which one to point at.

Wallet operations append to an in-memory ledger the stub exposes, so wallet flows
are observable without auth-service or MongoDB.

To use them, point a service's `.env` at the stub ports — the lines are already
in each `.env.example`, commented out:

```bash
AUTHENTICATION_SERVICE=http://127.0.0.1:5910/user
PAYMENT_SERVICE=http://127.0.0.1:5914/api/pay
EMAIL_SERVICE=http://127.0.0.1:5915/api/v1
```

## `sample-oneway-search-response.json`

A captured TripJack one-way flight search response, used as a fixture for the
normalizer checks in `flight-service/local-dev/`. Real supplier shape, so it
catches the field-level drift a hand-written fixture would not.

## `flight-service/local-dev/`

Standalone assertion scripts for flight-service, run directly with `ts-node`
rather than through a test runner:

| Script | Checks |
|---|---|
| `normalizerFields.check.ts` | The normalizer preserves every field downstream code reads |
| `filterStats.check.ts` | Filter option counts are built from the unfiltered result set |
