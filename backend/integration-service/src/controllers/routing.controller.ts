import { Request, Response } from "express";

import { OPERATIONS, SERVICES, isKnownService } from "../constants/catalogue";
import { candidatesFor, ProviderError } from "../services/provider.service";
import * as routing from "../services/routing.service";

const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const fail = (res: Response, err: unknown, context: string) => {
  if (err instanceof ProviderError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, code: err.code });
  }
  console.error(`[routing] ${context}:`, (err as any)?.message ?? err);
  return res.status(500).json({ success: false, message: "Something went wrong." });
};

export const list = async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await routing.listRules() });
  } catch (err) {
    fail(res, err, "list");
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    const service = param(req.params.service).toUpperCase();
    const operation = param(req.params.operation).toUpperCase();
    const decision = await routing.getRule(service, operation);
    // Everything the routing editor needs in one response: the current rule,
    // who else could be added, and the phrase the caller will be asked for if
    // they turn failover on.
    res.json({
      success: true,
      data: {
        ...decision,
        candidates: await candidatesFor(service, operation),
        failoverConfirmationPhrase: routing.failoverConfirmationPhrase(
          service,
          operation,
        ),
      },
    });
  } catch (err) {
    fail(res, err, "get");
  }
};

export const set = async (req: Request, res: Response) => {
  try {
    const decision = await routing.setRule(
      req,
      param(req.params.service).toUpperCase(),
      param(req.params.operation).toUpperCase(),
      {
        providers: req.body?.providers ?? [],
        failoverEnabled: Boolean(req.body?.failoverEnabled),
        reason: req.body?.reason ?? "",
        confirmation: req.body?.confirmation,
      },
    );
    res.json({ success: true, data: decision });
  } catch (err) {
    fail(res, err, "set");
  }
};

/**
 * The operation catalogue.
 *
 * Served rather than duplicated in the frontend: the admin UI builds its
 * routing screen from this, so adding an operation to the backend catalogue
 * makes it appear in the UI with no frontend release.
 */
export const catalogue = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: SERVICES.map((service) => ({
      service,
      operations: isKnownService(service) ? OPERATIONS[service] : [],
    })),
  });
};
