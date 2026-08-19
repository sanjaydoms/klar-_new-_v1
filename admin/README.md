# KLAR Operations

The Super Admin console — the Integration Control Center's frontend.

A separate app from `frontend/` on purpose: it ships to a handful of staff
rather than to customers, and nothing an operator sees belongs in a public
bundle.

```bash
npm run dev -- admin integration     # from the repository root
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

## Screens

| | |
|---|---|
| **Overview** | Is anything wrong right now — provider status beside measured health, operations with no provider, operations one supplier away from having none |
| **Providers** | Every supplier and what each is currently serving; the detail page carries the capability matrix and the enable/disable controls |
| **Service Routing** | Which supplier serves each operation, in what order, and whether the next is tried |
| **Credentials** | Per provider, per environment. Masked, with a real Test Connection |
| **Health Monitor** | Availability, latency and error rate down to the operation, plus open circuits and the thresholds editor |
| **API Logs** | Every supplier call, filterable, with the full correlation behind each row |
| **Incidents** | Raised automatically, with the timeline of what the system did |
| **Audit Logs** | Every administrative change, with before and after |

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

## Conventions worth keeping

**Never show a number that was not measured.** A KPI reading `0` because
nothing was counted is a lie that reads as good news, which is the worst
direction for an operations screen to be wrong in. `Stat` has an `unavailable`
state for exactly this, and health badges say "no traffic" or "too little
traffic" rather than showing a colour.

**Status is never colour alone.** Every `StatusPill` carries an icon and a
word, because this information travels by screenshot during an incident.

**Consequences are fetched, not described.** The disable dialog asks the
backend what would actually happen and lists the real affected operations. A
hard-coded "traffic will fail over" would be a guess printed as a fact.

**Destructive dialogs demand a typed phrase; recovery does not.** Making every
confirmation laborious trains people to type through them without reading. The
backend enforces both independently — this is where it is pleasant, not where
it is true.

Primitives are hand-written in `src/components/` rather than generated. Five
components is less code than the dependency and config that would produce them.
