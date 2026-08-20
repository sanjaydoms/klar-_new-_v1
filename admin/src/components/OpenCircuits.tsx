import { ZapOff } from "lucide-react";

import { Card, SectionHeader } from "./Primitives";
import { StatusPill } from "./StatusPill";
import { humanise, relativeTime } from "@/lib/format";
import type { CircuitState } from "@/lib/types";

/**
 * Suppliers a calling process has taken out of rotation (§46).
 *
 * Shows WHICH PROCESS reported it and how long ago, because the state is a
 * claim made by a service instance rather than a fact this dashboard observed.
 * Two instances can legitimately disagree during a partial outage, and an
 * operator seeing "one of three instances has RateGain open" is looking at
 * something quite different from all three agreeing.
 */
export function OpenCircuits({ circuits }: { circuits: CircuitState[] }) {
  if (!circuits.length) return null;

  return (
    <Card className="mt-5 border-degraded-500/30 bg-degraded-500/5">
      <SectionHeader
        title="Circuits open"
        description="These suppliers are being skipped. Traffic resumes automatically once probes succeed."
      />
      <ul className="divide-y divide-ink-800">
        {circuits.map((c) => (
          <li
            key={`${c.providerSlug}/${c.service}/${c.operation}/${c.reportedBy}`}
            className="flex items-center gap-4 px-5 py-3 text-[13px]"
          >
            <ZapOff className="size-4 shrink-0 text-degraded-500" />
            <span className="font-medium text-ink-50">
              {c.providerSlug} · {humanise(c.service)} {humanise(c.operation)}
            </span>
            <StatusPill
              status={c.state === "OPEN" ? "DEGRADED" : "WARNING"}
              label={c.state === "OPEN" ? "Open" : "Probing"}
              size="sm"
            />
            <span className="flex-1 text-ink-400">
              {c.lastReason ?? "repeated failures"}
              {c.consecutiveFailures > 0 && (
                <span className="text-ink-600"> · {c.consecutiveFailures} in a row</span>
              )}
            </span>
            <span className="text-right text-[12px] text-ink-600">
              open {relativeTime(c.since)}
              <br />
              reported by {c.reportedBy}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
