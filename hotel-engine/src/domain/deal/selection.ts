import { invariant } from '../shared/errors.js';
import type { BoardCode } from '../rate/board.js';
import { boardRichness } from '../rate/board.js';
import { refundTierRank } from '../rate/cancellation.js';
import { comparePrices } from '../pricing/customer-price.js';
import type { SupplierDeal } from './supplier-deal.js';
import type { EquivalenceGroup } from './equivalence.js';
import { groupByEquivalence, groupMatchesRequest } from './equivalence.js';

/**
 * How the featured deal is chosen.
 *
 * EQUIVALENT_CLASS_PREFERRED is the default (ADR-0000 §1): compare within
 * comparable products, feature the winner of the class the customer asked for.
 * ABSOLUTE_CHEAPEST is available, but as a stated business decision rather than
 * an accident of the code — the brief is emphatic that it must not be silent.
 */
export type SelectionPolicy = 'EQUIVALENT_CLASS_PREFERRED' | 'ABSOLUTE_CHEAPEST';

export interface SelectionRequest {
  readonly policy: SelectionPolicy;
  /** Signature of the occupancy the customer searched for. */
  readonly requestedOccupancy: string;
  readonly preferredBoard?: BoardCode;
  /**
   * Higher is better. Breaks exact price ties before falling back to supplier
   * code, so a flaky supplier does not win a coin toss. Absent ⇒ 0.
   */
  readonly supplierReliability?: Readonly<Record<string, number>>;
}

export interface DealSelection {
  readonly featured: SupplierDeal;
  /** Every group's winner except the featured one — the real "other rates". */
  readonly alternatives: readonly SupplierDeal[];
  readonly groups: readonly EquivalenceGroup[];
  readonly featuredGroupKey: string;
  readonly policy: SelectionPolicy;
}

/**
 * Total order over deals. Fully deterministic: every comparison ends in a
 * `dealId` tiebreak, so the same input always yields the same winner. Without
 * that, a page refresh could reorder equal-priced deals and the "cheapest"
 * badge would appear to move on its own.
 */
function compareDeals(
  a: SupplierDeal,
  b: SupplierDeal,
  reliability: Readonly<Record<string, number>>,
): number {
  const byPrice = comparePrices(a.price, b.price);
  if (byPrice !== 0) return byPrice;

  const byRefund =
    refundTierRank(b.cancellation.tier) - refundTierRank(a.cancellation.tier);
  if (byRefund !== 0) return byRefund;

  const byBoard = boardRichness(b.board.code) - boardRichness(a.board.code);
  if (byBoard !== 0) return byBoard;

  const byReliability = (reliability[b.supplier] ?? 0) - (reliability[a.supplier] ?? 0);
  if (byReliability !== 0) return byReliability;

  const bySupplier = a.supplier.localeCompare(b.supplier);
  if (bySupplier !== 0) return bySupplier;

  return a.dealId.localeCompare(b.dealId);
}

function cheapestOf(
  deals: readonly SupplierDeal[],
  reliability: Readonly<Record<string, number>>,
): SupplierDeal {
  invariant(deals.length > 0, 'SELECTION_EMPTY', 'Cannot select from an empty deal set');
  let best = deals[0] as SupplierDeal;
  for (let i = 1; i < deals.length; i++) {
    const candidate = deals[i] as SupplierDeal;
    if (compareDeals(candidate, best, reliability) < 0) best = candidate;
  }
  return best;
}

/**
 * Pick the featured deal and expose the rest.
 *
 * `alternatives` holds one winner per remaining equivalence class, not every
 * deal — showing a customer six near-identical rates is noise. The full set
 * stays reachable through `groups`.
 */
export function selectFeaturedDeal(
  deals: readonly SupplierDeal[],
  request: SelectionRequest,
): DealSelection {
  invariant(
    deals.length > 0,
    'SELECTION_EMPTY',
    'A merged hotel must carry at least one deal',
  );

  const reliability = request.supplierReliability ?? {};
  const groups = groupByEquivalence(deals);

  if (request.policy === 'ABSOLUTE_CHEAPEST') {
    const featured = cheapestOf(deals, reliability);
    const featuredGroupKey =
      groups.find((g) => g.deals.some((d) => d.dealId === featured.dealId))?.keyString ?? '';
    return {
      featured,
      alternatives: groups
        .filter((g) => g.keyString !== featuredGroupKey)
        .map((g) => cheapestOf(g.deals, reliability)),
      groups,
      featuredGroupKey,
      policy: request.policy,
    };
  }

  // Winner of each comparable group, then the group best matching the request.
  const winners = groups.map((g) => ({
    group: g,
    winner: cheapestOf(g.deals, reliability),
    score: groupMatchesRequest(g, request.requestedOccupancy, request.preferredBoard),
  }));

  const eligible = winners.filter((w) => w.score >= 0);
  // Nothing matched the requested occupancy — every rate is for a different
  // party size. Rather than pretend, fall back to the cheapest overall and let
  // the caller see the mismatch through `featuredGroupKey`.
  const pool = eligible.length > 0 ? eligible : winners;

  let best = pool[0] as (typeof pool)[number];
  for (let i = 1; i < pool.length; i++) {
    const candidate = pool[i] as (typeof pool)[number];
    if (candidate.score > best.score) {
      best = candidate;
      continue;
    }
    if (
      candidate.score === best.score &&
      compareDeals(candidate.winner, best.winner, reliability) < 0
    ) {
      best = candidate;
    }
  }

  return {
    featured: best.winner,
    alternatives: winners
      .filter((w) => w.group.keyString !== best.group.keyString)
      .map((w) => w.winner),
    groups,
    featuredGroupKey: best.group.keyString,
    policy: request.policy,
  };
}
