/**
 * The circuit breaker state machine.
 *
 * Every transition matters: opening too eagerly withholds traffic from a
 * healthy supplier, and closing too eagerly puts full load back onto one that
 * is still broken.
 */
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

import * as breaker from "./breaker";

const P = "RG";
const S = "HOTEL";
const O = "SEARCH";

const fail = (times: number) => {
  for (let i = 0; i < times; i++) breaker.recordFailure(P, S, O, "supplier error (503)");
};

beforeEach(() => {
  breaker.__resetBreakersForTests();
  breaker.configure({
    enabled: true,
    failureThreshold: 5,
    cooldownSeconds: 60,
    probeSuccesses: 2,
  });
});

test("a disabled breaker never withholds a call", () => {
  // The default until the first routing snapshot arrives: a process that has
  // never reached the admin plane behaves exactly as it did before.
  breaker.__resetBreakersForTests();
  fail(50);
  assert.equal(breaker.canAttempt(P, S, O), true);
});

test("failures below the threshold do not open the circuit", () => {
  fail(4);
  assert.equal(breaker.canAttempt(P, S, O), true);
});

test("the threshold opens the circuit", () => {
  fail(5);
  assert.equal(breaker.canAttempt(P, S, O), false);
});

test("a success resets the count, so intermittent failures never open it", () => {
  // Four failures, one success, four more failures is not a broken supplier.
  fail(4);
  breaker.recordSuccess(P, S, O);
  fail(4);
  assert.equal(breaker.canAttempt(P, S, O), true);
});

test("the circuit is per operation, not per provider", () => {
  // §24 — one broken operation must not take the supplier's others out.
  fail(5);
  assert.equal(breaker.canAttempt(P, S, "DETAILS"), true);
});

test("the cooldown elapsing lets exactly one probe through", () => {
  breaker.configure({ cooldownSeconds: 0 });
  fail(5);
  assert.equal(breaker.canAttempt(P, S, O), true, "cooldown of 0 admits a probe");
  const snapshot = breaker.snapshot((c) => c);
  assert.equal(snapshot[0].state, "HALF_OPEN");
});

test("one successful probe is not enough to close it", () => {
  // A single success during an outage is common. Closing on it puts full load
  // straight back onto a supplier that is still struggling.
  breaker.configure({ cooldownSeconds: 0 });
  fail(5);
  breaker.canAttempt(P, S, O);
  breaker.recordSuccess(P, S, O);
  assert.equal(breaker.snapshot((c) => c)[0].state, "HALF_OPEN");
});

test("enough successful probes close it", () => {
  breaker.configure({ cooldownSeconds: 0 });
  fail(5);
  breaker.canAttempt(P, S, O);
  breaker.recordSuccess(P, S, O);
  breaker.recordSuccess(P, S, O);
  assert.equal(breaker.snapshot((c) => c)[0].state, "CLOSED");
  assert.equal(breaker.canAttempt(P, S, O), true);
});

test("a failed probe re-opens immediately, without waiting for the threshold", () => {
  breaker.configure({ cooldownSeconds: 0 });
  fail(5);
  breaker.canAttempt(P, S, O);
  breaker.recordFailure(P, S, O, "still broken");
  breaker.configure({ cooldownSeconds: 60 });
  breaker.recordFailure(P, S, O, "still broken");
  assert.equal(breaker.canAttempt(P, S, O), false);
});

test("the snapshot reports slugs, not adapter codes", () => {
  // The admin plane keys on slugs; the registry speaks codes.
  fail(5);
  const [state] = breaker.snapshot((code) => (code === "RG" ? "rategain" : code));
  assert.equal(state.providerSlug, "rategain");
  assert.equal(state.state, "OPEN");
  assert.equal(state.consecutiveFailures, 5);
  assert.equal(state.lastReason, "supplier error (503)");
});

test("closed circuits are still reported, so a stale OPEN can be cleared", () => {
  // Silence would leave the dashboard claiming a supplier is out of rotation
  // long after it came back.
  breaker.recordSuccess(P, S, O);
  const [state] = breaker.snapshot((c) => c);
  assert.equal(state.state, "CLOSED");
});
