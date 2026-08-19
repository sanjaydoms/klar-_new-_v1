import { Request } from "express";

import {
  ALL_ALERT_EVENTS,
  AlertEvent,
  AlertSeverity,
  isAlertEvent,
  meetsSeverity,
} from "../constants/alerts";
import { AlertDelivery } from "../models/AlertDelivery.model";
import {
  INotificationTarget,
  NotificationTarget,
} from "../models/NotificationTarget.model";
import { decrypt, encrypt, isEncrypted, mask } from "../utils/crypto";
import { Alert, channelFor } from "./channels";
import * as audit from "./audit.service";
import { ProviderError } from "./provider.service";

/**
 * Alert dispatch (§44).
 *
 * Decides WHETHER to send and to whom; the channels decide HOW. Nothing here
 * knows what Slack is.
 */

/** Plaintext config for a channel to use. Never leaves this module. */
const configFor = (target: INotificationTarget): Record<string, string> => {
  const channel = channelFor(target.type);
  const secretKeys = new Set(
    (channel?.fields ?? []).filter((f) => f.type === "secret").map((f) => f.key),
  );

  const out: Record<string, string> = {};
  for (const [key, value] of target.config.entries()) {
    if (!secretKeys.has(key)) {
      out[key] = value;
      continue;
    }
    try {
      out[key] = isEncrypted(value) ? decrypt(value) : value;
    } catch (err: any) {
      console.error(`[alerts] decrypt failed for ${target.name}: ${err?.message ?? err}`);
      out[key] = "";
    }
  }
  return out;
};

/**
 * Send an alert to every target that wants it.
 *
 * NEVER THROWS. This is called from the incident detector and from the middle
 * of administrative actions, and an alert that cannot be delivered must not
 * roll back the thing it was describing — the outage happened whether or not
 * anyone could be told about it. Failures are recorded as deliveries with
 * status FAILED, which is exactly what someone asks about afterwards.
 */
export const dispatch = async (alert: Alert): Promise<void> => {
  try {
    const targets = await NotificationTarget.find({ enabled: true });
    const now = new Date();

    await Promise.all(
      targets.map(async (target) => {
        if (!target.events.includes(alert.event)) return;
        if (!meetsSeverity(alert.severity, target.minSeverity)) return;

        const channel = channelFor(target.type);
        if (!channel) {
          // A target whose channel was removed from the build. Recorded rather
          // than ignored: silence here looks identical to "nothing happened".
          await record(alert, target, "FAILED", `No channel of type "${target.type}"`);
          return;
        }

        // The backstop. Incidents are already deduplicated, so this only fires
        // in the case nobody predicted — where the cost of being wrong is a
        // pager going off every second.
        const since = target.lastDeliveryAt
          ? (now.getTime() - target.lastDeliveryAt.getTime()) / 1000
          : Infinity;
        if (since < target.minIntervalSeconds) {
          await record(
            alert,
            target,
            "SUPPRESSED",
            `Within the ${target.minIntervalSeconds}s minimum interval for this target`,
          );
          return;
        }

        const started = Date.now();
        const result = await channel.deliver(alert, configFor(target));
        const durationMs = Date.now() - started;

        target.lastDeliveryAt = new Date();
        target.lastDeliveryOk = result.ok;
        target.lastDeliveryError = result.ok ? undefined : result.detail;
        await target.save();

        await record(
          alert,
          target,
          result.ok ? "SENT" : "FAILED",
          result.detail,
          durationMs,
        );
      }),
    );
  } catch (err: any) {
    console.error(`[alerts] dispatch failed: ${err?.message ?? err}`);
  }
};

const record = async (
  alert: Alert,
  target: INotificationTarget,
  status: "SENT" | "FAILED" | "SUPPRESSED",
  detail?: string,
  durationMs?: number,
): Promise<void> => {
  try {
    await AlertDelivery.create({
      event: alert.event,
      severity: alert.severity,
      title: alert.title,
      targetId: String(target._id),
      targetName: target.name,
      targetType: target.type,
      status,
      detail,
      durationMs,
      providerSlug: alert.providerSlug,
      incidentReference: alert.incidentReference,
    });
  } catch (err: any) {
    console.error(`[alerts] could not record a delivery: ${err?.message ?? err}`);
  }
};

/** What the admin UI may see of a target. Secret values are masked. */
export const present = (target: INotificationTarget) => {
  const channel = channelFor(target.type);
  const secretKeys = new Set(
    (channel?.fields ?? []).filter((f) => f.type === "secret").map((f) => f.key),
  );

  const config: Record<string, string> = {};
  for (const [key, value] of target.config.entries()) {
    if (!secretKeys.has(key)) {
      config[key] = value;
      continue;
    }
    try {
      config[key] = mask(isEncrypted(value) ? decrypt(value) : value);
    } catch {
      config[key] = "";
    }
  }

  return {
    id: String(target._id),
    name: target.name,
    type: target.type,
    enabled: target.enabled,
    config,
    events: target.events,
    minSeverity: target.minSeverity,
    minIntervalSeconds: target.minIntervalSeconds,
    lastDeliveryAt: target.lastDeliveryAt,
    lastDeliveryOk: target.lastDeliveryOk,
    lastDeliveryError: target.lastDeliveryError,
    updatedBy: target.updatedBy,
    updatedAt: target.updatedAt,
    /** True when the channel it names is not in this build. */
    unknownChannel: !channel,
  };
};

export const list = async () => {
  const targets = await NotificationTarget.find().sort({ name: 1 });
  return targets.map(present);
};

export interface TargetInput {
  name: string;
  type: string;
  config: Record<string, string>;
  events: string[];
  minSeverity?: AlertSeverity;
  minIntervalSeconds?: number;
  enabled?: boolean;
}

const applyConfig = (
  target: INotificationTarget,
  input: Record<string, string>,
  existing?: Record<string, string>,
): Record<string, string> => {
  const channel = channelFor(target.type)!;
  const merged: Record<string, string> = { ...(existing ?? {}) };

  for (const field of channel.fields) {
    const value = input?.[field.key];
    if (value === undefined) continue;
    // The mask never round-trips — a target edited to change its recipients
    // must not have its webhook URL replaced with a row of bullets.
    if (field.type === "secret" && value.startsWith("••••")) continue;
    merged[field.key] = value;
  }
  return merged;
};

const store = (target: INotificationTarget, config: Record<string, string>): void => {
  const channel = channelFor(target.type)!;
  const secretKeys = new Set(
    channel.fields.filter((f) => f.type === "secret").map((f) => f.key),
  );
  target.config = new Map(
    Object.entries(config).map(([key, value]) => [
      key,
      secretKeys.has(key) ? encrypt(value) : value,
    ]),
  );
};

const validated = (type: string, events: string[]): AlertEvent[] => {
  const channel = channelFor(type);
  if (!channel) {
    throw new ProviderError(`No channel of type "${type}".`, 400, "UNKNOWN_CHANNEL");
  }
  const unknown = events.filter((e) => !isAlertEvent(e));
  if (unknown.length) {
    throw new ProviderError(
      `Unknown event(s): ${unknown.join(", ")}. Known: ${ALL_ALERT_EVENTS.join(", ")}.`,
      400,
      "UNKNOWN_EVENT",
    );
  }
  return events as AlertEvent[];
};

export const create = async (req: Request, input: TargetInput) => {
  const events = validated(input.type, input.events ?? []);
  if (!input.name?.trim()) {
    throw new ProviderError("A name is required.", 400, "NAME_REQUIRED");
  }

  const target = new NotificationTarget({
    name: input.name.trim(),
    type: input.type,
    events,
    minSeverity: input.minSeverity ?? "HIGH",
    minIntervalSeconds: input.minIntervalSeconds ?? 60,
    // Created enabled: a target added deliberately, with its events chosen,
    // is meant to be used. Nothing about it can change what customers can buy.
    enabled: input.enabled !== false,
    createdBy: (req as any).user?.email,
    updatedBy: (req as any).user?.email,
  });

  const config = applyConfig(target, input.config ?? {});
  const problem = channelFor(input.type)!.validate(config);
  if (problem) throw new ProviderError(problem, 400, "INVALID_CONFIG");
  store(target, config);

  if (await NotificationTarget.exists({ name: target.name })) {
    throw new ProviderError(`A target named "${target.name}" exists.`, 409, "NAME_TAKEN");
  }
  await target.save();

  await audit.record(req, {
    action: "ALERT_TARGET_CREATED",
    targetType: "PROVIDER",
    targetId: target.name,
    // Events and severity, never the config — it holds the webhook URL.
    after: { type: target.type, events: target.events, minSeverity: target.minSeverity },
    reason: "Notification target added",
  });

  return present(target);
};

export const update = async (req: Request, id: string, input: Partial<TargetInput>) => {
  const target = await NotificationTarget.findById(id);
  if (!target) {
    throw new ProviderError("No such notification target.", 404, "TARGET_NOT_FOUND");
  }

  const before = {
    events: [...target.events],
    minSeverity: target.minSeverity,
    enabled: target.enabled,
  };

  if (input.events) target.events = validated(target.type, input.events);
  if (input.minSeverity) target.minSeverity = input.minSeverity;
  if (input.minIntervalSeconds !== undefined) {
    target.minIntervalSeconds = input.minIntervalSeconds;
  }
  if (input.enabled !== undefined) target.enabled = input.enabled;
  if (input.name?.trim()) target.name = input.name.trim();

  if (input.config) {
    const existing = Object.fromEntries(target.config.entries());
    const channel = channelFor(target.type)!;
    const secretKeys = new Set(
      channel.fields.filter((f) => f.type === "secret").map((f) => f.key),
    );
    // Decrypt what is already stored so validate() sees real values, not
    // ciphertext, and a partial edit does not fail on an untouched field.
    for (const key of Object.keys(existing)) {
      if (secretKeys.has(key) && isEncrypted(existing[key])) {
        try {
          existing[key] = decrypt(existing[key]);
        } catch {
          existing[key] = "";
        }
      }
    }

    const config = applyConfig(target, input.config, existing);
    const problem = channel.validate(config);
    if (problem) throw new ProviderError(problem, 400, "INVALID_CONFIG");
    store(target, config);
  }

  target.updatedBy = (req as any).user?.email;
  await target.save();

  await audit.record(req, {
    action: "ALERT_TARGET_UPDATED",
    targetType: "PROVIDER",
    targetId: target.name,
    before,
    after: {
      events: target.events,
      minSeverity: target.minSeverity,
      enabled: target.enabled,
    },
    reason: "Notification target updated",
  });

  return present(target);
};

export const remove = async (req: Request, id: string): Promise<void> => {
  const target = await NotificationTarget.findById(id);
  if (!target) return;
  const name = target.name;
  await target.deleteOne();

  await audit.record(req, {
    action: "ALERT_TARGET_DELETED",
    targetType: "PROVIDER",
    targetId: name,
    reason: "Notification target removed",
  });
};

/**
 * Send a real alert to one target, now.
 *
 * Bypasses the event filter, the severity floor and the interval — the point
 * is to prove the destination works, and a test that silently matched none of
 * the target's rules would look identical to a broken webhook.
 */
export const test = async (req: Request, id: string) => {
  const target = await NotificationTarget.findById(id);
  if (!target) {
    throw new ProviderError("No such notification target.", 404, "TARGET_NOT_FOUND");
  }
  const channel = channelFor(target.type);
  if (!channel) {
    throw new ProviderError(
      `No channel of type "${target.type}".`,
      400,
      "UNKNOWN_CHANNEL",
    );
  }

  const alert: Alert = {
    event: "INCIDENT_OPENED",
    severity: "LOW",
    title: "Test alert from KLAR Operations",
    body:
      "Somebody pressed Test on this notification target. Nothing is wrong. " +
      "If you can read this, alerts will reach you.",
    facts: [
      { label: "Target", value: target.name },
      { label: "Sent by", value: (req as any).user?.email ?? "unknown" },
    ],
    at: new Date(),
  };

  const started = Date.now();
  const result = await channel.deliver(alert, configFor(target));
  const durationMs = Date.now() - started;

  target.lastDeliveryAt = new Date();
  target.lastDeliveryOk = result.ok;
  target.lastDeliveryError = result.ok ? undefined : result.detail;
  await target.save();

  await record(alert, target, result.ok ? "SENT" : "FAILED", result.detail, durationMs);
  return { ...result, durationMs };
};

export const deliveries = async (limit = 100) =>
  AlertDelivery.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(500, Math.max(1, limit)))
    .lean();
