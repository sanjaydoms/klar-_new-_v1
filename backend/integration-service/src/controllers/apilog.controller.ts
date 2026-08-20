import { Request, Response } from "express";

import * as apilog from "../services/apilog.service";

const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length ? v : undefined;

export const list = async (req: Request, res: Response) => {
  try {
    const logs = await apilog.list({
      provider: str(req.query.provider),
      service: str(req.query.service)?.toUpperCase(),
      operation: str(req.query.operation)?.toUpperCase(),
      environment: str(req.query.environment),
      result: str(req.query.result),
      httpStatus: req.query.httpStatus ? Number(req.query.httpStatus) : undefined,
      correlationId: str(req.query.correlationId),
      requestId: str(req.query.requestId),
      failoverOnly: req.query.failover === "true",
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    console.error("[apilog] list:", err?.message ?? err);
    res.status(500).json({ success: false, message: "Failed to read logs." });
  }
};

/**
 * Everything one customer action caused (§42).
 *
 * Accepts either the correlation id or any attempt's request id, because an
 * operator reading a log row has the request id in front of them and should
 * not have to work out which of the two identifiers to paste.
 */
export const correlation = async (req: Request, res: Response) => {
  try {
    const id = param(req.params.id);
    let found = await apilog.correlation(id);

    if (!found) {
      const [attempt] = await apilog.list({ requestId: id, limit: 1 });
      if (attempt) found = await apilog.correlation(attempt.correlationId);
    }

    if (!found) {
      return res.status(404).json({ success: false, message: "No such request." });
    }
    res.json({ success: true, data: found });
  } catch (err: any) {
    console.error("[apilog] correlation:", err?.message ?? err);
    res.status(500).json({ success: false, message: "Failed to read the request." });
  }
};
