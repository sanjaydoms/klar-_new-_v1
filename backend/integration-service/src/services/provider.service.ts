import { Request } from "express";

import { OPERATIONS, isKnownOperation, isKnownService } from "../constants/catalogue";
import { PROVIDER_STATUS, ProviderStatus } from "../constants/status";
import { IProvider, Provider } from "../models/Provider.model";
import { RoutingRule } from "../models/RoutingRule.model";
import * as audit from "./audit.service";
import { resolveAll } from "./router.service";

/**
 * Provider administration.
 *
 * Every mutation here does three things in the same call: change the record,
 * write the audit entry, and return the new state. Splitting those apart is how
 * a system ends up with changes nobody can account for.
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

const notFound = (slug: string) =>
  new ProviderError(`No provider "${slug}".`, 404, "PROVIDER_NOT_FOUND");

const load = async (slug: string): Promise<IProvider> => {
  const provider = await Provider.findOne({ slug: slug.toLowerCase() });
  if (!provider) throw notFound(slug);
  return provider;
};

export const list = () => Provider.find().sort({ name: 1 });

export const get = (slug: string) => load(slug);

/**
 * What disabling this provider would actually do (§11's confirmation modal).
 *
 * Computed from live routing rather than described in prose, because the honest
 * answer changes as routing changes. The part that matters is `orphaned`: the
 * operations that would be left with NO provider at all. An admin taking a
 * supplier off-sale needs to know which operations that silently stops.
 */
export const disableImpact = async (slug: string) => {
  const provider = await load(slug);
  const decisions = await resolveAll();

  const affected = decisions
    .filter((d) => d.providers.some((p) => p.slug === provider.slug))
    .map((d) => {
      const remaining = d.providers.filter((p) => p.slug !== provider.slug);
      return {
        service: d.service,
        operation: d.operation,
        /** Who serves it instead. Empty means nobody would. */
        fallback: remaining.map((p) => ({ slug: p.slug, name: p.name })),
        wasPrimary: d.providers[0]?.slug === provider.slug,
      };
    });

  return {
    provider: { slug: provider.slug, name: provider.name, status: provider.status },
    affected,
    orphaned: affected.filter((a) => a.fallback.length === 0),
  };
};

/**
 * The phrase an admin must type to confirm a destructive action (§51).
 *
 * Checked on the SERVER. A confirmation only the browser enforces is a
 * confirmation an API client skips entirely, which is the exact case — a
 * script, a stale tab, a copied curl — where the accident happens.
 */
export const confirmationPhraseFor = (
  action: "DISABLE" | "MAINTENANCE",
  provider: IProvider,
) => `${action} ${provider.name.toUpperCase()}`;

const assertConfirmed = (
  provider: IProvider,
  action: "DISABLE" | "MAINTENANCE",
  given: string | undefined,
) => {
  const expected = confirmationPhraseFor(action, provider);
  if ((given ?? "").trim().toUpperCase() !== expected) {
    throw new ProviderError(
      `Confirmation phrase required. Type "${expected}" to proceed.`,
      400,
      "CONFIRMATION_REQUIRED",
    );
  }
};

export interface StatusChange {
  status: ProviderStatus;
  reason: string;
  confirmation?: string;
}

/**
 * Change a provider's status.
 *
 * Taking a provider OUT of service (disabled or maintenance) needs a typed
 * confirmation and a reason; putting one back needs a reason alone. The
 * asymmetry is deliberate — the dangerous direction is the one that stops
 * KLAR selling, and making recovery equally laborious would slow down the
 * response to an outage the control center exists to shorten.
 */
export const setStatus = async (
  req: Request,
  slug: string,
  change: StatusChange,
): Promise<IProvider> => {
  const provider = await load(slug);

  const reason = (change.reason ?? "").trim();
  if (!reason) {
    throw new ProviderError("A reason is required.", 400, "REASON_REQUIRED");
  }

  const takingOffline =
    change.status === PROVIDER_STATUS.DISABLED ||
    change.status === PROVIDER_STATUS.MAINTENANCE;

  if (takingOffline && provider.status !== change.status) {
    assertConfirmed(
      provider,
      change.status === PROVIDER_STATUS.DISABLED ? "DISABLE" : "MAINTENANCE",
      change.confirmation,
    );
  }

  const before = { status: provider.status, statusReason: provider.statusReason };

  provider.status = change.status;
  provider.statusReason = reason;
  provider.statusChangedAt = new Date();
  provider.statusChangedBy = (req as any).user?.email ?? "unknown";
  if (change.status === PROVIDER_STATUS.ACTIVE && !provider.activatedAt) {
    provider.activatedAt = new Date();
  }
  await provider.save();

  await audit.record(req, {
    action: `PROVIDER_${change.status}`,
    targetType: "PROVIDER",
    targetId: provider.slug,
    providerSlug: provider.slug,
    before,
    after: { status: provider.status, statusReason: reason },
    reason,
  });

  return provider;
};

/** Turn one of a provider's services on or off (§13). */
export const setServiceEnabled = async (
  req: Request,
  slug: string,
  service: string,
  enabled: boolean,
  reason: string,
): Promise<IProvider> => {
  const provider = await load(slug);
  const svc = provider.services.find((s) => s.service === service);
  if (!svc) {
    throw new ProviderError(
      `${provider.name} does not offer ${service}.`,
      404,
      "SERVICE_NOT_FOUND",
    );
  }

  const before = { enabled: svc.enabled };
  svc.enabled = enabled;
  await provider.save();

  await audit.record(req, {
    action: enabled ? "SERVICE_ENABLED" : "SERVICE_DISABLED",
    targetType: "SERVICE",
    targetId: `${provider.slug}/${service}`,
    providerSlug: provider.slug,
    service,
    before,
    after: { enabled },
    reason,
  });

  return provider;
};

/**
 * Turn one operation on or off.
 *
 * Refuses to enable an operation the supplier does not implement. `supported`
 * is a fact about the supplier's API, not a preference — flipping it from the
 * admin UI would let the router send requests to an endpoint that does not
 * exist. Changing it belongs with the adapter that gains the implementation.
 */
export const setOperationEnabled = async (
  req: Request,
  slug: string,
  service: string,
  operation: string,
  enabled: boolean,
  reason: string,
): Promise<IProvider> => {
  const provider = await load(slug);
  const svc = provider.services.find((s) => s.service === service);
  if (!svc) {
    throw new ProviderError(
      `${provider.name} does not offer ${service}.`,
      404,
      "SERVICE_NOT_FOUND",
    );
  }

  const op = svc.operations.find((o) => o.operation === operation);
  if (!op) {
    throw new ProviderError(
      `${provider.name} has no ${service}/${operation}.`,
      404,
      "OPERATION_NOT_FOUND",
    );
  }

  if (enabled && !op.supported) {
    throw new ProviderError(
      `${provider.name} does not support ${service}/${operation}.`,
      409,
      "OPERATION_UNSUPPORTED",
    );
  }

  const before = { enabled: op.enabled };
  op.enabled = enabled;
  await provider.save();

  await audit.record(req, {
    action: enabled ? "OPERATION_ENABLED" : "OPERATION_DISABLED",
    targetType: "OPERATION",
    targetId: `${provider.slug}/${service}/${operation}`,
    providerSlug: provider.slug,
    service,
    operation,
    before,
    after: { enabled },
    reason,
  });

  return provider;
};

/** Point a provider at production or test (§14). */
export const setEnvironment = async (
  req: Request,
  slug: string,
  environment: "production" | "test",
  reason: string,
): Promise<IProvider> => {
  const provider = await load(slug);
  const before = { activeEnvironment: provider.activeEnvironment };

  provider.activeEnvironment = environment;
  await provider.save();

  await audit.record(req, {
    action: "ENVIRONMENT_SWITCHED",
    targetType: "PROVIDER",
    targetId: provider.slug,
    providerSlug: provider.slug,
    environment,
    before,
    after: { activeEnvironment: environment },
    reason,
  });

  return provider;
};

export interface NewProvider {
  slug: string;
  code: string;
  name: string;
  types: string[];
  description?: string;
  services?: { service: string; operations: string[] }[];
  credentialSchema?: IProvider["credentialSchema"];
  environments?: Partial<IProvider["environments"]>;
}

/**
 * Register a provider.
 *
 * Created DISABLED with no environment enabled, whatever the caller asks for:
 * §52 requires an explicit activation step, and a provider that went live the
 * moment it was created would start taking customer traffic before anyone had
 * tested its credentials.
 */
export const create = async (req: Request, input: NewProvider): Promise<IProvider> => {
  const slug = input.slug?.trim().toLowerCase();
  if (!slug) throw new ProviderError("A slug is required.", 400, "SLUG_REQUIRED");

  if (await Provider.exists({ slug })) {
    throw new ProviderError(`Provider "${slug}" already exists.`, 409, "SLUG_TAKEN");
  }

  for (const s of input.services ?? []) {
    if (!isKnownService(s.service)) {
      throw new ProviderError(`Unknown service "${s.service}".`, 400, "UNKNOWN_SERVICE");
    }
    for (const op of s.operations) {
      if (!isKnownOperation(s.service, op)) {
        throw new ProviderError(
          `Unknown operation "${s.service}/${op}".`,
          400,
          "UNKNOWN_OPERATION",
        );
      }
    }
  }

  const provider = new Provider({
    slug,
    code: input.code?.trim().toUpperCase(),
    name: input.name?.trim(),
    types: input.types ?? [],
    description: input.description,
    status: PROVIDER_STATUS.DISABLED,
    activatedAt: null,
    environments: {
      production: {
        baseUrl: input.environments?.production?.baseUrl ?? "",
        enabled: false,
      },
      test: { baseUrl: input.environments?.test?.baseUrl ?? "", enabled: false },
    },
    /**
     * Every operation the service HAS, with the undeclared ones recorded
     * `supported: false` rather than left absent.
     *
     * Absent and unsupported look the same to the router — neither is
     * routable — but not to a person: the capability matrix is how an operator
     * sees that a supplier cannot amend a booking, and a row that is simply
     * missing reads as an oversight rather than a fact. This mirrors what the
     * seed does, so a provider added through the API is described the same way
     * as one that shipped with the system.
     */
    services: (input.services ?? []).map((s) => ({
      service: s.service,
      enabled: true,
      operations: OPERATIONS[s.service as keyof typeof OPERATIONS].map((operation) => ({
        operation,
        supported: s.operations.includes(operation),
        enabled: s.operations.includes(operation),
      })),
    })),
    credentialSchema: input.credentialSchema ?? [],
  });
  await provider.save();

  await audit.record(req, {
    action: "PROVIDER_CREATED",
    targetType: "PROVIDER",
    targetId: provider.slug,
    providerSlug: provider.slug,
    after: { slug: provider.slug, name: provider.name, types: provider.types },
    reason: "Provider registered",
  });

  return provider;
};

/**
 * Every provider that could serve an operation but is not routed for it.
 *
 * The Add Provider flow and the routing screen both need this: a provider can
 * only be added to a rule for capabilities it actually declares (§10).
 */
export const candidatesFor = async (service: string, operation: string) => {
  const [providers, rule] = await Promise.all([
    Provider.find(),
    isKnownService(service)
      ? RoutingRule.findOne({ service, operation })
      : Promise.resolve(null),
  ]);
  const routed = new Set((rule?.providers ?? []).map((t) => t.providerSlug));

  return providers
    .filter((p) => {
      const svc = p.services.find((s) => s.service === service);
      return Boolean(svc?.operations.find((o) => o.operation === operation)?.supported);
    })
    .filter((p) => !routed.has(p.slug))
    .map((p) => ({ slug: p.slug, name: p.name, code: p.code }));
};
