import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field, TextInput } from "@/components/Fields";
import { OpenCircuits } from "@/components/OpenCircuits";
import { PageHeader } from "@/components/PageHeader";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  SectionHeader,
  Stat,
} from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { humanise, latency, percent, relativeTime } from "@/lib/format";
import type { HealthSnapshot, Metrics, Thresholds } from "@/lib/types";

const WINDOWS = [15, 60, 180, 1440];

/**
 * Health Monitor (§22-24).
 *
 * The hierarchy is expandable rather than flat: a provider row answers "is
 * anything wrong", and opening it answers "with what". §57's whole point is
 * that a provider can be healthy while one of its operations is not, and a
 * flat list of every operation buries that in noise.
 */
export function Health() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, t] = await Promise.all([
        api.get("/health", { params: { minutes } }),
        api.get("/health/thresholds"),
      ]);
      setSnapshot(h.data.data);
      setThresholds(t.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [minutes]);

  useEffect(() => {
    void load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const toggle = (key: string) => {
    const next = new Set(expanded);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpanded(next);
  };

  if (error && !snapshot) {
    return (
      <>
        <PageHeader title="Health Monitor" />
        <ErrorNotice message={error} />
      </>
    );
  }
  if (!snapshot) return null;

  const nothingMeasured = snapshot.overall.requests === 0;

  return (
    <>
      <PageHeader
        title="Health Monitor"
        description={`Measured from real supplier calls over the last ${minutes} minutes.`}
        action={
          <div className="flex items-center gap-2">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setMinutes(w)}
                className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium ${
                  w === minutes
                    ? "bg-brand-500/15 text-brand-400"
                    : "text-ink-400 hover:text-ink-200"
                }`}
              >
                {w >= 1440 ? "24h" : w >= 60 ? `${w / 60}h` : `${w}m`}
              </button>
            ))}
            <Button onClick={() => setEditing(true)}>
              <Settings2 className="size-3.5" />
              Thresholds
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={`${error} Showing the last successful read.`} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Requests"
          value={snapshot.overall.requests.toLocaleString()}
          hint={`${snapshot.overall.failures.toLocaleString()} failed`}
        />
        <Stat
          label="Error rate"
          value={percent(snapshot.overall.errorRate)}
          tone={
            snapshot.overall.status === "CRITICAL"
              ? "critical"
              : snapshot.overall.status === "HEALTHY"
                ? "ok"
                : "warn"
          }
        />
        <Stat label="Average response" value={latency(snapshot.overall.averageMs)} />
        <Stat
          label="p95 / p99"
          value={`${latency(snapshot.overall.p95Ms)} / ${latency(snapshot.overall.p99Ms)}`}
        />
      </div>

      <OpenCircuits circuits={snapshot.circuits ?? []} />

      {nothingMeasured && (
        <Card className="mt-5">
          <EmptyState
            title="No supplier calls measured in this window"
            description="Health is fed by the services that call suppliers. Run a hotel search, or widen the window — an empty window is not the same as a healthy one."
          />
        </Card>
      )}

      {snapshot.providers.map((provider) => (
        <Card key={provider.providerSlug} className="mt-5">
          <SectionHeader
            title={provider.name}
            description={`${provider.environment === "production" ? "PRODUCTION" : "Test"} · ${provider.requests.toLocaleString()} requests`}
            action={<HealthBadge metrics={provider} />}
          />

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-b border-ink-800 px-5 py-3 text-[13px] lg:grid-cols-5">
            <Figure label="Error rate" value={percent(provider.errorRate)} />
            <Figure label="Average" value={latency(provider.averageMs)} />
            <Figure label="p95" value={latency(provider.p95Ms)} />
            <Figure label="p99" value={latency(provider.p99Ms)} />
            <Figure
              label="Last failure"
              value={
                provider.lastFailureAt ? relativeTime(provider.lastFailureAt) : "none"
              }
              hint={provider.lastFailureReason ?? undefined}
            />
          </div>

          {provider.services.map((service) => {
            const key = `${provider.providerSlug}/${service.service}`;
            const open = expanded.has(key);
            return (
              <div key={key} className="border-b border-ink-800 last:border-b-0">
                <button
                  onClick={() => toggle(key)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-ink-850/50"
                >
                  {open ? (
                    <ChevronDown className="size-4 text-ink-400" />
                  ) : (
                    <ChevronRight className="size-4 text-ink-400" />
                  )}
                  <span className="flex-1 text-[13px] font-medium text-ink-50">
                    {humanise(service.service)}
                  </span>
                  <span className="tnum text-[12px] text-ink-400">
                    {service.requests.toLocaleString()} req
                  </span>
                  <HealthBadge metrics={service} />
                </button>

                {open && (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-y border-ink-800 text-left text-[12px] text-ink-400">
                        <th className="py-2 pr-5 pl-14 font-medium">Operation</th>
                        <th className="px-5 py-2 font-medium">Requests</th>
                        <th className="px-5 py-2 font-medium">Errors</th>
                        <th className="px-5 py-2 font-medium">Average</th>
                        <th className="px-5 py-2 font-medium">p95</th>
                        <th className="px-5 py-2 font-medium">Last failure</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-800">
                      {service.operations.map((op) => (
                        <tr key={op.operation} className="hover:bg-ink-850/50">
                          <td className="py-2.5 pr-5 pl-14 text-ink-50">
                            {humanise(op.operation)}
                          </td>
                          <td className="tnum px-5 py-2.5 text-ink-400">
                            {op.requests.toLocaleString()}
                          </td>
                          <td className="tnum px-5 py-2.5 text-ink-400">
                            {percent(op.errorRate)}
                          </td>
                          <td className="tnum px-5 py-2.5 text-ink-400">
                            {latency(op.averageMs)}
                          </td>
                          <td className="tnum px-5 py-2.5 text-ink-400">
                            {latency(op.p95Ms)}
                          </td>
                          <td className="px-5 py-2.5 text-ink-400">
                            {op.lastFailureAt ? (
                              <>
                                {relativeTime(op.lastFailureAt)}
                                {op.lastFailureReason && (
                                  <div className="text-[12px] text-ink-600">
                                    {op.lastFailureReason}
                                  </div>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-2.5">
                            <HealthBadge metrics={op} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </Card>
      ))}

      {editing && thresholds && (
        <ThresholdEditor
          thresholds={thresholds}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await load();
          }}
        />
      )}
    </>
  );
}

/**
 * A status, or an honest refusal to give one.
 *
 * Below the sample floor the pill says "too little traffic" instead of showing
 * a colour — a status inferred from three calls is a guess wearing a colour,
 * and a dashboard that goes red over noise teaches people to ignore red.
 */
function HealthBadge({ metrics }: { metrics: Metrics }) {
  if (metrics.requests === 0) {
    return <StatusPill status="UNKNOWN" label="No traffic" size="sm" />;
  }
  if (metrics.belowSampleSize) {
    return <StatusPill status="UNKNOWN" label="Too little traffic" size="sm" />;
  }
  return <StatusPill status={metrics.status} size="sm" />;
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[12px] text-ink-400">{label}</div>
      <div className="tnum mt-0.5 text-ink-50">{value}</div>
      {hint && <div className="text-[12px] text-ink-600">{hint}</div>}
    </div>
  );
}

function ThresholdEditor({
  thresholds,
  onClose,
  onSaved,
}: {
  thresholds: Thresholds;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(thresholds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: [keyof Thresholds, string, string][] = [
    ["warningErrorRate", "Warning error rate", "%"],
    ["degradedErrorRate", "Degraded error rate", "%"],
    ["criticalErrorRate", "Critical error rate", "%"],
    ["warningP95Ms", "Warning p95", "ms"],
    ["degradedP95Ms", "Degraded p95", "ms"],
    ["criticalP95Ms", "Critical p95", "ms"],
    ["minimumSampleSize", "Minimum requests before judging", ""],
    ["windowMinutes", "Default window", "minutes"],
    ["breakerFailureThreshold", "Circuit opens after", "failures in a row"],
    ["breakerCooldownSeconds", "Circuit cooldown", "seconds"],
    ["breakerProbeSuccesses", "Probes needed to close", ""],
  ];

  return (
    <ConfirmDialog
      title="Health thresholds"
      description="When a measurement becomes a status. Widening these silences an alarm, so the change is audited."
      confirmLabel="Save thresholds"
      variant="primary"
      busy={busy}
      error={error}
      onClose={onClose}
      onConfirm={async (reason) => {
        setBusy(true);
        setError(null);
        try {
          await api.put("/health/thresholds", { ...form, reason });
          onSaved();
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label, unit]) => (
          <Field key={key} label={`${label}${unit ? ` (${unit})` : ""}`}>
            <TextInput
              type="number"
              min={0}
              value={String(form[key] ?? "")}
              onChange={(e) =>
                setForm({ ...form, [key]: Number(e.target.value) })
              }
            />
          </Field>
        ))}
      </div>
    </ConfirmDialog>
  );
}
