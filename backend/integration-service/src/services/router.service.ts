import { Provider, IProvider } from "../models/Provider.model";
import { RoutingRule, IRoutingRule } from "../models/RoutingRule.model";
import { isKnownService, isMutating } from "../constants/catalogue";
import { Environment } from "../constants/status";

/**
 * The provider router (§33).
 *
 * Answers one question — "who should serve this operation, in what order?" —
 * and answers it from the database, so changing the answer is an admin action
 * rather than a deploy.
 *
 * It decides; it does not call. Nothing here talks to a supplier. The services
 * that own the supplier adapters keep owning them: they ask this for an
 * ordered list of slugs and then use the adapters they already have. That is
 * what keeps the existing hotel-search and hotel-booking supplier registries
 * untouched by this module.
 */

/** Why a provider named in a routing rule is not in the resolved list. */
export type ExclusionReason =
  | "UNKNOWN_PROVIDER"
  | "PROVIDER_DISABLED"
  | "ENVIRONMENT_DISABLED"
  | "SERVICE_DISABLED"
  | "OPERATION_DISABLED"
  | "OPERATION_UNSUPPORTED"
  | "ROUTE_DISABLED";

export interface ResolvedProvider {
  slug: string;
  /** Adapter short code ("TJ", "RG") — what the consuming registries match on. */
  code: string;
  name: string;
  priority: number;
  environment: Environment;
  baseUrl: string;
}

export interface RoutingDecision {
  service: string;
  operation: string;

  /**
   * Does a routing rule exist at all?
   *
   * This is NOT the same as `providers` being empty, and conflating the two is
   * the one way this router can quietly break a working system. `false` means
   * nobody has configured this operation — the caller should fall back to
   * whatever it did before the control center existed. `true` with an empty
   * list means an admin has deliberately left nothing routable, and the caller
   * must serve nothing. "Unconfigured" and "configured to nothing" look
   * identical in the data and mean opposite things.
   */
  configured: boolean;

  failoverEnabled: boolean;
  providers: ResolvedProvider[];

  /** Named in the rule but not routable, with the reason. Feeds the UI and logs. */
  excluded: { slug: string; reason: ExclusionReason }[];

  /**
   * True when this operation creates or alters a supplier-side booking.
   *
   * Surfaced with the decision rather than re-derived by each caller, because
   * a caller that forgets to check it is a caller that can double-book (§21).
   * `failoverEnabled` on one of these is a request to ATTEMPT failover after
   * establishing what the first supplier actually did — never a licence to
   * fire the same booking at the next provider.
   */
  mutating: boolean;
}

/** Why this provider cannot serve this operation. Null when it can. */
const excludedBecause = (
  provider: IProvider,
  service: string,
  operation: string,
): ExclusionReason | null => {
  if (provider.status !== "ACTIVE") return "PROVIDER_DISABLED";
  if (!provider.environments[provider.activeEnvironment]?.enabled) {
    return "ENVIRONMENT_DISABLED";
  }

  const svc = provider.services.find((s) => s.service === service);
  if (!svc || !svc.enabled) return "SERVICE_DISABLED";

  const op = svc.operations.find((o) => o.operation === operation);
  if (!op?.supported) return "OPERATION_UNSUPPORTED";
  if (!op.enabled) return "OPERATION_DISABLED";

  return null;
};

/**
 * The decision itself, over data already in hand. Pure — no I/O, so both the
 * single-operation and whole-snapshot paths share one implementation and
 * cannot drift apart.
 */
const decide = (
  rule: IRoutingRule,
  bySlug: Map<string, IProvider>,
): RoutingDecision => {
  const targets = rule.providers.slice().sort((a, b) => a.priority - b.priority);
  const providers: ResolvedProvider[] = [];
  const excluded: RoutingDecision["excluded"] = [];

  for (const target of targets) {
    // A target switched off in the rule is out of the rotation regardless of
    // how healthy the provider is — this is the per-route toggle, not the
    // provider-wide one.
    if (!target.enabled) {
      excluded.push({ slug: target.providerSlug, reason: "ROUTE_DISABLED" });
      continue;
    }

    const provider = bySlug.get(target.providerSlug);
    if (!provider) {
      // A rule naming a provider that no longer exists. Reported rather than
      // ignored: silently dropping it hides a broken configuration.
      excluded.push({ slug: target.providerSlug, reason: "UNKNOWN_PROVIDER" });
      continue;
    }

    const reason = excludedBecause(provider, rule.service, rule.operation);
    if (reason) {
      excluded.push({ slug: provider.slug, reason });
      continue;
    }

    const env = provider.activeEnvironment;
    providers.push({
      slug: provider.slug,
      code: provider.code,
      name: provider.name,
      priority: target.priority,
      environment: env,
      baseUrl: provider.environments[env].baseUrl,
    });
  }

  return {
    service: rule.service,
    operation: rule.operation,
    mutating: isMutating(rule.operation),
    configured: true,
    failoverEnabled: rule.failoverEnabled,
    providers,
    excluded,
  };
};

/**
 * Resolve the ordered provider list for one operation.
 *
 * Two queries whatever the provider count. This runs on the request path of
 * every search, so it stays a fixed number of round trips.
 */
export const resolve = async (
  service: string,
  operation: string,
): Promise<RoutingDecision> => {
  // An unknown service can have no rule by definition. Returning "unconfigured"
  // rather than throwing means a typo in a caller degrades to that caller's
  // own default behaviour instead of failing its request.
  const rule = isKnownService(service)
    ? await RoutingRule.findOne({ service, operation })
    : null;

  if (!rule) {
    return {
      service,
      operation,
      mutating: isMutating(operation),
      configured: false,
      failoverEnabled: false,
      providers: [],
      excluded: [],
    };
  }

  const found = await Provider.find({
    slug: { $in: rule.providers.map((t) => t.providerSlug) },
  });
  return decide(rule, new Map(found.map((p) => [p.slug, p])));
};

/**
 * Every operation's decision in one pass, for the admin dashboard and for the
 * clients that hold a snapshot rather than polling per operation.
 *
 * Two queries total, not two per rule: the snapshot is fetched by every
 * consuming service on a timer, so a per-rule fan-out here would multiply
 * across the fleet.
 */
export const resolveAll = async (): Promise<RoutingDecision[]> => {
  const [rules, providers] = await Promise.all([
    RoutingRule.find().sort({ service: 1, operation: 1 }),
    Provider.find(),
  ]);
  const bySlug = new Map(providers.map((p) => [p.slug, p]));
  return rules.map((r) => decide(r, bySlug));
};
