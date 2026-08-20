import mongoose, { Document, Schema } from "mongoose";

/**
 * One call KLAR made to a supplier (§25, §26, §41).
 *
 * WHAT IS NOT IN HERE
 * -------------------
 * No request bodies, no response bodies, no headers. Not "masked" — absent.
 * A supplier request carries the API key in a header and the guest's name and
 * card details in the body, and the reliable way to keep those out of a table
 * built to be queried by many people is never to write them.
 *
 * What IS stored is a `summary`: a small map of scalars the CALLER chose to
 * include, capped in size and count. The caller knows which of its fields are
 * safe (a destination, a date, a page number) in a way this service never
 * could by inspecting a payload it does not understand.
 *
 * RELATIONSHIP TO HEALTH BUCKETS
 * ------------------------------
 * Same observations, different shape. Buckets answer "how is it behaving" and
 * are aggregated on write; these answer "what happened to request X" and are
 * one row per attempt. Both are written from one telemetry batch.
 */
export interface IApiRequestLog extends Document {
  /**
   * The customer action this attempt belongs to (§42).
   *
   * Several rows share one correlationId — the primary provider's attempt and
   * the fallback's attempt are the same user pressing search once.
   */
  correlationId: string;
  /** This attempt. Unique. */
  requestId: string;

  providerSlug: string;
  service: string;
  operation: string;
  environment: string;

  startedAt: Date;
  durationMs: number;

  outcome: string;
  success: boolean;
  httpStatus?: number;
  /** Already-classified and safe. Never a supplier payload. */
  errorReason?: string;

  /** Which attempt this was for this operation within the correlation, from 1. */
  attempt: number;
  /** True when this attempt only happened because an earlier provider failed. */
  isFailover: boolean;
  /** The provider whose failure caused this attempt, when there was one. */
  failedOverFrom?: string;

  /** Caller-chosen safe scalars. Never a payload. */
  summary?: Record<string, string | number | boolean>;

  createdAt: Date;
}

const apiRequestLogSchema = new Schema<IApiRequestLog>(
  {
    correlationId: { type: String, required: true },
    requestId: { type: String, required: true, unique: true },

    providerSlug: { type: String, required: true },
    service: { type: String, required: true },
    operation: { type: String, required: true },
    environment: { type: String, required: true },

    startedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },

    outcome: { type: String, required: true },
    success: { type: Boolean, required: true },
    httpStatus: { type: Number },
    errorReason: { type: String },

    attempt: { type: Number, default: 1 },
    isFailover: { type: Boolean, default: false },
    failedOverFrom: { type: String },

    summary: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "api_request_logs" },
);

// The filters §25 lists, in the combinations the log screen actually uses.
apiRequestLogSchema.index({ startedAt: -1 });
apiRequestLogSchema.index({ correlationId: 1, startedAt: 1 });
apiRequestLogSchema.index({ providerSlug: 1, startedAt: -1 });
apiRequestLogSchema.index({ success: 1, startedAt: -1 });
apiRequestLogSchema.index({ service: 1, operation: 1, startedAt: -1 });

/**
 * Logs expire on their own (§62).
 *
 * Shorter than the audit trail by design: these are operational diagnostics,
 * and the volume is per-supplier-call rather than per-admin-action. Anything
 * needed for financial or booking reconciliation lives in the booking records,
 * not here — this collection is safe to lose.
 */
const RETENTION_DAYS = Number(process.env.API_LOG_RETENTION_DAYS || 30);
apiRequestLogSchema.index(
  { startedAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 },
);

export const ApiRequestLog = mongoose.model<IApiRequestLog>(
  "ApiRequestLog",
  apiRequestLogSchema,
);
