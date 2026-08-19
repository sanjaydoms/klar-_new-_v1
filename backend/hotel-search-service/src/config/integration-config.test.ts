/**
 * The routing client's failure semantics.
 *
 * These are the behaviours a search depends on and that no typecheck can
 * catch: an unconfigured operation must not be mistaken for a killed one, a
 * killed one must not be mistaken for unconfigured, and the admin plane going
 * down must not resurrect a supplier somebody switched off.
 */
import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { AddressInfo } from "node:net";

type Decision = Record<string, unknown>;

/**
 * A stand-in integration-service that serves whatever `body` currently holds.
 *
 * Registered for teardown with `t.after` rather than closed at the end of the
 * test body: a failing assertion throws, the close never runs, and the open
 * server then holds the whole test process open forever. A suite that hangs on
 * failure is a suite nobody runs.
 */
const startStub = async (state: { body: Decision[]; fail: boolean }) => {
  const server = http.createServer((req, res) => {
    if (state.fail) {
      res.writeHead(503).end();
      return;
    }
    if (req.headers["x-internal-key"] !== "test-key") {
      res.writeHead(401).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: true, data: state.body }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  /**
   * Closes keep-alive sockets as well as the listener. axios reuses
   * connections, so `close()` alone leaves the server holding the event loop
   * open and the test run never exits.
   */
  const stop = () =>
    new Promise<void>((r) => {
      server.closeAllConnections();
      server.close(() => r());
    });
  return { stop, url: `http://127.0.0.1:${port}` };
};

const decision = (operation: string, over: Decision = {}): Decision => ({
  service: "HOTEL",
  operation,
  configured: true,
  failoverEnabled: false,
  providers: [],
  excluded: [],
  mutating: false,
  ...over,
});

/**
 * Fresh module instance per test — the snapshot is module state, so tests would
 * otherwise inherit each other's answers.
 */
const load = async (url: string) => {
  process.env.INTEGRATION_CONFIG_TTL_MS = "0";
  delete require.cache[require.resolve("./integration-config")];
  delete require.cache[require.resolve("./env")];
  const mod = await import("./integration-config");

  // Both of these are set AFTER the import, and the URL is written onto the
  // env OBJECT rather than into process.env.
  //
  // env.ts calls dotenv with `override: true`, so anything this test puts in
  // process.env beforehand is replaced by whatever the developer's .env holds
  // — which, now that INTEGRATION_SERVICE_URL lives there, pointed these tests
  // at a real running service and made them pass or fail depending on whether
  // one happened to be up.
  const { env } = await import("./env");
  env.integrationServiceUrl = url;
  process.env.INTERNAL_SERVICE_KEY = "test-key";
  return mod;
};

test("an operation with no rule yields no opinion", async (t) => {
  const state = { body: [] as Decision[], fail: false };
  const { stop, url } = await startStub(state);
  t.after(stop);
  const mod = await load(url);
  await mod.refreshRouting();
  // null, not [] — the caller must fall back to its own behaviour.
  assert.equal(mod.routableCodes("HOTEL", "SEARCH"), null);
});

test("a rule with nothing routable yields an empty answer, not no opinion", async (t) => {
  // The kill switch. If this returned null the caller would fan out to
  // everybody and the disabled provider would keep serving traffic.
  const state = { body: [decision("SEARCH")], fail: false };
  const { stop, url } = await startStub(state);
  t.after(stop);
  const mod = await load(url);
  await mod.refreshRouting();
  assert.deepEqual(mod.routableCodes("HOTEL", "SEARCH"), []);
});

test("providers come back in priority order", async (t) => {
  const state = {
    body: [
      decision("SEARCH", {
        providers: [
          { slug: "tripjack", code: "TJ", priority: 2 },
          { slug: "rategain", code: "RG", priority: 1 },
        ],
      }),
    ],
    fail: false,
  };
  const { stop, url } = await startStub(state);
  t.after(stop);
  const mod = await load(url);
  await mod.refreshRouting();
  assert.deepEqual(mod.routableCodes("HOTEL", "SEARCH"), ["RG", "TJ"]);
});

test("the admin plane going down keeps the last known good answer", async (t) => {
  // An admin kills RateGain, then integration-service dies. The kill must hold.
  const state = {
    body: [
      decision("SEARCH", { providers: [{ slug: "tripjack", code: "TJ", priority: 1 }] }),
    ],
    fail: false,
  };
  const { stop, url } = await startStub(state);
  t.after(stop);
  const mod = await load(url);
  await mod.refreshRouting();

  state.fail = true;
  await mod.refreshRouting();

  assert.deepEqual(mod.routableCodes("HOTEL", "SEARCH"), ["TJ"]);
});

test("a cold start with the admin plane down has no opinion at all", async (t) => {
  // Never had an answer: behave exactly as the service did before this existed.
  const state = { body: [] as Decision[], fail: true };
  const { stop, url } = await startStub(state);
  t.after(stop);
  const mod = await load(url);
  await mod.refreshRouting();
  assert.equal(mod.routableCodes("HOTEL", "SEARCH"), null);
});

test("intersectCodes narrows, never widens", async (t) => {
  const { intersectCodes } = await import("./integration-config");

  // No routing configured: the caller's own filter is untouched.
  assert.deepEqual(intersectCodes(null, ["RG"]), ["RG"]);
  assert.equal(intersectCodes(null, undefined), undefined);

  // Routing configured, no caller filter: routing decides.
  assert.deepEqual(intersectCodes(["RG", "TJ"], undefined), ["RG", "TJ"]);
  assert.deepEqual(intersectCodes(["RG", "TJ"], []), ["RG", "TJ"]);

  // Both present: only what BOTH allow. A caller cannot ask for a provider
  // the admin has routed away.
  assert.deepEqual(intersectCodes(["TJ"], ["RG", "TJ"]), ["TJ"]);
  assert.deepEqual(intersectCodes(["TJ"], ["RG"]), []);
});
