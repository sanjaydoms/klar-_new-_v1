import { BellRing, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field, TextInput, Toggle } from "@/components/Fields";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, EmptyState, ErrorNotice, SectionHeader } from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, duration, humanise, relativeTime } from "@/lib/format";
import type {
  AlertDelivery,
  ChannelOption,
  NotificationTarget,
} from "@/lib/types";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

/**
 * Where KLAR's outages get announced (§44).
 *
 * The channel list and the event list are both fetched, not hard-coded here —
 * a channel added to the backend registry appears with its own fields and no
 * frontend release, which is the whole point of the registry.
 */
export function Alerts() {
  const [targets, setTargets] = useState<NotificationTarget[] | null>(null);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<NotificationTarget | "new" | null>(null);
  const [deleting, setDeleting] = useState<NotificationTarget | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([
        api.get("/alerts/targets"),
        api.get("/alerts/deliveries", { params: { limit: 50 } }),
      ]);
      setTargets(t.data.data);
      setDeliveries(d.data.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
    api
      .get("/alerts/options")
      .then((res) => {
        setChannels(res.data.data.channels);
        setEvents(res.data.data.events);
      })
      .catch(() => {
        // The list still works; only the "add" form needs these.
      });
  }, [load]);

  const runTest = async (target: NotificationTarget) => {
    setTesting(target.id);
    setError(null);
    try {
      const res = await api.post(`/alerts/targets/${target.id}/test`);
      if (!res.data.data.ok) setError(`Test failed: ${res.data.data.detail}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTesting(null);
    }
  };

  const all = targets ?? [];

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Who hears about an outage, and proof of what was sent."
        action={
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus className="size-3.5" />
            Add target
          </Button>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={error} />
        </div>
      )}

      {all.length === 0 && targets && (
        <Card className="mb-5 border-warn-500/30 bg-warn-500/5">
          <div className="flex items-start gap-3 px-5 py-4">
            <BellRing className="mt-0.5 size-4 shrink-0 text-warn-500" />
            <div className="text-[13px]">
              <div className="font-medium text-warn-500">Nobody is being told</div>
              <p className="mt-1 text-ink-400">
                Incidents open themselves, but with no target configured they
                are only visible to somebody already looking at this console.
                An outage at three in the morning would go unnoticed.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <SectionHeader
          title="Targets"
          description="An alert reaches a target only if it subscribed to that event and meets its severity floor."
        />
        {all.length === 0 ? (
          <EmptyState
            title="No targets configured"
            description="Add a webhook — Slack, Teams and most tools accept one — or an email address."
          />
        ) : (
          <ul className="divide-y divide-ink-800">
            {all.map((target) => (
              <li key={target.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-ink-50">
                      {target.name}
                      <span className="rounded bg-ink-850 px-1.5 py-0.5 text-[11px] font-normal text-ink-400">
                        {target.type}
                      </span>
                      {target.unknownChannel && (
                        <StatusPill status="CRITICAL" label="Unknown channel" size="sm" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-400">
                      {target.events.length
                        ? target.events.map(humanise).join(", ")
                        : "no events — nothing will be sent"}
                      {" · "}
                      {target.minSeverity} and above
                    </span>
                  </span>

                  {target.lastDeliveryAt && (
                    <span className="text-right text-[12px] text-ink-600">
                      last {relativeTime(target.lastDeliveryAt)}
                      <br />
                      <span
                        className={
                          target.lastDeliveryOk ? "text-ok-500" : "text-critical-500"
                        }
                      >
                        {target.lastDeliveryOk ? "delivered" : target.lastDeliveryError}
                      </span>
                    </span>
                  )}

                  <StatusPill
                    status={target.enabled ? "ACTIVE" : "DISABLED"}
                    size="sm"
                  />
                  <Button disabled={testing === target.id} onClick={() => void runTest(target)}>
                    <Send className="size-3.5" />
                    {testing === target.id ? "Sending…" : "Test"}
                  </Button>
                  <Button onClick={() => setEditing(target)}>Edit</Button>
                  <Button variant="danger" onClick={() => setDeleting(target)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-5">
        <SectionHeader
          title="Delivery history"
          description="Kept because “we alerted” is a claim. During a post-mortem, “nobody was told” and “somebody was told” are different answers."
        />
        {deliveries.length === 0 ? (
          <EmptyState
            title="Nothing sent yet"
            description="Every attempt appears here, including the ones that failed or were suppressed."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 font-medium">Event</th>
                  <th className="px-5 py-2.5 font-medium">Alert</th>
                  <th className="px-5 py-2.5 font-medium">Target</th>
                  <th className="px-5 py-2.5 font-medium">Result</th>
                  <th className="px-5 py-2.5 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {deliveries.map((d) => (
                  <tr key={d._id} className="hover:bg-ink-850/50">
                    <td className="tnum px-5 py-2.5 whitespace-nowrap text-ink-400">
                      {absoluteTime(d.createdAt)}
                    </td>
                    <td className="px-5 py-2.5 text-ink-400">{humanise(d.event)}</td>
                    <td className="px-5 py-2.5 text-ink-50">
                      {d.title}
                      {d.incidentReference && (
                        <span className="ml-2 font-mono text-[11px] text-ink-600">
                          {d.incidentReference}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-ink-400">{d.targetName}</td>
                    <td className="px-5 py-2.5">
                      <StatusPill
                        status={
                          d.status === "SENT"
                            ? "HEALTHY"
                            : d.status === "SUPPRESSED"
                              ? "WARNING"
                              : "CRITICAL"
                        }
                        label={humanise(d.status)}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-2.5 text-[12px] text-ink-600">
                      {d.detail}
                      {d.durationMs !== undefined && ` · ${duration(d.durationMs)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <TargetEditor
          target={editing === "new" ? null : editing}
          channels={channels}
          events={events}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          description="Alerts will stop reaching this destination."
          confirmLabel="Delete target"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await api.delete(`/alerts/targets/${deleting.id}`);
              setDeleting(null);
              await load();
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        />
      )}
    </>
  );
}

function TargetEditor({
  target,
  channels,
  events,
  onClose,
  onSaved,
}: {
  target: NotificationTarget | null;
  channels: ChannelOption[];
  events: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(target?.type ?? channels[0]?.type ?? "webhook");
  const [name, setName] = useState(target?.name ?? "");
  const [config, setConfig] = useState<Record<string, string>>(target?.config ?? {});
  const [chosen, setChosen] = useState<string[]>(target?.events ?? []);
  const [minSeverity, setMinSeverity] = useState(target?.minSeverity ?? "HIGH");
  const [minInterval, setMinInterval] = useState(target?.minIntervalSeconds ?? 60);
  const [enabled, setEnabled] = useState(target?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channel = channels.find((c) => c.type === type);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        name,
        type,
        config,
        events: chosen,
        minSeverity,
        minIntervalSeconds: minInterval,
        enabled,
      };
      if (target) await api.patch(`/alerts/targets/${target.id}`, body);
      else await api.post("/alerts/targets", body);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={target ? `Edit ${target.name}` : "Add a notification target"}
      onClose={onClose}
      width="max-w-xl"
    >
      <div className="space-y-4">
        <Field label="Name">
          <TextInput
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ops Slack"
          />
        </Field>

        {!target && (
          <Field label="Channel" hint={channel?.description}>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setConfig({});
              }}
              className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-[13px] text-ink-50 outline-none focus:border-brand-500"
            >
              {channels.map((c) => (
                <option key={c.type} value={c.type}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {/* Rendered from the channel's own field list, so a new channel needs
            no change here. */}
        {channel?.fields.map((field) => (
          <Field
            key={field.key}
            label={`${field.label}${field.required ? "" : " (optional)"}`}
            hint={
              field.helpText ??
              (field.type === "secret"
                ? "Stored encrypted. Leave as-is to keep the current value."
                : undefined)
            }
          >
            <TextInput
              value={config[field.key] ?? ""}
              placeholder={field.placeholder}
              spellCheck={false}
              onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
            />
          </Field>
        ))}

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-200">
            Events
          </span>
          <div className="flex flex-wrap gap-2">
            {events.map((event) => (
              <label
                key={event}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[12px] ${
                  chosen.includes(event)
                    ? "bg-brand-500/15 text-brand-400"
                    : "bg-ink-950 text-ink-400 ring-1 ring-ink-800 ring-inset"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={chosen.includes(event)}
                  onChange={() =>
                    setChosen(
                      chosen.includes(event)
                        ? chosen.filter((e) => e !== event)
                        : [...chosen, event],
                    )
                  }
                />
                {humanise(event)}
              </label>
            ))}
          </div>
          {chosen.length === 0 && (
            <p className="mt-1.5 text-[12px] text-warn-500">
              With no events selected this target receives nothing.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum severity">
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value as typeof minSeverity)}
              className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-[13px] text-ink-50 outline-none focus:border-brand-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {humanise(s)} and above
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Minimum interval (seconds)"
            hint="A backstop against a burst nobody predicted."
          >
            <TextInput
              type="number"
              min={0}
              value={String(minInterval)}
              onChange={(e) => setMinInterval(Number(e.target.value))}
            />
          </Field>
        </div>

        <Toggle
          label="Enabled"
          checked={enabled}
          onChange={setEnabled}
        />

        {error && <ErrorNotice message={error} />}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy || !name.trim()}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : target ? "Save changes" : "Add target"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
