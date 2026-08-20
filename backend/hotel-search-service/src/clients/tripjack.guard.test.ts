/**
 * The TripJack "HTTP 200 means nothing" guard.
 *
 * TripJack signals a refused request with HTTP 200 and an error body, so a
 * rejection is byte-for-byte shaped like a successful search that found no
 * hotels. Reading fields off such a response yields empty arrays, and the whole
 * system then reports "no availability" for what is really a bad key, an expired
 * key, or a rate limit.
 *
 * This is not a hypothetical failure mode. Probing production on 2026-08-19 with
 * a test key returned exactly the body asserted below, and before the guard
 * existed the hotel sync logged "Sync complete." having written nothing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertTripJackOk, TripJackRejectedError } from "./tripjack.client";

/** Verbatim from api.tripjack.com on 2026-08-19, using a test key. */
const REAL_REJECTION = {
  status: { success: false, httpStatus: 403 },
  errors: [
    { errCode: "412", message: "UnAuthorized Access!, The provided API key is invalid." },
  ],
};

test("the real production rejection body is caught", () => {
  assert.throws(
    () => assertTripJackOk(REAL_REJECTION, "fetch-static-hotels"),
    (err: Error) => {
      assert.ok(err instanceof TripJackRejectedError);
      // The operator has to be able to act on this: which call, which code, why.
      assert.match(err.message, /fetch-static-hotels/);
      assert.match(err.message, /412/);
      assert.match(err.message, /API key is invalid/);
      return true;
    },
  );
});

test("a rejection carrying no error detail still throws", () => {
  // Never let a thin body slip through just because it lacks `errors`.
  assert.throws(
    () => assertTripJackOk({ status: { success: false } }, "hotel listing"),
    TripJackRejectedError,
  );
});

test("successful and merely-empty responses pass through untouched", () => {
  // The distinction the whole guard exists to preserve: a destination with no
  // availability is a valid answer and must NOT be turned into an error.
  assert.doesNotThrow(() => assertTripJackOk({ status: { success: true }, hotels: [] }, "x"));
  assert.doesNotThrow(() => assertTripJackOk({ hotels: [] }, "x"));
  assert.doesNotThrow(() => assertTripJackOk({}, "x"));
  assert.doesNotThrow(() => assertTripJackOk(undefined, "x"));
});

test("only an explicit `false` counts as a refusal", () => {
  // Guards against a truthiness rewrite: a missing or non-boolean success flag
  // is not evidence of rejection, and treating it as one would fail every
  // healthy response from an endpoint that omits the field.
  assert.doesNotThrow(() => assertTripJackOk({ status: {} }, "x"));
  assert.doesNotThrow(() => assertTripJackOk({ status: { success: "false" } }, "x"));
  assert.doesNotThrow(() => assertTripJackOk({ status: { success: 0 } }, "x"));
});

// ── The wiring, not just the helper ────────────────────────────────────────
// The guard is only worth having if a refusal actually escapes the search path.
// fetchChunk's catch swallows every error into [] so one bad chunk cannot fail a
// page — which is exactly what used to turn a rejected request into "0 hotels".
import { test as wiringTest, after } from "node:test";
import mongoose from "mongoose";
import { searchTJ } from "../adapters/tripJackAdapter";
import { tripJackClient } from "./tripjack.client";
import RedisConfig from "../config/redis.config";

// searchTJ touches Mongo either side of the supplier call (nationality lookup,
// then image enrichment) and both are tolerated failures here. Without this the
// two tests below spend 30s waiting out mongoose's default buffer timeout.
mongoose.set("bufferTimeoutMS", 100);

const REQ = {
  // A "TJ:" destination short-circuits resolveForTJ, so no Mongo is needed.
  destination: "TJ:10000000012345",
  checkin: "2026-09-10",
  checkout: "2026-09-11",
  rooms: [{ adults: 2, children: 0, childAges: [] }],
  countryCode: "IN",
  currency: "INR",
} as any;

wiringTest("a refused listing fails the search instead of reporting no hotels", async () => {
  const realPost = tripJackClient.post;
  (tripJackClient as any).post = async () => ({ data: REAL_REJECTION });
  try {
    await assert.rejects(
      () => searchTJ(REQ),
      (err: Error) => {
        assert.ok(err instanceof TripJackRejectedError);
        assert.match(err.message, /hotel listing/);
        return true;
      },
    );
  } finally {
    (tripJackClient as any).post = realPost;
  }
});

wiringTest("a genuinely empty listing still returns zero hotels, not an error", async () => {
  // The other half of the contract: "nothing available" must stay a valid answer.
  const realPost = tripJackClient.post;
  (tripJackClient as any).post = async () => ({ data: { status: { success: true }, hotels: [] } });
  try {
    const res = await searchTJ(REQ);
    assert.equal(res.hotels.length, 0);
  } finally {
    (tripJackClient as any).post = realPost;
  }
});

after(() => {
  RedisConfig.getInstance().disconnect();
});
