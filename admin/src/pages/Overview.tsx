import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { OpenCircuits } from "@/components/OpenCircuits";
import { PageHeader } from "@/components/PageHeader";
import { Card, EmptyState, ErrorNotice, SectionHeader, Stat } from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { humanise, relativeTime } from "@/lib/format";
import { latency, percent } from "@/lib/format";
import type { HealthSnapshot, Provider, RoutingDecision } from "@/lib/types";

/**
 * "Are KLAR's external travel APIs healthy right now?" (§5)
 *
 * WHAT IS SHOWN AND WHAT IS NOT
 * -----------------------------
 * Everything here is measured. Request volume, latency and error rate are not
 * collected yet, so they are shown as "Not collected" rather than as zeros —
 * a KPI reading 0 errors because nothing was counted is a lie that reads as
 * good news, which is the worst direction for an ops screen to be wrong in
 * (§68, §69).
 *
 * What IS known today is configuration state, and it answers a real question:
 * which operations currently have somebody to serve them, and which have
 * nobody. An orphaned operation is an outage whether or not anyone has
 * measured a request failing.
 */
/** A provider's measured status, or an honest absence of one. */
function ProviderHealthPill({
  slug,
  health,
}: {
  slug: string;
  health: HealthSnapshot | null;
}) {
  const metrics = health?.providers.find((p) => p.providerSlug === slug);
  if (!metrics || metrics.requests === 0) {
    return <StatusPill status="UNKNOWN" label="No traffic" size="sm" />;
  }
  if (metrics.belowSampleSize) {
    return <StatusPill status="UNKNOWN" label="Too little traffic" size="sm" />;
  }
  return <StatusPill status={metrics.status} size="sm" />;
}

export function Overview() {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [routing, setRouting] = useState<RoutingDecision[] | null>(null);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [p, r, h] = await Promise.all([
          api.get("/providers"),
          api.get("/routing"),
          api.get("/health", { params: { minutes: 1440 } }),
        ]);
        if (!live) return;
        setProviders(p.data.data);
        setRouting(r.data.data);
        setHealth(h.data.data);
        setError(null);
      } catch (err) {
        if (live) setError(errorMessage(err));
      }
    };
    void load();
    // Polling rather than sockets (§43): one small request every 15s costs
    // nothing and needs no new infrastructure.
    const timer = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  if (error && !providers) {
    return (
      <>
        <PageHeader title="Overview" />
        <ErrorNotice message={error} />
      </>
    );
  }

  const all = providers ?? [];
  const active = all.filter((p) => p.status === "ACTIVE");
  const disabled = all.filter((p) => p.status === "DISABLED");
  const maintenance = all.filter((p) => p.status === "MAINTENANCE");

  const overall = health?.overall;
  // "Measured" means a real supplier call was observed. Without one, every
  // derived number would be an artefact of an empty set.
  const measured = Boolean(overall && overall.requests > 0);

  const configured = (routing ?? []).filter((d) => d.configured);
  const orphaned = configured.filter((d) => d.providers.length === 0);
  const singleSourced = configured.filter((d) => d.providers.length === 1);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Live configuration state across every external travel supplier."
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={`${error} Showing the last successful read.`} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Providers" value={all.length} hint={`${active.length} active`} />
        <Stat
          label="Operations covered"
          value={`${configured.length - orphaned.length}/${configured.length}`}
          hint="have at least one routable provider"
          tone={orphaned.length ? "critical" : "ok"}
        />
        <Stat
          label="Single-sourced"
          value={singleSourced.length}
          hint="one provider away from an outage"
          tone={singleSourced.length ? "warn" : "neutral"}
        />
        <Stat
          label="Providers off"
          value={disabled.length + maintenance.length}
          hint={maintenance.length ? `${maintenance.length} in maintenance` : "none"}
          tone={disabled.length ? "warn" : "neutral"}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/*
          Measured, not configured. `measured` is false until a supplier call
          has actually been observed, and these stay "Not collected" until then
          — a 0 here would read as "no errors" rather than "nothing watched".
        */}
        <Stat
          label="Requests (24h)"
          value={overall?.requests.toLocaleString()}
          hint={measured ? `${overall!.failures.toLocaleString()} failed` : undefined}
          unavailable={measured ? undefined : "No supplier calls observed yet"}
        />
        <Stat
          label="Average response"
          value={latency(overall?.averageMs ?? null)}
          hint={measured ? `p95 ${latency(overall!.p95Ms)}` : undefined}
          unavailable={measured ? undefined : "No supplier calls observed yet"}
        />
        <Stat
          label="Error rate"
          value={percent(overall?.errorRate ?? null)}
          tone={
            !measured
              ? "neutral"
              : overall!.status === "CRITICAL"
                ? "critical"
                : overall!.status === "HEALTHY"
                  ? "ok"
                  : "warn"
          }
          unavailable={measured ? undefined : "No supplier calls observed yet"}
        />
        <Stat
          label="Success rate"
          value={
            measured
              ? `${Math.round((overall!.successes / overall!.requests) * 1000) / 10}%`
              : undefined
          }
          hint={measured ? `over ${overall!.requests.toLocaleString()} calls` : undefined}
          unavailable={measured ? undefined : "No supplier calls observed yet"}
        />
      </div>

      <OpenCircuits circuits={health?.circuits ?? []} />

      {orphaned.length > 0 && (
        <Card className="mt-5 border-critical-500/30 bg-critical-500/5">
          <SectionHeader
            title="Operations with no provider"
            description="Nothing can serve these right now. Every request will fail."
          />
          <ul className="divide-y divide-ink-800">
            {orphaned.map((d) => (
              <li
                key={`${d.service}/${d.operation}`}
                className="flex items-center justify-between px-5 py-3 text-[13px]"
              >
                <span className="font-medium text-ink-50">
                  {humanise(d.service)} · {humanise(d.operation)}
                </span>
                <span className="text-ink-400">
                  {d.excluded.length
                    ? d.excluded
                        .map((e) => `${e.slug} (${humanise(e.reason)})`)
                        .join(", ")
                    : "no providers configured"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-5">
        <SectionHeader
          title="Providers"
          description="Status is what an administrator set. Health is what the suppliers actually did."
        />
        {all.length === 0 ? (
          <EmptyState
            title="No providers registered"
            description="Run the seed in integration-service to register TripJack and RateGain."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Provider</th>
                  <th className="px-5 py-2.5 font-medium">Services</th>
                  <th className="px-5 py-2.5 font-medium">Environment</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Health</th>
                  <th className="px-5 py-2.5 font-medium">Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {all.map((p) => (
                  <tr key={p.slug} className="hover:bg-ink-850/50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/providers/${p.slug}`}
                        className="font-medium text-ink-50 hover:text-brand-400"
                      >
                        {p.name}
                      </Link>
                      <div className="text-[12px] text-ink-600">{p.code}</div>
                    </td>
                    <td className="px-5 py-3 text-ink-400">
                      {p.services
                        .filter((s) => s.enabled)
                        .map((s) => humanise(s.service))
                        .join(" + ") || "none enabled"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          p.activeEnvironment === "production"
                            ? "font-medium text-warn-500"
                            : "text-ink-400"
                        }
                      >
                        {p.activeEnvironment === "production" ? "PRODUCTION" : "Test"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={p.status} size="sm" />
                    </td>
                    <td className="px-5 py-3">
                      <ProviderHealthPill slug={p.slug} health={health} />
                    </td>
                    <td className="px-5 py-3 text-ink-400">
                      {relativeTime(p.statusChangedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
