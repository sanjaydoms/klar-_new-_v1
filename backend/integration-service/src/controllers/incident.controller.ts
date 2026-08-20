import { Request, Response } from "express";

import * as incidents from "../services/incident.service";
import { ProviderError } from "../services/provider.service";

const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const fail = (res: Response, err: unknown, context: string) => {
  if (err instanceof ProviderError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, code: err.code });
  }
  console.error(`[incidents] ${context}:`, (err as any)?.message ?? err);
  return res.status(500).json({ success: false, message: "Something went wrong." });
};

export const list = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: await incidents.list({
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        providerSlug:
          typeof req.query.provider === "string" ? req.query.provider : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    });
  } catch (err) {
    fail(res, err, "list");
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await incidents.get(param(req.params.reference)) });
  } catch (err) {
    fail(res, err, "get");
  }
};

export const acknowledge = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: await incidents.acknowledge(
        req,
        param(req.params.reference),
        req.body?.note ?? "",
      ),
    });
  } catch (err) {
    fail(res, err, "acknowledge");
  }
};

export const resolve = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: await incidents.resolve(
        req,
        param(req.params.reference),
        req.body?.reason ?? "",
      ),
    });
  } catch (err) {
    fail(res, err, "resolve");
  }
};

export const addNote = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: await incidents.addNote(req, param(req.params.reference), req.body?.note ?? ""),
    });
  } catch (err) {
    fail(res, err, "addNote");
  }
};

/**
 * Run the detector now.
 *
 * Exists so an operator does not have to wait out the interval to see whether
 * a change they just made cleared an incident — and so the behaviour is
 * testable without a scheduler.
 */
export const runDetector = async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await incidents.detect() });
  } catch (err) {
    fail(res, err, "runDetector");
  }
};
