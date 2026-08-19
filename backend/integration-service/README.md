# integration-service

The API & Integration Control Center. Owns which external supplier serves which
operation, the credentials for reaching them, and the record of how they behave.

Port `5022`, MongoDB, no other runtime dependency. The Super Admin console that
drives it is [`admin/`](../../admin) on `:5009`.

```bash
npm run dev -- integration admin     # from the repository root
```

## What it is for

KLAR buys from several travel aggregators. Before this service, which supplier
served a request was decided by environment variables, so switching one off
meant a deploy. Now it is a database row, and an authorised administrator can
take a failing supplier out of rotation from a browser in under a minute.

The service decides; it never calls a supplier on the business path. The
supplier adapters stay where they already live, in `hotel-search-service` and
`hotel-booking-service`, which is what let this land without rewriting either.

```
hotel-search-service ──asks──▶ integration-service   "who serves HOTEL/SEARCH?"
         │                              │
         │◀────── ["RG", "TJ"] ─────────┘
         │
         └──calls──▶ its own supplier adapters ──▶ RateGain / TripJack
                              │
                              └──reports──▶ integration-service   health + logs
```

## Documentation

| | |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the layers fit, the data model, every endpoint |
| [docs/ADDING-A-PROVIDER.md](docs/ADDING-A-PROVIDER.md) | Adding a supplier, a service, or an operation |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Runbook: taking a supplier off-sale, reading health, troubleshooting |

## Commands

```bash
npm run dev                  # nodemon + ts-node
npm test                     # node:test; database-backed tests skip without MongoDB
npm run typecheck
npm run seed                 # registers TripJack and RateGain, idempotent
npm run import-credentials   # dry run; add -- --write to import from the other services' .env
```

## Environment

| Variable | |
|---|---|
| `MONGODB_URI` | required |
| `DB_NAME` | `klar_integrations` |
| `JWT_SECRET` | **must match auth-service** — this service verifies its tokens and issues none |
| `MASTER_EMAILS` | comma-separated allowlist for destructive actions. Empty locks everyone out, by design |
| `INTERNAL_SERVICE_KEY` | shared secret other KLAR services present. Empty makes the internal routes unreachable |
| `INTEGRATION_MASTER_KEY` | 32 bytes of hex for credential encryption. **Losing it makes every stored credential unrecoverable** |
| `PORT` | 5022 |
| `CORS_ORIGIN` | comma-separated; the admin console's origin |
| `HEALTH_RETENTION_DAYS` | 30 |
| `API_LOG_RETENTION_DAYS` | 30 |
| `INCIDENT_INTERVAL_MS` | 60000 |
| `INCIDENT_DETECTOR` | `off` to disable the background detector |

Generate the master key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Two rules worth knowing before you change anything

**Nothing on the admin path can read a secret.** Plaintext leaves
`services/credential.service.ts` through exactly one function, `forService`,
reachable only from the internal routes behind the shared key. There is no
"include secrets" flag, because a flag is a thing that gets set by accident.

**"Not configured" and "configured to nothing" are opposite answers.** The
router returns `configured: false` when no rule exists — callers should then do
whatever they did before this service existed. `configured: true` with an empty
provider list means an administrator deliberately left nothing routable, and
callers must serve nothing. Conflating them either ignores a kill switch or
blacks out an unconfigured operation.
