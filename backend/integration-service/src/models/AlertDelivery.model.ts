import mongoose, { Document, Schema } from "mongoose";

/**
 * A record of one attempt to deliver one alert.
 *
 * Kept because "we alerted" is a claim, and during a post-mortem the difference
 * between "nobody was told" and "somebody was told and did not act" is the
 * whole question. Without this the answer is a guess.
 *
 * Never holds the target's configuration — a webhook URL is a credential, and
 * this table is read whenever someone asks why they were not paged.
 */
export interface IAlertDelivery extends Document {
  event: string;
  severity: string;
  title: string;

  targetId: string;
  targetName: string;
  targetType: string;

  status: "SENT" | "FAILED" | "SUPPRESSED";
  /** Safe. Never a response body, which can echo the URL that was called. */
  detail?: string;
  durationMs?: number;

  providerSlug?: string;
  incidentReference?: string;

  createdAt: Date;
}

const deliverySchema = new Schema<IAlertDelivery>(
  {
    event: { type: String, required: true },
    severity: { type: String, required: true },
    title: { type: String, required: true },

    targetId: { type: String, required: true },
    targetName: { type: String, required: true },
    targetType: { type: String, required: true },

    status: { type: String, enum: ["SENT", "FAILED", "SUPPRESSED"], required: true },
    detail: { type: String },
    durationMs: { type: Number },

    providerSlug: { type: String },
    incidentReference: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "alert_deliveries",
  },
);

deliverySchema.index({ createdAt: -1 });
deliverySchema.index({ targetId: 1, createdAt: -1 });
deliverySchema.index({ incidentReference: 1, createdAt: -1 });

const RETENTION_DAYS = Number(process.env.ALERT_DELIVERY_RETENTION_DAYS || 90);
deliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 },
);

export const AlertDelivery = mongoose.model<IAlertDelivery>(
  "AlertDelivery",
  deliverySchema,
);
