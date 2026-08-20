import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, EmptyState, ErrorNotice } from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, duration, humanise } from "@/lib/format";
import type { ApiLogEntry, CorrelationView, Provider } from "@/lib/types";

interface Filters {
  provider: string;
  service: string;
  operation: string;
  result: string;
  failover: boolean;
  requestId: string;
}

const EMPTY: Filters = {
  provider: "",
  service: "",
  operation: "",
  result: "",
  failover: false,
  requestId: "",
};

/**
 * API Logs (§25).
 *
 * One row per ATTEMPT, not per customer action — a search that fell back to a
 * second supplier is two rows. Opening either shows the whole correlation, so
 * the flat list stays scannable while the full story is one click away.
 */
export function ApiLogs() {
  const [logs, setLogs] = useState<ApiLogEntry[] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [catalogue, setCatalogue] = useState<{ service: string; operations: string[] }[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/logs", {
        params: {
          provider: filters.provider || undefined,
          service: filters.service || undefined,
          operation: filters.operation || undefined,
          result: filters.result || undefined,
          failover: filters.failover ? "true" : undefined,
          requestId: filters.requestId || undefined,
          limit: 200,
        },
      });
      setLogs(res.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([api.get("/providers"), api.get("/catalogue")])
      .then(([p, c]) => {
        setProviders(p.data.data);
        setCatalogue(c.data.data);
      })
      .catch(() => {
        // The filter dropdowns degrade to free choice; the log itself still works.
      });
  }, []);

  const operations =
    catalogue.find((s) => s.service === filters.service)?.operations ?? [];
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  return (
    <>
      <PageHeader
        title="API Logs"
        description="Every call KLAR made to a supplier. No payloads and no headers are stored."
        action={
          active ? (
            <Button onClick={() => setFilters(EMPTY)}>
              <X className="size-3.5" />
              Clear filters
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <Select
            label="Provider"
            value={filters.provider}
            onChange={(provider) => setFilters({ ...filters, provider })}
            options={providers.map((p) => ({ value: p.slug, label: p.name }))}
          />
          <Select
            label="Service"
            value={filters.service}
            onChange={(service) => setFilters({ ...filters, service, operation: "" })}
            options={catalogue.map((s) => ({ value: s.service, label: humanise(s.service) }))}
          />
          <Select
            label="Operation"
            value={filters.operation}
            onChange={(operation) => setFilters({ ...filters, operation })}
            options={operations.map((o) => ({ value: o, label: humanise(o) }))}
            disabled={!filters.service}
          />
          <Select
            label="Result"
            value={filters.result}
            onChange={(result) => setFilters({ ...filters, result })}
            options={[
              { value: "success", label: "Succeeded" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <label className="flex items-center gap-2 pb-2 text-[13px] text-ink-200">
            <input
              type="checkbox"
              checked={filters.failover}
              onChange={(e) => setFilters({ ...filters, failover: e.target.checked })}
            />
            Failover only
          </label>
          <label className="ml-auto block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-400">
              Request ID
            </span>
            <input
              value={filters.requestId}
              onChange={(e) => setFilters({ ...filters, requestId: e.target.value })}
              placeholder="TJ-A1B2C3…"
              spellCheck={false}
              className="w-48 rounded-lg border border-ink-800 bg-ink-950 px-3 py-1.5 text-[13px] text-ink-50 outline-none focus:border-brand-500"
            />
          </label>
        </div>
      </Card>

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      <Card>
        {logs && logs.length === 0 ? (
          <EmptyState
            title="No calls match"
            description="Logs are written when a KLAR service calls a supplier. An empty list with no filters means nothing has been called yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Started</th>
                  <th className="px-5 py-2.5 font-medium">Request ID</th>
                  <th className="px-5 py-2.5 font-medium">Provider</th>
                  <th className="px-5 py-2.5 font-medium">Operation</th>
                  <th className="px-5 py-2.5 font-medium">Env</th>
                  <th className="px-5 py-2.5 font-medium">Result</th>
                  <th className="px-5 py-2.5 font-medium">HTTP</th>
                  <th className="px-5 py-2.5 font-medium">Duration</th>
                  <th className="px-5 py-2.5 font-medium">Failover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {(logs ?? []).map((log) => (
                  <tr
                    key={log._id}
                    onClick={() => setOpenId(log.correlationId)}
                    className="cursor-pointer hover:bg-ink-850/50"
                  >
                    <td className="tnum px-5 py-2.5 whitespace-nowrap text-ink-400">
                      {absoluteTime(log.startedAt)}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[12px] text-ink-200">
                      {log.requestId}
                    </td>
                    <td className="px-5 py-2.5 text-ink-50">{log.providerSlug}</td>
                    <td className="px-5 py-2.5 text-ink-400">
                      {humanise(log.service)} · {humanise(log.operation)}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className={
                          log.environment === "production"
                            ? "text-warn-500"
                            : "text-ink-600"
                        }
                      >
                        {log.environment === "production" ? "PROD" : "test"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusPill
                        status={log.success ? "HEALTHY" : "CRITICAL"}
                        label={log.success ? "Success" : humanise(log.outcome)}
                        size="sm"
                      />
                    </td>
                    <td className="tnum px-5 py-2.5 text-ink-400">
                      {log.httpStatus ?? "—"}
                    </td>
                    <td className="tnum px-5 py-2.5 text-ink-400">
                      {duration(log.durationMs)}
                    </td>
                    <td className="px-5 py-2.5 text-ink-400">
                      {log.isFailover ? `from ${log.failedOverFrom ?? "?"}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openId && <CorrelationDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-400">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-1.5 text-[13px] text-ink-50 outline-none focus:border-brand-500 disabled:opacity-50"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * One customer action, end to end (§26, §42).
 *
 * The attempts are shown as a sequence because that is the question being
 * asked: what did KLAR try, in what order, and what finally answered.
 */
function CorrelationDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [view, setView] = useState<CorrelationView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/logs/${encodeURIComponent(id)}`)
      .then((res) => setView(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  return (
    <Modal
      title="Request"
      description={id}
      onClose={onClose}
      width="max-w-3xl"
    >
      {error && <ErrorNotice message={error} />}
      {view && (
        <>
          <div className="mb-4 grid grid-cols-4 gap-4 rounded-lg border border-ink-800 bg-ink-950 px-4 py-3 text-[13px]">
            <Detail label="Started" value={absoluteTime(view.startedAt)} />
            <Detail
              label="Total"
              value={duration(view.totalMs)}
              hint="first attempt to last, not the sum"
            />
            <Detail label="Attempts" value={String(view.attempts.length)} />
            <Detail
              label="Result"
              value={view.succeeded ? `served by ${view.servedBy}` : "no provider answered"}
            />
          </div>

          <ol className="space-y-2">
            {view.attempts.map((attempt, i) => (
              <li
                key={attempt.requestId}
                className={`rounded-lg border px-4 py-3 ${
                  attempt.success
                    ? "border-ok-500/25 bg-ok-500/5"
                    : "border-critical-500/25 bg-critical-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[13px] font-medium text-ink-50">
                    {i + 1}. {attempt.providerSlug} · {humanise(attempt.operation)}
                    {attempt.isFailover && (
                      <span className="ml-2 text-[11px] text-warn-500">
                        failover from {attempt.failedOverFrom ?? "?"}
                      </span>
                    )}
                  </span>
                  <StatusPill
                    status={attempt.success ? "HEALTHY" : "CRITICAL"}
                    label={attempt.success ? "Success" : humanise(attempt.outcome)}
                    size="sm"
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-400">
                  <span className="font-mono">{attempt.requestId}</span>
                  <span>{duration(attempt.durationMs)}</span>
                  {attempt.httpStatus && <span>HTTP {attempt.httpStatus}</span>}
                  <span>{attempt.environment}</span>
                  {attempt.errorReason && (
                    <span className="text-critical-500">{attempt.errorReason}</span>
                  )}
                </div>
                {attempt.summary && (
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink-800 pt-2 text-[12px]">
                    {Object.entries(attempt.summary).map(([key, value]) => (
                      <div key={key}>
                        <dt className="inline text-ink-600">{key}: </dt>
                        <dd className="inline text-ink-200">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ol>

          <p className="mt-4 text-[12px] text-ink-600">
            Request and response payloads are never stored — not masked, absent.
            The fields above are the ones the calling service marked safe.
          </p>
        </>
      )}
    </Modal>
  );
}

function Detail({
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
      <div className="mt-0.5 text-ink-50">{value}</div>
      {hint && <div className="text-[11px] text-ink-600">{hint}</div>}
    </div>
  );
}
