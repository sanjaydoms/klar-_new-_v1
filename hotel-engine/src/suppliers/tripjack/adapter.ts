import type { CountryCode, CurrencyCode, SupplierCode } from '../../domain/shared/brand.js';
import { supplierHotelId } from '../../domain/shared/brand.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms } from '../../domain/rate/cancellation.js';
import type { HotelSupplier, SupplierCapabilities } from '../contract/hotel-supplier.js';
import type { SupplierContext } from '../contract/context.js';
import type {
  SupplierBookRequest,
  SupplierBookResult,
  SupplierBookingStatusResult,
  SupplierCancelRequest,
  SupplierCancelResult,
  SupplierHotelDetails,
  SupplierHotelDetailsRequest,
  SupplierPrecheckRequest,
  SupplierPrecheckResult,
  SupplierRate,
  SupplierRatesRequest,
  SupplierRatesResult,
  SupplierSearchRequest,
  SupplierSearchResult,
} from '../contract/dto.js';
import { mayHaveBooked, supplierError } from '../contract/errors.js';
import { allocateGuests } from '../contract/guests.js';
import type { CallDeps, CallOutcome } from '../common/call.js';
import { callSupplier } from '../common/call.js';
import { CircuitBreaker } from '../common/circuit-breaker.js';
import type { HttpTransport } from '../common/http.js';
import { createImageResolver, type ImageResolver } from '../common/images.js';
import { asRecord, mapDefensively, readArray, readNumber, readRecord, readString } from '../common/parse.js';
import {
  DEFAULT_TRIPJACK_TUNING,
  TRIPJACK,
  TRIPJACK_CAPABILITIES,
  type TripJackCredentials,
  type TripJackTuning,
} from './config.js';
import {
  buildBookRequest,
  buildListingRequest,
  buildPricingRequest,
  buildReviewRequest,
  type NationalityResolver,
} from './request.js';
import {
  costFromOption,
  hasBookableRates,
  toStaticDetail,
  toSupplierHotel,
  toSupplierRate,
  tjReportedFailure,
} from './response.js';

const TJ_BOOK_POLL = { intervalMs: 5_000, maxWaitMs: 180_000 } as const;

export interface TripJackAdapterDeps {
  /** HMS: listing, pricing, static-detail, review. */
  readonly hms: HttpTransport;
  /** OMS: book, booking-details, cancel. Different host, same credentials. */
  readonly oms: HttpTransport;
  readonly credentials: TripJackCredentials;
  readonly resolveNationality: NationalityResolver;
  readonly newCorrelationId: () => string;
  readonly tuning?: TripJackTuning;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly breaker?: CircuitBreaker;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * TripJack.
 *
 * The whole supplier lives in this folder: transport wiring here, payload
 * construction in `request.ts`, payload interpretation in `response.ts`. The
 * reference spread the same supplier across five layers in two services, two of
 * which were pass-through re-exports, and ended up with the search and booking
 * copies 1,040 lines apart.
 *
 * Nothing on this class throws. Every method resolves with a status and, on
 * failure, a normalised error (ADR-0004).
 */
export class TripJackAdapter implements HotelSupplier {
  readonly code: SupplierCode = TRIPJACK;
  readonly capabilities: SupplierCapabilities = TRIPJACK_CAPABILITIES;

  readonly #hms: HttpTransport;
  readonly #oms: HttpTransport;
  readonly #images: ImageResolver;
  readonly #resolveNationality: NationalityResolver;
  readonly #newCorrelationId: () => string;
  readonly #tuning: TripJackTuning;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #breaker: CircuitBreaker;
  readonly #now: () => number;
  readonly #sleep: ((ms: number) => Promise<void>) | undefined;

  constructor(deps: TripJackAdapterDeps) {
    this.#hms = deps.hms;
    this.#oms = deps.oms;
    this.#images = createImageResolver(deps.credentials.imageBaseUrl);
    this.#resolveNationality = deps.resolveNationality;
    this.#newCorrelationId = deps.newCorrelationId;
    this.#tuning = deps.tuning ?? DEFAULT_TRIPJACK_TUNING;
    this.#timeoutMs = deps.timeoutMs ?? 14_000;
    this.#maxRetries = deps.maxRetries ?? 1;
    this.#breaker = deps.breaker ?? new CircuitBreaker({ failureThreshold: 5, openMs: 30_000 });
    this.#now = deps.now ?? Date.now;
    this.#sleep = deps.sleep;
  }

  #deps(transport: HttpTransport): CallDeps {
    return {
      transport,
      breaker: this.#breaker,
      timeoutMs: this.#timeoutMs,
      maxRetries: this.#maxRetries,
      now: this.#now,
      ...(this.#sleep !== undefined ? { sleep: this.#sleep } : {}),
    };
  }

  // ── Search ────────────────────────────────────────────────────────────────

  /**
   * TripJack has no destination search: a listing call prices only the ids it
   * is given, and most ids in a large destination are not bookable on the
   * requested dates. A KLAR page therefore scans a *window* of candidate ids,
   * split into listing-sized calls and run a few at a time.
   *
   * The window is a fixed function of the page number, so page N+1 resumes
   * exactly where page N stopped. Truncating a window early on a hotel count
   * would leave part of it unscanned and make the next page skip those ids.
   */
  async search(req: SupplierSearchRequest, ctx: SupplierContext): Promise<SupplierSearchResult> {
    const startedAt = this.#now();
    const ids = this.#targetIds(req);

    if (ids === null) {
      return this.#emptySearch('ERROR', startedAt, {
        error: supplierError(
          'SUPPLIER_BAD_REQUEST',
          `TripJack cannot search target kind "${req.target.kind}"`,
        ),
      });
    }

    const windowStart = (req.page - 1) * this.#tuning.idsPerPage;
    const windowEnd = Math.min(windowStart + this.#tuning.idsPerPage, ids.length);
    const pageIds = ids.slice(windowStart, windowEnd);
    if (pageIds.length === 0) {
      return this.#emptySearch('EMPTY', startedAt, {
        supplierReportedTotal: ids.length,
      });
    }

    let nationalityId: string;
    try {
      nationalityId = await this.#resolveNationality(req.nationality);
    } catch {
      // The lookup is ours, not TripJack's, so this is not a supplier failure —
      // but it does mean we cannot price correctly, and pricing for the wrong
      // nationality is worse than returning nothing.
      return this.#emptySearch('ERROR', startedAt, {
        error: supplierError('SUPPLIER_BAD_REQUEST', 'could not resolve a TripJack nationality id'),
      });
    }

    const correlationId = ctx.correlationId;
    const chunks: string[][] = [];
    for (let i = 0; i < pageIds.length; i += this.#tuning.idsPerCall) {
      chunks.push(pageIds.slice(i, i + this.#tuning.idsPerCall));
    }

    const collected: unknown[] = [];
    let anyFailure: SupplierSearchResult['error'];
    let cancelled = false;

    for (let i = 0; i < chunks.length; i += this.#tuning.concurrency) {
      if (ctx.deadline.hasPassed(this.#now()) || ctx.signal.aborted) {
        cancelled = true;
        break;
      }
      const wave = chunks.slice(i, i + this.#tuning.concurrency);
      const results = await Promise.all(
        wave.map((chunk) =>
          this.#listing(ctx, chunk, req, nationalityId, correlationId),
        ),
      );
      for (const outcome of results) {
        if (outcome.ok) collected.push(...outcome.value);
        else anyFailure = outcome.error;
      }
    }

    const hotels = mapDefensively(
      collected.slice(0, this.#tuning.maxHotelsPerPage),
      (raw) => {
        const mapped = toSupplierHotel(raw, {
          currency: ctx.currency,
          requestedOccupancy: req.occupancy,
          correlationId,
          images: this.#images,
          onSkippedRate: (error, option) =>
            ctx.logger.warn('dropped an unmappable rate option', {
              option,
              reason: error instanceof Error ? error.message : String(error),
            }),
        });
        return mapped !== null && hasBookableRates(mapped) ? mapped : null;
      },
      (error, index) =>
        ctx.logger.warn('dropped an unmappable hotel', {
          index,
          reason: error instanceof Error ? error.message : String(error),
        }),
    );

    // A partially-scanned window still yields usable hotels, and saying so is
    // what lets the orchestrator mark the search PARTIAL rather than implying
    // the price shown is the best available (ADR-0003).
    //
    // When nothing came back, the reason matters as much as the emptiness: a
    // supplier that timed out is a gap in the comparison, while one that
    // answered "nothing here" is not. Collapsing both into ERROR is how the
    // reference lost the distinction entirely (D-8).
    const status: SupplierSearchResult['status'] = this.#searchStatus(
      cancelled,
      hotels.length,
      anyFailure,
    );

    return {
      supplier: this.code,
      status,
      hotels,
      pageInfo: {
        hasMore: windowEnd < ids.length,
        supplierPagesConsumed: chunks.length,
        // Candidate ids in range, NOT a hotel count. Goa resolves ~6,179 ids
        // and yields roughly 20 bookable hotels; surfacing this as a result
        // count, or summing it across suppliers, would be a lie either way.
        supplierReportedTotal: ids.length,
      },
      responseTimeMs: this.#now() - startedAt,
      ...(anyFailure !== undefined && hotels.length === 0 ? { error: anyFailure } : {}),
    };
  }

  #searchStatus(
    cancelled: boolean,
    hotelCount: number,
    failure: SupplierSearchResult['error'],
  ): SupplierSearchResult['status'] {
    // A window is scanned in chunks, and a chunk that failed is inventory that
    // was never looked at. Reporting SUCCESS because the surviving chunks
    // returned something claims BEST_AVAILABLE over a fraction of the window —
    // the search-level lie ADR-0003 §5 exists to prevent. `cancelled` covered
    // only the deadline case; a failed chunk is the same gap by another route.
    if (hotelCount > 0) return cancelled || failure !== undefined ? 'PARTIAL' : 'SUCCESS';
    if (cancelled) return 'TIMEOUT';
    if (failure === undefined) return 'EMPTY';
    switch (failure.code) {
      case 'SUPPLIER_TIMEOUT':
      case 'SUPPLIER_CANCELLED':
        return 'TIMEOUT';
      case 'SUPPLIER_CIRCUIT_OPEN':
        return 'CIRCUIT_OPEN';
      case 'SUPPLIER_NO_AVAILABILITY':
        return 'EMPTY';
      default:
        return 'ERROR';
    }
  }

  #targetIds(req: SupplierSearchRequest): string[] | null {
    if (req.target.kind === 'HOTEL_IDS') return req.target.ids.map(String);
    if (req.target.kind === 'SINGLE_HOTEL') return [String(req.target.id)];
    return null;
  }

  #emptySearch(
    status: SupplierSearchResult['status'],
    startedAt: number,
    extra: { error?: SupplierSearchResult['error']; supplierReportedTotal?: number },
  ): SupplierSearchResult {
    return {
      supplier: this.code,
      status,
      hotels: [],
      pageInfo: {
        hasMore: false,
        supplierPagesConsumed: 0,
        ...(extra.supplierReportedTotal !== undefined
          ? { supplierReportedTotal: extra.supplierReportedTotal }
          : {}),
      },
      responseTimeMs: this.#now() - startedAt,
      ...(extra.error !== undefined ? { error: extra.error } : {}),
    };
  }

  async #listing(
    ctx: SupplierContext,
    hids: readonly string[],
    req: SupplierSearchRequest,
    nationalityId: string,
    correlationId: string,
  ): Promise<CallOutcome<unknown[]>> {
    return callSupplier(ctx, this.#deps(this.#hms), {
      method: 'POST',
      path: '/hms/v3/hotel/listing',
      body: buildListingRequest({
        stay: req.stay,
        occupancy: req.occupancy,
        currency: ctx.currency,
        nationalityId,
        hids,
        correlationId,
      }),
    }, (res) => {
      const reported = tjReportedFailure(res.body);
      if (reported !== null) {
        return { ok: false, error: supplierError('SUPPLIER_UNKNOWN_ERROR', reported) };
      }
      return { ok: true, value: readArray(res.body, 'hotels') };
    }, { repeatable: true });
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  async getHotelDetails(
    req: SupplierHotelDetailsRequest,
    ctx: SupplierContext,
  ): Promise<SupplierHotelDetails | null> {
    const outcome = await callSupplier(ctx, this.#deps(this.#hms), {
      method: 'POST',
      path: '/hms/v3/hotel/static-detail',
      body: { hid: String(req.supplierHotelId) },
    }, (res) => ({ ok: true as const, value: res.body }), { repeatable: true });

    if (!outcome.ok) return null;

    const detail = toStaticDetail(outcome.value, this.#images);
    if (detail.name === undefined) return null;

    return {
      supplier: this.code,
      supplierHotelId: req.supplierHotelId,
      name: detail.name,
      ...(detail.description !== undefined ? { description: detail.description } : {}),
      ...(detail.address !== undefined ? { address: detail.address } : {}),
      ...(detail.city !== undefined ? { city: detail.city } : {}),
      ...(detail.location !== undefined ? { location: detail.location } : {}),
      ...(detail.starRating !== undefined ? { starRating: detail.starRating } : {}),
      imageUrls: detail.imageUrls,
      amenityLabels: detail.amenityLabels,
      ...(detail.checkInTime !== undefined ? { checkInTime: detail.checkInTime } : {}),
      ...(detail.checkOutTime !== undefined ? { checkOutTime: detail.checkOutTime } : {}),
      policies: detail.policies,
    };
  }

  // ── Rates ─────────────────────────────────────────────────────────────────

  async getRates(req: SupplierRatesRequest, ctx: SupplierContext): Promise<SupplierRatesResult> {
    const startedAt = this.#now();
    let nationalityId: string;
    try {
      nationalityId = await this.#resolveNationality(req.nationality);
    } catch {
      return {
        supplier: this.code,
        status: 'ERROR',
        rates: [],
        responseTimeMs: this.#now() - startedAt,
        error: supplierError('SUPPLIER_BAD_REQUEST', 'could not resolve a TripJack nationality id'),
      };
    }

    const correlationId =
      readString(asRecord(req.supplierState), 'correlationId') ?? this.#newCorrelationId();

    const outcome = await callSupplier(ctx, this.#deps(this.#hms), {
      method: 'POST',
      path: '/hms/v3/hotel/pricing',
      body: buildPricingRequest({
        hid: String(req.supplierHotelId),
        stay: req.stay,
        occupancy: req.occupancy,
        currency: ctx.currency,
        nationalityId,
        correlationId,
      }),
    }, (res) => {
      const reported = tjReportedFailure(res.body);
      if (reported !== null) {
        return { ok: false, error: supplierError('SUPPLIER_NO_AVAILABILITY', reported) };
      }
      return { ok: true, value: res.body };
    }, { repeatable: true });

    if (!outcome.ok) {
      // TripJack answers a sold-out hotel with a 400 and an empty option list,
      // which is an availability fact rather than a fault. Reporting it as an
      // error would send a healthy hotel to the circuit breaker.
      const soldOut =
        outcome.error.code === 'SUPPLIER_BAD_REQUEST' ||
        outcome.error.code === 'SUPPLIER_NO_AVAILABILITY';
      return {
        supplier: this.code,
        status: soldOut ? 'EMPTY' : 'ERROR',
        rates: [],
        responseTimeMs: outcome.durationMs,
        ...(soldOut ? {} : { error: outcome.error }),
      };
    }

    const body = outcome.value;
    const reviewHash = readString(body, 'reviewHash');
    /**
     * Mapped defensively, exactly as the search path is (C-4).
     *
     * `toSupplierRate` reaches domain constructors that THROW on a value they
     * cannot represent — a total outside the safe-integer range, a negative tax
     * component. This runs outside `callSupplier`'s parse guard, so an
     * unguarded `.map()` turns one bad option into a rejected `getRates`. C-4
     * fixed exactly that for the listing mapper and the hardening was never
     * carried across to this one, which is the mapper the whole enrichment
     * stage calls.
     */
    const rates = mapDefensively(
      readArray(body, 'options'),
      (option) =>
        toSupplierRate(option, {
          currency: ctx.currency,
          requestedOccupancy: req.occupancy,
          correlationId,
          hid: String(req.supplierHotelId),
          ...(reviewHash !== undefined ? { reviewHash } : {}),
        }),
      (error, index) =>
        ctx.logger.warn('dropped an unmappable rate option', {
          index,
          reason: error instanceof Error ? error.message : String(error),
        }),
    ).filter((r): r is SupplierRate => r !== null);

    return {
      supplier: this.code,
      status: rates.length > 0 ? 'SUCCESS' : 'EMPTY',
      rates,
      responseTimeMs: outcome.durationMs,
    };
  }

  // ── Precheck ──────────────────────────────────────────────────────────────

  /**
   * TripJack's Review. Re-prices the option and issues the `bookingId` that
   * Book consumes, so the id is carried forward in `supplierState`.
   *
   * This reports what TripJack will honour. It does NOT decide whether that
   * matches what we quoted — that comparison is `domain/revalidation`, shared
   * by every supplier, because a per-supplier tolerance rule is a per-supplier
   * chance to get it wrong.
   */
  async precheck(
    req: SupplierPrecheckRequest,
    ctx: SupplierContext,
  ): Promise<SupplierPrecheckResult> {
    const outcome = await callSupplier(ctx, this.#deps(this.#hms), {
      method: 'POST',
      path: '/hms/v3/hotel/review',
      body: buildReviewRequest({
        supplierRateRef: req.supplierRateRef,
        supplierState: req.supplierState,
      }),
    }, (res) => {
      const reported = tjReportedFailure(res.body);
      if (reported !== null) {
        return { ok: false, error: supplierError('SUPPLIER_RATE_EXPIRED', reported) };
      }
      return { ok: true, value: res.body };
      // Repeatable: review re-prices, it does not commit anything.
    }, { repeatable: true });

    if (!outcome.ok) {
      return { supplier: this.code, available: false, error: outcome.error };
    }

    const body = outcome.value;
    const option = this.#reviewOption(body);
    const cost = costFromOption(option, ctx.currency);
    if (cost === null) {
      return {
        supplier: this.code,
        available: false,
        error: supplierError('SUPPLIER_MALFORMED_RESPONSE', 'review returned no priced option'),
      };
    }

    const cancellation = readRecord(option, 'cancellation');
    const roomInfo = asRecord(readArray(option, 'roomInfo')[0]);
    const bookingId = readString(body, 'bookingId');
    const rateRef = readString(option, 'id', 'optionId') ?? req.supplierRateRef;

    return {
      supplier: this.code,
      available: true,
      cost,
      room: room({ name: readString(roomInfo, 'name') ?? readString(option, 'roomName') ?? 'Room' }),
      board: classifyBoard(readString(roomInfo, 'mealBasis') ?? readString(option, 'mealBasis')),
      cancellation: deriveCancellationTerms({
        ...(readRecord(option, 'cancellation')['isRefundable'] === true ? { explicit: true } : {}),
        ...(readRecord(option, 'cancellation')['isRefundable'] === false ? { explicit: false } : {}),
        windows: readArray(cancellation, 'penalties')
          .map((p) => {
            const from = readString(p, 'fromDate', 'from');
            const amount = readNumber(p, 'amount') ?? 0;
            return from === undefined
              ? null
              : { from, penalty: { minor: Math.round(amount * 100), currency: cost.currency } };
          })
          .filter((w): w is NonNullable<typeof w> => w !== null),
      }),
      supplierRateRef: rateRef,
      supplierState: {
        ...req.supplierState,
        optionId: rateRef,
        ...(bookingId !== undefined ? { bookingId } : {}),
      },
    };
  }

  /** Review nests its option differently across responses. */
  #reviewOption(body: unknown): unknown {
    const direct = readArray(body, 'options')[0];
    if (direct !== undefined) return direct;
    const hotel = readRecord(body, 'hotel');
    const nested = readArray(hotel, 'options')[0];
    if (nested !== undefined) return nested;
    const single = asRecord(body)['option'];
    return single ?? body;
  }

  // ── Book ──────────────────────────────────────────────────────────────────

  /** Book returns an order that confirms asynchronously: 180 s at 5 s intervals. */

  async book(req: SupplierBookRequest, ctx: SupplierContext): Promise<SupplierBookResult> {
    const bookingId = readString(asRecord(req.supplierState), 'bookingId');
    if (bookingId === undefined) {
      // Book consumes the id Review issued. Without it there is nothing to
      // book, and inventing one would create an order nobody can reconcile.
      return {
        supplier: this.code,
        status: 'FAILED',
        error: supplierError(
          'SUPPLIER_BAD_REQUEST',
          'TripJack book requires the bookingId issued by review',
        ),
      };
    }

    if (req.holdOnly) {
      // `/oms/v3/hotel/book` commits. TripJack's hold is a different call and is
      // not implemented, and ignoring the flag would answer "hold this room"
      // with a paid, confirmed reservation.
      return {
        supplier: this.code,
        status: 'FAILED',
        error: supplierError('SUPPLIER_BAD_REQUEST', 'TripJack holds are not implemented'),
      };
    }

    const party = allocateGuests(req.occupancy, req.guests);
    if (!party.ok) {
      return {
        supplier: this.code,
        status: 'FAILED',
        error: supplierError('SUPPLIER_BAD_REQUEST', party.reason),
      };
    }

    const outcome = await callSupplier(ctx, this.#deps(this.#oms), {
      method: 'POST',
      path: '/oms/v3/hotel/book',
      body: buildBookRequest({ bookingId, rooms: party.rooms, lead: party.lead }),
      headers: { 'x-idempotency-key': req.idempotencyKey },
    }, (res) => {
      const reported = tjReportedFailure(res.body);
      if (reported !== null) {
        return { ok: false, error: supplierError('SUPPLIER_UNKNOWN_ERROR', reported) };
      }
      return { ok: true, value: res.body };
    });

    if (!outcome.ok) {
      // A commit whose outcome we do not know is PENDING, not FAILED: TripJack
      // may hold the order regardless, and `getBookingStatus` is how that gets
      // settled. Calling it failed refunds a booking that exists.
      return {
        supplier: this.code,
        status: mayHaveBooked(outcome.error.code) ? 'PENDING' : 'FAILED',
        error: outcome.error,
        ...(mayHaveBooked(outcome.error.code)
          ? { supplierBookingRef: bookingId, poll: TJ_BOOK_POLL }
          : {}),
      };
    }

    const order = readRecord(outcome.value, 'order');
    const status = this.#mapBookStatus(readString(order, 'status') ?? readString(outcome.value, 'status'));

    return {
      supplier: this.code,
      status,
      supplierBookingRef: bookingId,
      ...(readString(outcome.value, 'hotelConfirmationNumber') !== undefined
        ? { hotelConfirmationNumber: readString(outcome.value, 'hotelConfirmationNumber') as string }
        : {}),
      // Only where there is something to poll for. `poll` on a CONFIRMED order
      // invites a caller to wait for a confirmation it already has.
      ...(status === 'PENDING' ? { poll: TJ_BOOK_POLL } : {}),
    };
  }

  #mapBookStatus(raw: string | undefined): SupplierBookResult['status'] {
    switch ((raw ?? '').toUpperCase()) {
      case 'SUCCESS':
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'ON_HOLD':
        return 'ON_HOLD';
      case 'ABORTED':
      case 'FAILED':
      case 'CANCELLED':
        return 'FAILED';
      default:
        // Unknown means unknown. Treating it as failed would refund a booking
        // the hotel may still confirm; the poller resolves it.
        return 'PENDING';
    }
  }

  async getBookingStatus(
    supplierBookingRef: string,
    ctx: SupplierContext,
  ): Promise<SupplierBookingStatusResult> {
    const outcome = await callSupplier(ctx, this.#deps(this.#oms), {
      method: 'POST',
      path: '/oms/v3/hotel/booking-details',
      body: { bookingId: supplierBookingRef },
    }, (res) => ({ ok: true as const, value: res.body }), { repeatable: true });

    if (!outcome.ok) {
      return { supplier: this.code, status: 'PENDING', error: outcome.error };
    }

    const order = readRecord(outcome.value, 'order');
    const raw = (readString(order, 'status') ?? '').toUpperCase();
    if (raw === 'CANCELLED') return { supplier: this.code, status: 'CANCELLED' };

    const hotelConfirmationNumber = readString(outcome.value, 'hotelConfirmationNumber');
    return {
      supplier: this.code,
      status: this.#mapBookStatus(raw),
      ...(hotelConfirmationNumber !== undefined ? { hotelConfirmationNumber } : {}),
    };
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(req: SupplierCancelRequest, ctx: SupplierContext): Promise<SupplierCancelResult> {
    const outcome = await callSupplier(ctx, this.#deps(this.#oms), {
      method: 'POST',
      path: `/oms/v3/hotel/cancel-booking/${encodeURIComponent(req.supplierBookingRef)}`,
    }, (res) => {
      const reported = tjReportedFailure(res.body);
      if (reported !== null) {
        return { ok: false, error: supplierError('SUPPLIER_UNKNOWN_ERROR', reported) };
      }
      return { ok: true, value: res.body };
    });

    if (!outcome.ok) {
      // Same asymmetry as book, in the other direction: a cancel whose outcome
      // is unknown may well have gone through, and telling the customer it was
      // rejected leaves them expecting a stay that no longer exists.
      return {
        supplier: this.code,
        status: mayHaveBooked(outcome.error.code) ? 'PENDING' : 'REJECTED',
        error: outcome.error,
      };
    }

    /**
     * TripJack's success signal is `status.success`, not a top-level status
     * string.
     *
     * Reading only the string found nothing on the recorded shape — `status` is
     * an OBJECT here — so every successful cancellation was reported as
     * PENDING. Nothing polls a pending cancellation, so the booking sat in
     * `CANCELLATION_PENDING` and the customer was never refunded for a stay
     * TripJack had already released.
     *
     * `tjReportedFailure` above has already rejected an unsuccessful response,
     * so reaching here with a cancellation reference means TripJack accepted
     * it. Whether it then settles asynchronously is one of the things the
     * unobtainable specification would answer (OPEN-ISSUES §3.1); the
     * reconciliation path is what covers being wrong.
     */
    const reference = readString(outcome.value, 'cancellationId', 'amendmentId');
    const reported = (readString(outcome.value, 'status') ?? '').toUpperCase();
    const accepted = reported === 'CANCELLED' || reported === 'SUCCESS' || reference !== undefined;

    return {
      supplier: this.code,
      status: accepted ? 'CANCELLED' : 'PENDING',
      ...(reference !== undefined ? { supplierCancellationRef: reference } : {}),
    };
  }
}

/** Convenience for the composition root and for tests. */
export const tripJackSupplierHotelId = supplierHotelId;
export type { CurrencyCode, CountryCode };
