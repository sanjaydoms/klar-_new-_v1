import type { SupplierCode } from '../../domain/shared/brand.js';
import type { Money } from '../../domain/shared/money.js';
import type { UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import type { Deadline } from '../../suppliers/contract/context.js';
import type { RegisteredSupplier } from '../../suppliers/contract/registry.js';
import type { SupplierHotel, SupplierRate } from '../../suppliers/contract/dto.js';
import type { Clock, IdGenerator, Logger } from '../ports.js';
import { isolateSupplierCall } from '../supplier-isolation.js';
import { supplierContext } from './fanout.js';

/**
 * Fetch bookable rates for suppliers whose search does not return them.
 *
 * RateGain's `bestproperties` gives a lead-in price and no rate key, so a
 * property it found cannot be priced or booked until `getproducts` is called.
 * Calling it for every result would be one HTTP request per hotel and would
 * blow the search deadline several times over.
 *
 * So enrichment is **targeted**: a candidate is only worth a call if its
 * indicative price could beat the bookable price we already hold for that
 * hotel. Everything else keeps its indicative figure, is labelled as such, and
 * costs nothing. This is the difference between "we checked where it mattered"
 * and "we guessed".
 */

export interface EnrichmentCandidate {
  readonly supplier: SupplierCode;
  readonly hotel: SupplierHotel;
  /** Marked-up indicative total, comparable with a bookable price. */
  readonly indicativeTotal: Money;
  /** Best bookable total already held for the same property, if any. */
  readonly incumbentTotal?: Money;
}

export interface EnrichmentBudget {
  /** Hard ceiling on calls for one search. */
  readonly maxCalls: number;
  readonly concurrency: number;
  /** Stop starting new calls once less than this remains of the deadline. */
  readonly minRemainingMs: number;
}

export const DEFAULT_ENRICHMENT_BUDGET: EnrichmentBudget = {
  maxCalls: 12,
  concurrency: 4,
  minRemainingMs: 2_500,
};

export interface EnrichmentInput {
  readonly request: UnifiedHotelSearchRequest;
  readonly candidates: readonly EnrichmentCandidate[];
  readonly suppliersByCode: Map<SupplierCode, RegisteredSupplier>;
  readonly deadline: Deadline;
  readonly signal: AbortSignal;
  readonly budget?: EnrichmentBudget;
}

export interface EnrichmentDeps {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly searchId: ReturnType<IdGenerator['searchId']>;
}

export interface EnrichmentResult {
  /** Rates keyed by `supplier:supplierHotelId`. */
  readonly rates: Map<string, readonly SupplierRate[]>;
  readonly callsIssued: number;
  readonly callsSucceeded: number;
  readonly skipped: number;
}

const key = (supplier: SupplierCode, id: string): string => `${supplier}:${id}`;

/**
 * Candidates worth a call, best prospect first.
 *
 * Ordering only — nothing is excluded, and that is the fix for a money bug.
 * This used to DROP any candidate whose indicative price lost to the cheapest
 * bookable rate held for the same hotel. But the price the customer is shown is
 * not the cheapest rate; under `EQUIVALENT_CLASS_PREFERRED` (ADR-0007 §2.2) it
 * is the cheapest rate that buys *what was searched for*, which is usually
 * dearer — a non-refundable room-only rate is routinely the cheapest and
 * routinely not the winner. So a candidate that would have beaten the FEATURED
 * price was discarded for losing to a rate the customer was never going to be
 * shown, and the page kept a higher price with a cheaper one a call away.
 *
 * An indicative offer carries no room and no board, so it cannot be placed in an
 * equivalence class before it is fetched, and there is no honest bar to compare
 * it against. Ranking without excluding costs at most one wasted call inside a
 * budget that is already capped; excluding cost money.
 */
export function rankCandidates(
  candidates: readonly EnrichmentCandidate[],
): readonly EnrichmentCandidate[] {
  return candidates
    .slice()
    .sort((a, b) => {
      // Hotels with no bookable price at all come first: they are the
      // difference between showing a bookable result and showing none.
      const aHas = a.incumbentTotal !== undefined ? 1 : 0;
      const bHas = b.incumbentTotal !== undefined ? 1 : 0;
      if (aHas !== bHas) return aHas - bHas;
      return a.indicativeTotal.minor - b.indicativeTotal.minor;
    });
}

export async function enrichRates(
  input: EnrichmentInput,
  deps: EnrichmentDeps,
): Promise<EnrichmentResult> {
  const budget = input.budget ?? DEFAULT_ENRICHMENT_BUDGET;
  const ranked = rankCandidates(input.candidates);
  const selected = ranked.slice(0, budget.maxCalls);

  const rates = new Map<string, readonly SupplierRate[]>();
  let callsIssued = 0;
  let callsSucceeded = 0;

  for (let i = 0; i < selected.length; i += budget.concurrency) {
    const remaining = input.deadline.remainingMs(deps.clock.now());
    if (remaining < budget.minRemainingMs || input.signal.aborted) {
      deps.logger.info('enrichment stopped early', {
        searchId: deps.searchId,
        remainingMs: remaining,
        done: callsIssued,
        pending: selected.length - callsIssued,
      });
      break;
    }

    const wave = selected.slice(i, i + budget.concurrency);
    callsIssued += wave.length;

    const settled = await Promise.all(
      wave.map(async (candidate) => {
        const registered = input.suppliersByCode.get(candidate.supplier);
        if (registered === undefined) return null;

        const ctx = supplierContext(
          candidate.supplier,
          {
            deadline: input.deadline.withBudget(
              registered.config.detailTimeoutMs,
              deps.clock.now(),
            ),
            signal: input.signal,
            request: input.request,
          },
          deps,
        );

        // Property-scoped state first: for a two-phase supplier the identifiers
        // the rate call requires arrive with the PROPERTY, and there are no
        // rates on its search results to carry them.
        const carriedState =
          candidate.hotel.supplierState ?? candidate.hotel.rates[0]?.supplierState;

        /**
         * The same barrier the fan-out has, for the same reason.
         *
         * This was a bare `Promise.all` over `getRates` — B-1's construct
         * exactly, one stage later. ADR-0004 says a supplier call resolves
         * rather than rejects, but B-1 established that the guarantee is
         * enforced by the caller and never assumed of every adapter forever:
         * both rate mappers run OUTSIDE `callSupplier`'s parse guard, so one
         * malformed rate on one property — a negative tax line, a total outside
         * the safe-integer range — threw out of `getRates`, rejected this
         * `Promise.all`, and rejected `search()` itself. Every other supplier's
         * results were already in memory and were lost with it, and the
         * customer got a 500 with no `SupplierAttempt` for anyone.
         *
         * Enrichment is an OPTIMISATION on top of a search that already has an
         * answer. It has even less business failing the request than the
         * fan-out does.
         */
        const outcome = await isolateSupplierCall(
          candidate.supplier,
          () =>
            registered.supplier.getRates(
              {
                supplierHotelId: candidate.hotel.supplierHotelId,
                stay: input.request.stay,
                occupancy: input.request.occupancy,
                nationality: input.request.nationality,
                ...(carriedState !== undefined ? { supplierState: carriedState } : {}),
              },
              ctx,
            ),
          deps,
        );

        return { candidate, outcome };
      }),
    );

    for (const entry of settled) {
      if (entry === null) continue;
      if (!entry.outcome.ok) {
        // One property's rates, lost. The hotel keeps its indicative price and
        // is labelled as such, which is what a candidate that was never called
        // gets anyway.
        deps.logger.warn('enrichment call failed; keeping the indicative price', {
          searchId: deps.searchId,
          supplier: String(entry.candidate.supplier),
          supplierHotelId: String(entry.candidate.hotel.supplierHotelId),
          code: entry.outcome.error.code,
        });
        continue;
      }
      const result = entry.outcome.value;
      if (result.status === 'SUCCESS' && result.rates.length > 0) {
        callsSucceeded += 1;
        rates.set(
          key(entry.candidate.supplier, String(entry.candidate.hotel.supplierHotelId)),
          result.rates,
        );
      }
    }
  }

  return {
    rates,
    callsIssued,
    callsSucceeded,
    // Candidates that deserved a call and did not get one. Reported rather than
    // hidden: it is the difference between "no cheaper rate exists" and "we
    // stopped looking".
    skipped: Math.max(0, ranked.length - callsIssued),
  };
}
