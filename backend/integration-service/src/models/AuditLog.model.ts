import mongoose, { Document, Schema } from "mongoose";

/**
 * An administrative action that changed the integration configuration (§28).
 *
 * Append-only. There is no update or delete path anywhere in this service, and
 * the schema is `strict` with no method that mutates an existing entry — an
 * audit trail an admin can edit is not an audit trail. Retention is longer
 * than API logs (§62) because these records explain why routing looked the way
 * it did during an incident, long after the request logs have aged out.
 */
export interface IAuditLog extends Document {
  /** Who did it. Denormalised: the record must stay readable if the user is deleted. */
  actorId: string;
  actorEmail: string;
  actorRole: string;

  /** Verb, e.g. PROVIDER_DISABLED, ROUTING_CHANGED, CREDENTIALS_ROTATED. */
  action: string;

  targetType: "PROVIDER" | "ROUTING" | "CREDENTIAL" | "SERVICE" | "OPERATION" | "THRESHOLD";
  targetId: string;

  providerSlug?: string;
  service?: string;
  operation?: string;
  environment?: string;

  /**
   * Before and after, already scrubbed. Credential changes record which keys
   * changed, never their values — the audit log is a security record, and a
   * secret written into it is a secret leaked into a table built to be kept.
   */
  before?: unknown;
  after?: unknown;

  reason?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },

    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },

    providerSlug: { type: String },
    service: { type: String },
    operation: { type: String },
    environment: { type: String },

    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },

    reason: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ providerSlug: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
