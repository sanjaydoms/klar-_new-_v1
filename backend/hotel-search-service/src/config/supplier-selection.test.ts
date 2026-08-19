/**
 * Which suppliers a search calls.
 *
 * Every rule here inverts into a serious bug if it is wrong — a kill switch
 * that fans out, a control plane that resurrects a silenced supplier, a
 * breaker that turns "slow" into "no hotels" — and none of them were testable
 * while they lived inline in the orchestrator.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { selectSuppliers } from "./supplier-selection";

const ALL_OPEN = () => true;
const select = (over: Partial<Parameters<typeof selectSuppliers>[0]> = {}) =>
  selectSuppliers({
    eligible: ["RG", "TJ"],
    routed: null,
    requested: undefined,
    canAttempt: ALL_OPEN,
    ...over,
  });

test("with no routing configured, every eligible supplier is called", () => {
  // The behaviour before the control center existed. A process that has never
  // reached the admin plane must search exactly as it always did.
  const s = select();
  assert.deepEqual(s.codes, ["RG", "TJ"]);
  assert.equal(s.serveNothing, false);
});

test("an empty routed list stops the search — it does not widen it", () => {
  // THE kill switch. The registry reads an empty filter as "no filter", so
  // getting this wrong sends traffic to everyone at the exact moment an
  // administrator asked for nobody.
  const s = select({ routed: [] });
  assert.deepEqual(s.codes, []);
  assert.equal(s.serveNothing, true);
});

test("unconfigured and configured-to-nothing are opposite answers", () => {
  assert.equal(select({ routed: null }).serveNothing, false);
  assert.equal(select({ routed: [] }).serveNothing, true);
});

test("routing narrows what is eligible", () => {
  assert.deepEqual(select({ routed: ["TJ"] }).codes, ["TJ"]);
});

test("routing can never add a supplier the mode excluded", () => {
  // Deploying the control center must not send live traffic to a supplier
  // HOTEL_PROVIDER_MODE had switched off.
  const s = select({ eligible: ["TJ"], routed: ["RG", "TJ"] });
  assert.deepEqual(s.codes, ["TJ"]);
});

test("routing decides the ORDER, so the primary is called first", () => {
  assert.deepEqual(select({ routed: ["TJ", "RG"] }).codes, ["TJ", "RG"]);
  assert.deepEqual(select({ routed: ["RG", "TJ"] }).codes, ["RG", "TJ"]);
});

test("the caller's filter narrows further, and cannot widen", () => {
  assert.deepEqual(select({ routed: ["RG", "TJ"], requested: ["TJ"] }).codes, ["TJ"]);
  // Asking for a supplier routing excluded gets nothing, not that supplier.
  assert.deepEqual(select({ routed: ["TJ"], requested: ["RG"] }).codes, []);
});

test("an empty caller filter means no filter, matching the registry", () => {
  assert.deepEqual(select({ requested: [] }).codes, ["RG", "TJ"]);
});

test("an open circuit removes that supplier and says so", () => {
  const s = select({ canAttempt: (c) => c !== "RG" });
  assert.deepEqual(s.codes, ["TJ"]);
  assert.deepEqual(s.shortCircuited, ["RG"]);
  assert.equal(s.ignoredCircuits, false);
});

test("when EVERY supplier is short-circuited they are called anyway", () => {
  // The breaker is a latency optimisation over a fan-out that already
  // tolerates failure. With nothing left to protect, honouring it would turn
  // "slow" into "no hotels", which is strictly worse for the customer.
  const s = select({ canAttempt: () => false });
  assert.deepEqual(s.codes, ["RG", "TJ"]);
  assert.equal(s.ignoredCircuits, true);
  assert.deepEqual(s.shortCircuited, ["RG", "TJ"]);
  assert.equal(s.serveNothing, false);
});

test("a kill switch beats an open circuit", () => {
  // Both say stop; only one of them is a person's decision, and it must not be
  // overridden by the all-out fallback above.
  const s = select({ routed: [], canAttempt: () => false });
  assert.equal(s.serveNothing, true);
  assert.deepEqual(s.codes, []);
});

test("no eligible supplier is not the same as an administrator saying stop", () => {
  // An unknown destination or an exclusive mode empties the list too. The page
  // is empty either way, but the logs must be able to tell them apart.
  const s = select({ eligible: [] });
  assert.deepEqual(s.codes, []);
  assert.equal(s.serveNothing, false);
});

test("a routed supplier that is not registered is ignored, not called", () => {
  // Routing can name a provider whose adapter is not in this build.
  const s = select({ eligible: ["TJ"], routed: ["GHOST", "TJ"] });
  assert.deepEqual(s.codes, ["TJ"]);
});
