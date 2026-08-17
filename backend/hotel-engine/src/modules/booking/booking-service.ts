import type { DealId, KlarBookingId } from '../../domain/shared/brand.js';
import type { Money } from '../../domain/shared/money.js';
import type { Booking, DealSnapshot, Guest } from '../../domain/booking/booking.js';
import { isCancellable } from '../../domain/booking/booking.js';
import {
  claimRefund,
  decideCommit,
  refundAfterCancellation,
  type CommitConsent,
  type CommitRefusal,
} from '../../domain/booking/commit.js';
import type { RevalidationReport } from '../../domain/revalidation/revalidation-report.js';
import { deadlineIn } from '../../suppliers/contract/context.js';
import type { SupplierRegistry } from '../../suppliers/contract/registry.js';
import { allocateGuests } from '../../suppliers/contract/guests.js';
import type { SupplierBookResult, SupplierGuest } from '../../suppliers/contract/dto.js';
import type { CanonicalHotel } from '../../domain/hotel/canonical-hotel.js';
import type {
  BookingRepository,
  Clock,
  IdGenerator,
  Logger,
  PaymentGateway,
  PropertyRepository,
  RateTokenStore,
  SealedQuote,
} from '../ports.js';
import { isolateSupplierCall } from '../supplier-isolation.js';
import type { RevalidationService } from '../revalidation/revalidation-service.js';

/**
 * One booking path, for every supplier.
 *
 * The reference had two: `#commitTripJack` and `#commitRateGain`, 1,013 lines
 * between them, chosen by a five-clause heuristic that inferred the supplier
 * from the shape of whatever the browser happened to send (D-9). Everything
 * supplier-specific here is behind `HotelSupplier`; this file names no supplier
 * and would not change to add a third.
 *
 * The order of the steps is the design, and each step is placed where it is
 * because of what happens if it fails:
 *
 *  1. **Replay check.** A commit that already produced a booking returns it. A
 *     retried submit must never be a second room.
 *  2. **Revalidate**, then read the resealed quote. Precheck rotates the
 *     supplier's handle — TripJack mints its `bookingId` at review — so the
 *     quote is read *after* revalidation or the commit goes out with a stale
 *     reference.
 *  3. **Decide**, in the domain: proceed, ask the customer, or refuse.
 *  4. **Check the party against what was priced**, before any money moves. A
 *     guest list the supplier will reject is better found here than after a
 *     charge.
 *  5. **Create the booking row.** The unique index over the idempotency key is
 *     the lock: two concurrent commits with the same key race to insert, and
 *     the loser is handed the winner's booking. Creating BEFORE charging is
 *     what makes that lock meaningful.
 *  6. **Charge.** A decline ends the booking here, with nothing to unwind.
 *  7. **Retire the deal.** The token is a second lock, against the case the
 *     first cannot see: two commits with *different* idempotency keys for the
 *     same rate. Whoever retires it books.
 *  8. **Book**, then record the outcome — including the one outcome that is not
 *     an outcome, a supplier that did not answer.
 */
export interface BookingRequest {
  readonly dealId: DealId;
  /** Client-supplied, and the thing that makes a retry safe. */
  readonly idempotencyKey: string;
  readonly guests: readonly Guest[];
  readonly specialRequests?: readonly string[];
  readonly holdOnly?: boolean;
  /** The customer's answer when the price moved. Absent means they were not asked. */
  readonly consent?: CommitConsent;
  /** Whatever the payment provider handed the client. Verified, never trusted. */
  readonly paymentReference?: string;
  readonly userId?: string;
  readonly agentId?: string;
}

export type CommitOutcome =
  | { readonly kind: 'BOOKED'; readonly booking: Booking; readonly replayed: boolean }
  /** Made, but not settled: the supplier is still deciding, or never answered. */
  | { readonly kind: 'PENDING'; readonly booking: Booking }
  | {
      readonly kind: 'CONSENT_REQUIRED';
      readonly report: RevalidationReport;
      readonly unverified: readonly ('room' | 'board' | 'cancellation')[];
    }
  | { readonly kind: 'REFUSED'; readonly reason: CommitRefusal; readonly report: RevalidationReport }
  | {
      readonly kind: 'REJECTED';
      readonly reason: 'INVALID_PARTY' | 'PAYMENT_DECLINED' | 'DEAL_ALREADY_BOOKED';
      readonly detail: string;
    }
  /** The supplier refused it. The customer keeps their money. */
  | { readonly kind: 'FAILED'; readonly booking: Booking; readonly detail: string };

export interface BookingServiceConfig {
  readonly deadlineMs: number;
  readonly channel?: 'B2C' | 'B2B';
}

export interface BookingServiceDeps {
  readonly registry: SupplierRegistry;
  readonly revalidation: RevalidationService;
  readonly rateTokens: RateTokenStore;
  readonly bookings: BookingRepository;
  readonly properties: PropertyRepository;
  readonly payments: PaymentGateway;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly config: BookingServiceConfig;
}

export class BookingService {
  readonly #d: BookingServiceDeps;

  constructor(deps: BookingServiceDeps) {
    this.#d = deps;
  }

  async commit(request: BookingRequest): Promise<CommitOutcome> {
    const logger = this.#d.logger.child({
      dealId: String(request.dealId),
      idempotencyKey: request.idempotencyKey,
    });

    const replay = await this.#d.bookings.findByIdempotencyKey(request.idempotencyKey);
    if (replay !== null) {
      // Answered from the store, without touching a supplier. The client that
      // retried gets the booking it already made.
      logger.info('commit replayed an existing booking', {
        klarBookingId: String(replay.klarBookingId),
      });
      return { kind: 'BOOKED', booking: replay, replayed: true };
    }

    const report = await this.#d.revalidation.revalidate(request.dealId);
    const decision = decideCommit(report, request.consent);

    if (decision.kind === 'REFUSED') {
      return { kind: 'REFUSED', reason: decision.reason, report };
    }
    if (decision.kind === 'CONSENT_REQUIRED') {
      return { kind: 'CONSENT_REQUIRED', report, unverified: decision.unverified };
    }

    /**
     * Read after revalidation, never before.
     *
     * `RevalidationService` re-seals the supplier handle with whatever precheck
     * returned. Reading the quote first would book against the reference the
     * search issued — which TripJack replaces at review, and which RateGain
     * refreshes — and the commit would go out naming a rate the supplier has
     * already moved on from.
     */
    const quote = await this.#d.rateTokens.resolve(request.dealId);
    if (quote === null) {
      return { kind: 'REFUSED', reason: 'DEAL_NOT_FOUND', report };
    }

    const registered = this.#d.registry.get(quote.supplier);
    if (registered === undefined || !registered.config.enabled) {
      return { kind: 'REFUSED', reason: 'SUPPLIER_UNAVAILABLE', report };
    }

    /**
     * The party is checked here as well as in the adapter, and both are wanted.
     *
     * The adapter's check is the contract — it protects any caller, including a
     * future one. This one protects the CUSTOMER, by happening before the
     * charge: a guest list that does not fill the occupancy is a 400, not a
     * payment followed by a refund.
     */
    const party = allocateGuests(quote.occupancy, request.guests.map(toSupplierGuest));
    if (!party.ok) {
      return { kind: 'REJECTED', reason: 'INVALID_PARTY', detail: party.reason };
    }

    const chargeable = decision.chargeable;
    // The catalogue, not the supplier, names the hotel on the voucher. It is
    // the same record the search matched this deal to, so the booking reads the
    // way the results page did whichever supplier sold it.
    const hotel = await this.#d.properties.findByKlarHotelId(quote.klarHotelId);

    const booking: Booking = {
      klarBookingId: this.#d.ids.bookingId(),
      publicToken: this.#d.ids.publicToken(),
      idempotencyKey: request.idempotencyKey,
      supplier: quote.supplier,
      status: 'PRECHECK_PASSED',
      stay: quote.stay,
      deal: snapshotOf(quote, chargeable, hotel, new Date(this.#d.clock.now())),
      guests: request.guests,
      // From the sealed quote, not from the request: the channel decides which
      // markup rules priced this deal, and a client that could name it could
      // buy at another channel's margin.
      channel: quote.scope.channel,
      ...(request.userId !== undefined ? { userId: request.userId } : {}),
      ...(request.agentId !== undefined ? { agentId: request.agentId } : {}),
      createdAt: new Date(this.#d.clock.now()),
      updatedAt: new Date(this.#d.clock.now()),
    };

    const created = await this.#d.bookings.create(booking);
    if (!created.created) {
      // Lost the insert race. The winner's booking is the answer — and no money
      // has moved on this path, because the charge comes after the row.
      return { kind: 'BOOKED', booking: created.existing, replayed: true };
    }
    await this.#event(booking.klarBookingId, 'PRECHECK_PASSED', 'PRECHECK_PASSED');

    const payment = await this.#d.payments.authorize({
      klarBookingId: booking.klarBookingId,
      // The server's figure, from the sealed quote and the fresh supplier cost.
      // Nothing the client sent contributed to it.
      amount: chargeable.total,
      ...(request.paymentReference !== undefined ? { reference: request.paymentReference } : {}),
    });

    if (!payment.ok) {
      await this.#fail(booking.klarBookingId, ['PRECHECK_PASSED'], 'PAYMENT_DECLINED', {
        reason: payment.reason,
      });
      return { kind: 'REJECTED', reason: 'PAYMENT_DECLINED', detail: payment.reason };
    }

    const held = await this.#d.bookings.advance({
      id: booking.klarBookingId,
      to: 'PAYMENT_HELD',
      expect: ['PRECHECK_PASSED'],
      patch: { payment: payment.payment },
      at: new Date(this.#d.clock.now()),
    });
    await this.#event(booking.klarBookingId, 'PAYMENT_HELD', 'PAYMENT_HELD');

    /**
     * Retiring the deal is the second lock, and it is taken before the supplier
     * call rather than after it.
     *
     * Two commits under different idempotency keys for the same rate both pass
     * the booking table's unique index. Whoever retires the token books; the
     * other stops here with its payment still to be returned, which is a refund
     * — not a second reservation.
     */
    const won = await this.#d.rateTokens.consume(request.dealId);
    if (!won) {
      logger.warn('another commit had already retired this deal');
      await this.#fail(booking.klarBookingId, ['PAYMENT_HELD'], 'DEAL_ALREADY_BOOKED', {});
      await this.#refund(
        held ?? booking,
        payment.payment.capturedAmount,
        'the deal was booked by another request',
      );
      return {
        kind: 'REJECTED',
        reason: 'DEAL_ALREADY_BOOKED',
        detail: 'this deal was already committed by another request',
      };
    }

    return this.#book(held ?? booking, quote, request, logger);
  }

  async #book(
    booking: Booking,
    quote: SealedQuote,
    request: BookingRequest,
    logger: Logger,
  ): Promise<CommitOutcome> {
    const registered = this.#d.registry.get(quote.supplier);
    if (registered === undefined) {
      await this.#fail(booking.klarBookingId, ['PAYMENT_HELD'], 'SUPPLIER_NOT_REGISTERED', {});
      return { kind: 'FAILED', booking, detail: 'the supplier is no longer registered' };
    }

    const startedAt = this.#d.clock.now();
    const deadline = deadlineIn(this.#d.config.deadlineMs, startedAt);
    const controller = new AbortController();

    const bookRequest = {
      klarBookingId: booking.klarBookingId,
      supplierHotelId: quote.supplierHotelId,
      supplierRateRef: quote.supplierRateRef,
      stay: quote.stay,
      occupancy: quote.occupancy,
      nationality: quote.nationality,
      guests: booking.guests.map(toSupplierGuest),
      holdOnly: request.holdOnly ?? false,
      supplierState: quote.supplierState,
      idempotencyKey: request.idempotencyKey,
      ...(request.specialRequests !== undefined
        ? { specialRequests: request.specialRequests }
        : {}),
    };

    const outcome = await isolateSupplierCall(
      quote.supplier,
      () =>
        registered.supplier.book(bookRequest, {
          supplier: quote.supplier,
          searchId: this.#d.ids.searchId(),
          correlationId: this.#d.ids.correlationId(),
          deadline: deadline.withBudget(registered.config.bookTimeoutMs, this.#d.clock.now()),
          signal: controller.signal,
          logger: logger.child({ supplier: quote.supplier }),
          currency: booking.deal.price.currency,
        }),
      { clock: this.#d.clock, logger },
    );
    controller.abort();

    await this.#d.bookings.recordSupplierPayload({
      klarBookingId: booking.klarBookingId,
      supplier: quote.supplier,
      operation: 'BOOK',
      request: bookRequest,
      response: outcome.ok ? outcome.value : { error: outcome.error },
      recordedAt: new Date(this.#d.clock.now()),
    });

    /**
     * An adapter that threw is not a booking that failed.
     *
     * `isolateSupplierCall` catches a throw out of the contract, and a throw
     * tells us nothing about whether the request reached the supplier. The safe
     * reading is the expensive one: treat it as pending and reconcile.
     */
    if (!outcome.ok) {
      const pending = await this.#pending(booking, 'SUPPLIER_THREW', outcome.error.message);
      return { kind: 'PENDING', booking: pending };
    }

    return this.#settle(booking, outcome.value);
  }

  async #settle(booking: Booking, result: SupplierBookResult): Promise<CommitOutcome> {
    const at = new Date(this.#d.clock.now());
    const patch = {
      ...(result.supplierBookingRef !== undefined
        ? { supplierBookingRef: result.supplierBookingRef }
        : {}),
      ...(result.hotelConfirmationNumber !== undefined
        ? { hotelConfirmationNumber: result.hotelConfirmationNumber }
        : {}),
      // Everything cancelling will need, and only the commit response knew (A-3).
      ...(result.supplierState !== undefined ? { supplierState: result.supplierState } : {}),
    };

    if (result.status === 'CONFIRMED' || result.status === 'ON_HOLD') {
      const settled = await this.#d.bookings.advance({
        id: booking.klarBookingId,
        to: result.status,
        expect: ['PAYMENT_HELD', 'SUPPLIER_PENDING'],
        patch,
        at,
      });
      await this.#event(booking.klarBookingId, 'SUPPLIER_BOOKED', result.status, {
        supplierBookingRef: result.supplierBookingRef ?? null,
      });
      return { kind: 'BOOKED', booking: settled ?? booking, replayed: false };
    }

    if (result.status === 'PENDING') {
      const pending = await this.#pending(
        booking,
        'SUPPLIER_PENDING',
        result.error?.message ?? 'the supplier has not confirmed yet',
        patch,
      );
      return { kind: 'PENDING', booking: pending };
    }

    /**
     * A definite refusal. This is the only branch that refunds, and it is
     * reachable only because the adapters distinguish "refused" from "did not
     * answer" — before Phase 8's audit both reported a timeout as FAILED, which
     * would have refunded bookings that existed.
     */
    const failed = await this.#fail(
      booking.klarBookingId,
      ['PAYMENT_HELD', 'SUPPLIER_PENDING'],
      'SUPPLIER_REFUSED',
      { code: result.error?.code ?? null },
    );
    const detail = result.error?.message ?? 'the supplier refused the booking';
    await this.#refund(failed ?? booking, booking.payment?.capturedAmount, detail);
    return { kind: 'FAILED', booking: failed ?? booking, detail };
  }

  /**
   * Ask the supplier what happened to a booking it never settled.
   *
   * The only way out of `SUPPLIER_PENDING` other than a human. A supplier that
   * cannot be asked — no `getBookingStatus`, which `capabilities.asyncBooking`
   * declares — goes to `MANUAL_REVIEW` rather than being guessed at in either
   * direction: guessing confirmed sells a room that may not exist, and guessing
   * failed refunds one that does.
   */
  async confirm(id: KlarBookingId): Promise<Booking | null> {
    const booking = await this.#d.bookings.findById(id);
    if (booking === null) return null;
    if (booking.status !== 'SUPPLIER_PENDING') return booking;

    const registered = this.#d.registry.get(booking.supplier);
    const ref = booking.supplierBookingRef;

    if (registered === undefined || registered.supplier.getBookingStatus === undefined || ref === undefined) {
      const reviewed = await this.#d.bookings.advance({
        id,
        to: 'MANUAL_REVIEW',
        expect: ['SUPPLIER_PENDING'],
        at: new Date(this.#d.clock.now()),
      });
      await this.#event(id, 'NEEDS_REVIEW', 'MANUAL_REVIEW', {
        reason: ref === undefined ? 'no supplier reference' : 'the supplier cannot be polled',
      });
      return reviewed ?? booking;
    }

    const logger = this.#d.logger.child({ klarBookingId: String(id) });
    const deadline = deadlineIn(this.#d.config.deadlineMs, this.#d.clock.now());
    const controller = new AbortController();

    const outcome = await isolateSupplierCall(
      booking.supplier,
      () =>
        (registered.supplier.getBookingStatus as NonNullable<typeof registered.supplier.getBookingStatus>)(ref, {
          supplier: booking.supplier,
          searchId: this.#d.ids.searchId(),
          correlationId: this.#d.ids.correlationId(),
          deadline: deadline.withBudget(registered.config.bookTimeoutMs, this.#d.clock.now()),
          signal: controller.signal,
          logger,
          currency: booking.deal.price.currency,
        }),
      { clock: this.#d.clock, logger },
    );
    controller.abort();

    await this.#d.bookings.recordSupplierPayload({
      klarBookingId: id,
      supplier: booking.supplier,
      operation: 'STATUS',
      request: { supplierBookingRef: ref },
      response: outcome.ok ? outcome.value : { error: outcome.error },
      recordedAt: new Date(this.#d.clock.now()),
    });

    // Still unknown. The booking stays pending and the next poll tries again;
    // nothing about the customer's money changes on a failed question.
    if (!outcome.ok) return booking;

    const status = outcome.value.status;
    if (status === 'CONFIRMED' || status === 'ON_HOLD') {
      const settled = await this.#d.bookings.advance({
        id,
        to: status,
        expect: ['SUPPLIER_PENDING'],
        at: new Date(this.#d.clock.now()),
        ...(outcome.value.hotelConfirmationNumber !== undefined
          ? { patch: { hotelConfirmationNumber: outcome.value.hotelConfirmationNumber } }
          : {}),
      });
      await this.#event(id, 'SUPPLIER_CONFIRMED', status);
      return settled ?? booking;
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      const failed = await this.#fail(id, ['SUPPLIER_PENDING'], 'SUPPLIER_REFUSED', {
        polled: status,
      });
      await this.#refund(
        failed ?? booking,
        booking.payment?.capturedAmount,
        'the supplier did not complete this booking',
      );
      return failed ?? booking;
    }

    return booking;
  }

  /**
   * Cancel with the supplier, then give the money back.
   *
   * The state the cancel needs travels on the booking: RateGain requires
   * `ReservationId`, `PropertyId` and `PropertyCode` alongside the confirmation
   * number, and they exist only in the commit response (A-3).
   */
  async cancel(
    id: KlarBookingId,
    reason: string,
  ): Promise<
    | { readonly kind: 'CANCELLED'; readonly booking: Booking; readonly refunded: Money | null }
    | { readonly kind: 'PENDING'; readonly booking: Booking }
    | { readonly kind: 'REJECTED'; readonly booking: Booking; readonly detail: string }
    /** We could not ask. Distinct from the supplier saying no. */
    | { readonly kind: 'UNAVAILABLE'; readonly booking: Booking; readonly detail: string }
    | { readonly kind: 'NOT_FOUND' }
    | { readonly kind: 'NOT_CANCELLABLE'; readonly booking: Booking }
  > {
    const booking = await this.#d.bookings.findById(id);
    if (booking === null) return { kind: 'NOT_FOUND' };
    if (!isCancellable(booking)) return { kind: 'NOT_CANCELLABLE', booking };

    const ref = booking.supplierBookingRef;
    if (ref === undefined) {
      // Nothing to cancel with. A human has to reconcile this against the
      // supplier's own records rather than the customer being told it is done.
      const reviewed = await this.#d.bookings.advance({
        id,
        to: 'MANUAL_REVIEW',
        expect: ['CONFIRMED', 'ON_HOLD', 'SUPPLIER_PENDING'],
        at: new Date(this.#d.clock.now()),
      });
      return {
        kind: 'REJECTED',
        booking: reviewed ?? booking,
        detail: 'this booking has no supplier reference to cancel',
      };
    }

    const pending = await this.#d.bookings.advance({
      id,
      to: 'CANCELLATION_PENDING',
      expect: ['CONFIRMED', 'ON_HOLD', 'SUPPLIER_PENDING'],
      at: new Date(this.#d.clock.now()),
    });
    if (pending === null) return { kind: 'NOT_CANCELLABLE', booking };

    const registered = this.#d.registry.get(booking.supplier);
    if (registered === undefined) {
      /**
       * Nothing was sent, so nothing was refused.
       *
       * Reporting this as REJECTED told the customer the supplier had declined
       * their cancellation, when in fact we never asked — and left the booking
       * stranded in CANCELLATION_PENDING, where no path settles it. The stay is
       * still theirs until someone can ask.
       */
      const restored = await this.#d.bookings.advance({
        id,
        to: booking.status,
        expect: ['CANCELLATION_PENDING'],
        at: new Date(this.#d.clock.now()),
      });
      return {
        kind: 'UNAVAILABLE',
        booking: restored ?? booking,
        detail: 'the supplier that holds this booking is not available right now',
      };
    }

    const logger = this.#d.logger.child({ klarBookingId: String(id) });
    const deadline = deadlineIn(this.#d.config.deadlineMs, this.#d.clock.now());
    const controller = new AbortController();

    const cancelRequest = {
      supplierBookingRef: ref,
      reason,
      ...(booking.supplierState !== undefined ? { supplierState: booking.supplierState } : {}),
    };

    const outcome = await isolateSupplierCall(
      booking.supplier,
      () =>
        registered.supplier.cancel(cancelRequest, {
          supplier: booking.supplier,
          searchId: this.#d.ids.searchId(),
          correlationId: this.#d.ids.correlationId(),
          deadline: deadline.withBudget(registered.config.bookTimeoutMs, this.#d.clock.now()),
          signal: controller.signal,
          logger,
          currency: booking.deal.price.currency,
        }),
      { clock: this.#d.clock, logger },
    );
    controller.abort();

    await this.#d.bookings.recordSupplierPayload({
      klarBookingId: id,
      supplier: booking.supplier,
      operation: 'CANCEL',
      request: cancelRequest,
      response: outcome.ok ? outcome.value : { error: outcome.error },
      recordedAt: new Date(this.#d.clock.now()),
    });

    // Unknown, so it stays pending: the cancellation may well have gone through,
    // and telling the customer it was rejected would leave them expecting a stay
    // that no longer exists.
    if (!outcome.ok) return { kind: 'PENDING', booking: pending };
    if (outcome.value.status === 'PENDING') return { kind: 'PENDING', booking: pending };

    if (outcome.value.status === 'REJECTED') {
      /**
       * Back to what it was, not to CONFIRMED.
       *
       * A booking that was ON_HOLD or still SUPPLIER_PENDING when the customer
       * asked to cancel is not confirmed by the supplier refusing to cancel it.
       * Hardcoding the target laundered an unsettled booking into a terminal
       * confirmed one — and CONFIRMED is terminal for the poller, so nothing
       * would ever have settled it afterwards.
       */
      const restored = await this.#d.bookings.advance({
        id,
        to: booking.status,
        expect: ['CANCELLATION_PENDING'],
        at: new Date(this.#d.clock.now()),
      });
      await this.#event(id, 'CANCELLATION_REJECTED', booking.status);
      return {
        kind: 'REJECTED',
        booking: restored ?? pending,
        detail: outcome.value.error?.message ?? 'the supplier refused the cancellation',
      };
    }

    const cancelled = await this.#d.bookings.advance({
      id,
      to: 'CANCELLED',
      expect: ['CANCELLATION_PENDING'],
      at: new Date(this.#d.clock.now()),
    });
    await this.#event(id, 'CANCELLED', 'CANCELLED', {
      supplierCancellationRef: outcome.value.supplierCancellationRef ?? null,
    });

    const captured = booking.payment?.capturedAmount;
    if (captured === undefined) {
      return { kind: 'CANCELLED', booking: cancelled ?? pending, refunded: null };
    }

    const { amount, needsReview } = refundAfterCancellation(
      captured,
      outcome.value.penalty?.total,
    );
    if (needsReview) {
      // A penalty in another currency. Converting it at a rate nobody quoted is
      // how a refund becomes the wrong number, so a human decides.
      await this.#event(id, 'REFUND_NEEDS_REVIEW', undefined, {
        penaltyCurrency: outcome.value.penalty?.total.currency ?? null,
      });
      return { kind: 'CANCELLED', booking: cancelled ?? pending, refunded: null };
    }

    const refunded = await this.#refund(
      cancelled ?? pending,
      amount,
      reason,
      'CANCELLATION',
    );
    return { kind: 'CANCELLED', booking: cancelled ?? pending, refunded: refunded ? amount : null };
  }

  // ── Shared steps ──────────────────────────────────────────────────────────

  async #fail(
    id: KlarBookingId,
    expect: readonly Booking['status'][],
    type: string,
    detail: Record<string, unknown>,
  ): Promise<Booking | null> {
    const failed = await this.#d.bookings.advance({
      id,
      to: 'FAILED',
      expect,
      at: new Date(this.#d.clock.now()),
    });
    await this.#event(id, type, 'FAILED', detail);
    return failed;
  }

  async #pending(
    booking: Booking,
    type: string,
    detail: string,
    patch?: Parameters<BookingRepository['advance']>[0]['patch'],
  ): Promise<Booking> {
    const pending = await this.#d.bookings.advance({
      id: booking.klarBookingId,
      to: 'SUPPLIER_PENDING',
      expect: ['PAYMENT_HELD', 'SUPPLIER_PENDING'],
      at: new Date(this.#d.clock.now()),
      ...(patch !== undefined ? { patch } : {}),
    });
    await this.#event(booking.klarBookingId, type, 'SUPPLIER_PENDING', { detail });
    return pending ?? booking;
  }

  /**
   * Claim the refund, then pay it. Both halves are required.
   *
   * `claimRefund` answers "is one owed?", the store's conditional write answers
   * "may I be the one to pay it?", and only a caller that gets both may call the
   * gateway. Three paths reach a failed booking — this request, the poller, the
   * reconciliation worker — and the customer must be made whole once.
   */
  async #refund(
    booking: Booking,
    amount: Money | undefined,
    reason: string,
    kind: 'FAILED_BOOKING' | 'CANCELLATION' = 'FAILED_BOOKING',
  ): Promise<boolean> {
    if (amount === undefined || booking.payment === undefined) return false;

    const now = new Date(this.#d.clock.now());
    const decided = claimRefund(booking, {
      kind,
      method: 'GATEWAY',
      amount,
      referenceId: String(booking.klarBookingId),
      reason,
      now,
    });
    if (!decided.ok) return false;

    const claimed = await this.#d.bookings.claimRefund(booking.klarBookingId, decided.record);
    if (!claimed) return false;

    const paid = await this.#d.payments.refund({
      klarBookingId: booking.klarBookingId,
      payment: booking.payment,
      amount,
      reason,
    });

    await this.#d.bookings.settleRefund(booking.klarBookingId, {
      ...decided.record,
      status: paid.ok ? 'COMPLETED' : 'FAILED',
      ...(paid.providerRefundId !== undefined ? { providerRefundId: paid.providerRefundId } : {}),
      ...(paid.error !== undefined ? { error: paid.error } : {}),
      ...(paid.ok ? { completedAt: now } : {}),
    });
    await this.#event(booking.klarBookingId, paid.ok ? 'REFUNDED' : 'REFUND_FAILED', undefined, {
      amountMinor: amount.minor,
      currency: amount.currency,
    });

    return paid.ok;
  }

  async #event(
    id: KlarBookingId,
    type: string,
    status?: Booking['status'],
    detail?: Record<string, unknown>,
  ): Promise<void> {
    await this.#d.bookings.appendEvent({
      klarBookingId: id,
      type,
      ...(status !== undefined ? { status } : {}),
      ...(detail !== undefined ? { detail } : {}),
      occurredAt: new Date(this.#d.clock.now()),
    });
  }
}

/**
 * The canonical record of what was sold.
 *
 * Built from the sealed quote and the price that was actually charged, so the
 * voucher, the bookings list and the invoice all render from one supplier-
 * neutral object. The reference rendered them from the stored raw supplier
 * request, which is why its bookings page would break on a third supplier.
 */
function snapshotOf(
  quote: SealedQuote,
  charged: DealSnapshot['price'],
  hotel: CanonicalHotel | null,
  quotedAt: Date,
): DealSnapshot {
  const image = hotel?.images[0]?.url;
  return {
    dealId: quote.dealId,
    supplier: quote.supplier,
    supplierHotelId: quote.supplierHotelId,
    klarHotelId: quote.klarHotelId,
    hotelName: hotel?.name ?? String(quote.klarHotelId),
    ...(hotel?.address !== undefined ? { hotelAddress: hotel.address } : {}),
    ...(image !== undefined ? { hotelImage: image } : {}),
    ...(hotel?.starRating !== undefined ? { starRating: hotel.starRating } : {}),
    room: quote.room,
    board: quote.board,
    occupancy: quote.occupancy,
    cancellation: quote.cancellation,
    cost: quote.quotedCost,
    price: charged,
    quotedAt,
  };
}

const toSupplierGuest = (guest: Guest): SupplierGuest => ({
  firstName: guest.firstName,
  lastName: guest.lastName,
  isPrimary: guest.isPrimary,
  isChild: guest.isChild,
  ...(guest.age !== undefined ? { age: guest.age } : {}),
  ...(guest.email !== undefined ? { email: guest.email } : {}),
  ...(guest.phone !== undefined ? { phone: guest.phone } : {}),
  ...(guest.countryCode !== undefined ? { countryCode: guest.countryCode } : {}),
  ...(guest.postalCode !== undefined ? { postalCode: guest.postalCode } : {}),
});
