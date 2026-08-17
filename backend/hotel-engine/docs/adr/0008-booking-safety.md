# ADR-0008 — What makes a booking safe

**Status:** Accepted · **Date:** 2026-08-14

## Context

Booking is the only place in this system where being wrong costs money in both
directions. A duplicate reservation charges a customer twice and leaves KLAR
holding a room; a booking wrongly reported as failed refunds a customer who has
a confirmed stay, and KLAR is invoiced for it anyway.

The reference implementation had two commit paths — `#commitTripJack` and
`#commitRateGain`, 1,013 lines between them — chosen by a five-clause heuristic
that inferred the supplier from the shape of whatever the browser had sent
(D-9). Its *domain* logic was the most mature part of the codebase: idempotency
keys with a unique index, a Redis lock, a payment-reuse guard, a server-side
price floor, idempotent refund claims, a reconciliation worker. The teardown's
conclusion was to carry that forward and replace the routing around it.

The audit that preceded this phase (OPEN-ISSUES §1.7) found ten defects in the
supplier-side booking and cancel paths, nine of them reachable only by a
customer who is paying. They shaped the decisions below more than the reference
did.

## Decision

**1. A commit is a write, and writes are not repeated.** `callSupplier` retries
only when the caller opts in. The asymmetry decides the default: forgetting
`repeatable: true` on a search costs one retry, and defaulting writes to
repeatable costs a second reservation. Supplier-side idempotency is sent —
TripJack's `x-idempotency-key`, RateGain's `EchoToken` and `DemandBookingId` —
but no specification we hold promises it is honoured, so it is not relied on.

**2. An unknown outcome is PENDING, never FAILED.** A commit that timed out,
answered 500, or answered in a shape we could not parse may well have succeeded.
FAILED triggers a refund; PENDING triggers reconciliation. Only outcomes that
prove the supplier never accepted the request — an open breaker, a rejected
credential, a refused payload — are FAILED. `mayHaveBooked()` states the rule
once, and the contract suite makes every supplier obey it.

**3. Two locks, because they stop different things.**

| Lock | Stops |
|---|---|
| The unique index on `idempotency_key` | The same request arriving twice — a retried submit, a double-clicked button, a client reconnecting mid-commit |
| Retiring the rate token (`consume` reports whether *this* caller did it) | Two *different* requests booking the same rate |

The booking row is written **before** the charge, which is what makes the first
lock meaningful: concurrent commits race to insert, and the loser is handed the
winner's booking with no money moved. The token is retired **before** the
supplier call, so the loser of the second race refunds rather than double-books.

A Redis lock, as the reference used, is not needed for either: both are already
single atomic operations in stores we have.

**4. The price is never sent by the client — consent is.** The reference took
`payload.sellingRate` from the browser and defended it with a server-side
`b2cPriceFloor`, a guard that exists only because the number arrived from
somewhere it should not have. Here the amount comes from the sealed quote and
the fresh supplier cost, so there is nothing to floor. What a client may send is
agreement to a figure the server computed and showed — and it is checked against
what the supplier will honour **now**, not against the figure that produced it,
so a price that moved again after the customer accepted asks again.

A price consent does not cover a substituted room, board or cancellation policy.
Those are refused outright: agreement to a number for a Deluxe King is not
agreement to a Deluxe Twin at that number. The reference had a
`STRICT_ROOM_VALIDATION=false` switch that downgraded exactly this to a warning.

**5. Payment is a port with no implementation, and no default that says yes.**
KLAR's gateway credentials are not in this repository. A deployment without a
gateway declines every commit at the charge and warns at boot, because a
permissive default would book real rooms against payments nobody took. The
commit path is fully exercised either way — the booking is created, the charge
fails, nothing reaches a supplier.

**6. A refund needs two answers: is one owed, and may I be the one to pay it.**
The domain decides the first (`claimRefund`), a conditional UPDATE decides the
second. Both are needed, because the in-request path, the status poller and the
reconciliation worker can all pass the domain check at the same instant.

**7. What cannot be decided is escalated, not guessed.** A supplier that cannot
be polled leaves a pending booking in `MANUAL_REVIEW` rather than being assumed
confirmed (which sells a room that may not exist) or failed (which refunds one
that does). A cancellation penalty in another currency is not converted at a
rate nobody quoted; it goes to a human.

## Consequences

- **Bookings can sit unsettled.** `SUPPLIER_PENDING`, `CANCELLATION_PENDING` and
  `MANUAL_REVIEW` are real states with no worker behind them yet; the
  `booking_unsettled` index is there for one. Until it exists, settling them is
  an operational task. This is the direct cost of decision 2, and it is the
  right cost: the alternative is a wrong answer given automatically.
- **A commit is slower than a search**, deliberately — a 90 s deadline against
  15 s, because the customer has already paid and abandoning the call leaves a
  reservation whose outcome nobody knows.
- **No authentication.** `POST /api/booking/commit` will book for anyone who can
  reach it. The reads are defended as far as they can be without identity; the
  write is not. It is the one item in OPEN-ISSUES §4 that must not reach
  production unresolved.
- Adding a supplier still touches nothing here: `BookingService` names no
  supplier, and the phase's acceptance test books through TripJack and through
  RateGain with the same code.

## Alternatives rejected

- **Trust supplier idempotency and keep retrying.** It would be free if it
  worked. Nothing we hold says it does, and the failure mode is a second
  reservation — the most expensive outcome in the system.
- **A distributed lock around commit**, as the reference used. It solves the
  same two races the unique index and the token already solve, and adds a
  dependency whose failure mode is a booking that cannot be made.
- **Treat a failed commit as failed and refund immediately.** Simpler, faster
  for the customer in the common case, and wrong in exactly the case that
  matters. Reconciliation is slower and correct.
- **Let consent cover a room substitution.** The reference's
  `STRICT_ROOM_VALIDATION=false`. It converts a refusal into a question the
  customer cannot answer, because they were never shown the substitution.
