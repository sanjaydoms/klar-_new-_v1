import mongoose, { Document, Schema } from "mongoose";

/**
 * One minute of supplier calls for one (provider, service, operation,
 * environment).
 *
 * PRE-AGGREGATED ON WRITE. Every call becomes a handful of $inc operations
 * against an existing document rather than a new row, so a busy search minute
 * costs one upsert per supplier instead of hundreds of inserts. That is what
 * keeps §63 true — health monitoring must not become the reason customer
 * traffic is slow.
 *
 * The consequence is that individual requests are NOT recoverable from here.
 * That is deliberate: this collection answers "how is it behaving", and the
 * API log (phase 9) answers "what happened to request X". Trying to serve both
 * from one collection makes the aggregate expensive and the log lossy.
 */
export interface IHealthBucket extends Document {
  providerSlug: string;
  service: string;
  operation: string;
  environment: string;
  /** Start of the minute this bucket covers, UTC. */
  minute: Date;

  requests: number;
  successes: number;
  /** Every non-success, whatever the cause. failures = timeouts + auth + supplier + other. */
  failures: number;
  timeouts: number;
  authFailures: number;
  supplierErrors: number;

  durationSumMs: number;
  /**
   * Counts keyed by bucket index, not an array.
   *
   * An array cannot be built by upsert: `$inc: {"histogram.3": 1}` against a
   * document that does not exist yet creates an object anyway, and pairing it
   * with a `$setOnInsert` of the array is refused outright — both touch the
   * same path. A map is what the write actually produces, so it is what the
   * schema declares. Reading converts it back to a dense array.
   */
  histogram: Map<string, number>;

  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  /** Safe, already-classified reason for the most recent failure. Never a payload. */
  lastFailureReason?: string;
}

const healthBucketSchema = new Schema<IHealthBucket>(
  {
    providerSlug: { type: String, required: true },
    service: { type: String, required: true },
    operation: { type: String, required: true },
    environment: { type: String, required: true },
    minute: { type: Date, required: true },

    requests: { type: Number, default: 0 },
    successes: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    timeouts: { type: Number, default: 0 },
    authFailures: { type: Number, default: 0 },
    supplierErrors: { type: Number, default: 0 },

    durationSumMs: { type: Number, default: 0 },
    histogram: { type: Map, of: Number, default: {} },

    lastSuccessAt: { type: Date },
    lastFailureAt: { type: Date },
    lastFailureReason: { type: String },
  },
  { timestamps: false, collection: "health_buckets" },
);

// The upsert key. Unique so two concurrent reports for the same minute merge
// into one document instead of racing into two.
healthBucketSchema.index(
  { providerSlug: 1, service: 1, operation: 1, environment: 1, minute: 1 },
  { unique: true },
);
// Every dashboard query is "the last N minutes", optionally for one provider.
healthBucketSchema.index({ minute: -1 });
healthBucketSchema.index({ providerSlug: 1, minute: -1 });

/**
 * Buckets expire on their own (§62).
 *
 * Minute resolution is for the live dashboard, not for history — 30 days of it
 * is already more than anyone reads, and letting it grow forever turns a
 * dashboard query into a table scan. Longer-horizon reporting should roll these
 * up rather than keep them.
 */
const RETENTION_DAYS = Number(process.env.HEALTH_RETENTION_DAYS || 30);
healthBucketSchema.index(
  { minute: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 },
);

export const HealthBucket = mongoose.model<IHealthBucket>(
  "HealthBucket",
  healthBucketSchema,
);
