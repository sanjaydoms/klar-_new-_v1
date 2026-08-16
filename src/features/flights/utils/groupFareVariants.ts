/**
 * TripJack returns the same physical flight once per fare group (PUBLISHED,
 * ECO VALUE, PROMO, SME…). The backend normalizer preserves that flattening,
 * so a results list renders near-duplicate cards — same flight, different
 * price — where TripJack's own portal shows ONE card with a fare list.
 *
 * Groups variants by physical identity (flight number + departure and arrival
 * times + stops) and sorts each group cheapest-first, list ordered by that
 * cheapest fare. Field names follow the normalizer's flight shape.
 */
export interface FareVariantGroup<T = any> {
  /** Cheapest variant — safe default for price display and selection. */
  cheapest: T;
  /** All variants, cheapest first. */
  variants: T[];
}

export function groupFareVariants<T extends Record<string, any>>(flights: T[]): FareVariantGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const f of flights) {
    const key = [
      f?.flightNumber ?? '',
      f?.from?.time ?? '',
      f?.to?.time ?? '',
      f?.stops ?? '',
    ].join('|');
    const bucket = map.get(key);
    if (bucket) bucket.push(f);
    else map.set(key, [f]);
  }
  const groups = [...map.values()].map((variants) => {
    const sorted = [...variants].sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0));
    return { cheapest: sorted[0] as T, variants: sorted };
  });
  return groups;
}

/** "2h 10m" -> minutes; unparseable -> Infinity so it never wins "fastest". */
export function durationToMinutes(duration: unknown): number {
  if (typeof duration !== 'string') return Infinity;
  const h = duration.match(/(\d+)\s*h/);
  const m = duration.match(/(\d+)\s*m/);
  if (!h && !m) return Infinity;
  return (h ? parseInt(h[1]!, 10) * 60 : 0) + (m ? parseInt(m[1]!, 10) : 0);
}
