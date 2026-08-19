/**
 * Alerting.
 *
 * The properties that matter: an alert reaches only the targets that asked for
 * it, a webhook URL is treated as the credential it is, and a dispatch that
 * fails never takes down the thing it was reporting.
 */
import "./env";

import assert from "node:assert/strict";
import http, { Server } from "node:http";
import test, { after, before, beforeEach } from "node:test";
import { AddressInfo } from "node:net";

import mongoose from "mongoose";

const DB = "klar_integrations_alerttest";
let connected = false;

/** Stands in for Slack. Records what arrives. */
let hook: Server;
let hookUrl = "";
let received: any[] = [];
let hookStatus = 200;

const req = { user: { email: "ops@klar.test" }, headers: {} } as never;

before(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: DB,
      serverSelectionTimeoutMS: 1500,
    });
    connected = true;
  } catch {
    return;
  }

  await mongoose.connection.dropDatabase();

  // AFTER the drop, not before: dropping a database removes the indexes with
  // it, so building them first achieves nothing. This ordering is the whole
  // reason the concurrency test kept failing.
  const { ensureIndexes } = await import("../src/config/db.config");
  await ensureIndexes();

  hook = http.createServer((r, res) => {
    let raw = "";
    r.on("data", (c) => (raw += c));
    r.on("end", () => {
      received.push(JSON.parse(raw || "{}"));
      res.writeHead(hookStatus).end();
    });
  });
  await new Promise<void>((r) => hook.listen(0, "127.0.0.1", r));
  hookUrl = `http://127.0.0.1:${(hook.address() as AddressInfo).port}/hook`;
});

after(async () => {
  if (!connected) return;
  hook?.closeAllConnections();
  await new Promise<void>((r) => hook.close(() => r()));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  if (!connected) return;
  received = [];
  hookStatus = 200;
  const { NotificationTarget } = await import("../src/models/NotificationTarget.model");
  const { AlertDelivery } = await import("../src/models/AlertDelivery.model");
  await Promise.all([NotificationTarget.deleteMany({}), AlertDelivery.deleteMany({})]);
});

const needsMongo = (t: { skip: (m: string) => void }): boolean => {
  if (connected) return false;
  t.skip("no MongoDB reachable");
  return true;
};

const alert = (over: Record<string, unknown> = {}) => ({
  event: "INCIDENT_OPENED" as const,
  severity: "CRITICAL" as const,
  title: "RateGain hotel search is critical",
  body: "Error rate 18%.",
  facts: [{ label: "Provider", value: "RateGain" }],
  providerSlug: "rategain",
  at: new Date(),
  ...over,
});

/** A webhook target. `https` is required, so tests override after validation. */
const makeTarget = async (over: Record<string, unknown> = {}) => {
  const notifications = await import("../src/services/notification.service");
  const target = await notifications.create(req, {
    name: `target-${Math.round(performance.now() * 1000)}`,
    type: "webhook",
    config: { url: "https://hooks.example/placeholder" },
    events: ["INCIDENT_OPENED"],
    minSeverity: "HIGH",
    minIntervalSeconds: 0,
    ...over,
  } as never);

  // Point it at the local stub, which cannot serve https.
  const { NotificationTarget } = await import("../src/models/NotificationTarget.model");
  const { encrypt } = await import("../src/utils/crypto");
  await NotificationTarget.updateOne(
    { _id: target.id },
    { $set: { "config.url": encrypt(hookUrl) } },
  );
  return target;
};

test("an http webhook URL is refused — the URL is the credential", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await assert.rejects(
    () =>
      notifications.create(req, {
        name: "insecure",
        type: "webhook",
        config: { url: "http://hooks.example/x" },
        events: ["INCIDENT_OPENED"],
      } as never),
    /https/,
  );
});

test("an unknown channel type is refused", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await assert.rejects(
    () =>
      notifications.create(req, {
        name: "carrier-pigeon",
        type: "pigeon",
        config: {},
        events: ["INCIDENT_OPENED"],
      } as never),
    /No channel of type/,
  );
});

test("an unknown event is refused, and the message says what is valid", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await assert.rejects(
    () =>
      notifications.create(req, {
        name: "typo",
        type: "webhook",
        config: { url: "https://hooks.example/x" },
        events: ["PROVIDER_EXPLODED"],
      } as never),
    /Unknown event/,
  );
});

test("the webhook URL is stored encrypted and returned masked", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  const secret = "https://hooks.slack.com/services/T000/B000/XXXXsecretXXXX";
  const target = await notifications.create(req, {
    name: "slack",
    type: "webhook",
    config: { url: secret },
    events: ["INCIDENT_OPENED"],
  } as never);

  assert.ok(!JSON.stringify(target).includes(secret), "plaintext URL escaped");
  assert.ok(target.config.url.startsWith("••••"));

  const { NotificationTarget } = await import("../src/models/NotificationTarget.model");
  const raw = await NotificationTarget.findById(target.id);
  assert.ok(raw!.config.get("url")!.startsWith("v1."), "should be ciphertext at rest");
});

test("an alert reaches a target that subscribed to the event", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await makeTarget();
  await notifications.dispatch(alert());

  assert.equal(received.length, 1);
  assert.equal(received[0].event, "INCIDENT_OPENED");
  assert.match(received[0].text, /RateGain hotel search is critical/);
  // Slack and Teams render `text`; a KLAR-shaped envelope alone arrives blank.
  assert.ok(received[0].text.includes("Provider: RateGain"));
});

test("an alert does not reach a target that did not subscribe", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await makeTarget({ events: ["INCIDENT_RESOLVED"] });
  await notifications.dispatch(alert({ event: "INCIDENT_OPENED" }));
  assert.equal(received.length, 0);
});

test("an alert below a target's severity floor is not delivered", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await makeTarget({ minSeverity: "CRITICAL" });
  await notifications.dispatch(alert({ severity: "MEDIUM" }));
  assert.equal(received.length, 0);
});

test("a disabled target receives nothing", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await makeTarget({ enabled: false });
  await notifications.dispatch(alert());
  assert.equal(received.length, 0);
});

test("the minimum interval suppresses a burst, and records that it did", async (t) => {
  if (needsMongo(t)) return;
  // Silence and suppression must be distinguishable afterwards.
  const notifications = await import("../src/services/notification.service");
  await makeTarget({ minIntervalSeconds: 3600 });

  await notifications.dispatch(alert());
  await notifications.dispatch(alert());
  await notifications.dispatch(alert());

  assert.equal(received.length, 1);
  const log = await notifications.deliveries();
  assert.equal(log.filter((d) => d.status === "SENT").length, 1);
  assert.equal(log.filter((d) => d.status === "SUPPRESSED").length, 2);
});

test("a failing endpoint is recorded, not thrown", async (t) => {
  if (needsMongo(t)) return;
  // dispatch is called from the incident detector — an undeliverable alert must
  // not fail the pass that found the outage.
  const notifications = await import("../src/services/notification.service");
  await makeTarget();
  hookStatus = 500;

  await notifications.dispatch(alert());

  const [delivery] = await notifications.deliveries();
  assert.equal(delivery.status, "FAILED");
  assert.match(delivery.detail!, /HTTP 500/);
});

test("no delivery record carries the target's configuration", async (t) => {
  if (needsMongo(t)) return;
  // This table is read whenever somebody asks why they were not paged.
  const notifications = await import("../src/services/notification.service");
  await makeTarget();
  await notifications.dispatch(alert());

  const raw = JSON.stringify(await notifications.deliveries());
  assert.ok(!raw.includes(hookUrl), "the webhook URL reached the delivery log");
});

test("editing a target does not overwrite its secret with the mask", async (t) => {
  if (needsMongo(t)) return;
  // The console round-trips whatever it was given; storing "••••" as the URL
  // would silently stop every alert. Asserted against what is actually at
  // rest, rather than by delivering — the local stub cannot serve https, and
  // weakening the channel's validation to suit a test would be the wrong fix.
  const notifications = await import("../src/services/notification.service");
  const secret = "https://hooks.slack.com/services/T222/B222/KEEPKEEPKEEP";
  const target = await notifications.create(req, {
    name: "edit-me",
    type: "webhook",
    config: { url: secret },
    events: ["INCIDENT_OPENED"],
  } as never);

  await notifications.update(req, target.id, {
    events: ["INCIDENT_OPENED", "INCIDENT_RESOLVED"],
    config: { url: target.config.url },
  } as never);

  const { NotificationTarget } = await import("../src/models/NotificationTarget.model");
  const { decrypt } = await import("../src/utils/crypto");
  const stored = await NotificationTarget.findById(target.id);
  assert.equal(decrypt(stored!.config.get("url")!), secret);
  assert.deepEqual(stored!.events, ["INCIDENT_OPENED", "INCIDENT_RESOLVED"]);
});

test("a test alert ignores the target's own filters", async (t) => {
  if (needsMongo(t)) return;
  // Pressing Test proves the destination works. A test that silently matched
  // none of the rules would look identical to a broken webhook.
  const notifications = await import("../src/services/notification.service");
  const target = await makeTarget({
    events: ["PROVIDER_DISABLED"],
    minSeverity: "CRITICAL",
    minIntervalSeconds: 3600,
  });

  const result = await notifications.test(req, target.id);
  assert.equal(result.ok, true);
  assert.equal(received.length, 1);
  assert.match(received[0].title, /Test alert/);
});

test("the audit trail records a new target without its configuration", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  const secret = "https://hooks.slack.com/services/T111/B111/AAAAsecretAAAA";
  await notifications.create(req, {
    name: "audited",
    type: "webhook",
    config: { url: secret },
    events: ["INCIDENT_OPENED"],
  } as never);

  const { AuditLog } = await import("../src/models/AuditLog.model");
  const raw = JSON.stringify(await AuditLog.find({ action: "ALERT_TARGET_CREATED" }));
  assert.ok(raw.includes("audited"));
  assert.ok(!raw.includes(secret), "the webhook URL reached the audit log");
});

test("email recipients are validated before they are stored", async (t) => {
  if (needsMongo(t)) return;
  const notifications = await import("../src/services/notification.service");
  await assert.rejects(
    () =>
      notifications.create(req, {
        name: "bad-email",
        type: "email",
        config: { recipients: "ops@klar.test, not-an-address" },
        events: ["INCIDENT_OPENED"],
      } as never),
    /not-an-address/,
  );
});
