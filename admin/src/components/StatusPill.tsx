import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  MinusCircle,
  Wrench,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * The status vocabulary, in one component (§38).
 *
 * Colour is never the only signal: every pill carries an icon AND a word. A
 * red dot alone is unreadable to a colourblind operator and invisible in a
 * screenshot pasted into a chat thread — both of which are exactly how this
 * information travels during an incident.
 */
export type Status =
  | "ACTIVE"
  | "HEALTHY"
  | "WARNING"
  | "DEGRADED"
  | "CRITICAL"
  | "DISABLED"
  | "MAINTENANCE"
  | "UNKNOWN";

const STYLES: Record<
  Status,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircle2,
    className: "text-ok-500 bg-ok-500/10 ring-ok-500/25",
  },
  HEALTHY: {
    label: "Healthy",
    icon: CheckCircle2,
    className: "text-ok-500 bg-ok-500/10 ring-ok-500/25",
  },
  WARNING: {
    label: "Warning",
    icon: AlertTriangle,
    className: "text-warn-500 bg-warn-500/10 ring-warn-500/25",
  },
  DEGRADED: {
    label: "Degraded",
    icon: AlertTriangle,
    className: "text-degraded-500 bg-degraded-500/10 ring-degraded-500/25",
  },
  CRITICAL: {
    label: "Critical",
    icon: XCircle,
    className: "text-critical-500 bg-critical-500/10 ring-critical-500/25",
  },
  DISABLED: {
    label: "Disabled",
    icon: MinusCircle,
    className: "text-ink-400 bg-ink-400/10 ring-ink-400/20",
  },
  MAINTENANCE: {
    label: "Maintenance",
    icon: Wrench,
    className: "text-brand-400 bg-brand-400/10 ring-brand-400/25",
  },
  UNKNOWN: {
    label: "Unknown",
    icon: CircleSlash,
    className: "text-ink-400 bg-ink-400/10 ring-ink-400/20",
  },
};

export function StatusPill({
  status,
  label,
  size = "md",
}: {
  status: Status;
  /** Overrides the default word, e.g. "Not collected" for an unmeasured thing. */
  label?: string;
  size?: "sm" | "md";
}) {
  const style = STYLES[status] ?? STYLES.UNKNOWN;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${
        style.className
      } ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[13px]"}`}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
      {label ?? style.label}
    </span>
  );
}
