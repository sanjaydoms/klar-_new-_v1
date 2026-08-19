# Operations runbook

For whoever is on the end of "hotel search is slow".

---

## A supplier is failing. Take it out of rotation.

The whole flow, no developer, under a minute.

1. **Overview** — the provider table shows status (what an admin set) beside
   health (what the supplier actually did). A provider can be `Active` and
   `Critical` at once; that is the case you are here for.
2. **Click the provider.** Its operations table shows which one is failing.
   A provider is often only broken at one thing.
3. **Disable provider.** The dialog is filled from *live routing*, not from a
   description: it lists every affected operation and who would serve it
   instead.
4. **Read the red box if there is one.** It names operations that would be left
   with **no provider at all**. Disabling anyway is a decision to take those
   offline.
5. Type the reason and the confirmation phrase. Both are required, and both are
   enforced by the server.
6. **Verify.** The provider's `Serving` count drops to 0 and the other
   provider's `Primary for` count rises. Routing has already changed — there is
   no deploy and no restart.
7. **Incidents** carries the record, and **Audit Logs** carries who did it.

If only one operation is broken, prefer disabling that operation on the
provider's page. Taking a whole supplier off-sale for one broken endpoint costs
inventory you did not need to lose.

## Bringing it back

**Enable provider**, with a reason. No confirmation phrase — recovery is the
direction that should be fast during an outage.

Open incidents close themselves after three consecutive healthy checks, and say
they closed automatically. You can also resolve one by hand with a reason.

---

## Reading the health screen

| What it says | What it means |
|---|---|
| **Healthy / Warning / Degraded / Critical** | measured against the stored thresholds |
| **Too little traffic** | fewer requests than the sample floor. *Not* a status — one failure out of one request is a 100% error rate and means nothing |
| **No traffic** | nothing observed at all in the window. Not the same as healthy |
| **p95 `> 30s`** | the percentile landed in the overflow bucket. Genuinely unbounded above, so no number is invented |
| **Circuits open** | a calling process has stopped sending traffic. Names the instance and the report's age, because it is that instance's claim |

Status takes the **worse** of the error-rate and latency verdicts. A supplier
answering everything in forty seconds is not healthy.

Thresholds are editable — **Health Monitor → Thresholds** — and the change is
audited. Widening the critical band silences an alarm as effectively as turning
monitoring off.

---

## Tracing one customer's search

**API Logs**, paste the request ID, click the row. You get every attempt that
one customer action caused: which supplier was tried, in what order, what each
returned, and which finally answered.

`Total` spans the first attempt's start to the last attempt's end, *not* the
sum — attempts overlap in a fan-out.

Payloads and headers are not stored. Not masked, absent. The `summary` fields
are the ones the calling service marked safe.

---

## Rotating credentials

**Credentials → provider → environment.** Fields show masked; edit only what
changes. Leaving a field alone sends the mask back and the server treats it as
unchanged — it will not store `••••••••91AF` as your API key.

Use **Save as rotation** rather than Save when replacing a working key: it
stamps `lastRotatedAt`, which is what tells you at a glance when a key was last
turned over.

Then **Test connection**. It spends a real request against KLAR's account, so
be deliberate about doing it in production.

---

## Troubleshooting

**Every operation shows "No traffic" but the site is working.**
Health is fed by the services that call suppliers. Check `INTERNAL_SERVICE_KEY`
matches between `hotel-search-service` and `integration-service` — without it
the telemetry client drops its buffer silently by design.

**A provider shows "no base URL configured" but searches work.**
Expected. Credentials were imported into the store but the running services
still read their own `.env`; the store is not yet their source. See the
`ponytail:` note in `src/scripts/import-credentials.ts`.

**Routing changes have no effect.**
The client holds a snapshot refreshed every 15 seconds — wait one cycle. If it
persists, check the calling service can reach `/internal/routing`; on failure
it keeps the **last known good** snapshot indefinitely and logs once.

**A circuit shows open for a supplier that is fine.**
Circuit rows expire after 15 minutes, so a stale one clears itself. If it
persists, a live process really does have it open — the row names which.

**"Master access is not configured" (503).**
`MASTER_EMAILS` is empty. It fails closed on purpose: an empty allowlist locks
everyone out rather than degrading to a role-only check.

**Credentials read as configured but every value is blank.**
`INTEGRATION_MASTER_KEY` changed. The ciphertext is unrecoverable; re-enter the
credentials. Decryption failures are logged and return empty rather than
throwing, so the page stays usable — an administrator who cannot open it cannot
fix it either.

**Test connection says `NOT_CONFIGURED`.**
No base URL, or no credentials, for that environment. It is reporting honestly
rather than inventing a result.

---

## Things the system will not let you do

Not bugs:

- enable an operation the supplier does not implement — `supported` is a fact
  about their API
- route an operation to a provider that has not declared it
- turn on failover for a booking-shaped operation without typing a phrase that
  names that operation
- disable a provider without a reason and the confirmation phrase
- read a stored secret from the admin API, under any flag
- edit or delete an audit entry
