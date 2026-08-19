/**
 * Latency histogram buckets, in milliseconds.
 *
 * Percentiles (§22) need a distribution, and storing every sample would mean
 * millions of rows a day for numbers nobody reads at that resolution. Eleven
 * counters per minute give a real p95 and p99 to within one bucket width,
 * which is far tighter than any decision made from them.
 *
 * The boundaries are chosen around what these suppliers actually do: RateGain's
 * bestproperties measures ~10.7s domestic and ~14.2s international, so the
 * interesting resolution is between one and twenty seconds, not below 50ms.
 * The 12s, 15s and 20s boundaries are deliberately close together: because a
 * percentile reports its bucket's UPPER edge, a coarse 15s-30s bucket would
 * report a genuine 20s p95 as 30s and flip a merely slow provider to CRITICAL.
 *
 * CHANGING THESE INVALIDATES COMPARISONS with buckets already stored, because
 * old rows carry counts against the old boundaries. Add a boundary at the end
 * rather than re-cutting the middle.
 */
export const LATENCY_BUCKETS_MS = [
  50, 100, 250, 500, 1_000, 2_000, 4_000, 8_000, 12_000, 15_000, 20_000, 30_000,
] as const;

/** One more slot than boundaries: the last holds everything above the top. */
export const HISTOGRAM_SIZE = LATENCY_BUCKETS_MS.length + 1;

export const bucketFor = (durationMs: number): number => {
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
    if (durationMs <= LATENCY_BUCKETS_MS[i]) return i;
  }
  return LATENCY_BUCKETS_MS.length;
};

/**
 * The percentile value from a histogram.
 *
 * Reports the UPPER boundary of the bucket the percentile falls in — an
 * over-estimate rather than an under-estimate, because a latency figure that
 * quietly flatters the supplier is the one that lets a problem run.
 *
 * The overflow bucket has no upper boundary, so it reports the top boundary
 * with a `+` at the presentation layer; here it returns Infinity so callers
 * cannot mistake it for a measured value.
 */
export const percentileFrom = (
  histogram: number[],
  percentile: number,
): number | null => {
  const total = histogram.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const target = total * percentile;
  let seen = 0;
  for (let i = 0; i < histogram.length; i++) {
    seen += histogram[i];
    if (seen >= target) {
      return i < LATENCY_BUCKETS_MS.length ? LATENCY_BUCKETS_MS[i] : Infinity;
    }
  }
  return Infinity;
};
