import {
  AlertCircle,
  Check,
  CircleDot,
  MessageSquare,
  ZapOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, EmptyState, ErrorNotice } from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, humanise, latency, percent, relativeTime } from "@/lib/format";
import type { Incident, IncidentEvent } from "@/lib/types";

/**
 * Incidents (§27).
 *
 * Open ones first and always visible; resolved ones behind a filter. During an
 * outage the list has to answer "what is wrong now" without anyone scrolling
 * past last week's history to find it.
 */
export function Incidents() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/incidents", { params: { status } });
      setIncidents(res.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [status]);

  useEffect(() => {
    void load();
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  if (error && !incidents) {
    return (
      <>
        <PageHeader title="Incidents" />
        <ErrorNotice message={error} />
      </>
    );
  }

  const all = incidents ?? [];

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Raised automatically when an operation crosses a threshold, and closed when it has been well again for long enough to believe it."
        action={
          <div className="flex gap-2">
            {(["open", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
                  s === status
                    ? "bg-brand-500/15 text-brand-400"
                    : "text-ink-400 hover:text-ink-200"
                }`}
              >
                {humanise(s)}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      <Card>
        {all.length === 0 ? (
          <EmptyState
            title={status === "open" ? "Nothing is on fire" : "No resolved incidents"}
            description={
              status === "open"
                ? "The detector checks every minute. An empty list here means no operation has crossed a threshold — not that nothing is being watched."
                : "Incidents appear here once they close."
            }
          />
        ) : (
          <ul className="divide-y divide-ink-800">
            {all.map((incident) => (
              <li
                key={incident.reference}
                onClick={() => setSelected(incident.reference)}
                className="flex cursor-pointer items-center gap-4 px-5 py-3.5 hover:bg-ink-850/50"
              >
                <span className="font-mono text-[12px] text-ink-600">
                  {incident.reference}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-medium text-ink-50">
                    {incident.title}
                  </span>
                  <span className="block text-[12px] text-ink-400">
                    {incident.providerSlug} · {humanise(incident.service)}{" "}
                    {humanise(incident.operation)} · started{" "}
                    {relativeTime(incident.startedAt)}
                  </span>
                </span>
                <StatusPill
                  status={incident.severity === "CRITICAL" ? "CRITICAL" : "DEGRADED"}
                  label={humanise(incident.severity)}
                  size="sm"
                />
                <StatusPill
                  status={
                    incident.status === "RESOLVED"
                      ? "HEALTHY"
                      : incident.status === "ACKNOWLEDGED"
                        ? "WARNING"
                        : "CRITICAL"
                  }
                  label={
                    incident.status === "RESOLVED" && incident.autoResolved
                      ? "Auto-resolved"
                      : humanise(incident.status)
                  }
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selected && (
        <IncidentDetail
          reference={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </>
  );
}

const EVENT_ICON: Record<IncidentEvent["kind"], typeof AlertCircle> = {
  OPENED: AlertCircle,
  DEGRADED: AlertCircle,
  RECOVERED: Check,
  CIRCUIT_OPENED: ZapOff,
  CIRCUIT_CLOSED: CircleDot,
  ACKNOWLEDGED: Check,
  NOTE: MessageSquare,
  RESOLVED: Check,
};

const EVENT_TONE: Record<IncidentEvent["kind"], string> = {
  OPENED: "text-critical-500",
  DEGRADED: "text-critical-500",
  RECOVERED: "text-ok-500",
  CIRCUIT_OPENED: "text-degraded-500",
  CIRCUIT_CLOSED: "text-ok-500",
  ACKNOWLEDGED: "text-brand-400",
  NOTE: "text-ink-400",
  RESOLVED: "text-ok-500",
};

function IncidentDetail({
  reference,
  onClose,
  onChanged,
}: {
  reference: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/incidents/${reference}`);
      setIncident(res.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [reference]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (resolving && incident) {
    return (
      <ConfirmDialog
        title={`Resolve ${incident.reference}?`}
        description="Closing an incident is a claim that the problem is over. The detector will reopen it if the operation crosses the threshold again."
        confirmLabel="Resolve incident"
        variant="primary"
        busy={busy}
        error={error}
        onClose={() => setResolving(false)}
        onConfirm={(reason) =>
          void act(async () => {
            await api.post(`/incidents/${reference}/resolve`, { reason });
            setResolving(false);
          })
        }
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm">
      <div className="mt-12 w-full max-w-2xl rounded-xl border border-ink-800 bg-ink-900 shadow-2xl">
        {incident && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-ink-800 px-5 py-4">
              <div>
                <div className="font-mono text-[12px] text-ink-600">
                  {incident.reference}
                </div>
                <h2 className="mt-0.5 text-[15px] font-semibold text-ink-50">
                  {incident.title}
                </h2>
                <p className="mt-1 text-[13px] text-ink-400">
                  {incident.providerSlug} · {humanise(incident.service)}{" "}
                  {humanise(incident.operation)} · started{" "}
                  {absoluteTime(incident.startedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusPill
                  status={
                    incident.status === "RESOLVED"
                      ? "HEALTHY"
                      : incident.status === "ACKNOWLEDGED"
                        ? "WARNING"
                        : "CRITICAL"
                  }
                  label={
                    incident.status === "RESOLVED" && incident.autoResolved
                      ? "Auto-resolved"
                      : humanise(incident.status)
                  }
                  size="sm"
                />
                <button
                  onClick={onClose}
                  className="text-[12px] text-ink-400 hover:text-ink-200"
                >
                  Close
                </button>
              </div>
            </div>

            {incident.openedWith && (
              <div className="grid grid-cols-3 gap-4 border-b border-ink-800 px-5 py-3 text-[13px]">
                <div>
                  <div className="text-[12px] text-ink-400">Error rate when opened</div>
                  <div className="tnum mt-0.5 text-ink-50">
                    {percent(incident.openedWith.errorRate)}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-ink-400">p95 when opened</div>
                  <div className="tnum mt-0.5 text-ink-50">
                    {latency(incident.openedWith.p95Ms)}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-ink-400">Requests observed</div>
                  <div className="tnum mt-0.5 text-ink-50">
                    {incident.openedWith.requests}
                  </div>
                </div>
              </div>
            )}

            <ol className="space-y-0 px-5 py-4">
              {incident.events.map((event, i) => {
                const Icon = EVENT_ICON[event.kind] ?? MessageSquare;
                return (
                  <li key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <Icon className={`size-4 ${EVENT_TONE[event.kind]}`} />
                      {i < incident.events.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-ink-800" />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-baseline gap-2">
                        <span className="tnum text-[12px] text-ink-600">
                          {new Date(event.at).toLocaleTimeString()}
                        </span>
                        {event.actorEmail && (
                          <span className="text-[12px] text-ink-400">
                            {event.actorEmail}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[13px] text-ink-200">{event.message}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {error && (
              <div className="px-5 pb-3">
                <ErrorNotice message={error} />
              </div>
            )}

            {incident.status !== "RESOLVED" && (
              <div className="flex items-center gap-2 border-t border-ink-800 px-5 py-3">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                  className="flex-1 rounded-lg border border-ink-800 bg-ink-950 px-3 py-1.5 text-[13px] text-ink-50 outline-none focus:border-brand-500"
                />
                <Button
                  disabled={!note.trim() || busy}
                  onClick={() =>
                    void act(async () => {
                      await api.post(`/incidents/${reference}/notes`, { note });
                      setNote("");
                    })
                  }
                >
                  Add note
                </Button>
                {incident.status === "ACTIVE" && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void act(() =>
                        api.post(`/incidents/${reference}/acknowledge`, {
                          note: note.trim() || "Acknowledged",
                        }),
                      )
                    }
                  >
                    Acknowledge
                  </Button>
                )}
                <Button variant="primary" disabled={busy} onClick={() => setResolving(true)}>
                  Resolve
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
