/**
 * The gates everything else trusts: who may serve a request, in what order,
 * and whether a stored secret survives a round trip without leaking.
 *
 * No database — mongoose validates and runs schema methods on unsaved
 * documents, so these run anywhere.
 */
import "./env";

import assert from "node:assert/strict";
import test from "node:test";

import { Provider } from "../src/models/Provider.model";
import { RoutingRule } from "../src/models/RoutingRule.model";
import { decrypt, encrypt, mask } from "../src/utils/crypto";

const provider = (overrides: Record<string, unknown> = {}) =>
  new Provider({
    slug: "acme",
    name: "Acme",
    types: ["HOTEL"],
    status: "ACTIVE",
    activeEnvironment: "test",
    environments: {
      production: { baseUrl: "", enabled: false },
      test: { baseUrl: "https://test.example", enabled: true },
    },
    services: [
      {
        service: "HOTEL",
        enabled: true,
        operations: [
          { operation: "SEARCH", supported: true, enabled: true },
          { operation: "BOOKING", supported: true, enabled: false },
          { operation: "MODIFICATION", supported: false, enabled: false },
        ],
      },
    ],
    ...overrides,
  });

test("canServe passes only when all four levels agree", () => {
  assert.equal(provider().canServe("HOTEL", "SEARCH"), true);
});

test("canServe rejects a disabled provider", () => {
  assert.equal(provider({ status: "DISABLED" }).canServe("HOTEL", "SEARCH"), false);
});

test("canServe rejects a provider pointed at a disabled environment", () => {
  // The classic production trap: provider on, credentials absent, environment off.
  assert.equal(
    provider({ activeEnvironment: "production" }).canServe("HOTEL", "SEARCH"),
    false,
  );
});

test("canServe rejects a disabled service even when the operation is on", () => {
  const p = provider();
  p.services[0].enabled = false;
  assert.equal(p.canServe("HOTEL", "SEARCH"), false);
});

test("canServe rejects an operation KLAR switched off", () => {
  // §13 — one broken supplier operation, not the whole provider.
  assert.equal(provider().canServe("HOTEL", "BOOKING"), false);
});

test("canServe rejects an operation the supplier does not implement", () => {
  // Enabling it must not help: unsupported is a fact about the supplier.
  const p = provider();
  p.services[0].operations[2].enabled = true;
  assert.equal(p.canServe("HOTEL", "MODIFICATION"), false);
});

test("canServe rejects a service the provider does not offer at all", () => {
  assert.equal(provider().canServe("FLIGHT", "SEARCH"), false);
});

test("ordered() returns enabled targets, primary first", () => {
  const rule = new RoutingRule({
    service: "HOTEL",
    operation: "SEARCH",
    failoverEnabled: true,
    providers: [
      { providerSlug: "tripjack", priority: 2, enabled: true },
      { providerSlug: "offline", priority: 1, enabled: false },
      { providerSlug: "rategain", priority: 1, enabled: true },
    ],
  });
  assert.deepEqual(
    rule.ordered().map((t) => t.providerSlug),
    ["rategain", "tripjack"],
  );
});

test("encrypt round-trips and never emits the plaintext", () => {
  const secret = "tj-live-key-8f2a91AF";
  const sealed = encrypt(secret);
  assert.ok(!sealed.includes(secret));
  assert.equal(decrypt(sealed), secret);
});

test("encrypting the same value twice gives different ciphertext", () => {
  // Equal ciphertexts would tell an observer that two providers share a key.
  assert.notEqual(encrypt("same"), encrypt("same"));
});

test("tampered ciphertext fails rather than decrypting to garbage", () => {
  const sealed = encrypt("tj-live-key-8f2a91AF");
  const parts = sealed.split(".");
  parts[3] = Buffer.from("evil").toString("base64url");
  assert.throws(() => decrypt(parts.join(".")));
});

test("mask reveals only the last four characters", () => {
  assert.equal(mask("tj-live-key-8f2a91AF"), "••••••••91AF");
});

test("mask reveals nothing of a short secret", () => {
  assert.equal(mask("abc12345"), "••••••••");
});
