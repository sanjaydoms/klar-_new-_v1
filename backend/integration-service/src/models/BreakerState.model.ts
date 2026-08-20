import mongoose, { Document, Schema } from "mongoose";

/**
 * The last known circuit-breaker state for one (provider, service, operation).
 *
 * REPORTED, NOT DECIDED HERE. The breaker itself lives in the process that
 * calls the supplier — a breaker that needs a network hop to decide whether to
 * make a network call has already failed at its job. This collection exists so
 * an operator can SEE that a circuit is open, and so an incident can be raised
 * from it.
 *
 * That means the state here can lag reality by one telemetry flush, and can be
 * stale if a service instance dies with a circuit open. `reportedAt` is shown
 * for exactly that reason: the age of the claim is part of the claim.
 */
export interface IBreakerState extends Document {
  providerSlug: string;
  service: string;
  operation: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  /** Which service instance reported it — several may hold different views. */
  reportedBy: string;
  reportedAt: Date;
  /** When the state was entered, per the reporting process. */
  since: Date;
  consecutiveFailures: number;
  lastReason?: string;
}

const breakerStateSchema = new Schema<IBreakerState>(
  {
    providerSlug: { type: String, required: true },
    service: { type: String, required: true },
    operation: { type: String, required: true },
    state: {
      type: String,
      enum: ["CLOSED", "OPEN", "HALF_OPEN"],
      required: true,
    },
    reportedBy: { type: String, required: true },
    reportedAt: { type: Date, required: true },
    since: { type: Date, required: true },
    consecutiveFailures: { type: Number, default: 0 },
    lastReason: { type: String },
  },
  { timestamps: false, collection: "breaker_states" },
);

// One row per reporting process per key: two instances can legitimately
// disagree, and collapsing them would hide a partial outage.
breakerStateSchema.index(
  { providerSlug: 1, service: 1, operation: 1, reportedBy: 1 },
  { unique: true },
);
breakerStateSchema.index({ state: 1, reportedAt: -1 });

/**
 * Stale reports expire.
 *
 * A process that died holding a circuit open would otherwise leave a permanent
 * "OPEN" on the dashboard for a supplier that is fine.
 */
breakerStateSchema.index({ reportedAt: 1 }, { expireAfterSeconds: 15 * 60 });

export const BreakerState = mongoose.model<IBreakerState>(
  "BreakerState",
  breakerStateSchema,
);
