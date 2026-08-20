/**
 * An amenity may be reported, never inferred.
 *
 * Both adapters used to fill an empty amenity list with a guess built from the
 * hotel's star rating and from substrings of its NAME:
 *
 *   starRating >= 5            -> Swimming Pool, Fitness Center, Spa, Restaurant, Bar
 *   name contains "beach"      -> Swimming Pool, Spa
 *   name contains "airport"    -> Free Parking
 *   anything else              -> 24-hour Front Desk
 *
 * That output is indistinguishable downstream from a supplier's own list. It
 * reached `facets.service.ts`, which counts `hotel.amenities` into
 * `amenityCounts` — so the inventions became amenity FILTER options, and a
 * customer who filtered for a spa was shown hotels we had guessed had one.
 *
 * The rule is the one `imageUrl.util.ts` already applies to images we cannot
 * resolve: an absent value yields nothing and is dropped, never guessed. An
 * empty amenity list means "the supplier did not report any", which is not the
 * same claim as "this hotel has none" — so it must not be filled, and it must
 * not be rendered as a negative either.
 *
 * Source-level guards, because the failure is silent: a fabricated list looks
 * exactly like a real one at every layer past the adapter.
 *
 * See backend/hotel-engine/docs/UX-CAPABILITY-CONTRACT.md — D-5.
 *
 * Run: npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADAPTERS = ["rateGainAdapter.ts", "tripJackAdapter.ts"];

/** Strip comments so prose describing the removed pattern doesn't trip a guard. */
const source = (file: string): string =>
  readFileSync(resolve(__dirname, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

for (const file of ADAPTERS) {
  test(`${file} defines no fallback-amenity generator`, () => {
    assert.doesNotMatch(source(file), /FallbackAmenities/);
  });

  test(`${file} hardcodes no amenity of its own`, () => {
    const src = source(file);
    for (const invention of [
      "Swimming Pool",
      "Fitness Center",
      "24-hour Front Desk",
      "Free Parking",
      "Welcome Drink",
    ]) {
      assert.doesNotMatch(
        src,
        new RegExp(`["'\`]${invention}`, "i"),
        `${file} names "${invention}" — an amenity literal in an adapter is an invention`,
      );
    }
  });

  test(`${file} never derives an amenity from the star rating or the hotel name`, () => {
    const src = source(file);

    // Any identifier ending in "amenities" — `finalAmenities` too, so the
    // case-insensitive match matters.
    const assignments = [...src.matchAll(/^.*\b\w*amenities\b\s*[:=][^\n]*/gim)].map(
      (m) => m[0],
    );
    for (const line of assignments) {
      assert.doesNotMatch(
        line,
        // `\brating\b` as well as `starRating`: in this adapter the star
        // rating is held in a local called `rating`, and a guard that only
        // knew the long name let `rating >= 5 ? [...] : []` straight through.
        /starRating|\brating\b|\.name\b|lowerName/i,
        `amenities assigned from a rating or a name: ${line.trim()}`,
      );
    }

    // The generator reached the name through `lowerName` and `name.includes`.
    // A hotel's name is display text; it is never a source of facts about the
    // property, so no adapter has a reason to inspect its contents at all.
    // Banning that outright also closes the indirection the per-line check
    // above cannot see — computing the guess into a differently-named variable
    // one line before assigning it.
    assert.doesNotMatch(src, /lowerName/i);
    assert.doesNotMatch(src, /\bname\b[^\n]{0,40}\.(includes|match|test|startsWith)\(/);
    assert.doesNotMatch(src, /name\.toLowerCase\(\)/);
  });

  test(`${file} still passes the supplier's own amenities through`, () => {
    // Guards the lazy "fix" of dropping amenities entirely.
    assert.match(source(file), /amenities/);
  });
}

test("an empty amenity list is preserved, not filled", () => {
  const src = source("rateGainAdapter.ts");
  // `Array.isArray(x) ? x : []` — an empty list stays empty. The banned shape
  // is `x.length > 0 ? x : <anything else>`, which is where the guess went.
  assert.doesNotMatch(src, /amenities\.length\s*>\s*0\s*\n?\s*\?/);
  assert.match(src, /Array\.isArray\(bh\.amenities\)\s*\?\s*bh\.amenities\s*:\s*\[\]/);
});
