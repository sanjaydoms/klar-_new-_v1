/**
 * HOTEL_PROVIDER_MODE resolution.
 *
 * This one env value decides which suppliers a search may query, so a value it
 * does not understand means an empty site. That is not hypothetical: the
 * documented values ("both", "tripjack", "rategain") originally matched nothing
 * — mode was compared against "UNIFIED"/"<CODE>_ONLY" — so every search returned
 * zero hotels while the config looked correct.
 *
 * It matters more now than when that was written: with RateGain retired from
 * search, `tripjack` is the only thing standing between the site and no
 * inventory at all.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { supplierRegistry } from "./index";
import RedisConfig from "../config/redis.config";

// Importing the suppliers pulls in the adapters, and with them a Redis client
// that keeps the event loop alive. Same reason services/hotels.paging.test.ts
// disconnects; without this the run passes and then hangs forever.
after(() => {
  RedisConfig.getInstance().disconnect();
});

/** A plain city — not a direct "TJ:"/"RG:" reference, so only mode filters. */
const DESTINATION = "Goa";

const codesFor = (mode: string) =>
  supplierRegistry
    .getModeAndDirectEligible(mode, DESTINATION)
    .map((s) => s.code)
    .sort();

test("the documented values select the suppliers they name", () => {
  assert.deepEqual(codesFor("tripjack"), ["TJ"]);
  assert.deepEqual(codesFor("rategain"), ["RG"]);
  assert.deepEqual(codesFor("both"), ["RG", "TJ"]);
});

test("the value the retirement runs on selects TripJack and nothing else", () => {
  // The live setting. If this ever resolves to [] the site has no inventory.
  assert.deepEqual(codesFor("tripjack"), ["TJ"]);
});

test("case does not decide whether the site has inventory", () => {
  assert.deepEqual(codesFor("TripJack"), ["TJ"]);
  assert.deepEqual(codesFor("BOTH"), ["RG", "TJ"]);
});

test("the internal values still work, so neither spelling is a trap", () => {
  assert.deepEqual(codesFor("TJ_ONLY"), ["TJ"]);
  assert.deepEqual(codesFor("RG_ONLY"), ["RG"]);
  assert.deepEqual(codesFor("UNIFIED"), ["RG", "TJ"]);
});

test("an unrecognised value degrades to every supplier, never to none", () => {
  // A typo should cost correctness of the FILTER, not the entire result set.
  // Returning [] here is the original bug: searches silently went empty.
  assert.deepEqual(codesFor("tripjak"), ["RG", "TJ"]);
  assert.deepEqual(codesFor(""), ["RG", "TJ"]);
  assert.deepEqual(codesFor(undefined as unknown as string), ["RG", "TJ"]);
});

test("a direct supplier reference still overrides the mode", () => {
  // "TJ:123..." targets one supplier regardless of what mode allows — this is
  // how a hotel detail page re-fetches a specific property.
  const direct = supplierRegistry
    .getModeAndDirectEligible("both", "TJ:10000000012345")
    .map((s) => s.code);
  assert.deepEqual(direct, ["TJ"]);
});
