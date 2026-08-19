/**
 * Every status vocabulary in the control center.
 *
 * PROVIDER_STATUS is what an admin sets (§11) — an intent.
 * HEALTH_STATUS is what the monitor observes (§38) — a measurement.
 * They are deliberately separate: a provider an admin left ACTIVE can still be
 * observed CRITICAL, and that gap is exactly the thing the dashboard exists to
 * show. Collapsing them into one field would make "healthy but switched off"
 * and "switched on but failing" indistinguishable.
 */

export const PROVIDER_STATUS = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  DEGRADED: "DEGRADED",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type ProviderStatus = (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS];

/** Only ACTIVE providers may receive traffic. Everything else is off the router. */
export const isRoutable = (status: ProviderStatus): boolean =>
  status === PROVIDER_STATUS.ACTIVE;

export const HEALTH_STATUS = {
  HEALTHY: "HEALTHY",
  WARNING: "WARNING",
  DEGRADED: "DEGRADED",
  CRITICAL: "CRITICAL",
  UNKNOWN: "UNKNOWN",
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export const ENVIRONMENTS = ["production", "test"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const isEnvironment = (v: string): v is Environment =>
  (ENVIRONMENTS as readonly string[]).includes(v);
