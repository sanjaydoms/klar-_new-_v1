/**
 * Meal plan, normalised.
 *
 * Comparability depends on this being a closed set. Suppliers describe the same
 * plan a dozen ways ("LUNCH INCLUDED", "HB", "Half Board", "Bed & Breakfast"),
 * and the reference implementation compared the raw strings — or, more often,
 * did not compare them at all, which is how a room-only rate could win against
 * a breakfast-inclusive one and be labelled cheaper.
 */
export type BoardCode =
  | 'RO'   // room only
  | 'BB'   // bed & breakfast
  | 'HB'   // half board
  | 'FB'   // full board
  | 'AI'   // all inclusive
  | 'UNKNOWN';

/**
 * What to call each plan on a filter panel.
 *
 * `Board.label` is one supplier's wording for one rate — "BED AND BREAKFAST"
 * from RateGain, "Bed and Breakfast" from TripJack — so it cannot name a facet
 * that aggregates across both. Without a canonical name the facet fell back to
 * the code itself and the customer was offered a filter called "BB".
 */
const BOARD_LABEL: Readonly<Record<BoardCode, string>> = {
  RO: 'Room only',
  BB: 'Breakfast included',
  HB: 'Half board',
  FB: 'Full board',
  AI: 'All inclusive',
  UNKNOWN: 'Not specified',
};

export const boardLabel = (code: BoardCode): string => BOARD_LABEL[code];

export interface Board {
  readonly code: BoardCode;
  /** The supplier's own wording, preserved for display. */
  readonly label: string;
}

/**
 * Richness order, used only as a deterministic tiebreak — never to justify
 * treating one board as a substitute for another.
 */
const RICHNESS: Readonly<Record<BoardCode, number>> = {
  AI: 5, FB: 4, HB: 3, BB: 2, RO: 1, UNKNOWN: 0,
};

export const boardRichness = (c: BoardCode): number => RICHNESS[c];

const PATTERNS: ReadonlyArray<readonly [RegExp, BoardCode]> = [
  [/\ball[\s-]?inclusive\b|^ai$/i, 'AI'],
  [/\bfull[\s-]?board\b|^fb$/i, 'FB'],
  [/\bhalf[\s-]?board\b|^hb$/i, 'HB'],
  [/\b(bed\s*(and|&)\s*breakfast|breakfast)\b|^bb$/i, 'BB'],
  [/\b(room\s*only|no\s*meals?)\b|^(ro|ep)$/i, 'RO'],
];

/**
 * Classify a supplier's board string.
 *
 * Returns UNKNOWN rather than guessing. An unrecognised plan forms its own
 * equivalence class, so it is still offered to the customer but never silently
 * compared against a plan we do understand.
 */
export function classifyBoard(raw: string | null | undefined): Board {
  const label = (raw ?? '').trim();
  if (!label) return { code: 'UNKNOWN', label: '' };

  for (const [pattern, code] of PATTERNS) {
    if (pattern.test(label)) return { code, label };
  }
  return { code: 'UNKNOWN', label };
}
