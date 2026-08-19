import { ArrowLeft, Power, PowerOff, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toggle } from "@/components/Fields";
import { PageHeader } from "@/components/PageHeader";
import {
  Button,
  Card,
  ErrorNotice,
  SectionHeader,
  Stat,
} from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, humanise, relativeTime } from "@/lib/format";
import { latency, percent } from "@/lib/format";
import type {
  Environment,
  HealthSnapshot,
  Metrics,
  Provider,
  ProviderHealth,
  RoutingDecision,
} from "@/lib/types";

interface Impact {
  affected: {
    service: string;
    operation: string;
    fallback: { slug: string; name: string }[];
    wasPrimary: boolean;
  }[];
  orphaned: { service: string; operation: string }[];
  confirmationPhrase: string;
}

/**
 * One provider, in full.
 *
 * The page answers three questions in order: is it on, what is it allowed to
 * do, and what would happen if it stopped. The last one is not hypothetical —
 * it is fetched from live routing before the disable dialog opens, so the
 * consequence shown is the real one rather than a description of one.
 */
export function ProviderDetail() {
  const { slug = "" } = useParams();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [routing, setRouting] = useState<RoutingDecision[]>([]);
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [dialog, setDialog] = useState<
    | null
    | { kind: "disable" | "maintenance"; impact: Impact }
    | { kind: "enable" }
    | { kind: "environment"; environment: Environment }
  >(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, r, h] = await Promise.all([
        api.get(`/providers/${slug}`),
        api.get("/routing"),
        api.get("/health", { params: { minutes: 60 } }),
      ]);
      setProvider(p.data.data);
      setRouting(r.data.data);
      const snapshot: HealthSnapshot = h.data.data;
      setHealth(snapshot.providers.find((x) => x.providerSlug === slug) ?? null);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const openStatusDialog = async (kind: "disable" | "maintenance") => {
    setDialogError(null);
    try {
      const res = await api.get(`/providers/${slug}/disable-impact`);
      setDialog({ kind, impact: res.data.data });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const changeStatus = async (
    status: string,
    reason: string,
    confirmation?: string,
  ) => {
    setBusy("status");
    setDialogError(null);
    try {
      await api.patch(`/providers/${slug}/status`, { status, reason, confirmation });
      setDialog(null);
      await load();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleService = async (service: string, enabled: boolean) => {
    setBusy(service);
    try {
      await api.patch(`/providers/${slug}/services/${service}`, {
        enabled,
        reason: `${enabled ? "Enabled" : "Disabled"} ${service} from the provider page`,
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleOperation = async (
    service: string,
    operation: string,
    enabled: boolean,
  ) => {
    setBusy(`${service}/${operation}`);
    try {
      await api.patch(
        `/providers/${slug}/services/${service}/operations/${operation}`,
        {
          enabled,
          reason: `${enabled ? "Enabled" : "Disabled"} ${service}/${operation} from the provider page`,
        },
      );
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (error && !provider) {
    return (
      <>
        <PageHeader title="Provider" />
        <ErrorNotice message={error} />
      </>
    );
  }
  if (!provider) return null;

  const serving = routing.filter((d) =>
    d.providers.some((p) => p.slug === provider.slug),
  );
  const primaryFor = routing.filter((d) => d.providers[0]?.slug === provider.slug);
  const isProduction = provider.activeEnvironment === "production";

  return (
    <>
      <Link
        to="/providers"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200"
      >
        <ArrowLeft className="size-3.5" />
        Providers
      </Link>

      <PageHeader
        title={provider.name}
        description={provider.description}
        action={
          <div className="flex items-center gap-2">
            {provider.status === "ACTIVE" ? (
              <>
                <Button onClick={() => void openStatusDialog("maintenance")}>
                  <Wrench className="size-3.5" />
                  Maintenance
                </Button>
                <Button variant="danger" onClick={() => void openStatusDialog("disable")}>
                  <PowerOff className="size-3.5" />
                  Disable provider
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setDialog({ kind: "enable" })}>
                <Power className="size-3.5" />
                Enable provider
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      {isProduction && (
        <div className="mb-5 rounded-lg border border-warn-500/30 bg-warn-500/10 px-4 py-3 text-[13px] text-warn-500">
          This provider is pointed at <strong>PRODUCTION</strong>. Changes here
          affect real bookings and real money.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Status"
          value={<StatusPill status={provider.status} />}
          hint={provider.statusReason}
        />
        <Stat
          label="Serving"
          value={serving.length}
          hint={`primary for ${primaryFor.length}`}
          tone={serving.length ? "neutral" : "warn"}
        />
        <Stat
          label="Error rate (1h)"
          value={percent(health?.errorRate ?? null)}
          hint={
            health && health.requests > 0
              ? `${health.requests.toLocaleString()} requests`
              : undefined
          }
          tone={
            health?.status === "CRITICAL"
              ? "critical"
              : health?.status === "HEALTHY"
                ? "ok"
                : "warn"
          }
          unavailable={
            health && health.requests > 0 ? undefined : "No supplier calls observed yet"
          }
        />
        <Stat
          label="Response p95 / p99"
          value={`${latency(health?.p95Ms ?? null)} / ${latency(health?.p99Ms ?? null)}`}
          hint={health?.averageMs ? `average ${latency(health.averageMs)}` : undefined}
          unavailable={
            health && health.requests > 0 ? undefined : "No supplier calls observed yet"
          }
        />
      </div>

      <Card className="mt-5">
        <SectionHeader
          title="Environment"
          description="Production and test are separate configurations. Only one is live at a time."
        />
        <div className="flex items-center gap-6 px-5 py-4">
          {(["test", "production"] as Environment[]).map((env) => {
            const active = provider.activeEnvironment === env;
            const config = provider.environments[env];
            return (
              <button
                key={env}
                disabled={active}
                onClick={() => setDialog({ kind: "environment", environment: env })}
                className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                  active
                    ? env === "production"
                      ? "border-warn-500/40 bg-warn-500/10"
                      : "border-brand-500/40 bg-brand-500/10"
                    : "border-ink-800 bg-ink-950 hover:border-ink-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[13px] font-semibold ${
                      env === "production" ? "text-warn-500" : "text-ink-50"
                    }`}
                  >
                    {env === "production" ? "PRODUCTION" : "Test"}
                  </span>
                  {active && (
                    <span className="text-[11px] font-medium text-ink-400">
                      Live
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-[12px] text-ink-400">
                  {config.baseUrl || "no base URL configured"}
                </div>
                <div className="mt-0.5 text-[12px] text-ink-600">
                  {config.enabled ? "Enabled" : "Disabled"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="border-t border-ink-800 px-5 py-3">
          <Link
            to={`/credentials?provider=${provider.slug}`}
            className="text-[13px] text-brand-400 hover:underline"
          >
            Manage credentials and test the connection →
          </Link>
        </div>
      </Card>

      {provider.services.map((service) => (
        <Card key={service.service} className="mt-5">
          <SectionHeader
            title={humanise(service.service)}
            description="Operations this supplier implements, and whether KLAR is using them."
            action={
              <Toggle
                label={`Enable ${service.service}`}
                checked={service.enabled}
                busy={busy === service.service}
                onChange={(next) => void toggleService(service.service, next)}
              />
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Operation</th>
                  <th className="px-5 py-2.5 font-medium">Supported</th>
                  <th className="px-5 py-2.5 font-medium">Enabled</th>
                  <th className="px-5 py-2.5 font-medium">Routing</th>
                  <th className="px-5 py-2.5 font-medium">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {service.operations.map((op) => {
                  const decision = routing.find(
                    (d) => d.service === service.service && d.operation === op.operation,
                  );
                  const position = decision?.providers.findIndex(
                    (p) => p.slug === provider.slug,
                  );
                  return (
                    <tr key={op.operation} className="hover:bg-ink-850/50">
                      <td className="px-5 py-3 font-medium text-ink-50">
                        {humanise(op.operation)}
                      </td>
                      <td className="px-5 py-3">
                        {op.supported ? (
                          <span className="text-ok-500">Yes</span>
                        ) : (
                          <span className="text-ink-600">Not implemented</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Toggle
                          label={`Enable ${op.operation}`}
                          checked={op.enabled}
                          busy={busy === `${service.service}/${op.operation}`}
                          unavailable={
                            op.supported
                              ? undefined
                              : "Unavailable — the supplier has no such endpoint"
                          }
                          onChange={(next) =>
                            void toggleOperation(service.service, op.operation, next)
                          }
                        />
                      </td>
                      <td className="px-5 py-3 text-ink-400">
                        {position === undefined || position < 0
                          ? "not routed"
                          : position === 0
                            ? "primary"
                            : `fallback #${position}`}
                      </td>
                      <td className="px-5 py-3">
                        <OperationHealthPill
                          metrics={
                            health?.services
                              .find((s) => s.service === service.service)
                              ?.operations.find((o) => o.operation === op.operation) ??
                            null
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card className="mt-5">
        <SectionHeader title="Record" />
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 px-5 py-4 text-[13px] lg:grid-cols-3">
          {[
            ["Adapter code", provider.code],
            ["Types", provider.types.map(humanise).join(", ")],
            ["Activated", absoluteTime(provider.activatedAt)],
            ["Status changed", `${relativeTime(provider.statusChangedAt)} by ${provider.statusChangedBy ?? "—"}`],
            ["Last updated", absoluteTime(provider.updatedAt)],
            ["Registered", absoluteTime(provider.createdAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-ink-400">{label}</dt>
              <dd className="mt-0.5 text-ink-50">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {dialog?.kind === "enable" && (
        <ConfirmDialog
          title={`Enable ${provider.name}?`}
          description="Traffic resumes as soon as routing allows it."
          confirmLabel="Enable provider"
          variant="primary"
          busy={busy === "status"}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => void changeStatus("ACTIVE", reason)}
        />
      )}

      {(dialog?.kind === "disable" || dialog?.kind === "maintenance") && (
        <ConfirmDialog
          title={
            dialog.kind === "disable"
              ? `Disable ${provider.name}?`
              : `Put ${provider.name} into maintenance?`
          }
          description="Routing stops sending it new requests immediately. No deployment is needed."
          phrase={
            dialog.kind === "disable"
              ? dialog.impact.confirmationPhrase
              : `MAINTENANCE ${provider.name.toUpperCase()}`
          }
          confirmLabel={dialog.kind === "disable" ? "Disable provider" : "Start maintenance"}
          busy={busy === "status"}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(reason, typed) =>
            void changeStatus(
              dialog.kind === "disable" ? "DISABLED" : "MAINTENANCE",
              reason,
              typed,
            )
          }
        >
          <ImpactSummary impact={dialog.impact} />
        </ConfirmDialog>
      )}

      {dialog?.kind === "environment" && (
        <ConfirmDialog
          title={`Switch ${provider.name} to ${dialog.environment}?`}
          description={
            dialog.environment === "production"
              ? "Requests will go to the live supplier account and create real bookings."
              : "Requests will go to the sandbox account."
          }
          phrase={dialog.environment === "production" ? "USE PRODUCTION" : undefined}
          confirmLabel="Switch environment"
          variant={dialog.environment === "production" ? "danger" : "primary"}
          busy={busy === "status"}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            setBusy("status");
            setDialogError(null);
            try {
              await api.patch(`/providers/${slug}/environment`, {
                environment: dialog.environment,
                reason,
              });
              setDialog(null);
              await load();
            } catch (err) {
              setDialogError(errorMessage(err));
            } finally {
              setBusy(null);
            }
          }}
        />
      )}
    </>
  );
}

/** A measured operation status, or an honest absence of one. */
function OperationHealthPill({ metrics }: { metrics: Metrics | null }) {
  if (!metrics || metrics.requests === 0) {
    return <StatusPill status="UNKNOWN" label="No traffic" size="sm" />;
  }
  if (metrics.belowSampleSize) {
    return <StatusPill status="UNKNOWN" label="Too little traffic" size="sm" />;
  }
  return <StatusPill status={metrics.status} size="sm" />;
}

/**
 * What stopping this provider would actually do.
 *
 * Orphaned operations lead, because they are the part that turns a routine
 * change into an outage — and the part an admin is most likely to have
 * forgotten about.
 */
function ImpactSummary({ impact }: { impact: Impact }) {
  if (impact.affected.length === 0) {
    return (
      <p className="text-[13px] text-ink-400">
        This provider is not currently serving any operation, so nothing changes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {impact.orphaned.length > 0 && (
        <div className="rounded-lg border border-critical-500/30 bg-critical-500/10 px-4 py-3">
          <div className="text-[13px] font-semibold text-critical-500">
            {impact.orphaned.length} operation
            {impact.orphaned.length === 1 ? "" : "s"} would have no provider at all
          </div>
          <div className="mt-1 text-[12px] text-critical-500/90">
            {impact.orphaned
              .map((o) => `${humanise(o.service)} ${humanise(o.operation)}`)
              .join(", ")}{" "}
            — every request would fail until something else is routed.
          </div>
        </div>
      )}

      <div className="rounded-lg border border-ink-800 bg-ink-950">
        <div className="border-b border-ink-800 px-4 py-2 text-[12px] font-medium text-ink-400">
          Affected operations
        </div>
        <ul className="divide-y divide-ink-800">
          {impact.affected.map((a) => (
            <li
              key={`${a.service}/${a.operation}`}
              className="flex items-center justify-between px-4 py-2 text-[13px]"
            >
              <span className="text-ink-200">
                {humanise(a.service)} · {humanise(a.operation)}
                {a.wasPrimary && (
                  <span className="ml-2 text-[11px] text-ink-600">primary</span>
                )}
              </span>
              <span
                className={
                  a.fallback.length ? "text-ink-400" : "font-medium text-critical-500"
                }
              >
                {a.fallback.length
                  ? `→ ${a.fallback.map((f) => f.name).join(", ")}`
                  : "no fallback"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
