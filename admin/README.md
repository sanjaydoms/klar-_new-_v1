# KLAR Operations

The Super Admin console — the Integration Control Center's frontend.

A separate app from `frontend/` on purpose: it ships to a handful of staff
rather than to customers, and nothing an operator sees belongs in a public
bundle.

```bash
npm run dev -- admin        # from the repository root, port 5009
```

It talks to two backends and holds no credential of its own. Sign-in posts to
auth-service, which sets an httpOnly cookie the browser holds and this app
cannot read — an admin console that could read its own token could also leak
it. Every permission is enforced by integration-service; the route guard here
is a courtesy so an unauthenticated visitor lands somewhere useful.

| Variable | |
|---|---|
| `VITE_INTEGRATION_URL` | integration-service, default `http://localhost:5022` |
| `VITE_AUTH_URL` | auth-service, default `http://localhost:5010` |

## Running it locally

auth-service's checked-in `.env` points at the shared Atlas cluster. To work on
this console without touching it, run the collaborator stubs and point the app
at the auth stub:

```bash
npm run stubs
```

Then set `VITE_AUTH_URL=http://localhost:5910` in `admin/.env`. The stub signs
any credentials in as a MASTER user, with a JWT signed by the same secret
integration-service verifies. Add that user's email to integration-service's
`MASTER_EMAILS` or every destructive action will be refused — which is the
allowlist working, not a bug.

## What is shown and what is not

Sections with no backend behind them yet say so. Request volume, latency and
error rate read "Not collected" rather than "0": a KPI showing zero because
nothing was measured is a lie that reads as good news, which is the worst
direction for an operations screen to be wrong in.

Status colour is never the only signal — every status carries an icon and a
word, because this information travels by screenshot during an incident.
