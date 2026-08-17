import type { SupplierCode } from '../../domain/shared/brand.js';
import type { SupplierAttempt } from '../../domain/search/result.js';
import type { UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import type { Deadline, SupplierContext } from '../../suppliers/contract/context.js';
import type { RegisteredSupplier } from '../../suppliers/contract/registry.js';
import type { SupplierSearchResult, SupplierSearchTarget } from '../../suppliers/contract/dto.js';
import type { Clock, IdGenerator, Logger } from '../ports.js';
import { isolateSupplierCall } from '../supplier-isolation.js';

/**
 * Ask every eligible supplier the same question, at the same time, under one
 * absolute deadline.
 *
 * Two rules from ADR-0003 shape this:
 *
 *  - **A supplier is never cancelled because another one finished.** Waiting
 *    for the slower supplier is the entire point of a price comparison; the
 *    reference returned as soon as it held one hotel and called the result the
 *    cheapest available.
 *  - **Failure is recorded, not swallowed.** Every supplier produces a
 *    `SupplierAttempt` whether it answered or not, which is what lets the
 *    response say honestly that a supplier was never heard from.
 */

export interface FanoutInput {
  readonly request: UnifiedHotelSearchRequest;
  readonly suppliers: readonly RegisteredSupplier[];
  readonly targets: Map<SupplierCode, SupplierSearchTarget | null>;
  readonly deadline: Deadline;
  readonly signal: AbortSignal;
}

export interface FanoutDeps {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly searchId: ReturnType<IdGenerator['searchId']>;
}

export interface FanoutResult {
  readonly results: readonly SupplierSearchResult[];
  readonly attempts: readonly SupplierAttempt[];
}

function notEligible(supplier: SupplierCode, reason: string): SupplierAttempt {
  return {
    supplier,
    status: 'NOT_ELIGIBLE',
    durationMs: 0,
    hotelsReturned: 0,
    dealsReturned: 0,
    supplierPagesConsumed: 0,
    errorCode: reason,
  };
}

export function supplierContext(
  supplier: SupplierCode,
  input: { deadline: Deadline; signal: AbortSignal; request: UnifiedHotelSearchRequest },
  deps: FanoutDeps,
): SupplierContext {
  return {
    supplier,
    searchId: deps.searchId,
    correlationId: deps.ids.correlationId(),
    deadline: input.deadline,
    signal: input.signal,
    logger: deps.logger.child({ supplier, searchId: deps.searchId }),
    currency: input.request.currency,
  };
}

export async function fanOut(input: FanoutInput, deps: FanoutDeps): Promise<FanoutResult> {
  const results: SupplierSearchResult[] = [];
  const attempts: SupplierAttempt[] = [];

  const runnable: RegisteredSupplier[] = [];
  for (const registered of input.suppliers) {
    const target = input.targets.get(registered.config.code) ?? null;

    if (registered.config.maintenanceMode) {
      attempts.push({ ...notEligible(registered.config.code, 'MAINTENANCE'), status: 'DISABLED' });
      continue;
    }
    // A supplier with no mapping for this destination, or one that cannot
    // accept this target shape, is not a hole in the comparison — it simply
    // does not serve the question.
    if (target === null) {
      attempts.push(notEligible(registered.config.code, 'NO_DESTINATION_MAPPING'));
      continue;
    }
    if (!registered.supplier.capabilities.searchTargets.includes(target.kind)) {
      attempts.push(notEligible(registered.config.code, 'UNSUPPORTED_TARGET'));
      continue;
    }
    runnable.push(registered);
  }


  const settled = await Promise.all(
    runnable.map((registered) => runOne(registered, input, deps)),
  );

  for (const { result, attempt } of settled) {
    results.push(result);
    attempts.push(attempt);
  }

  deps.logger.info('supplier fan-out complete', {
    searchId: deps.searchId,
    attempts: attempts.map((a) => `${a.supplier}:${a.status}:${a.durationMs}ms:${a.hotelsReturned}`),
  });

  return { results, attempts };
}

/**
 * One supplier's search, and the barrier that keeps it one supplier's problem.
 *
 * ADR-0003 §3 says a supplier call never rejects: every contract method
 * resolves with a status. That is a promise the contract makes, and it held for
 * both adapters — but it is not a promise the fan-out can verify, and
 * `Promise.all` rejects on the first rejection. An adapter that threw anyway
 * (a malformed payload reaching a domain constructor is the realistic route)
 * would have taken every OTHER supplier's results down with it, and recorded no
 * attempt for anyone — the search failing whole, rather than one supplier being
 * reported as unavailable.
 *
 * So the guarantee is enforced here rather than assumed: a throw becomes this
 * supplier's ERROR attempt, and the comparison proceeds with whoever answered.
 */
async function runOne(
  registered: RegisteredSupplier,
  input: FanoutInput,
  deps: FanoutDeps,
): Promise<{ result: SupplierSearchResult; attempt: SupplierAttempt }> {
  const code = registered.config.code;

  const outcome = await isolateSupplierCall(
    code,
    async () => {
      const target = input.targets.get(code) as SupplierSearchTarget;

      // Each supplier gets its own budget, clamped to what is left of the
      // search deadline. `withBudget` can only move a deadline nearer, so a
      // supplier can never outlive the search that asked for it.
      const ctx = supplierContext(
        code,
        {
          deadline: input.deadline.withBudget(
            registered.config.searchTimeoutMs,
            deps.clock.now(),
          ),
          signal: input.signal,
          request: input.request,
        },
        deps,
      );

      return registered.supplier.search(
        {
          target,
          stay: input.request.stay,
          occupancy: input.request.occupancy,
          nationality: input.request.nationality,
          page: input.request.page.page,
          pageSize: registered.supplier.capabilities.pageSize,
        },
        ctx,
      );
    },
    deps,
  );

  if (!outcome.ok) {
    return {
      result: {
        supplier: code,
        status: 'ERROR',
        hotels: [],
        pageInfo: { hasMore: false, supplierPagesConsumed: 0 },
        responseTimeMs: outcome.durationMs,
        error: outcome.error,
      },
      attempt: {
        supplier: code,
        status: 'ERROR',
        durationMs: outcome.durationMs,
        hotelsReturned: 0,
        dealsReturned: 0,
        supplierPagesConsumed: 0,
        errorCode: outcome.error.code,
        retryable: false,
      },
    };
  }

  const result = outcome.value;
  return {
    result,
    attempt: {
      supplier: code,
      status: result.status,
      durationMs: result.responseTimeMs,
      hotelsReturned: result.hotels.length,
      dealsReturned: result.hotels.reduce((n, h) => n + h.rates.length, 0),
      supplierPagesConsumed: result.pageInfo.supplierPagesConsumed,
      ...(result.error !== undefined
        ? { errorCode: result.error.code, retryable: result.error.retryable }
        : {}),
    },
  };
}
