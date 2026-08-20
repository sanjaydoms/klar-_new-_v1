import { Alert, Channel, DeliveryResult } from "./types";

/**
 * Email, queued through KLAR's existing email-service.
 *
 * Deliberately not an SMTP client. email-service already owns the credentials,
 * the queue and the retries; a second sender here would mean a second set of
 * SMTP secrets to keep and a second thing to debug when mail stops arriving.
 */
const TIMEOUT_MS = Number(process.env.EMAIL_ALERT_TIMEOUT_MS || 8_000);
const EMAIL_SERVICE_URL =
  process.env.EMAIL_SERVICE_URL || "http://localhost:5015/api/v1";

const SEVERITY_PREFIX: Record<string, string> = {
  CRITICAL: "[CRITICAL]",
  HIGH: "[HIGH]",
  MEDIUM: "[KLAR]",
  LOW: "[KLAR]",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

export const emailChannel: Channel = {
  type: "email",
  label: "Email",
  description:
    "Queues the alert through KLAR's email-service. Several recipients, comma separated.",
  fields: [
    {
      key: "recipients",
      label: "Recipients",
      // Not secret: an operator must be able to see who is being paged, and
      // masking the list would make a wrong address impossible to spot.
      type: "text",
      required: true,
      placeholder: "ops@klar.example, oncall@klar.example",
      helpText: "Comma separated.",
    },
  ],

  validate(config) {
    const recipients = (config.recipients ?? "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (!recipients.length) return "At least one recipient is required.";
    const bad = recipients.filter((r) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r));
    if (bad.length) return `Not a valid address: ${bad.join(", ")}`;
    return null;
  },

  async deliver(alert: Alert, config): Promise<DeliveryResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const rows = alert.facts
      .map(
        (f) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(f.label)}</td>` +
          `<td style="padding:4px 0"><strong>${escapeHtml(f.value)}</strong></td></tr>`,
      )
      .join("");

    try {
      const res = await fetch(`${EMAIL_SERVICE_URL}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: config.recipients,
          subject: `${SEVERITY_PREFIX[alert.severity] ?? "[KLAR]"} ${alert.title}`,
          text:
            `${alert.title}\n\n${alert.body}\n\n` +
            alert.facts.map((f) => `${f.label}: ${f.value}`).join("\n"),
          html:
            `<h2 style="margin:0 0 8px">${escapeHtml(alert.title)}</h2>` +
            `<p style="margin:0 0 16px">${escapeHtml(alert.body)}</p>` +
            `<table style="font-family:system-ui,sans-serif;font-size:14px">${rows}</table>`,
        }),
        signal: controller.signal,
      });

      // 202: email-service queues rather than sends, so a success here means
      // accepted for delivery. Saying "sent" would overstate it.
      return res.ok
        ? { ok: true, detail: `Queued (HTTP ${res.status})` }
        : { ok: false, detail: `email-service answered HTTP ${res.status}` };
    } catch (err: any) {
      return {
        ok: false,
        detail:
          err?.name === "AbortError"
            ? "email-service did not respond in time"
            : "Could not reach email-service",
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
