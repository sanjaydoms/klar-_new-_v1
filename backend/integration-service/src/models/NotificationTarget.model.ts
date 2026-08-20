import mongoose, { Document, Schema } from "mongoose";

import { AlertEvent, AlertSeverity } from "../constants/alerts";

/**
 * Somewhere an alert can be sent (§44).
 *
 * The channel TYPE is a string, and the code that delivers it is looked up in
 * a registry — so a new destination is a new file and a registry entry, not a
 * change to this model, the controller, or the console. §44's "do not hard-code
 * notification providers" is that lookup.
 *
 * `config` is deliberately loose for the same reason: a webhook needs a URL, an
 * email target needs recipients, and the next one will need something neither
 * of them does. Each channel validates its own shape.
 *
 * SECRETS. A webhook URL is usually a credential — a Slack or Teams URL is
 * bearer-equivalent, and anyone holding it can post as KLAR. Values whose key
 * a channel declares secret are encrypted at rest and masked on read, the same
 * as supplier credentials.
 */
export interface INotificationTarget extends Document {
  name: string;
  type: string;
  enabled: boolean;

  /** Channel-specific. Secret-declared keys hold ciphertext. */
  config: Map<string, string>;

  /** Which events reach this target. Empty means none — never "all". */
  events: AlertEvent[];
  /** Alerts below this severity are not delivered here. */
  minSeverity: AlertSeverity;

  /**
   * Shortest gap between deliveries to this target, in seconds.
   *
   * A backstop, not the main defence — incidents are already deduplicated, so
   * ordinary operation does not produce bursts. This is for the case nobody
   * predicted, where the cost of being wrong is a pager firing every second.
   */
  minIntervalSeconds: number;

  lastDeliveryAt?: Date | null;
  lastDeliveryOk?: boolean | null;
  lastDeliveryError?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const targetSchema = new Schema<INotificationTarget>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    enabled: { type: Boolean, default: true },

    config: { type: Map, of: String, default: {} },

    events: { type: [String], default: [] },
    minSeverity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
    },
    minIntervalSeconds: { type: Number, default: 60 },

    lastDeliveryAt: { type: Date, default: null },
    lastDeliveryOk: { type: Boolean, default: null },
    lastDeliveryError: { type: String },

    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: "notification_targets" },
);

targetSchema.index({ name: 1 }, { unique: true });
targetSchema.index({ enabled: 1 });

export const NotificationTarget = mongoose.model<INotificationTarget>(
  "NotificationTarget",
  targetSchema,
);
