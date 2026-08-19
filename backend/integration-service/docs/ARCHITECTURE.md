# Architecture

## The layering

Two services call suppliers, and they integrate with the control center
DIFFERENTLY — on purpose.

| | hotel-search | hotel-booking | flight |
|---|---|---|---|
| Consults routing | yes | **no** | **no** |
| Circuit breaker | yes | **no** | **no** |
| Reports health and logs | yes | yes | yes |

Only one of the three decides anything, and that is a property of the domain
rather than an omission.

A hotel SEARCH fans out to every routed supplier and merges, so skipping one
costs coverage and saves a timeout — routing and a breaker both earn their
place.

A hotel BOOKING is made against a specific rate at a specific supplier. There
is no second provider who could serve the same request, so refusing to call the
one that owns it would abandon a customer mid-purchase rather than protect
anything.

FLIGHTS have one supplier. Routing would have exactly one candidate and could
only ever return the same answer; a breaker could only refuse to sell a flight
nobody else can sell. That changes the day a second flight aggregator exists —
and it is the case routing was built for, because two aggregators genuinely can
both answer a flight search.

```
customer request
      │
      ▼
hotel-search-service          owns the supplier adapters and makes the calls
      │  ├─ config/integration-config.ts   holds a routing snapshot, refreshed on a timer
      │  ├─ config/breaker.ts              circuit breaker, state local to this process
      │  └─ config/telemetry.ts            batches observations, sends them fire-and-forget
      │
      │
hotel-booking-service         observes only
      │  ├─ utils/observability.ts        the route names the operation; ALS carries it
      │  └─ clients/observe.ts            one axios interceptor per supplier client
      │
flight-service                observes only
      │  ├─ utils/observability.ts        same, labelled at the route MOUNT
      │  └─ utils/supplierObserver.ts     global axios interceptor, filtered by host
      │
      ▼ (once per 15s, and once per 10s the other way)
integration-service
      ├─ services/router.service.ts        who may serve (service, operation)
      ├─ services/health.service.ts        folds observations into per-minute buckets
      ├─ services/apilog.service.ts        one row per attempt, correlated
      ├─ services/incident.service.ts      opens and closes incidents from health
      ├─ services/credential.service.ts    the only plaintext exit in the system
      └─ services/audit.service.ts         append-only record of administrative change
      │
      ▼
admin/  (:5009)                the Super Admin console
```

### Why the router decides but never calls

The obvious alternative — a gateway that proxies every supplier call — would
have meant moving TripJack and RateGain knowledge out of two working services
into a third, and putting a new hop on the customer's critical path. Instead
the services keep their adapters and ask one question: *who should I call?*

The cost is that a service can ignore the answer. That is accepted, and it is
why the answer is also *reported back*: the health data shows which provider
actually served a request, so a service ignoring routing would be visible.

### Why the breaker runs in the calling process

A breaker exists to avoid a network call. One that asks a remote service for
permission has already made the call it was meant to save, and stops working
exactly when the platform is unhealthy. So the **state** is local and the
**configuration** is remote, arriving on the routing snapshot that is already
being polled.

The consequence is that two service instances can hold different views. That is
real — a partial outage looks like this — so the console shows which instance
reported a circuit and how long ago, rather than merging them into one claim.

### Why health and logs are separate collections

They answer different questions and want opposite storage. *How is this
behaving* wants aggregation on write: one minute of calls is a handful of
`$inc` operations on one document, so a busy search costs one upsert per
supplier instead of hundreds of inserts. *What happened to request X* wants one
row per attempt. Serving both from one collection makes the aggregate expensive
and the log lossy.

Both are written from the same telemetry batch, in parallel.

## Data model

All MongoDB. `slug` — not `_id` — is the key everything references, because it
is what the existing supplier adapters already call themselves.

| Collection | Holds | Notes |
|---|---|---|
| `providers` | one supplier, with its services, operations, credential schema and connection test | Embeds the whole provider → service → operation hierarchy: the router needs all three levels on every request |
| `provider_credentials` | one provider's credentials for one environment | Separate collection so the document the browser sees has no secret in it to leak |
| `routing_rules` | one ordered provider list per (service, operation) | One document, so reordering is atomic |
| `health_buckets` | one minute of calls per provider/service/operation/environment | Pre-aggregated, TTL 30 days |
| `api_request_logs` | one supplier call attempt | No payloads, no headers. TTL 30 days |
| `breaker_states` | a circuit as reported by one process | TTL 15 minutes, so a dead process's OPEN does not linger |
| `incidents` | an outage and its timeline | Partial unique index on (provider, service, operation): one open incident per provider per operation, so two suppliers can each have one for the same operation |
| `audit_logs` | every administrative change | Append-only, longest retention |
| `health_thresholds` | one document | When a measurement becomes a status, plus the breaker's numbers |
| `notification_targets` | where an alert can be sent | Channel config; secret-declared keys encrypted |
| `alert_deliveries` | one attempt to deliver one alert | TTL 90 days. Never holds a target's configuration |
| `counters` | incident numbering | Atomic `$inc`; a row count would collide |

### The provider document

```
providers
  slug            "tripjack"        stable key, referenced everywhere
  code            "TJ"              what the existing adapters call themselves
  types           ["FLIGHT","HOTEL"]
  status          ACTIVE | DISABLED | DEGRADED | MAINTENANCE     ← an admin's intent
  activeEnvironment  production | test
  environments
    production    { baseUrl, enabled }
    test          { baseUrl, enabled }
  services[]
    service       "HOTEL"
    enabled       true              ← KLAR's choice
    operations[]
      operation   "SEARCH"
      supported   true              ← a fact about the supplier's API
      enabled     true              ← KLAR's choice
  credentialSchema[]                ← what fields THIS provider needs
  connectionTest                    ← how to prove they work
```

`supported` and `enabled` are deliberately different fields. `supported` is a
fact about what the supplier implements and cannot be changed from the admin
UI; `enabled` is a preference. Enabling an unsupported operation is refused,
because the failure would otherwise land on a customer mid-purchase.

**Provider status and health status are also separate.** Status is what an
administrator set. Health is what the suppliers actually did. A provider left
ACTIVE can still be measured CRITICAL, and that gap is exactly what the
dashboard exists to show.

## The routing decision

`resolve(service, operation)` runs six gates, in order:

1. the target is enabled **in this routing rule** — a per-route switch,
   independent of the provider's own status, for parking a provider on one
   operation without touching the rest (`ROUTE_DISABLED`)
2. the provider still exists (`UNKNOWN_PROVIDER`)
3. the provider is `ACTIVE`
4. its active environment is enabled
5. the service is enabled
6. the operation is both `supported` and `enabled`

Anything that fails a gate appears in `excluded` with the reason, which the
console shows and the logs record. Silently dropping a provider hides a broken
configuration.

Two fields carry weight in the response:

- **`configured`** — `false` means no rule exists and the caller should fall
  back to its own behaviour. `true` with an empty `providers` list means an
  administrator deliberately left nothing routable.
- **`mutating`** — `true` for `BOOKING`, `CANCELLATION` and `MODIFICATION`.
  Surfaced with the decision rather than re-derived by each caller, because a
  caller that forgets to check it is a caller that can double-book.

### What `failoverEnabled` does today

It is enforced and recorded but does not drive sequential retry, because
nothing in the hotel flow can use it yet:

- **Search** calls every routed supplier *in parallel* and merges. One failing
  costs coverage, not the search. What protects that path is the circuit
  breaker.
- **Details** are fetched by a property id that *belongs* to one supplier.
  TripJack cannot price a RateGain property.
- **Booking** is made against the specific rate revalidated moments earlier.

There is no second supplier who could serve the same request. The flag becomes
live the first time an operation exists that two providers can genuinely both
serve — a flight search across two aggregators, for example. Fabricating
failover on a path that merges would make the logs lie.

## Health

Per-minute buckets carry counters, a duration sum, and a **latency histogram**
of twelve boundaries. Percentiles come from the histogram rather than stored
samples.

Two facts make the boundaries load-bearing: a percentile reports its bucket's
*upper* edge, and RateGain's search normally runs 10–14s. A coarse 15s–30s
bucket therefore reported a genuine 20s p95 as 30s and flipped a merely slow
provider to CRITICAL, which is why 12s, 15s and 20s boundaries exist. Adding a
boundary in the middle invalidates comparison with rows already stored — append
at the end instead.

An empty histogram yields `null`, never `0`. Zero would read as "instant".

**Nothing is judged below the sample floor.** One failure out of one request is
a 100% error rate and means nothing. Status takes the *worse* of the
error-rate and latency verdicts: a supplier answering everything in forty
seconds is not healthy just because nothing failed.

## Alerting

Incidents raise themselves, but a dashboard only helps somebody already looking
at it. Alerts are what make the workflow work at three in the morning.

```
incident opened / escalated / resolved ─┐
provider disabled by an administrator ──┼─▶ dispatch ─▶ every target that
supplier rejected our credentials ──────┘                subscribed to that event
                                                         and meets its severity floor
                                                              │
                                                    channel registry (by type)
                                                         ├─ webhook  → Slack, Teams, PagerDuty…
                                                         └─ email    → via email-service
```

The registry is §44's "do not hard-code notification providers": everything
above it looks a channel up by a type string, so adding one is a file in
`services/channels/` and a line in its index. No model, controller, dispatcher
or console change.

Two events do not come from incidents, deliberately. **A provider disabled by
an administrator** raises nothing in the health monitor — a supplier nobody is
calling produces no errors — yet it is exactly what other people need to know.
**A rejected credential** needs a different person: an expired key is not fixed
by watching an error rate come down, and a connection test can find it with no
customer traffic at all.

`dispatch` never throws. It is called from the incident detector and from the
middle of administrative actions, and an alert that cannot be delivered must
not roll back the thing it was describing. Failures become deliveries with
status `FAILED`, which is what somebody asks about afterwards.

A resolution alert is sent at the severity the incident carried, not at LOW.
Downgrading it would filter it out at exactly the target that most needs to
hear the outage is over.

A webhook URL is treated as a credential — a Slack or Teams URL is
bearer-equivalent — so it is encrypted at rest, masked on read, `http` is
refused, and it never reaches the delivery log or the audit trail.

## Security

| | |
|---|---|
| Authentication | the same JWT auth-service issues, from the `Authorization` header or the `token` cookie. This service verifies and never mints. `?token=` is deliberately not accepted — query strings end up in access logs |
| Authorisation | `constants/permissions.ts` maps role → permissions; routes state the permission they need |
| Second factor | destructive routes also require the caller's email in `MASTER_EMAILS` |
| Typed confirmation | enforced server-side for disabling a provider, entering maintenance, enabling failover on a booking-shaped operation, writing production credentials and deleting credentials. A confirmation only the browser checks is one a `curl` skips |
| Credentials at rest | AES-256-GCM, one random IV per value, authentication tag stored alongside |
| Credentials in transit to the browser | never. Masked reads only |
| Service-to-service | shared `x-internal-key`; fails closed when unset |
| Audit | every mutation, with before and after. Credential entries record which *keys* changed, never values |

### The roles gap

§29 describes Super Admin / Admin / Operations. KLAR's auth-service has five
roles and only one is KLAR staff: `MASTER`. `B2B_ADMIN` is the admin of a
**customer agency** — granting it "view provider health" would show a travel
agency which suppliers KLAR buys from and how each performs.

So `MASTER` holds everything and no other role holds anything. The Admin and
Operations tiers are defined in `TIER_TEMPLATES` and left unassigned until KLAR
creates internal staff roles, at which point they become entries in
`ROLE_PERMISSIONS` rather than a new permission system.

## Endpoints

### Admin — `/admin/integrations`, JWT + permission

| | | Permission |
|---|---|---|
| `GET` | `/providers` | view |
| `POST` | `/providers` | manage + allowlist |
| `GET` | `/providers/:slug` | view |
| `GET` | `/providers/:slug/disable-impact` | view |
| `PATCH` | `/providers/:slug/status` | control + allowlist + phrase |
| `PATCH` | `/providers/:slug/services/:service` | control + allowlist |
| `PATCH` | `/providers/:slug/services/:service/operations/:operation` | control + allowlist |
| `PATCH` | `/providers/:slug/environment` | control + allowlist |
| `GET` | `/providers/:slug/credentials/:environment` | view — masked |
| `PUT` | `/providers/:slug/credentials/:environment` | credentials + allowlist |
| `DELETE` | `/providers/:slug/credentials/:environment` | credentials + allowlist |
| `POST` | `/providers/:slug/credentials/:environment/test` | credentials + allowlist |
| `GET` | `/routing`, `/routing/:service/:operation` | view |
| `PUT` | `/routing/:service/:operation` | route + allowlist |
| `GET` | `/catalogue` | view |
| `GET` | `/health`, `/health/thresholds` | view |
| `PUT` | `/health/thresholds` | control + allowlist |
| `GET` | `/providers/:slug/health/timeline` | view |
| `GET` | `/logs`, `/logs/:id` | view |
| `GET` | `/incidents`, `/incidents/:reference` | view |
| `POST` | `/incidents/:reference/acknowledge`, `/notes` | view |
| `POST` | `/incidents/:reference/resolve`, `/incidents/detect` | control |
| `GET` | `/alerts/options` | view — the channel and event catalogue the console renders its form from |
| `GET` | `/alerts/targets` | view — secrets masked |
| `POST` `PATCH` `DELETE` | `/alerts/targets[/:id]` | manage + allowlist |
| `POST` | `/alerts/targets/:id/test` | manage + allowlist |
| `GET` | `/alerts/deliveries` | view |
| `GET` | `/audit-logs` | audit |

### Internal — `/internal`, `x-internal-key`

| | |
|---|---|
| `GET /routing` | the whole routing table plus the breaker configuration |
| `GET /routing/:service/:operation` | one operation, fresh |
| `GET /credentials/:slug/:environment` | **decrypted** credentials. The only plaintext exit |
| `POST /telemetry` | a batch of observations and circuit states |
