import { Request, Response } from "express";

import { HealthThresholds, currentThresholds } from "../models/HealthThresholds.model";
import * as audit from "../services/audit.service";
import * as health from "../services/health.service";

const param = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

/**
 * Telemetry ingest.
 *
 * Accepts a batch and answers immediately. Reporting is fire-and-forget from
 * the caller's side, so this must never be slow enough to be worth waiting for
 * and never fail in a way that makes a caller retry — a retry storm from the
 * services that serve customers is a worse outcome than a lost measurement.
 */
export const ingest = async (req: Request, res: Response) => {
  const reports = Array.isArray(req.body?.reports) ? req.body.reports : [];

  // Bounded so one malformed caller cannot hand over a million rows.
  if (reports.length > 1000) {
    return res.status(413).json({ success: false, message: "Batch too large." });
  }

  const accepted = await health.report(reports);
  res.json({ success: true, accepted });
};

export const snapshot = async (req: Request, res: Response) => {
  try {
    const minutes = req.query.minutes ? Number(req.query.minutes) : undefined;
    res.json({ success: true, data: await health.snapshot({ minutes }) });
  } catch (err: any) {
    console.error("[health] snapshot:", err?.message ?? err);
    res.status(500).json({ success: false, message: "Failed to read health." });
  }
};

export const timeline = async (req: Request, res: Response) => {
  try {
    const minutes = req.query.minutes ? Number(req.query.minutes) : undefined;
    res.json({
      success: true,
      data: await health.timeline(param(req.params.slug), minutes),
    });
  } catch (err: any) {
    console.error("[health] timeline:", err?.message ?? err);
    res.status(500).json({ success: false, message: "Failed to read history." });
  }
};

export const thresholds = async (_req: Request, res: Response) => {
  res.json({ success: true, data: await currentThresholds() });
};

/**
 * Change the thresholds (§23).
 *
 * Audited like any other configuration change: moving the critical band from
 * 5% to 20% silences an alarm just as effectively as switching monitoring off,
 * and the record of who did it matters just as much.
 */
export const setThresholds = async (req: Request, res: Response) => {
  const reason = String(req.body?.reason ?? "").trim();
  if (!reason) {
    return res
      .status(400)
      .json({ success: false, message: "A reason is required.", code: "REASON_REQUIRED" });
  }

  const current = await currentThresholds();
  const before = current.toObject();

  const numericFields = [
    "warningErrorRate",
    "degradedErrorRate",
    "criticalErrorRate",
    "warningP95Ms",
    "degradedP95Ms",
    "criticalP95Ms",
    "minimumSampleSize",
    "windowMinutes",
  ] as const;

  for (const field of numericFields) {
    const value = req.body?.[field];
    if (value === undefined) continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a non-negative number.`,
      });
    }
    (current as any)[field] = n;
  }

  // Bands that cross over would make the classifier report a lower severity
  // for a worse measurement — refused rather than silently reordered.
  if (
    !(current.warningErrorRate <= current.degradedErrorRate &&
      current.degradedErrorRate <= current.criticalErrorRate)
  ) {
    return res.status(400).json({
      success: false,
      message: "Error-rate bands must increase: warning ≤ degraded ≤ critical.",
    });
  }
  if (
    !(current.warningP95Ms <= current.degradedP95Ms &&
      current.degradedP95Ms <= current.criticalP95Ms)
  ) {
    return res.status(400).json({
      success: false,
      message: "Response-time bands must increase: warning ≤ degraded ≤ critical.",
    });
  }

  current.updatedBy = (req as any).user?.email ?? "unknown";
  await current.save();

  await audit.record(req, {
    action: "THRESHOLDS_CHANGED",
    targetType: "THRESHOLD",
    targetId: "default",
    before: {
      warningErrorRate: before.warningErrorRate,
      degradedErrorRate: before.degradedErrorRate,
      criticalErrorRate: before.criticalErrorRate,
      warningP95Ms: before.warningP95Ms,
      degradedP95Ms: before.degradedP95Ms,
      criticalP95Ms: before.criticalP95Ms,
      minimumSampleSize: before.minimumSampleSize,
      windowMinutes: before.windowMinutes,
    },
    after: numericFields.reduce<Record<string, number>>((acc, f) => {
      acc[f] = current[f];
      return acc;
    }, {}),
    reason,
  });

  res.json({ success: true, data: await HealthThresholds.findOne({ key: "default" }) });
};
