/**
 * What KLAR raises an alert about (§44).
 *
 * A closed set, deliberately. An alert vocabulary that grows by accident
 * produces channels subscribed to events nobody meant them to receive, and the
 * cure for that is worse than the constraint: adding an event here and one
 * dispatch call is the whole cost of a new one.
 *
 * Most of §44's list arrives as an incident, because that is where "a provider
 * is down" and "the error rate is high" already become facts with a threshold
 * behind them. The two that do not are the ones a person caused or that no
 * amount of traffic would reveal.
 */
export const ALERT_EVENTS = {
  /** An operation crossed into degraded or critical. */
  INCIDENT_OPENED: "INCIDENT_OPENED",
  /** An open incident got worse. */
  INCIDENT_ESCALATED: "INCIDENT_ESCALATED",
  /** Health returned and the incident closed. */
  INCIDENT_RESOLVED: "INCIDENT_RESOLVED",
  /** An administrator took a provider off-sale. Nobody else may know. */
  PROVIDER_DISABLED: "PROVIDER_DISABLED",
  /**
   * A supplier rejected KLAR's credentials.
   *
   * Its own event rather than an incident because it needs a different person:
   * an expired key is not fixed by watching the error rate come down, and it
   * can be discovered by a connection test with no customer traffic at all.
   */
  AUTH_FAILURE: "AUTH_FAILURE",
} as const;

export type AlertEvent = (typeof ALERT_EVENTS)[keyof typeof ALERT_EVENTS];

export const ALL_ALERT_EVENTS = Object.values(ALERT_EVENTS);

export const isAlertEvent = (value: string): value is AlertEvent =>
  (ALL_ALERT_EVENTS as string[]).includes(value);

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const meetsSeverity = (
  actual: AlertSeverity,
  minimum: AlertSeverity,
): boolean => SEVERITY_RANK[actual] >= SEVERITY_RANK[minimum];
