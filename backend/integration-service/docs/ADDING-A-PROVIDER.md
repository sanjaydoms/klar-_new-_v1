# Adding a provider

The goal of this module is that adding a supplier is a configuration and
adapter task, not a redesign. This is the whole list.

Nothing in `integration-service` changes. You will not edit a controller, a
route, a model or the router. If you find yourself editing one of those to add
a supplier, something has gone wrong and it is worth stopping to work out what.

---

## 1. Write the adapter, in the service that calls suppliers

The supplier code lives with the service that owns the operation, not here.
For hotels that is `hotel-search-service` (search and details) and
`hotel-booking-service` (everything after).

Create `src/suppliers/<name>/index.ts` exporting an object matching
`HotelSupplierAdapter` (see `src/suppliers/types.ts`), and register it in
`src/suppliers/index.ts`.

**Registration order matters.** `resolveByPropertyId()` takes the first match,
and a supplier can act as a catch-all by always returning `true` — so
specific-match suppliers must be registered before any catch-all.

Pick a short `code` — `"TJ"`, `"RG"`. It is what the registry filters on and
what the provider record maps to a slug.

## 2. Register the provider

**Providers → Add provider** in the console, or an entry in
`src/scripts/seed.ts` followed by `npm run seed`.

The console collects the three things that only exist at creation — identity,
capabilities, and the credential fields this supplier needs — and then hands
over to the screens that own the rest. Credentials, Test Connection, routing
and activation are not rebuilt inside a wizard: they have to work for the other
ninety-nine percent of a provider's life anyway, and a second implementation of
each would go stale the first time one of them changed.

```ts
{
  slug: "acme",                    // stable, lowercase, referenced everywhere
  code: "AC",                      // matches the adapter's `code`
  name: "Acme Travel",
  types: ["HOTEL"],
  services: [
    { service: "HOTEL", enabled: true, operations: ops(HOTEL_OPS, [
      "AUTH", "SEARCH", "DETAILS", "BOOKING",
    ])},
  ],
  ...
}
```

**Declare only the operations the adapter actually implements.** Both paths
record every other operation in the service as `supported: false`, and the
router will never select one. A
capability matrix that overstates a supplier is worse than none, because the
router would send it traffic it cannot serve — and the failure would land on a
customer mid-purchase rather than here.

The provider is created **disabled**, with both environments disabled. That is
deliberate (§52): it goes live when somebody activates it, not when somebody
adds it.

## 3. Describe its credentials

Providers do not share a credential shape. Describe this one's:

```ts
credentialSchema: [
  { key: "BASE_URL",   label: "Base URL",   type: "url",    required: true },
  { key: "API_KEY",    label: "API Key",    type: "secret", required: true },
  { key: "AGENCY_ID",  label: "Agency ID",  type: "text",   required: false },
]
```

`type: "secret"` is encrypted at rest and only ever leaves masked. `text` and
`url` are configuration and are shown in full — masking them would only stop an
administrator checking they typed the right host.

The console renders the form from this. **No frontend change is needed for a
new provider**, however unusual its fields.

If the supplier serves different services from different hosts — TripJack uses
three — model those as extra fields (`HOTEL_BASE_URL`, `OMS_BASE_URL`) rather
than expecting one base URL to cover it.

## 4. Describe how to test the connection

```ts
connectionTest: {
  method: "GET",
  path: "",                                  // appended to the base URL
  headers: { apikey: "{{API_KEY}}" },        // {{KEY}} comes from the credentials
  okStatuses: [],                            // beyond the default 2xx
}
```

Take header names from the supplier's **live behaviour**, not its
documentation. In this repository the documentation has diverged from the real
API every time it mattered — probe the sandbox first.

Omitting `connectionTest` falls back to an authenticated request at the base
URL, which separates a dead host from a rejected key but proves nothing about a
specific endpoint.

## 5. Configure credentials and test

**Credentials → your provider → Test**, fill the fields, save, then **Test
connection**. It makes a real request. A green result means the supplier
answered; anything else is classified — `AUTHENTICATION_FAILED` and
`CONNECTION_FAILED` send you to different places.

Writing production credentials requires the typed phrase `UPDATE PRODUCTION`,
and deleting any environment's credentials requires `DELETE <PROVIDER NAME>`.
Both are enforced by the server, so a script does not get to skip them. The
console asks the backend which phrase it will be required to type rather than
holding its own copy.

## 6. Route traffic to it

**Service Routing → the operation → Edit.** Only providers that declare the
capability can be added. The list *is* the priority order; there are no numbers
to keep consistent.

Turning on failover for `BOOKING`, `CANCELLATION` or `MODIFICATION` requires
typing a phrase naming the operation. That is not ceremony: a timeout does not
mean the supplier did nothing, and failing over without establishing what
happened can charge a customer twice at two suppliers.

## 7. Activate

**Providers → your provider → Enable provider**, with a reason. It is now live,
and the audit log says who did it and why.

## 8. Report health from the calling service

The adapter's caller should record what happened. In `hotel-search-service`
that is already done for search — a new supplier registered in the registry is
measured with no further work.

In `hotel-booking-service` it is done once, in the axios clients: every call
through them is measured, and the route says which operation it belongs to
(`observing("BOOKING")` in `routes/index.ts`). A new supplier there needs its
client wrapped in `observe(...)` and nothing else.

If you are adding an operation to a service that does not yet report, the shape
is:

```ts
const started = Date.now();
try {
  const result = await adapter.doThing(payload);
  breaker.recordSuccess(supplier.code, "HOTEL", "DETAILS");
  recordCall({
    providerSlug: providerSlugFor(supplier.code),
    service: "HOTEL", operation: "DETAILS", environment,
    outcome: "SUCCESS", durationMs: Date.now() - started,
    correlationId: currentCorrelationId() ?? undefined,
    requestId: newRequestId(supplier.code),
    summary: { propertyId },            // safe scalars ONLY
  });
} catch (err) {
  const { outcome, reason } = classifyError(err);
  breaker.recordFailure(supplier.code, "HOTEL", "DETAILS", reason);
  recordCall({ /* …same shape, plus outcome, reason, httpStatus… */ });
}
```

`summary` is written to the API log and read by more people than the booking
records are. Pass identifiers and parameters; never a payload, a header, or
anything a customer typed about themselves. Objects and arrays are dropped
rather than serialised, but do not rely on that as the safety net.

---

# Adding a service or an operation

Both are one edit to `src/constants/catalogue.ts`:

```ts
export const OPERATIONS = {
  HOTEL: ["AUTH", "SEARCH", "DETAILS", ... , "YOUR_OPERATION"],
  ...
};
```

That is the whole vocabulary the system speaks. An operation added there
becomes routable, monitorable and toggleable, and the console picks it up from
`GET /catalogue` with **no frontend release**.

If the new operation creates or alters a supplier-side booking, add it to
`MUTATING_OPERATIONS` in the same file. That one line is what makes failover on
it require a typed confirmation and what marks it in the routing screen.

Existing providers will not claim the new operation until their `services[]`
lists it — which is correct. An operation nobody has declared support for is
one nobody can be routed to.

---

# Adding a new service type

`SERVICES` in the same file already carries `TRANSFER`, `ACTIVITY`,
`INSURANCE`, `VISA`, `TOUR` and `OTHER` with operation lists. Using one is a
matter of declaring it on a provider, not of adding it here.

---

# What you should never have to do

- edit `router.service.ts` to accommodate a supplier
- add a provider name to a `switch` or an `if` anywhere in this service
- change the admin console to render a new credential field
- create a `<supplier>_config` collection
- deploy to switch a supplier off
