/** Presentation helpers. Nothing here decides anything. */

export const relativeTime = (iso?: string | null): string => {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export const absoluteTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString() : "—";

/** "SEARCH" -> "Search", "BOOKING_STATUS" -> "Booking status". */
export const humanise = (value: string): string => {
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const duration = (ms: number): string =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

/**
 * A latency figure, or an honest absence.
 *
 * `Infinity` comes back when a percentile lands in the overflow bucket — the
 * value is genuinely unbounded above, so it is shown as "> 30s" rather than
 * given a number the measurement cannot support.
 */
export const latency = (ms: number | null): string => {
  if (ms === null) return "—";
  if (!Number.isFinite(ms)) return "> 30s";
  return duration(ms);
};

export const percent = (value: number | null): string =>
  value === null ? "—" : `${value}%`;
