/**
 * Every dotenv call site loads `.env.local` before `.env`, and none of them
 * pass `override: true`.
 *
 * `override: true` reverses the whole scheme twice over. dotenv walks the path
 * array overwriting as it goes, so `.env` beat `.env.local` — the opposite of
 * what the filename promises — and, worse, a plain `.env` silently beat a
 * variable exported by the shell, Docker or PM2. A dotfile outranking an
 * explicitly set environment variable only ever shows up as a deployment
 * behaving nothing like the machine it was tested on.
 *
 * Source-level because the defect is invisible at runtime: nothing throws, the
 * wrong value is simply used. Five call sites carried the same copy-pasted
 * line, so the guard covers all of them rather than the one that was noticed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

const CALL_SITES = [
  "src/config/env.ts",
  "src/server.ts",
  "scripts/syncHotels.ts",
  "scripts/backfillSearchTokens.ts",
  "local-dev/check-env.ts",
];

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

for (const rel of CALL_SITES) {
  test(`${rel} does not override the real environment`, () => {
    const call = read(rel).match(/dotenv\.config\(([\s\S]*?)\);/);
    assert.ok(call, `no dotenv.config() found in ${rel}`);
    assert.doesNotMatch(
      call[1]!,
      /override\s*:\s*true/,
      `${rel} passes override:true — .env would beat .env.local AND the shell`,
    );
  });

  test(`${rel} loads .env.local before .env`, () => {
    const call = read(rel).match(/dotenv\.config\(([\s\S]*?)\);/);
    // Order is the whole mechanism: without override, first-to-set wins.
    assert.match(call![1]!, /\[\s*"\.env\.local"\s*,\s*"\.env"\s*\]/);
  });
}

test("the call-site list has not silently shrunk", () => {
  // A new service file that copy-pastes the old line would slip past a guard
  // that only checks the files it already knows about.
  for (const rel of CALL_SITES) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} no longer exists — update this list`);
  }
});
