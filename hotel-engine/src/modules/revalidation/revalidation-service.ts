import type { DealId } from '../../domain/shared/brand.js';
import type { CustomerPrice } from '../../domain/pricing/customer-price.js';
import type { SupplierAttempt } from '../../domain/search/result.js';
import {
  canProceedWithoutConsent,
  chargeableAfter,
  revalidate,
  type PriceTolerance,
  type RevalidationOutcome,
} from '../../domain/revalidation/revalidation.js';
import type { RevalidationReport } from '../../domain/revalidation/revalidation-report.js';
import { deadlineIn } from '../../suppliers/contract/context.js';
import type { SupplierRegistry } from '../../suppliers/contract/registry.js';
import type { SupplierPrecheckResult, SupplierRate } from '../../suppliers/contract/dto.js';
import type { Clock, IdGenerator, Logger, RateTokenStore, SealedQuote } from '../ports.js';
import { PricingService, type PricingScope } from '../pricing/pricing-service.js';
import { isolateSupplierCall } from '../supplier-isolation.js';

/**
 * Ask the supplier to honour a quote, and say plainly what changed.
 *
 * This is the gate between "a price we showed" and "a price we charge", and the
 * whole design turns on one thing: **the quote is read, never recomputed.**
 * Everything the comparison needs was sealed when the deal was issued — the
 * stay, the party, the room, the board, the cancellation terms, the customer
 * price and the pricing scope that produced it. Re-deriving any of it here
 * would move the customer's price whenever a markup rule or a resolved region
 * changed, which is D-1 wearing a different hat: quoted one number, charged
 * another, for a reason the supplier had nothing to do with.
 *
 * The fresh side is priced through the same engine with the SEALED scope, so
 * the only thing that can differ between the two figures is the supplier's own
 * cost. That is the point of the exercise.
 */
export interface RevalidationConfig {
  readonly deadlineMs: number;
  /** How much of an increase may be absorbed. Absent ⇒ the domain default. */
  readonly tolerance?: PriceTolerance;
}

export interface RevalidationDeps {
  readonly registry: SupplierRegistry;
  readonly rateTokens: RateTokenStore;
  readonly pricing: PricingService;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly config: RevalidationConfig;
}

export class RevalidationService {
  readonly #d: RevalidationDeps;

  constructor(deps: RevalidationDeps) {
    this.#d = deps;
  }

  async revalidate(dealId: DealId): Promise<RevalidationReport> {
    const startedAt = this.#d.clock.now();
    const logger = this.#d.logger.child({ dealId: String(dealId) });

    const quote = await this.#d.rateTokens.resolve(dealId);
    if (quote === null) {
      // Unknown and expired are one answer on purpose: telling a client which
      // it was lets it probe for live ids.
      return {
        status: 'DEAL_NOT_FOUND',
        dealId,
        chargeable: null,
        requiresConsent: true,
        unverified: [],
        durationMs: this.#d.clock.now() - startedAt,
      };
    }

    const registered = this.#d.registry.get(quote.supplier);
    if (registered === undefined || !registered.config.enabled) {
      // The supplier was switched off between quoting and booking. Not the
      // customer's mistake, and not a sold-out room either.
      logger.warn('the supplier that quoted this deal is not available', {
        supplier: quote.supplier,
      });
      return this.#unavailable(quote, startedAt, 'SUPPLIER_NOT_REGISTERED');
    }

    const deadline = deadlineIn(this.#d.config.deadlineMs, startedAt);
    const controller = new AbortController();

    const outcome = await isolateSupplierCall(
      quote.supplier,
      () =>
        registered.supplier.precheck(
          {
            supplierHotelId: quote.supplierHotelId,
            supplierRateRef: quote.supplierRateRef,
            stay: quote.stay,
            occupancy: quote.occupancy,
            // Sealed at quote time, not taken from whoever is asking now: a
            // different nationality is a different price (A-5).
            nationality: quote.nationality,
            supplierState: quote.supplierState,
          },
          {
            supplier: quote.supplier,
            searchId: this.#d.ids.searchId(),
            correlationId: this.#d.ids.correlationId(),
            deadline: deadline.withBudget(registered.config.bookTimeoutMs, this.#d.clock.now()),
            signal: controller.signal,
            logger: logger.child({ supplier: quote.supplier }),
            currency: quote.quotedPrice.currency,
          },
        ),
      { clock: this.#d.clock, logger },
    );
    controller.abort();

    if (!outcome.ok) {
      return this.#unavailable(quote, startedAt, outcome.error.code);
    }

    const fresh = outcome.value;
    const attempt: SupplierAttempt = {
      supplier: quote.supplier,
      status: fresh.available ? 'SUCCESS' : 'EMPTY',
      durationMs: outcome.durationMs,
      hotelsReturned: 1,
      dealsReturned: fresh.available ? 1 : 0,
      supplierPagesConsumed: 1,
      ...(fresh.error !== undefined
        ? { errorCode: fresh.error.code, retryable: fresh.error.retryable }
        : {}),
    };

    if (fresh.error !== undefined && !fresh.available) {
      return this.#unavailable(quote, startedAt, fresh.error.code, attempt);
    }

    /**
     * Sold out is an answer, and a complete one — there is nothing left to
     * compare, so it does not need a price.
     */
    if (!fresh.available) {
      return {
        status: 'REVALIDATED',
        dealId,
        supplier: quote.supplier,
        outcome: { kind: 'SOLD_OUT' },
        chargeable: null,
        requiresConsent: true,
        unverified: [],
        expiresAt: new Date(quote.expiresAtMs),
        attempt,
        durationMs: this.#d.clock.now() - startedAt,
      };
    }

    /**
     * Available, but priced at nothing.
     *
     * Blocking rather than optimistic: treating a missing cost as "unchanged"
     * would charge the customer the old number on a confirmation the supplier
     * never gave.
     */
    if (fresh.cost === undefined) {
      logger.error('supplier confirmed availability without a price', {
        supplier: quote.supplier,
      });
      return {
        status: 'INCOMPLETE',
        dealId,
        supplier: quote.supplier,
        chargeable: null,
        requiresConsent: true,
        unverified: ['room', 'board', 'cancellation'],
        expiresAt: new Date(quote.expiresAtMs),
        attempt,
        durationMs: this.#d.clock.now() - startedAt,
      };
    }

    const freshPrice = await this.#priceFresh(quote, fresh);

    /**
     * Whatever the supplier did not describe is reported, never assumed equal.
     *
     * `SupplierPrecheckResult` has room, board and cancellation all optional
     * while `RevalidationInput` requires them. Falling back to the expected
     * value to satisfy the type would turn "the supplier did not say" into
     * "nothing changed" — a silent substitution at the booking gate, which is
     * exactly the C-2 defect one layer further in.
     */
    const unverified: Array<'room' | 'board' | 'cancellation'> = [];
    if (fresh.room === undefined) unverified.push('room');
    if (fresh.board === undefined) unverified.push('board');
    if (fresh.cancellation === undefined) unverified.push('cancellation');

    const decision: RevalidationOutcome = revalidate({
      quoted: quote.quotedPrice,
      fresh: freshPrice,
      available: true,
      expectedRoom: quote.room,
      offeredRoom: fresh.room ?? quote.room,
      expectedBoard: quote.board,
      offeredBoard: fresh.board ?? quote.board,
      expectedCancellation: quote.cancellation,
      offeredCancellation: fresh.cancellation ?? quote.cancellation,
      ...(this.#d.config.tolerance !== undefined ? { tolerance: this.#d.config.tolerance } : {}),
    });

    /**
     * Move the sealed handle on, keep the id and the quote.
     *
     * TripJack mints a booking id at review and RateGain refreshes
     * `allocationDetails`; booking must use the new one. The client keeps the
     * opaque `dealId` it already holds.
     *
     * Precheck deliberately does NOT consume the deal: it is repeatable — a
     * customer may refresh the review page, or be re-prechecked after accepting
     * a price change — and retiring it here would kill a booking that had not
     * happened yet.
     */
    if (fresh.supplierRateRef !== undefined || fresh.supplierState !== undefined) {
      await this.#d.rateTokens.reseal(dealId, {
        supplierRateRef: fresh.supplierRateRef ?? quote.supplierRateRef,
        supplierState: { ...quote.supplierState, ...(fresh.supplierState ?? {}) },
      });
    }

    return {
      status: 'REVALIDATED',
      dealId,
      supplier: quote.supplier,
      outcome: decision,
      chargeable: chargeableAfter(decision),
      // Anything we could not verify needs a human to look, whatever the price
      // did.
      requiresConsent: !canProceedWithoutConsent(decision) || unverified.length > 0,
      unverified,
      expiresAt: new Date(quote.expiresAtMs),
      attempt,
      durationMs: this.#d.clock.now() - startedAt,
    };
  }

  /**
   * The fresh supplier cost, priced under the SEALED scope.
   *
   * Not today's scope. The region, channel and night count that produced the
   * quote are replayed, so the only thing that can move the number is the
   * supplier's own cost. Resolving the region afresh here would let a hotel
   * whose catalogue record gained a country between search and booking price
   * under a different rule, and the customer would see a "price change" that no
   * supplier made.
   */
  async #priceFresh(quote: SealedQuote, fresh: SupplierPrecheckResult): Promise<CustomerPrice> {
    const scope: PricingScope = {
      channel: quote.scope.channel,
      homeCountry: quote.scope.homeCountry,
      nights: quote.scope.nights,
      ...(quote.scope.destinationCountry !== undefined
        ? { destinationCountry: quote.scope.destinationCountry }
        : {}),
    };
    const resolved = await this.#d.pricing.resolve(scope);

    if (resolved.markupVersion !== quote.markupVersion) {
      // Not an error — margins change — but it is the one legitimate reason a
      // revalidated price can move without the supplier moving, and an
      // unexplained price change is worth being able to explain.
      this.#d.logger.info('markup configuration changed since this deal was quoted', {
        quotedUnder: quote.markupVersion,
        now: resolved.markupVersion,
      });
    }

    /**
     * A precheck result is not a `SupplierRate`, so it is reassembled into one.
     *
     * `priceIndicative` would take the cost on its own and drop
     * `minimumSellingPrice` with it — and a RateGain MSP is a contractual floor
     * (`priceFromCost` raises the price to meet it). Losing it at the booking
     * gate would sell below a floor the search honoured.
     */
    const asRate: SupplierRate = {
      supplierRateRef: fresh.supplierRateRef ?? quote.supplierRateRef,
      room: fresh.room ?? quote.room,
      board: fresh.board ?? quote.board,
      occupancy: quote.occupancy,
      cancellation: fresh.cancellation ?? quote.cancellation,
      cost: fresh.cost as NonNullable<SupplierPrecheckResult['cost']>,
      onHoldAllowed: false,
      supplierState: { ...quote.supplierState, ...(fresh.supplierState ?? {}) },
      ...(fresh.minimumSellingPrice !== undefined
        ? { minimumSellingPrice: fresh.minimumSellingPrice }
        : {}),
    };

    return this.#d.pricing.priceRate(asRate, quote.supplier, scope, resolved);
  }

  #unavailable(
    quote: SealedQuote,
    startedAt: number,
    errorCode: string,
    attempt?: SupplierAttempt,
  ): RevalidationReport {
    return {
      status: 'SUPPLIER_UNAVAILABLE',
      dealId: quote.dealId,
      supplier: quote.supplier,
      chargeable: null,
      requiresConsent: true,
      unverified: [],
      expiresAt: new Date(quote.expiresAtMs),
      attempt: attempt ?? {
        supplier: quote.supplier,
        status: 'ERROR',
        durationMs: this.#d.clock.now() - startedAt,
        hotelsReturned: 0,
        dealsReturned: 0,
        supplierPagesConsumed: 0,
        errorCode,
        retryable: false,
      },
      durationMs: this.#d.clock.now() - startedAt,
    };
  }
}
