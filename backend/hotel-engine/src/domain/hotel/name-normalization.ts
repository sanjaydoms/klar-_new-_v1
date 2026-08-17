/**
 * Name normalisation and similarity for the matcher.
 *
 * The reference implementation compared names by substring containment, gated
 * only on the shorter string exceeding five characters. That merges "Marriott"
 * into "Marriott Executive Apartments" — two different properties, often on the
 * same street.
 *
 * Token-set similarity does not have that failure mode: the extra tokens in the
 * longer name count against the match instead of being ignored.
 */

const LEGAL_SUFFIXES = new Set([
  'ltd', 'limited', 'llc', 'inc', 'pvt', 'private', 'co', 'corp', 'plc', 'gmbh', 'sa', 'bv',
]);

/**
 * Words that carry no distinguishing power in a hotel name. Dropping them stops
 * "Hotel Grand" and "Grand Hotel" from being treated as different, and stops
 * "The Hotel" and "Hotel" from being treated as a match on nothing.
 */
const STOP_WORDS = new Set([
  'hotel', 'hotels', 'resort', 'resorts', 'the', 'and', 'a', 'an', 'of', 'at', 'by',
  'inn', 'suites', 'suite', 'lodge', 'guesthouse', 'guest', 'house', 'apartments',
  'apartment', 'villa', 'villas', 'hostel', 'motel', 'spa', 'palace',
]);

/** NFD splits "é" into "e" + a combining mark; \p{M} then drops the mark. */
const deaccent = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '');

/** Lower-cased, de-accented, punctuation collapsed to single spaces. */
export function normalizeName(raw: string): string {
  return deaccent(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Distinguishing tokens only.
 *
 * If stripping stop-words would leave nothing — "The Hotel", "Villa" — the full
 * token set is returned instead. An empty set would otherwise compare equal to
 * every other empty set and merge every generically-named property in a city.
 */
export function significantTokens(raw: string): string[] {
  const all = normalizeName(raw).split(' ').filter(Boolean);
  const kept = all.filter(
    (t) => !STOP_WORDS.has(t) && !LEGAL_SUFFIXES.has(t) && t.length > 1,
  );
  return kept.length > 0 ? kept : all;
}

/**
 * Jaccard similarity over significant tokens, in [0,1].
 *
 * Symmetric, and — unlike containment — penalised by tokens present in one name
 * and absent from the other.
 */
export function nameSimilarity(a: string, b: string): number {
  const setA = new Set(significantTokens(a));
  const setB = new Set(significantTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared += 1;

  const union = setA.size + setB.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Thresholds the matcher gates on. Deliberately high: the cost of a false merge
 * is a customer arriving at the wrong hotel.
 */
export const NAME_SIMILARITY = {
  /** Tier 3 — merge and persist the mapping. */
  HIGH: 0.85,
  /** Tier 4 — merge, but flag for review. */
  MEDIUM: 0.65,
} as const;

/** Address token overlap, an independent corroborating signal. */
export function addressOverlap(a: string | undefined, b: string | undefined): number {
  if (!a || !b) return 0;
  const setA = new Set(normalizeName(a).split(' ').filter((t) => t.length > 2));
  const setB = new Set(normalizeName(b).split(' ').filter((t) => t.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared += 1;
  return shared / Math.min(setA.size, setB.size);
}
