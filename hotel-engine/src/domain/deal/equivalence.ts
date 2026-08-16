import type { BoardCode } from '../rate/board.js';
import type { RefundTier } from '../rate/cancellation.js';
import type { RoomCategory } from '../rate/room.js';
import { occupancySignature } from '../rate/occupancy.js';
import type { SupplierDeal } from './supplier-deal.js';

/**
 * What makes two offers commercially the same product.
 *
 * The brief is explicit that a cheaper rate must not win unless it is
 * comparable: a non-refundable room-only rate at ₹11,500 is not a better deal
 * than a refundable breakfast-inclusive rate at ₹12,000, it is a different
 * product. The reference implementation compared on price alone and had no
 * concept of comparability at all (D-2).
 *
 * Grouping first, then choosing a winner within each group, makes the rule
 * explicit and auditable — and leaves every losing group's winner available as
 * a genuine alternative rate rather than discarding it.
 */
export interface EquivalenceKey {
  readonly occupancy: string;
  readonly board: BoardCode;
  readonly refundTier: RefundTier;
  readonly roomCategory: RoomCategory;
}

export function equivalenceKeyOf(deal: SupplierDeal): EquivalenceKey {
  return {
    occupancy: occupancySignature(deal.occupancy),
    board: deal.board.code,
    refundTier: deal.cancellation.tier,
    roomCategory: deal.room.category,
  };
}

/** Stable string form, used as a map key and echoed in the API response. */
export function equivalenceKeyString(k: EquivalenceKey): string {
  return `${k.occupancy}|${k.board}|${k.refundTier}|${k.roomCategory}`;
}

export const dealEquivalenceKey = (deal: SupplierDeal): string =>
  equivalenceKeyString(equivalenceKeyOf(deal));

export interface EquivalenceGroup {
  readonly key: EquivalenceKey;
  readonly keyString: string;
  readonly deals: readonly SupplierDeal[];
}

/**
 * Partition deals into comparable groups, preserving input order within each so
 * that selection stays deterministic for equal prices.
 */
export function groupByEquivalence(deals: readonly SupplierDeal[]): EquivalenceGroup[] {
  const groups = new Map<string, { key: EquivalenceKey; deals: SupplierDeal[] }>();

  for (const deal of deals) {
    const key = equivalenceKeyOf(deal);
    const keyString = equivalenceKeyString(key);
    const existing = groups.get(keyString);
    if (existing) {
      existing.deals.push(deal);
    } else {
      groups.set(keyString, { key, deals: [deal] });
    }
  }

  return [...groups.entries()].map(([keyString, g]) => ({
    key: g.key,
    keyString,
    deals: g.deals,
  }));
}

/**
 * How closely a group matches what the customer actually searched for.
 *
 * Occupancy must match — a rate for different occupancy is not an answer to the
 * question asked. Board and refundability are preferences, scored so that the
 * featured deal lands on the product the customer was looking at rather than on
 * whatever happened to be cheapest.
 */
export function groupMatchesRequest(
  group: EquivalenceGroup,
  requestedOccupancy: string,
  preferredBoard?: BoardCode,
): number {
  if (group.key.occupancy !== requestedOccupancy) return -1;
  let score = 1;
  if (preferredBoard !== undefined && group.key.board === preferredBoard) score += 2;
  if (group.key.refundTier === 'REFUNDABLE') score += 1;
  return score;
}
