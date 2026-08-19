import { Request, Response } from "express";

import { IProvider } from "../models/Provider.model";
import * as audit from "../services/audit.service";
import * as providers from "../services/provider.service";
import { ProviderError } from "../services/provider.service";
import { resolveAll } from "../services/router.service";

/**
 * HTTP for provider administration.
 *
 * Thin on purpose — parse, delegate, shape. Every decision lives in
 * provider.service so it stays testable without a request object.
 */

/**
 * What the admin UI is allowed to see of a provider.
 *
 * An explicit allowlist, not the raw document minus a few fields. Credentials
 * live in another collection today, but a projection that says exactly what
 * goes out cannot start leaking a field somebody adds to the schema next year.
 */
const present = (p: IProvider) => ({
  slug: p.slug,
  code: p.code,
  name: p.name,
  types: p.types,
  description: p.description,
  logoUrl: p.logoUrl,
  status: p.status,
  statusReason: p.statusReason,
  statusChangedAt: p.statusChangedAt,
  statusChangedBy: p.statusChangedBy,
  activeEnvironment: p.activeEnvironment,
  environments: {
    production: {
      baseUrl: p.environments.production.baseUrl,
      enabled: p.environments.production.enabled,
    },
    test: {
      baseUrl: p.environments.test.baseUrl,
      enabled: p.environments.test.enabled,
    },
  },
  services: p.services.map((s) => ({
    service: s.service,
    enabled: s.enabled,
    operations: s.operations.map((o) => ({
      operation: o.operation,
      supported: o.supported,
      enabled: o.enabled,
    })),
  })),
  credentialSchema: p.credentialSchema,
  activatedAt: p.activatedAt,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

/** Express 5 types a route param as string | string[]; these are always single. */
const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

/** Turns a thrown ProviderError into its intended response; anything else 500s. */
const fail = (res: Response, err: unknown, context: string) => {
  if (err instanceof ProviderError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, code: err.code });
  }
  console.error(`[providers] ${context}:`, (err as any)?.message ?? err);
  return res.status(500).json({ success: false, message: "Something went wrong." });
};

export const list = async (_req: Request, res: Response) => {
  try {
    const all = await providers.list();
    res.json({ success: true, data: all.map(present) });
  } catch (err) {
    fail(res, err, "list");
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: present(await providers.get(param(req.params.slug))) });
  } catch (err) {
    fail(res, err, "get");
  }
};

/**
 * What the disable-confirmation modal needs, including the exact phrase the
 * caller will have to type back.
 */
export const disableImpact = async (req: Request, res: Response) => {
  try {
    const provider = await providers.get(param(req.params.slug));
    const impact = await providers.disableImpact(param(req.params.slug));
    res.json({
      success: true,
      data: {
        ...impact,
        confirmationPhrase: providers.confirmationPhraseFor("DISABLE", provider),
      },
    });
  } catch (err) {
    fail(res, err, "disableImpact");
  }
};

export const setStatus = async (req: Request, res: Response) => {
  try {
    const provider = await providers.setStatus(req, param(req.params.slug), {
      status: req.body?.status,
      reason: req.body?.reason,
      confirmation: req.body?.confirmation,
    });
    // The caller's next question is always "so who serves it now?" — answering
    // it here saves a round trip and, more importantly, lets the UI show the
    // consequence rather than assert it.
    const routing = await resolveAll();
    res.json({ success: true, data: present(provider), routing });
  } catch (err) {
    fail(res, err, "setStatus");
  }
};

export const setServiceEnabled = async (req: Request, res: Response) => {
  try {
    const provider = await providers.setServiceEnabled(
      req,
      param(req.params.slug),
      param(req.params.service).toUpperCase(),
      Boolean(req.body?.enabled),
      req.body?.reason ?? "",
    );
    res.json({ success: true, data: present(provider) });
  } catch (err) {
    fail(res, err, "setServiceEnabled");
  }
};

export const setOperationEnabled = async (req: Request, res: Response) => {
  try {
    const provider = await providers.setOperationEnabled(
      req,
      param(req.params.slug),
      param(req.params.service).toUpperCase(),
      param(req.params.operation).toUpperCase(),
      Boolean(req.body?.enabled),
      req.body?.reason ?? "",
    );
    res.json({ success: true, data: present(provider) });
  } catch (err) {
    fail(res, err, "setOperationEnabled");
  }
};

export const setEnvironment = async (req: Request, res: Response) => {
  try {
    const environment = req.body?.environment;
    if (environment !== "production" && environment !== "test") {
      return res.status(400).json({
        success: false,
        message: 'environment must be "production" or "test".',
      });
    }
    const provider = await providers.setEnvironment(
      req,
      param(req.params.slug),
      environment,
      req.body?.reason ?? "",
    );
    res.json({ success: true, data: present(provider) });
  } catch (err) {
    fail(res, err, "setEnvironment");
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const provider = await providers.create(req, req.body ?? {});
    res.status(201).json({ success: true, data: present(provider) });
  } catch (err) {
    fail(res, err, "create");
  }
};

export const auditLog = async (req: Request, res: Response) => {
  try {
    const { entries, limit } = await audit.list({
      providerSlug: req.query.provider as string | undefined,
      action: req.query.action as string | undefined,
      actorId: req.query.actor as string | undefined,
      targetType: req.query.targetType as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, data: entries, limit });
  } catch (err) {
    fail(res, err, "auditLog");
  }
};
