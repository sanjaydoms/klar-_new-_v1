import mongoose, { Document, Schema } from "mongoose";

/**
 * When a measurement becomes a status (§23).
 *
 * A single document. Thresholds are configuration, not code — the defaults
 * below came from the brief, but "5% errors is critical" is a business
 * judgement that will change with experience, and changing it should not need
 * a deployment.
 *
 * Percentages are whole numbers (3 means 3%), matching how they are discussed
 * and displayed. Storing 0.03 invites a factor-of-100 mistake at every edge.
 */
export interface IHealthThresholds extends Document {
  key: "default";

  /** Error-rate bands, in percent. Below `warning` is healthy. */
  warningErrorRate: number;
  degradedErrorRate: number;
  criticalErrorRate: number;

  /** Response-time bands, in milliseconds, measured on p95. */
  warningP95Ms: number;
  degradedP95Ms: number;
  criticalP95Ms: number;

  /**
   * Below this many requests in the window, no status is inferred at all.
   *
   * One failure out of one request is a 100% error rate and means nothing. A
   * dashboard that turns a single unlucky call into a red CRITICAL trains
   * people to ignore red.
   */
  minimumSampleSize: number;

  /** How far back the live status looks. */
  windowMinutes: number;

  /**
   * Circuit breaker (§46).
   *
   * Lives with the health thresholds because it is the same judgement made for
   * a different purpose: these numbers decide when a provider is bad enough to
   * stop calling, where the ones above decide when it is bad enough to show in
   * red. One editor, one audit entry, no chance of the two drifting into
   * saying different things about the same supplier.
   */
  breakerEnabled: boolean;
  /** Consecutive failures on one operation before the circuit opens. */
  breakerFailureThreshold: number;
  /** How long the circuit stays open before a probe is allowed through. */
  breakerCooldownSeconds: number;
  /** Consecutive successful probes needed to close it again. */
  breakerProbeSuccesses: number;

  updatedBy?: string;
  updatedAt: Date;
}

const thresholdsSchema = new Schema<IHealthThresholds>(
  {
    key: { type: String, default: "default", unique: true },

    warningErrorRate: { type: Number, default: 1 },
    degradedErrorRate: { type: Number, default: 3 },
    criticalErrorRate: { type: Number, default: 5 },

    // Defaults sit deliberately high: RateGain's search measures ~10.7s
    // domestic and ~14.2s international in normal operation, so anything
    // tighter would report a healthy supplier as degraded forever.
    warningP95Ms: { type: Number, default: 8_000 },
    degradedP95Ms: { type: Number, default: 15_000 },
    criticalP95Ms: { type: Number, default: 25_000 },

    minimumSampleSize: { type: Number, default: 20 },
    windowMinutes: { type: Number, default: 15 },

    breakerEnabled: { type: Boolean, default: true },
    // Five in a row, not a percentage: a breaker exists to react in seconds,
    // and a rate over a window is still averaging while every request is
    // failing. Five consecutive failures is not bad luck.
    breakerFailureThreshold: { type: Number, default: 5 },
    breakerCooldownSeconds: { type: Number, default: 60 },
    breakerProbeSuccesses: { type: Number, default: 2 },

    updatedBy: { type: String },
  },
  { timestamps: true, collection: "health_thresholds" },
);

export const HealthThresholds = mongoose.model<IHealthThresholds>(
  "HealthThresholds",
  thresholdsSchema,
);

/** The stored thresholds, creating the defaults on first use. */
export const currentThresholds = async (): Promise<IHealthThresholds> => {
  const existing = await HealthThresholds.findOne({ key: "default" });
  if (existing) return existing;
  return HealthThresholds.create({ key: "default" });
};
