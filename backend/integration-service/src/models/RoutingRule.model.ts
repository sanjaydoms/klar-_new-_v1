import mongoose, { Document, Schema } from "mongoose";

import { ServiceCode } from "../constants/catalogue";

/**
 * Which providers serve one (service, operation), in what order.
 *
 * One document per operation holding an ordered provider list, rather than one
 * row per provider-operation pair (§19's relational sketch). Reordering
 * priorities is then a single atomic write, and the router's question — "who
 * serves hotel search?" — is one document read instead of a sorted query.
 *
 * Routing NEVER overrides capability: a provider listed here that cannot serve
 * the operation (disabled, unsupported, wrong environment) is skipped by the
 * router. This list expresses preference, not permission.
 *
 * Weighted traffic splitting (§35) is deliberately not modelled yet. Mongo
 * makes adding a `weight` to these entries a non-event when it is actually
 * wanted — there is no migration to write — so carrying an unused field now
 * would buy nothing.
 */

export interface RoutingTarget {
  providerSlug: string;
  /** 1 is primary. Ties are resolved by array order. */
  priority: number;
  /** Off here means "not in this rotation", independent of provider status. */
  enabled: boolean;
}

export interface IRoutingRule extends Document {
  service: ServiceCode;
  operation: string;
  /**
   * May the router try the next provider when the primary fails?
   *
   * For booking-shaped operations this is a request to attempt failover, not a
   * licence to retry blindly — the failover service still has to establish
   * that the supplier did not process the request (§21) before trying anyone
   * else. For search it is a straightforward "try the next one".
   */
  failoverEnabled: boolean;
  providers: RoutingTarget[];
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Enabled targets, primary first. The order the router will try them in. */
  ordered(): RoutingTarget[];
}

const targetSchema = new Schema<RoutingTarget>(
  {
    providerSlug: { type: String, required: true, lowercase: true, trim: true },
    priority: { type: Number, required: true, min: 1 },
    enabled: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

const routingRuleSchema = new Schema<IRoutingRule>(
  {
    service: { type: String, required: true },
    operation: { type: String, required: true },
    failoverEnabled: { type: Boolean, required: true, default: false },
    providers: { type: [targetSchema], default: [] },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: "routing_rules" },
);

// One rule per operation — the uniqueness is the data model, not a convention.
routingRuleSchema.index({ service: 1, operation: 1 }, { unique: true });

routingRuleSchema.methods.ordered = function (this: IRoutingRule): RoutingTarget[] {
  return this.providers
    .filter((p) => p.enabled)
    .slice()
    .sort((a, b) => a.priority - b.priority);
};

export const RoutingRule = mongoose.model<IRoutingRule>("RoutingRule", routingRuleSchema);
