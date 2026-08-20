/**
 * The guard on the TripJack withdrawal feed.
 *
 * syncTJDeletedHotels calls deleteMany against the hotel catalogue, and under a
 * single-supplier setup that catalogue IS the searchable inventory — there is no
 * second supplier's results to fall back on and no undo. The feed itself has
 * never been run against a live supplier (no production key), so the size of a
 * real withdrawal batch is not something this codebase has ever observed.
 *
 * Hence a ceiling: withdrawals are a trickle, and a response asking us to remove
 * a large slice of the database is far more likely to be a misread response than
 * a supplier that withdrew a tenth of its inventory overnight.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isImplausibleDeletion } from "./tjHotelSync";

const RATIO = 0.1;

test("an ordinary withdrawal batch is applied", () => {
  // The realistic shape: a handful of properties against a full catalogue.
  assert.equal(isImplausibleDeletion(12, 1_500_000, RATIO), false);
  assert.equal(isImplausibleDeletion(2_000, 1_500_000, RATIO), false);
});

test("a batch that would gut the catalogue is refused", () => {
  assert.equal(isImplausibleDeletion(200_000, 1_500_000, RATIO), true);
  // The case that actually matters: a response we misread as "delete everything".
  assert.equal(isImplausibleDeletion(1_500_000, 1_500_000, RATIO), true);
});

test("the boundary is exclusive, so exactly-at-the-limit still applies", () => {
  assert.equal(isImplausibleDeletion(100, 1_000, RATIO), false); // exactly 10%
  assert.equal(isImplausibleDeletion(101, 1_000, RATIO), true); // one over
});

test("an empty catalogue is never blocked", () => {
  // A fresh database has no baseline to judge against, and nothing to protect.
  // Blocking here would make the guard fail the very first sync it ever saw.
  assert.equal(isImplausibleDeletion(50, 0, RATIO), false);
  assert.equal(isImplausibleDeletion(50, -1, RATIO), false);
});

test("deleting nothing is never implausible", () => {
  assert.equal(isImplausibleDeletion(0, 1_500_000, RATIO), false);
  assert.equal(isImplausibleDeletion(0, 0, RATIO), false);
});

test("the ratio is what decides, so raising it deliberately lets a batch through", () => {
  // The documented escape hatch: TJ_MAX_DELETE_RATIO, after verifying with the
  // supplier that the batch is real.
  assert.equal(isImplausibleDeletion(200_000, 1_500_000, 0.1), true);
  assert.equal(isImplausibleDeletion(200_000, 1_500_000, 0.5), false);
});
