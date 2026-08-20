import { AlertTriangle, ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, ErrorNotice, SectionHeader } from "@/components/Primitives";
import { api, errorMessage } from "@/lib/api";
import { humanise } from "@/lib/format";
import type { RoutingDecision } from "@/lib/types";

interface Candidate {
  slug: string;
  name: string;
  code: string;
}

interface RuleDetail extends RoutingDecision {
  candidates: Candidate[];
  failoverConfirmationPhrase: string;
}

/**
 * Service Routing (§18).
 *
 * Editing happens in a drawer against a working copy, committed in one PUT.
 * Reordering providers live, one request per drag, would leave the routing
 * table in intermediate orders that briefly send real traffic somewhere nobody
 * chose.
 */
export function Routing() {
  const [rules, setRules] = useState<RoutingDecision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RuleDetail | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/routing");
      setRules(res.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = async (service: string, operation: string) => {
    try {
      const res = await api.get(`/routing/${service}/${operation}`);
      setEditing(res.data.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !rules) {
    return (
      <>
        <PageHeader title="Service Routing" />
        <ErrorNotice message={error} />
      </>
    );
  }

  const byService = (rules ?? []).reduce<Record<string, RoutingDecision[]>>(
    (acc, rule) => {
      (acc[rule.service] ??= []).push(rule);
      return acc;
    },
    {},
  );

  return (
    <>
      <PageHeader
        title="Service Routing"
        description="Which supplier serves each operation, in what order, and whether the next one is tried."
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      {Object.entries(byService).map(([service, operations]) => (
        <Card key={service} className="mb-5">
          <SectionHeader title={humanise(service)} />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Operation</th>
                  <th className="px-5 py-2.5 font-medium">Primary</th>
                  <th className="px-5 py-2.5 font-medium">Fallbacks</th>
                  <th className="px-5 py-2.5 font-medium">Failover</th>
                  <th className="px-5 py-2.5 font-medium">Excluded</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {operations.map((rule) => (
                  <tr key={rule.operation} className="hover:bg-ink-850/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink-50">
                        {humanise(rule.operation)}
                      </span>
                      {rule.mutating && (
                        <span
                          className="ml-2 text-[11px] text-warn-500"
                          title="Creates or alters a supplier booking — failover is guarded"
                        >
                          booking
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {rule.providers[0] ? (
                        <span className="text-ink-50">{rule.providers[0].name}</span>
                      ) : (
                        <span className="font-medium text-critical-500">nobody</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-400">
                      {rule.providers.slice(1).map((p) => p.name).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {rule.failoverEnabled ? (
                        <span className="text-ok-500">Enabled</span>
                      ) : (
                        <span className="text-ink-600">Disabled</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-ink-600">
                      {rule.excluded.length
                        ? rule.excluded
                            .map((e) => `${e.slug} (${humanise(e.reason)})`)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        onClick={() => void openEditor(rule.service, rule.operation)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {editing && (
        <RuleEditor
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </>
  );
}

/**
 * Editing one operation's routing.
 *
 * The list is the order. Priority numbers are not exposed at all — an admin
 * thinks "RateGain first, TripJack if that fails", and asking them to keep two
 * integers consistent is a way of introducing mistakes.
 */
function RuleEditor({
  rule,
  onClose,
  onSaved,
}: {
  rule: RuleDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [order, setOrder] = useState<Candidate[]>(
    rule.providers.map((p) => ({ slug: p.slug, name: p.name, code: p.code })),
  );
  const [available, setAvailable] = useState<Candidate[]>(rule.candidates);
  const [failover, setFailover] = useState(rule.failoverEnabled);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const move = (index: number, by: number) => {
    const next = [...order];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const remove = (index: number) => {
    const [removed] = order.splice(index, 1);
    setOrder([...order]);
    setAvailable([...available, removed]);
  };

  const add = (candidate: Candidate) => {
    setOrder([...order, candidate]);
    setAvailable(available.filter((c) => c.slug !== candidate.slug));
  };

  // Turning failover ON for a booking-shaped operation is the one change that
  // needs the phrase (§21). Everything else takes a reason and nothing more.
  const needsPhrase = rule.mutating && failover && !rule.failoverEnabled;

  const save = async (reason: string, typed: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/routing/${rule.service}/${rule.operation}`, {
        providers: order.map((p) => ({ providerSlug: p.slug })),
        failoverEnabled: failover,
        reason,
        confirmation: typed || undefined,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  if (confirming) {
    return (
      <ConfirmDialog
        title={`Save routing for ${humanise(rule.service)} ${humanise(rule.operation)}?`}
        description={
          order.length === 0
            ? "No provider will serve this operation. Every request will fail."
            : `${order[0].name} will be tried first.`
        }
        phrase={needsPhrase ? rule.failoverConfirmationPhrase : undefined}
        confirmLabel="Save routing"
        variant={order.length === 0 || needsPhrase ? "danger" : "primary"}
        busy={busy}
        error={error}
        onClose={() => setConfirming(false)}
        onConfirm={(reason, typed) => void save(reason, typed)}
      >
        {needsPhrase && (
          <div className="rounded-lg border border-warn-500/30 bg-warn-500/10 px-4 py-3 text-[13px] text-warn-500">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              This operation creates or alters a supplier booking
            </div>
            <p className="mt-1 text-[12px] text-warn-500/90">
              A timeout does not mean the supplier did nothing. Failing over
              without first establishing what happened can charge a customer
              twice at two different suppliers.
            </p>
          </div>
        )}
      </ConfirmDialog>
    );
  }

  return (
    <ConfirmDialogShell
      title={`${humanise(rule.service)} · ${humanise(rule.operation)}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-200">
            Provider order
          </div>
          {order.length === 0 ? (
            <div className="rounded-lg border border-critical-500/30 bg-critical-500/10 px-4 py-3 text-[13px] text-critical-500">
              Nothing will serve this operation.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {order.map((p, i) => (
                <li
                  key={p.slug}
                  className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950 px-3 py-2"
                >
                  <span className="w-16 text-[12px] text-ink-600">
                    {i === 0 ? "Primary" : `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-[13px] text-ink-50">{p.name}</span>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${p.name} up`}
                    className="rounded p-1 text-ink-400 hover:bg-ink-850 disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1}
                    aria-label={`Move ${p.name} down`}
                    className="rounded p-1 text-ink-400 hover:bg-ink-850 disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    onClick={() => remove(i)}
                    aria-label={`Remove ${p.name}`}
                    className="rounded p-1 text-ink-400 hover:bg-ink-850 hover:text-critical-500"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {available.length > 0 && (
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-200">
              Available
            </div>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => add(c)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-950 px-3 py-1.5 text-[13px] text-ink-200 hover:border-brand-500"
                >
                  <Plus className="size-3.5" />
                  {c.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-600">
              Only providers that implement this operation can be added.
            </p>
          </div>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-ink-800 bg-ink-950 px-3 py-3">
          <input
            type="checkbox"
            checked={failover}
            onChange={(e) => setFailover(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-[13px] font-medium text-ink-200">
              Try the next provider on failure
            </span>
            <span className="mt-0.5 block text-[12px] text-ink-600">
              {rule.mutating
                ? "This operation creates or alters a booking, so enabling this needs a typed confirmation."
                : "Safe for read operations — a failure costs a retry."}
            </span>
          </span>
        </label>

        {error && <ErrorNotice message={error} />}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => setConfirming(true)}>
            Review and save
          </Button>
        </div>
      </div>
    </ConfirmDialogShell>
  );
}

/**
 * The editor's chrome — the shared Modal, minus its own reason/phrase footer,
 * because this step gathers the change and the NEXT step gathers the reason.
 */
function ConfirmDialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      {children}
    </Modal>
  );
}
