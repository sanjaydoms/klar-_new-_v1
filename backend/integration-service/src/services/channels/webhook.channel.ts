import { Alert, Channel, DeliveryResult } from "./types";

/**
 * An HTTP POST of the alert as JSON.
 *
 * The general-purpose channel: Slack, Teams, Discord, PagerDuty and every
 * internal tool accept an incoming webhook, so one implementation reaches all
 * of them without this service learning what any of them are.
 *
 * The payload carries a `text` field alongside the structured data because
 * Slack and Teams render that key directly — a KLAR-shaped envelope alone
 * would arrive in Slack as an empty message.
 */
const TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS || 8_000);

export const webhookChannel: Channel = {
  type: "webhook",
  label: "Webhook",
  description:
    "POSTs the alert as JSON. Works with Slack, Teams, Discord, PagerDuty and most internal tools.",
  fields: [
    {
      key: "url",
      label: "Webhook URL",
      // Secret because these URLs authenticate by being unguessable — anyone
      // holding one can post as KLAR.
      type: "secret",
      required: true,
      placeholder: "https://hooks.slack.com/services/…",
    },
  ],

  validate(config) {
    const url = (config.url ?? "").trim();
    if (!url) return "A webhook URL is required.";
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return "That is not a valid URL.";
    }
    if (parsed.protocol !== "https:") {
      // The URL is the credential; http: would put it on the wire in clear.
      return "The webhook URL must use https.";
    }
    return null;
  },

  async deliver(alert: Alert, config): Promise<DeliveryResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const text =
      `*${alert.title}*\n${alert.body}\n` +
      alert.facts.map((f) => `• ${f.label}: ${f.value}`).join("\n");

    try {
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          event: alert.event,
          severity: alert.severity,
          title: alert.title,
          body: alert.body,
          facts: alert.facts,
          providerSlug: alert.providerSlug,
          incidentReference: alert.incidentReference,
          at: alert.at.toISOString(),
          source: "klar-integration-service",
        }),
        signal: controller.signal,
      });

      // Status only. A response body can echo back the URL that was called,
      // and this detail is stored and shown.
      return res.ok
        ? { ok: true, detail: `HTTP ${res.status}` }
        : { ok: false, detail: `The endpoint answered HTTP ${res.status}` };
    } catch (err: any) {
      return {
        ok: false,
        detail:
          err?.name === "AbortError"
            ? "The endpoint did not respond in time"
            : "Could not reach the endpoint",
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
