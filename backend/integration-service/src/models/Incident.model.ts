import mongoose, { Document, Schema } from "mongoose";

/**
 * An incident (§27).
 *
 * Raised by the detector when an operation crosses into CRITICAL, and closed
 * when it has been well again for long enough to believe it. The timeline is
 * the point: an operator arriving twenty minutes late needs to know what
 * happened and what the system already did about it, not just that something
 * is red now.
 *
 * ONE ACTIVE INCIDENT PER KEY. A supplier that fails a hundred times in ten
 * minutes is one incident with a timeline, not a hundred incidents. The unique
 * partial index below enforces that rather than trusting every caller to check.
 */

export type IncidentStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface IncidentEvent {
  at: Date;
  /** Machine-readable, so the UI can style without parsing prose. */
  kind:
    | "OPENED"
    | "DEGRADED"
    | "RECOVERED"
    | "CIRCUIT_OPENED"
    | "CIRCUIT_CLOSED"
    | "ACKNOWLEDGED"
    | "NOTE"
    | "RESOLVED";
  message: string;
  /** Absent for anything the system did to itself. */
  actorEmail?: string;
}

export interface IIncident extends Document {
  /** Human-facing reference, e.g. INC-0021. */
  reference: string;

  providerSlug: string;
  service: string;
  operation: string;

  severity: IncidentSeverity;
  status: IncidentStatus;

  title: string;
  startedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  /** True when the system closed it because health returned, not a person. */
  autoResolved: boolean;

  /** Measurements at the moment it opened, so the record survives log expiry. */
  openedWith?: {
    errorRate: number | null;
    p95Ms: number | null;
    requests: number;
  };

  events: IncidentEvent[];

  /** Consecutive healthy checks seen since the last unhealthy one. */
  healthyChecks: number;

  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IncidentEvent>(
  {
    at: { type: Date, required: true },
    kind: { type: String, required: true },
    message: { type: String, required: true },
    actorEmail: { type: String },
  },
  { _id: false },
);

const incidentSchema = new Schema<IIncident>(
  {
    reference: { type: String, required: true, unique: true },

    providerSlug: { type: String, required: true },
    service: { type: String, required: true },
    operation: { type: String, required: true },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"],
      default: "ACTIVE",
    },

    title: { type: String, required: true },
    startedAt: { type: Date, required: true },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    autoResolved: { type: Boolean, default: false },

    openedWith: {
      errorRate: { type: Number, default: null },
      p95Ms: { type: Number, default: null },
      requests: { type: Number, default: 0 },
    },

    events: { type: [eventSchema], default: [] },
    healthyChecks: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "incidents" },
);

/**
 * At most one open incident per operation.
 *
 * Partial, so resolved incidents for the same operation can pile up as history
 * without blocking the next one.
 */
incidentSchema.index(
  { providerSlug: 1, service: 1, operation: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["ACTIVE", "ACKNOWLEDGED"] } },
  },
);
incidentSchema.index({ status: 1, startedAt: -1 });
incidentSchema.index({ startedAt: -1 });

export const Incident = mongoose.model<IIncident>("Incident", incidentSchema);

/**
 * The incident counter.
 *
 * A separate document incremented atomically, rather than counting existing
 * rows: two detectors opening incidents in the same second would otherwise
 * both count N and both claim INC-000N.
 */
interface ICounter extends Document {
  key: string;
  value: number;
}

const counterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  { collection: "counters" },
);

const Counter = mongoose.model<ICounter>("Counter", counterSchema);

export const nextReference = async (): Promise<string> => {
  const counter = await Counter.findOneAndUpdate(
    { key: "incident" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return `INC-${String(counter!.value).padStart(4, "0")}`;
};
