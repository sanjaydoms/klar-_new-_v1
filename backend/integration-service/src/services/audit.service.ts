import { Request } from "express";

import { AuditLog, IAuditLog } from "../models/AuditLog.model";
import { TokenPayload } from "../middlewares/auth.middleware";

/**
 * The audit trail (§28).
 *
 * Append-only by construction: this module exposes `record` and `list`, and
 * nothing anywhere exposes an update or a delete.
 */

export interface AuditEntry {
  action: string;
  targetType: IAuditLog["targetType"];
  targetId: string;
  providerSlug?: string;
  service?: string;
  operation?: string;
  environment?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

/**
 * Where the request came from, best effort.
 *
 * `x-forwarded-for` is client-controlled and trivially spoofed, so it is
 * recorded as a hint rather than trusted as identity — the actor's identity
 * comes from the verified token, never from a header.
 */
const originOf = (req: Request) => ({
  ip:
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    undefined,
  userAgent: (req.headers["user-agent"] as string) || undefined,
});

/**
 * Write one entry.
 *
 * Never throws. An audit write that fails must not roll back the change it was
 * describing — the change has already happened, and losing the record of it is
 * strictly better than a half-applied disable that leaves a supplier serving
 * traffic somebody believes is stopped. Failures are logged loudly instead.
 */
export const record = async (
  req: Request & { user?: TokenPayload },
  entry: AuditEntry,
): Promise<void> => {
  try {
    const user = req.user;
    await AuditLog.create({
      actorId: user?.userId ?? "unknown",
      actorEmail: user?.email ?? "unknown",
      actorRole: user?.roles ?? "unknown",
      ...entry,
      ...originOf(req),
    });
  } catch (err: any) {
    console.error(
      `[audit] FAILED to record ${entry.action} on ${entry.targetId}: ${err?.message ?? err}`,
    );
  }
};

export interface AuditQuery {
  providerSlug?: string;
  action?: string;
  actorId?: string;
  targetType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

/** Newest first, capped. */
export const list = async (q: AuditQuery = {}) => {
  const filter: Record<string, unknown> = {};
  if (q.providerSlug) filter.providerSlug = q.providerSlug;
  if (q.action) filter.action = q.action;
  if (q.actorId) filter.actorId = q.actorId;
  if (q.targetType) filter.targetType = q.targetType;
  if (q.from || q.to) {
    filter.createdAt = {
      ...(q.from ? { $gte: q.from } : {}),
      ...(q.to ? { $lte: q.to } : {}),
    };
  }

  const limit = Math.min(200, Math.max(1, q.limit ?? 50));
  const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
  return { entries, limit };
};
