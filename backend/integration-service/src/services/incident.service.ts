import { Request } from "express";

import {
  IIncident,
  Incident,
  IncidentEvent,
  IncidentSeverity,
  nextReference,
} from "../models/Incident.model";
import { ALERT_EVENTS } from "../constants/alerts";
import * as audit from "./audit.service";
import { dispatch } from "./notification.service";
import { HealthStatus } from "../constants/status";
import { Metrics, snapshot } from "./health.service";
import { ProviderError } from "./provider.service";

/**
 * Incident detection and management (§27).
 *
 * The detector compares the live health snapshot against what is already open
 * and reconciles the difference. It is intentionally stateless between runs —
 * everything it needs to know is in the incidents themselves — so restarting
 * the service cannot lose track of an outage or open a duplicate for one.
 */

/** Consecutive healthy checks before an incident closes itself. */
const HEALTHY_CHECKS_TO_RESOLVE = Number(
  process.env.INCIDENT_HEALTHY_CHECKS_TO_RESOLVE || 3,
);

const SEVERITY_BY_STATUS: Partial<Record<HealthStatus, IncidentSeverity>> = {
  CRITICAL: "CRITICAL",
  DEGRADED: "HIGH",
};

const describe = (metrics: Metrics): string => {
  const parts: string[] = [];
  if (metrics.errorRate !== null) parts.push(`error rate ${metrics.errorRate}%`);
  if (metrics.p95Ms !== null && Number.isFinite(metrics.p95Ms)) {
    parts.push(`p95 ${Math.round(metrics.p95Ms / 100) / 10}s`);
  }
  parts.push(`${metrics.requests} requests`);
  return parts.join(", ");
};

const addEvent = (incident: IIncident, event: IncidentEvent): void => {
  incident.events.push(event);
};

/**
 * One detector pass.
 *
 * Opens incidents for operations that have crossed into DEGRADED or CRITICAL,
 * updates the ones already open, and closes those that have been well for
 * several consecutive passes.
 *
 * Returns a summary so the scheduler can log something useful without this
 * function knowing how it is being run.
 */
export const detect = async (): Promise<{
  opened: string[];
  resolved: string[];
  updated: string[];
}> => {
  const health = await snapshot();
  const opened: string[] = [];
  const resolvedRefs: string[] = [];
  const updated: string[] = [];

  const open = await Incident.find({ status: { $in: ["ACTIVE", "ACKNOWLEDGED"] } });
  const byKey = new Map(
    open.map((i) => [`${i.providerSlug}/${i.service}/${i.operation}`, i]),
  );

  const now = new Date();

  for (const provider of health.providers) {
    for (const service of provider.services) {
      for (const operation of service.operations) {
        const key = `${provider.providerSlug}/${service.service}/${operation.operation}`;
        const existing = byKey.get(key);
        byKey.delete(key);

        // Below the sample floor nothing is judged, in either direction. An
        // operation that stopped receiving traffic has not recovered — it has
        // stopped being observed, and closing an incident on that would be a
        // dashboard congratulating itself for a supplier going quiet.
        if (operation.belowSampleSize) continue;

        const severity = SEVERITY_BY_STATUS[operation.status];

        if (severity) {
          if (!existing) {
            const incident = new Incident({
              reference: await nextReference(),
              providerSlug: provider.providerSlug,
              service: service.service,
              operation: operation.operation,
              severity,
              status: "ACTIVE",
              title: `${provider.name} ${service.service} ${operation.operation} ${operation.status.toLowerCase()}`,
              startedAt: now,
              openedWith: {
                errorRate: operation.errorRate,
                p95Ms: Number.isFinite(operation.p95Ms ?? NaN) ? operation.p95Ms : null,
                requests: operation.requests,
              },
              events: [
                {
                  at: now,
                  kind: "OPENED",
                  message: `Health monitor detected ${operation.status.toLowerCase()}: ${describe(operation)}`,
                },
              ],
            });
            await incident.save();
            opened.push(incident.reference);

            // Awaited so a detector pass does not finish before its alerts are
            // recorded — dispatch never throws, so this cannot fail the pass.
            await dispatch({
              event: ALERT_EVENTS.INCIDENT_OPENED,
              severity,
              title: `${provider.name} ${service.service} ${operation.operation} is ${operation.status.toLowerCase()}`,
              body: `KLAR's health monitor opened ${incident.reference}. ${describe(operation)}.`,
              facts: [
                { label: "Incident", value: incident.reference },
                { label: "Provider", value: provider.name },
                { label: "Operation", value: `${service.service} / ${operation.operation}` },
                { label: "Environment", value: provider.environment },
                { label: "Error rate", value: `${operation.errorRate ?? 0}%` },
                { label: "Requests observed", value: String(operation.requests) },
              ],
              providerSlug: provider.providerSlug,
              incidentReference: incident.reference,
              at: now,
            });
          } else {
            existing.healthyChecks = 0;
            // Escalation is recorded; de-escalation is not, because an
            // incident that flickers between degraded and critical would
            // otherwise fill its own timeline with noise.
            if (severity === "CRITICAL" && existing.severity !== "CRITICAL") {
              existing.severity = "CRITICAL";
              addEvent(existing, {
                at: now,
                kind: "DEGRADED",
                message: `Escalated to critical: ${describe(operation)}`,
              });
              updated.push(existing.reference);

              await dispatch({
                event: ALERT_EVENTS.INCIDENT_ESCALATED,
                severity: "CRITICAL",
                title: `${provider.name} ${service.service} ${operation.operation} escalated to critical`,
                body: `${existing.reference} got worse. ${describe(operation)}.`,
                facts: [
                  { label: "Incident", value: existing.reference },
                  { label: "Provider", value: provider.name },
                  { label: "Operation", value: `${service.service} / ${operation.operation}` },
                  { label: "Error rate", value: `${operation.errorRate ?? 0}%` },
                ],
                providerSlug: provider.providerSlug,
                incidentReference: existing.reference,
                at: now,
              });
            }
            await existing.save();
          }
          continue;
        }

        // Healthy again.
        if (existing) {
          existing.healthyChecks += 1;

          if (existing.healthyChecks === 1) {
            addEvent(existing, {
              at: now,
              kind: "RECOVERED",
              message: `Health returned to ${operation.status.toLowerCase()}: ${describe(operation)}`,
            });
            updated.push(existing.reference);
          }

          // Several consecutive healthy passes, not one. A supplier that
          // recovers for thirty seconds and fails again has not recovered, and
          // an incident that closed on the first good reading would reopen as a
          // new one every few minutes.
          if (existing.healthyChecks >= HEALTHY_CHECKS_TO_RESOLVE) {
            existing.status = "RESOLVED";
            existing.resolvedAt = now;
            existing.autoResolved = true;
            addEvent(existing, {
              at: now,
              kind: "RESOLVED",
              message: `Closed automatically after ${existing.healthyChecks} consecutive healthy checks`,
            });
            resolvedRefs.push(existing.reference);

            // Sent at the SAME severity the incident carried, so whoever was
            // woken by it is told by the same route that it is over. A
            // recovery downgraded to LOW would be filtered out by exactly the
            // target that most needs to hear it.
            await dispatch({
              event: ALERT_EVENTS.INCIDENT_RESOLVED,
              severity: existing.severity,
              title: `${provider.name} ${service.service} ${operation.operation} has recovered`,
              body: `${existing.reference} closed automatically after ${existing.healthyChecks} consecutive healthy checks.`,
              facts: [
                { label: "Incident", value: existing.reference },
                { label: "Provider", value: provider.name },
                { label: "Operation", value: `${service.service} / ${operation.operation}` },
                {
                  label: "Open for",
                  value: `${Math.round((now.getTime() - existing.startedAt.getTime()) / 60_000)} minutes`,
                },
              ],
              providerSlug: provider.providerSlug,
              incidentReference: existing.reference,
              at: now,
            });
          }
          await existing.save();
        }
      }
    }
  }

  /**
   * Anything left in `byKey` is an incident whose operation no longer appears
   * in the snapshot — the provider was deleted, or the operation removed from
   * its capabilities. Left open deliberately: the incident is a record of
   * something that happened, and closing it because the evidence disappeared
   * would be the wrong lesson.
   */
  for (const orphan of byKey.values()) {
    if (orphan.events[orphan.events.length - 1]?.kind !== "NOTE") {
      addEvent(orphan, {
        at: now,
        kind: "NOTE",
        message:
          "This operation is no longer reported by the health monitor. The incident is left open for review.",
      });
      await orphan.save();
      updated.push(orphan.reference);
    }
  }

  return { opened, resolved: resolvedRefs, updated };
};

/** Record that a circuit opened or closed against any incident it belongs to. */
export const noteCircuitChange = async (
  providerSlug: string,
  service: string,
  operation: string,
  state: "OPEN" | "CLOSED",
  reason?: string,
): Promise<void> => {
  const incident = await Incident.findOne({
    providerSlug,
    service,
    operation,
    status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
  });
  if (!incident) return;

  const last = incident.events[incident.events.length - 1];
  const kind = state === "OPEN" ? "CIRCUIT_OPENED" : "CIRCUIT_CLOSED";
  // The breaker reports its state on every flush, so without this the timeline
  // would gain an identical line every ten seconds for the whole outage.
  if (last?.kind === kind) return;

  addEvent(incident, {
    at: new Date(),
    kind,
    message:
      state === "OPEN"
        ? `Circuit opened — traffic is no longer being sent${reason ? `: ${reason}` : ""}`
        : "Circuit closed — traffic resumed",
  });
  await incident.save();
};

export interface IncidentQuery {
  status?: string;
  providerSlug?: string;
  limit?: number;
}

export const list = async (q: IncidentQuery = {}) => {
  const filter: Record<string, unknown> = {};
  if (q.status === "open") filter.status = { $in: ["ACTIVE", "ACKNOWLEDGED"] };
  else if (q.status) filter.status = q.status.toUpperCase();
  if (q.providerSlug) filter.providerSlug = q.providerSlug;

  const limit = Math.min(200, Math.max(1, q.limit ?? 50));
  return Incident.find(filter).sort({ startedAt: -1 }).limit(limit);
};

export const get = async (reference: string): Promise<IIncident> => {
  const incident = await Incident.findOne({ reference: reference.toUpperCase() });
  if (!incident) {
    throw new ProviderError(`No incident "${reference}".`, 404, "INCIDENT_NOT_FOUND");
  }
  return incident;
};

export const acknowledge = async (
  req: Request,
  reference: string,
  note: string,
): Promise<IIncident> => {
  const incident = await get(reference);
  if (incident.status !== "ACTIVE") {
    throw new ProviderError(
      `${incident.reference} is already ${incident.status.toLowerCase()}.`,
      409,
      "INVALID_STATE",
    );
  }

  const actorEmail = (req as any).user?.email ?? "unknown";
  incident.status = "ACKNOWLEDGED";
  incident.acknowledgedAt = new Date();
  incident.acknowledgedBy = actorEmail;
  addEvent(incident, {
    at: new Date(),
    kind: "ACKNOWLEDGED",
    message: note?.trim() || "Acknowledged",
    actorEmail,
  });
  await incident.save();

  await audit.record(req, {
    action: "INCIDENT_ACKNOWLEDGED",
    targetType: "PROVIDER",
    targetId: incident.reference,
    providerSlug: incident.providerSlug,
    service: incident.service,
    operation: incident.operation,
    reason: note,
  });

  return incident;
};

export const resolve = async (
  req: Request,
  reference: string,
  reason: string,
): Promise<IIncident> => {
  const incident = await get(reference);
  if (incident.status === "RESOLVED") {
    throw new ProviderError(
      `${incident.reference} is already resolved.`,
      409,
      "INVALID_STATE",
    );
  }
  if (!reason?.trim()) {
    throw new ProviderError("A reason is required.", 400, "REASON_REQUIRED");
  }

  const actorEmail = (req as any).user?.email ?? "unknown";
  incident.status = "RESOLVED";
  incident.resolvedAt = new Date();
  incident.resolvedBy = actorEmail;
  incident.autoResolved = false;
  addEvent(incident, {
    at: new Date(),
    kind: "RESOLVED",
    message: reason.trim(),
    actorEmail,
  });
  await incident.save();

  await audit.record(req, {
    action: "INCIDENT_RESOLVED",
    targetType: "PROVIDER",
    targetId: incident.reference,
    providerSlug: incident.providerSlug,
    service: incident.service,
    operation: incident.operation,
    reason,
  });

  return incident;
};

export const addNote = async (
  req: Request,
  reference: string,
  note: string,
): Promise<IIncident> => {
  const incident = await get(reference);
  if (!note?.trim()) {
    throw new ProviderError("A note is required.", 400, "NOTE_REQUIRED");
  }

  addEvent(incident, {
    at: new Date(),
    kind: "NOTE",
    message: note.trim(),
    actorEmail: (req as any).user?.email ?? "unknown",
  });
  await incident.save();
  return incident;
};
