import { AlertEvent, AlertSeverity } from "../../constants/alerts";

/**
 * The contract every notification destination implements (§44).
 *
 * A channel knows how to reach one kind of place and nothing else. It does not
 * decide whether an alert should be sent, does not read the database, and does
 * not know what an incident is — all of that is the dispatcher's, so a new
 * channel is a file and a registry line.
 */

export interface Alert {
  event: AlertEvent;
  severity: AlertSeverity;
  /** One line. What happened. */
  title: string;
  /** A few sentences. Enough to decide whether to get out of bed. */
  body: string;
  /** Rendered as a definition list by channels that can. */
  facts: { label: string; value: string }[];
  providerSlug?: string;
  incidentReference?: string;
  at: Date;
}

/** One configuration field a channel needs, described so the UI can render it. */
export interface ChannelField {
  key: string;
  label: string;
  /**
   * `secret` is encrypted at rest and masked on read. A Slack or Teams webhook
   * URL is bearer-equivalent — anyone holding it can post as KLAR — so URLs
   * that authenticate by being unguessable are declared secret, not `text`.
   */
  type: "text" | "secret";
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface DeliveryResult {
  ok: boolean;
  /** Safe for storage and display. Never a response body or a URL. */
  detail?: string;
}

export interface Channel {
  type: string;
  label: string;
  description: string;
  fields: ChannelField[];
  /**
   * Reject a configuration before it is stored, so a broken target fails when
   * somebody is looking at it rather than during the outage it was meant to
   * report.
   */
  validate(config: Record<string, string>): string | null;
  deliver(alert: Alert, config: Record<string, string>): Promise<DeliveryResult>;
}
