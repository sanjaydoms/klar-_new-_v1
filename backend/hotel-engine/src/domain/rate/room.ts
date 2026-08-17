/**
 * Room category, normalised.
 *
 * Part of the equivalence class: a Deluxe room on one supplier should compete
 * with a Deluxe room on another, not with a Standard one that happens to be
 * cheaper. Suppliers name rooms freely ("Superior Double Room with Sea View"),
 * so classification is a bucket, not a parse.
 */
export type RoomCategory =
  | 'DORM'
  | 'STANDARD'
  | 'SUPERIOR'
  | 'DELUXE'
  | 'PREMIUM'
  | 'EXECUTIVE'
  | 'SUITE'
  | 'VILLA'
  | 'APARTMENT'
  | 'MIXED'      // multi-room options a supplier bundles as one offer
  | 'UNKNOWN';

export interface Room {
  readonly name: string;
  readonly category: RoomCategory;
  readonly code?: string;
  readonly bedConfig?: string;
  readonly maxOccupancy?: number;
}

/**
 * Ordered most-specific first: "Junior Suite" must classify as SUITE before
 * anything else claims it, and "Presidential Villa" as VILLA rather than
 * PREMIUM.
 */
const PATTERNS: ReadonlyArray<readonly [RegExp, RoomCategory]> = [
  [/\b(dorm|dormitory|shared\s+room|bunk)\b/i, 'DORM'],
  [/\b(villa|bungalow|cottage|chalet)\b/i, 'VILLA'],
  [/\b(apartment|apt|studio|residence|serviced)\b/i, 'APARTMENT'],
  [/\b(suite|penthouse)\b/i, 'SUITE'],
  [/\b(executive|club\s+room|business\s+room)\b/i, 'EXECUTIVE'],
  [/\b(premium|premier|luxury|grand)\b/i, 'PREMIUM'],
  [/\b(deluxe|delux)\b/i, 'DELUXE'],
  [/\b(superior)\b/i, 'SUPERIOR'],
  [/\b(standard|classic|basic|economy|budget)\b/i, 'STANDARD'],
];

export function classifyRoom(name: string | null | undefined): RoomCategory {
  const n = (name ?? '').trim();
  if (!n) return 'UNKNOWN';
  for (const [pattern, category] of PATTERNS) {
    if (pattern.test(n)) return category;
  }
  return 'UNKNOWN';
}

export function room(input: {
  name: string;
  code?: string;
  bedConfig?: string;
  maxOccupancy?: number;
  category?: RoomCategory;
}): Room {
  return {
    name: input.name,
    category: input.category ?? classifyRoom(input.name),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.bedConfig !== undefined ? { bedConfig: input.bedConfig } : {}),
    ...(input.maxOccupancy !== undefined ? { maxOccupancy: input.maxOccupancy } : {}),
  };
}
