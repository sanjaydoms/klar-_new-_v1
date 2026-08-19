import { Request } from "express";

import { isKnownOperation, isKnownService, isMutating } from "../constants/catalogue";
import { Provider } from "../models/Provider.model";
import { RoutingRule } from "../models/RoutingRule.model";
import * as audit from "./audit.service";
import { ProviderError } from "./provider.service";
import { RoutingDecision, resolve, resolveAll } from "./router.service";

/**
 * Routing administration (§18, §19).
 *
 * Changing routing changes which supplier a customer's money goes to, so every
 * write here validates against capability, records before and after, and — for
 * the operations that create bookings — asks for the change to be typed out.
 */

export interface RoutingInput {
  /**
   * Providers in the order they should be tried. Priority is derived from
   * position rather than sent by the caller: a client-supplied priority can
   * arrive duplicated or with gaps, and "first in the list is primary" is the
   * thing the admin actually means.
   */
  providers: { providerSlug: string; enabled?: boolean }[];
  failoverEnabled: boolean;
  reason: string;
  confirmation?: string;
}

/** What must be typed to turn on failover for a booking-shaped operation. */
export const failoverConfirmationPhrase = (service: string, operation: string) =>
  `ENABLE FAILOVER ${service} ${operation}`;

export const listRules = () => resolveAll();

export const getRule = (service: string, operation: string) =>
  resolve(service, operation);

/**
 * Replace one operation's routing.
 *
 * Wholesale rather than incremental: an admin reordering providers is
 * expressing a complete intent, and applying it as a set of deltas leaves room
 * for two concurrent edits to interleave into an order neither of them chose.
 */
export const setRule = async (
  req: Request,
  service: string,
  operation: string,
  input: RoutingInput,
): Promise<RoutingDecision> => {
  if (!isKnownService(service) || !isKnownOperation(service, operation)) {
    throw new ProviderError(
      `Unknown operation "${service}/${operation}".`,
      400,
      "UNKNOWN_OPERATION",
    );
  }

  const reason = (input.reason ?? "").trim();
  if (!reason) {
    throw new ProviderError("A reason is required.", 400, "REASON_REQUIRED");
  }

  const targets = input.providers ?? [];

  const slugs = targets.map((t) => t.providerSlug);
  const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (duplicates.length) {
    throw new ProviderError(
      `A provider may appear once: ${[...new Set(duplicates)].join(", ")}.`,
      400,
      "DUPLICATE_PROVIDER",
    );
  }

  /**
   * Capability is a precondition, not a preference (§10).
   *
   * Routing an operation to a provider whose API does not implement it would
   * produce a request that can only fail — and, worse, it would fail at the
   * moment a customer is trying to buy something rather than here, where
   * somebody is watching.
   */
  const known = await Provider.find({ slug: { $in: slugs } });
  const bySlug = new Map(known.map((p) => [p.slug, p]));

  for (const target of targets) {
    const provider = bySlug.get(target.providerSlug);
    if (!provider) {
      throw new ProviderError(
        `No provider "${target.providerSlug}".`,
        404,
        "PROVIDER_NOT_FOUND",
      );
    }
    const svc = provider.services.find((s) => s.service === service);
    const op = svc?.operations.find((o) => o.operation === operation);
    if (!op?.supported) {
      throw new ProviderError(
        `${provider.name} does not support ${service}/${operation}.`,
        409,
        "OPERATION_UNSUPPORTED",
      );
    }
  }

  const existing = await RoutingRule.findOne({ service, operation });

  /**
   * Turning on failover for an operation that creates or alters a booking is
   * the single most dangerous switch in this module (§21).
   *
   * A search that fails over costs a retry. A BOOKING that fails over can
   * charge a customer twice at two different suppliers, because a timeout does
   * not mean the first supplier did nothing. The reconciliation that makes
   * this safe is not built yet, so the switch is gated behind a typed phrase
   * rather than a checkbox — and the phrase names the operation, so it cannot
   * be typed on autopilot for the wrong one.
   */
  const turningOnDangerousFailover =
    input.failoverEnabled &&
    isMutating(operation) &&
    !existing?.failoverEnabled;

  if (turningOnDangerousFailover) {
    const expected = failoverConfirmationPhrase(service, operation);
    if ((input.confirmation ?? "").trim().toUpperCase() !== expected) {
      throw new ProviderError(
        `${operation} creates or alters a supplier booking, so failover cannot be enabled without confirmation. Type "${expected}" to proceed.`,
        400,
        "CONFIRMATION_REQUIRED",
      );
    }
  }

  const before = existing
    ? {
        failoverEnabled: existing.failoverEnabled,
        providers: existing.providers.map((p) => ({
          providerSlug: p.providerSlug,
          priority: p.priority,
          enabled: p.enabled,
        })),
      }
    : null;

  const rule =
    existing ?? new RoutingRule({ service, operation, providers: [], failoverEnabled: false });

  rule.providers = targets.map((t, i) => ({
    providerSlug: t.providerSlug,
    priority: i + 1,
    enabled: t.enabled !== false,
  }));
  rule.failoverEnabled = input.failoverEnabled;
  rule.updatedBy = (req as any).user?.email ?? "unknown";
  await rule.save();

  const after = {
    failoverEnabled: rule.failoverEnabled,
    providers: rule.providers.map((p) => ({
      providerSlug: p.providerSlug,
      priority: p.priority,
      enabled: p.enabled,
    })),
  };

  await audit.record(req, {
    action: before ? "ROUTING_CHANGED" : "ROUTING_CREATED",
    targetType: "ROUTING",
    targetId: `${service}/${operation}`,
    service,
    operation,
    before,
    after,
    reason,
  });

  return resolve(service, operation);
};
