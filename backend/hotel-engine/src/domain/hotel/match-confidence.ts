/**
 * How sure we are that two supplier properties are the same hotel.
 *
 * The governing rule, from the brief: a false merge is worse than a duplicate.
 * Merging two different hotels shows a customer a price for a property they
 * will not be staying in. Showing the same hotel twice is untidy. The ladder
 * below is therefore biased toward refusing to merge.
 *
 * The reference implementation had no ladder at all: 100 m proximity plus a
 * substring name test, one boolean, no record of why. "Marriott" is a substring
 * of "Marriott Executive Apartments", so it merged two different properties and
 * left nothing behind to audit.
 */
export type MatchConfidence =
  /** A persisted, previously-resolved mapping. The only tier we fully trust. */
  | 'EXACT_SUPPLIER_MAPPING'
  /** Multiple independent signals agree strongly. Merge, and persist the mapping. */
  | 'HIGH_CONFIDENCE'
  /** Signals agree, but weakly enough to be worth a human look. Merge, flag. */
  | 'MEDIUM_CONFIDENCE'
  /** Something matched, not enough. Do NOT merge; queue for review. */
  | 'LOW_CONFIDENCE'
  /** No candidate at all. The property stands alone. */
  | 'UNMATCHED';

/** What actually produced a match. Persisted so a bad rule can be found later. */
export type MatchSignal =
  | 'PERSISTED_MAPPING'
  | 'EXTERNAL_ID'          // GIATA or equivalent — reserved, see ADR-0000 §7
  | 'CHAIN_PROPERTY_CODE'
  | 'NORMALIZED_NAME'
  | 'PROXIMITY'
  | 'ADDRESS_TOKENS'
  | 'STAR_RATING'
  | 'CITY';

const MERGEABLE: ReadonlySet<MatchConfidence> = new Set<MatchConfidence>([
  'EXACT_SUPPLIER_MAPPING',
  'HIGH_CONFIDENCE',
  'MEDIUM_CONFIDENCE',
]);

/** The single gate. Nothing merges without passing through here. */
export function isMergeable(c: MatchConfidence): boolean {
  return MERGEABLE.has(c);
}

/** Tiers worth writing back to supplier_property_mapping. */
export function shouldPersistMapping(c: MatchConfidence): boolean {
  return c === 'HIGH_CONFIDENCE' || c === 'MEDIUM_CONFIDENCE';
}

/** Tiers an operator should review. */
export function needsReview(c: MatchConfidence): boolean {
  return c === 'MEDIUM_CONFIDENCE' || c === 'LOW_CONFIDENCE';
}

const RANK: Readonly<Record<MatchConfidence, number>> = {
  EXACT_SUPPLIER_MAPPING: 4,
  HIGH_CONFIDENCE: 3,
  MEDIUM_CONFIDENCE: 2,
  LOW_CONFIDENCE: 1,
  UNMATCHED: 0,
};

export const confidenceRank = (c: MatchConfidence): number => RANK[c];

/**
 * A merged hotel is only as trustworthy as its weakest constituent match.
 * Reporting the best would let one confident supplier launder an uncertain one.
 */
export function weakest(confidences: readonly MatchConfidence[]): MatchConfidence {
  let worst: MatchConfidence = 'EXACT_SUPPLIER_MAPPING';
  for (const c of confidences) {
    if (RANK[c] < RANK[worst]) worst = c;
  }
  return confidences.length === 0 ? 'UNMATCHED' : worst;
}

/**
 * Independent signals required before any merge is allowed.
 *
 * Two, always. Coordinates alone never merge (suppliers routinely return a
 * shared city-centre pin for properties with no geocode). A name alone never
 * merges (chains repeat names across a city).
 */
export const MIN_INDEPENDENT_SIGNALS = 2;

export function hasEnoughSignals(signals: readonly MatchSignal[]): boolean {
  if (signals.includes('PERSISTED_MAPPING') || signals.includes('EXTERNAL_ID')) return true;
  return new Set(signals).size >= MIN_INDEPENDENT_SIGNALS;
}
