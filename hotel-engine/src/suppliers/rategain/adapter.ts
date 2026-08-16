import type { SupplierCode } from '../../domain/shared/brand.js';
import { toMajor } from '../../domain/shared/money.js';
import type { HotelSupplier, SupplierCapabilities } from '../contract/hotel-supplier.js';
import type { SupplierContext } from '../contract/context.js';
import type {
  SupplierBookRequest,
  SupplierBookResult,
  SupplierCancelRequest,
  SupplierCancelResult,
  SupplierHotelDetails,
  SupplierHotelDetailsRequest,
  SupplierPrecheckRequest,
  SupplierPrecheckResult,
  SupplierRatesRequest,
  SupplierRatesResult,
  SupplierSearchRequest,
  SupplierSearchResult,
} from '../contract/dto.js';
import { mayHaveBooked, supplierError } from '../contract/errors.js';
import { allocateGuests, placeholderParty } from '../contract/guests.js';
import type { CallDeps } from '../common/call.js';
import { callSupplier } from '../common/call.js';
import { CircuitBreaker } from '../common/circuit-breaker.js';
import type { HttpTransport } from '../common/http.js';
import { createImageResolver, type ImageResolver } from '../common/images.js';
import { asRecord, mapDefensively, readArray, readNumber, readRecord, readString } from '../common/parse.js';
import {
  DEFAULT_RATEGAIN_TUNING,
  RATEGAIN,
  RATEGAIN_CAPABILITIES,
  type RateGainCredentials,
  type RateGainTuning,
} from './config.js';
import {
  RG_RES_STATUS_CONFIRMED,
  buildBestPropertiesRequest,
  buildCancelRequest,
  buildGetProductsRequest,
  buildReservationRequest,
} from './request.js';
import {
  isRgSuccess,
  precheckRate,
  rgDescription,
  rgTotalRecords,
  toProductsHotel,
  toSearchHotel,
} from './response.js';

export interface RateGainAdapterDeps {
  readonly transport: HttpTransport;
  readonly credentials: RateGainCredentials;
  readonly newEchoToken: () => string;
  readonly tuning?: RateGainTuning;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly breaker?: CircuitBreaker;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * RateGain Smart Distribution, per API specification v1.5.3.
 *
 * Nothing on this class throws; every method resolves with a status and, on
 * failure, a normalised error (ADR-0004). Costs come back as `SupplierCost`,
 * never a customer price.
 */
export class RateGainAdapter implements HotelSupplier {
  readonly code: SupplierCode = RATEGAIN;
  readonly capabilities: SupplierCapabilities = RATEGAIN_CAPABILITIES;

  readonly #transport: HttpTransport;
  readonly #images: ImageResolver;
  readonly #newEchoToken: () => string;
  readonly #tuning: RateGainTuning;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #breaker: CircuitBreaker;
  readonly #now: () => number;
  readonly #sleep: ((ms: number) => Promise<void>) | undefined;

  constructor(deps: RateGainAdapterDeps) {
    this.#transport = deps.transport;
    this.#images = createImageResolver(deps.credentials.imageBaseUrl);
    this.#newEchoToken = deps.newEchoToken;
    this.#tuning = deps.tuning ?? DEFAULT_RATEGAIN_TUNING;
    this.#timeoutMs = deps.timeoutMs ?? 14_000;
    this.#maxRetries = deps.maxRetries ?? 1;
    this.#breaker = deps.breaker ?? new CircuitBreaker({ failureThreshold: 5, openMs: 30_000 });
    this.#now = deps.now ?? Date.now;
    this.#sleep = deps.sleep;
  }

  get #deps(): CallDeps {
    return {
      transport: this.#transport,
      breaker: this.#breaker,
      timeoutMs: this.#timeoutMs,
      maxRetries: this.#maxRetries,
      now: this.#now,
      ...(this.#sleep !== undefined ? { sleep: this.#sleep } : {}),
    };
  }

  // ── Search ────────────────────────────────────────────────────────────────

  /**
   * `bestproperties`: properties with an indicative price and **no bookable
   * rates**.
   *
   * The spec is explicit that a hotel object carries a single `price`
   * ("Starting price of the hotel") and no rate key. Rates require a second
   * `getproducts` call, which `capabilities.searchReturnsRates === false` tells
   * the orchestrator. Returning hotels with `rates: []` and an `indicativeCost`
   * is therefore the correct shape — filtering them out, as an earlier version
   * did, would have dropped every result of every RateGain search.
   *
   * One KLAR page consumes several supplier pages, fetched concurrently.
   * RateGain returns ten properties per page against TripJack's densified ~100,
   * so asking for one page makes RateGain look like it never has the cheapest
   * rate when in truth it was barely asked.
   */
  async search(req: SupplierSearchRequest, ctx: SupplierContext): Promise<SupplierSearchResult> {
    const startedAt = this.#now();
    const firstPage = (req.page - 1) * this.#tuning.pagesPerSearch + 1;

    const probe = buildBestPropertiesRequest({
      target: req.target,
      stay: req.stay,
      occupancy: req.occupancy,
      nationality: req.nationality,
      currency: ctx.currency,
      pageNo: firstPage,
      echoToken: this.#newEchoToken(),
      minRadiusKm: this.#tuning.minRadiusKm,
      maxRadiusKm: this.#tuning.maxRadiusKm,
    });

    if (probe === null) {
      return this.#emptySearch('ERROR', startedAt, {
        error: supplierError(
          'SUPPLIER_BAD_REQUEST',
          `RateGain cannot search target kind "${req.target.kind}"`,
        ),
      });
    }

    const lead = await this.#bestProperties(ctx, probe);
    if (!lead.ok) {
      const timedOut =
        lead.error.code === 'SUPPLIER_TIMEOUT' || lead.error.code === 'SUPPLIER_CANCELLED';
      return this.#emptySearch(
        lead.error.code === 'SUPPLIER_CIRCUIT_OPEN'
          ? 'CIRCUIT_OPEN'
          : timedOut
            ? 'TIMEOUT'
            : 'ERROR',
        startedAt,
        { error: lead.error },
      );
    }

    const total = rgTotalRecords(lead.value);
    const rawHotels: unknown[] = [...readArray(lead.value, 'body')];

    // Only request pages that exist, and reuse the shape that just worked
    // rather than re-deciding geo-vs-code per page.
    const extraPages: number[] = [];
    for (let p = firstPage + 1; p < firstPage + this.#tuning.pagesPerSearch; p++) {
      if ((p - 1) * this.#tuning.supplierPageSize >= total) break;
      extraPages.push(p);
    }

    let partial = false;
    if (extraPages.length > 0 && !ctx.deadline.hasPassed(this.#now())) {
      const settled = await Promise.all(
        extraPages.map((pageNo) => this.#bestProperties(ctx, { ...probe, pageNo })),
      );
      for (const outcome of settled) {
        // One page failing loses that page, not the search.
        if (outcome.ok) rawHotels.push(...readArray(outcome.value, 'body'));
        else partial = true;
      }
    } else if (extraPages.length > 0) {
      partial = true;
    }

    const hotels = mapDefensively(
      rawHotels,
      (raw) => toSearchHotel(raw, { currency: ctx.currency, images: this.#images }),
      (error, index) =>
        ctx.logger.warn('dropped an unmappable property', {
          index,
          reason: error instanceof Error ? error.message : String(error),
        }),
    );

    const consumed = (firstPage + this.#tuning.pagesPerSearch - 1) * this.#tuning.supplierPageSize;

    return {
      supplier: this.code,
      status: hotels.length === 0 ? 'EMPTY' : partial ? 'PARTIAL' : 'SUCCESS',
      hotels,
      pageInfo: {
        hasMore: hotels.length > 0 && consumed < total,
        supplierPagesConsumed: 1 + extraPages.length,
        supplierReportedTotal: total,
      },
      responseTimeMs: this.#now() - startedAt,
    };
  }

  #emptySearch(
    status: SupplierSearchResult['status'],
    startedAt: number,
    extra: { error?: SupplierSearchResult['error'] },
  ): SupplierSearchResult {
    return {
      supplier: this.code,
      status,
      hotels: [],
      pageInfo: { hasMore: false, supplierPagesConsumed: 0 },
      responseTimeMs: this.#now() - startedAt,
      ...(extra.error !== undefined ? { error: extra.error } : {}),
    };
  }

  async #bestProperties(ctx: SupplierContext, body: unknown) {
    return callSupplier(ctx, this.#deps, {
      method: 'POST',
      path: '/api/SmartDistribution/bestproperties',
      body,
    }, (res) => {
      if (!isRgSuccess(res.body)) {
        return {
          ok: false,
          error: supplierError(
            'SUPPLIER_NO_AVAILABILITY',
            rgDescription(res.body) ?? 'RateGain reported a non-success status',
          ),
        };
      }
      return { ok: true, value: res.body };
    }, { repeatable: true });
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  /**
   * RateGain has no static-content endpoint: property detail arrives with
   * availability, from `getproducts`. Returning null is the honest answer, and
   * the property module fills the gap from the canonical catalogue.
   */
  async getHotelDetails(
    _req: SupplierHotelDetailsRequest,
    _ctx: SupplierContext,
  ): Promise<SupplierHotelDetails | null> {
    return Promise.resolve(null);
  }

  // ── Rates ─────────────────────────────────────────────────────────────────

  /**
   * `getproducts`: the bookable rates. Required before any RateGain property
   * can enter price comparison.
   */
  async getRates(req: SupplierRatesRequest, ctx: SupplierContext): Promise<SupplierRatesResult> {
    const outcome = await callSupplier(ctx, this.#deps, {
      method: 'POST',
      path: '/api/SmartDistribution/getproducts',
      body: buildGetProductsRequest({
        propertyId: String(req.supplierHotelId),
        stay: req.stay,
        occupancy: req.occupancy,
        nationality: req.nationality,
        currency: ctx.currency,
        echoToken: this.#newEchoToken(),
        ...(req.supplierState !== undefined ? { supplierState: req.supplierState } : {}),
      }),
    }, (res) => {
      if (!isRgSuccess(res.body)) {
        return {
          ok: false,
          error: supplierError(
            'SUPPLIER_NO_AVAILABILITY',
            rgDescription(res.body) ?? 'RateGain returned no products',
          ),
        };
      }
      return { ok: true, value: res.body };
    }, { repeatable: true });

    if (!outcome.ok) {
      const empty = outcome.error.code === 'SUPPLIER_NO_AVAILABILITY';
      return {
        supplier: this.code,
        status: empty ? 'EMPTY' : 'ERROR',
        rates: [],
        responseTimeMs: outcome.durationMs,
        ...(empty ? {} : { error: outcome.error }),
      };
    }

    const hotel = toProductsHotel(readRecord(outcome.value, 'body'), {
      currency: ctx.currency,
      requestedOccupancy: req.occupancy,
      images: this.#images,
    });
    const rates = hotel?.rates ?? [];

    return {
      supplier: this.code,
      status: rates.length > 0 ? 'SUCCESS' : 'EMPTY',
      rates,
      responseTimeMs: outcome.durationMs,
    };
  }

  // ── Precheck ──────────────────────────────────────────────────────────────

  /**
   * `PreCheckReservation`. Reports what RateGain will honour and returns the
   * `allocationDetails` and confirmation identifiers that commit needs.
   *
   * Whether the fresh figure still matches our quote is decided by
   * `domain/revalidation`, shared across suppliers — a per-supplier tolerance
   * rule is a per-supplier chance to get it wrong.
   */
  async precheck(
    req: SupplierPrecheckRequest,
    ctx: SupplierContext,
  ): Promise<SupplierPrecheckResult> {
    const state = asRecord(req.supplierState);
    const quotedMajor = readNumber(state, 'quotedTotalMajor');
    if (quotedMajor === undefined) {
      // `BookingRate` is required and must be the net the rate quoted. Sending
      // zero would either be rejected or, worse, accepted against a price
      // nobody agreed to.
      return {
        supplier: this.code,
        available: false,
        error: supplierError(
          'SUPPLIER_BAD_REQUEST',
          'RateGain precheck requires the net total the rate quoted',
        ),
      };
    }

    const outcome = await callSupplier(ctx, this.#deps, {
      method: 'POST',
      path: '/api/SmartDistribution/PreCheckReservation',
      body: buildReservationRequest({
        propertyId: String(req.supplierHotelId),
        rateRef: req.supplierRateRef,
        stay: req.stay,
        // Nobody has named a guest yet; the envelope still needs the slots.
        rooms: placeholderParty(req.occupancy),
        nationality: req.nationality,
        currency: ctx.currency,
        bookingRateMajor: quotedMajor,
        ...this.#reservationIdentifiers(state),
        echoToken: this.#newEchoToken(),
        session: this.#newEchoToken(),
        timestamp: new Date(this.#now()).toISOString(),
        resStatus: RG_RES_STATUS_CONFIRMED,
      }),
    }, (res) => {
      if (!isRgSuccess(res.body)) {
        return {
          ok: false,
          error: supplierError(
            'SUPPLIER_RATE_EXPIRED',
            rgDescription(res.body) ?? 'precheck rejected',
          ),
        };
      }
      return { ok: true, value: res.body };
      // Repeatable: `PreCheckReservation` re-prices, it does not reserve.
    }, { repeatable: true });

    if (!outcome.ok) {
      return { supplier: this.code, available: false, error: outcome.error };
    }

    const fresh = precheckRate(outcome.value, {
      currency: ctx.currency,
      requestedOccupancy: req.occupancy,
      propertyId: String(req.supplierHotelId),
      expectedRateRef: req.supplierRateRef,
    });

    if (fresh === null) {
      return {
        supplier: this.code,
        available: false,
        error: supplierError('SUPPLIER_MALFORMED_RESPONSE', 'precheck returned no priced rate'),
      };
    }

    const response = readRecord(readRecord(outcome.value, 'body'), 'preCheckResponse');
    const sellingRateMajor = readNumber(response, 'sellingRate');

    return {
      supplier: this.code,
      available: true,
      cost: fresh.cost,
      room: fresh.room,
      board: fresh.board,
      cancellation: fresh.cancellation,
      // The MSP as precheck re-confirms it. It is a term of the distribution
      // agreement — "partner must sell at or above" — so it has to reach the
      // pricing engine at the booking gate, not only at search.
      ...(fresh.minimumSellingPrice !== undefined
        ? { minimumSellingPrice: fresh.minimumSellingPrice }
        : {}),
      supplierRateRef: fresh.supplierRateRef,
      supplierState: {
        ...req.supplierState,
        ...fresh.supplierState,
        // Commit must echo exactly what precheck confirmed.
        quotedTotalMajor: toMajor(fresh.cost.total),
        ...(sellingRateMajor !== undefined ? { sellingRateMajor } : {}),
      },
    };
  }

  /** Identifiers RateGain requires on the reservation envelope. */
  #reservationIdentifiers(state: Record<string, unknown>): {
    roomTypeCode?: string;
    boardName?: string;
    allocationDetails?: string;
    propertyCode?: string;
    brandCode?: string;
  } {
    const roomTypeCode = readString(state, 'roomTypeCode');
    const boardName = readString(state, 'boardName');
    // Spec: "use allocationDetails if it is not null on precheck and
    // CommitReservation". Dropping it makes the supplier reject the booking.
    const allocationDetails = readString(state, 'allocationDetails');
    const propertyCode = readString(state, 'propertyCode');
    const brandCode = readString(state, 'brandCode');
    return {
      ...(roomTypeCode !== undefined ? { roomTypeCode } : {}),
      ...(boardName !== undefined ? { boardName } : {}),
      ...(allocationDetails !== undefined ? { allocationDetails } : {}),
      ...(propertyCode !== undefined ? { propertyCode } : {}),
      ...(brandCode !== undefined ? { brandCode } : {}),
    };
  }

  // ── Book ──────────────────────────────────────────────────────────────────

  async book(req: SupplierBookRequest, ctx: SupplierContext): Promise<SupplierBookResult> {
    const state = asRecord(req.supplierState);
    const quotedMajor = readNumber(state, 'quotedTotalMajor');
    if (quotedMajor === undefined) {
      return {
        supplier: this.code,
        status: 'FAILED',
        error: supplierError(
          'SUPPLIER_BAD_REQUEST',
          'RateGain commit requires the totalNet that precheck confirmed',
        ),
      };
    }
    const sellingRateMajor = readNumber(state, 'sellingRateMajor');

    if (req.holdOnly) {
      // `capabilities.supportsHold` is false and `CommitReservation` sends
      // ResStatus 1 — Confirmed. Ignoring the flag would answer a request to
      // hold a room with a booking the customer is liable for.
      return {
        supplier: this.code,
        status: 'FAILED',
        error: supplierError('SUPPLIER_BAD_REQUEST', 'RateGain does not support holds'),
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

    const outcome = await callSupplier(ctx, this.#deps, {
      method: 'POST',
      path: '/api/SmartDistribution/CommitReservation',
      body: buildReservationRequest({
        propertyId: String(req.supplierHotelId),
        rateRef: req.supplierRateRef,
        stay: req.stay,
        rooms: party.rooms,
        nationality: req.nationality,
        currency: ctx.currency,
        bookingRateMajor: quotedMajor,
        // Spec 1.5.3 added this for the B2C net-rate-plus-commission model.
        ...(sellingRateMajor !== undefined ? { sellingRateMajor } : {}),
        ...this.#reservationIdentifiers(state),
        demandBookingId: String(req.klarBookingId),
        echoToken: req.idempotencyKey,
        session: req.idempotencyKey,
        timestamp: new Date(this.#now()).toISOString(),
        resStatus: RG_RES_STATUS_CONFIRMED,
        ...(req.specialRequests !== undefined ? { specialRequests: req.specialRequests } : {}),
      }),
    }, (res) => {
      if (!isRgSuccess(res.body)) {
        return {
          ok: false,
          error: supplierError('SUPPLIER_UNKNOWN_ERROR', rgDescription(res.body) ?? 'commit rejected'),
        };
      }
      return { ok: true, value: res.body };
      // Deliberately NOT repeatable. `EchoToken` and `DemandBookingId` are sent
      // so RateGain *can* deduplicate, but no specification we hold promises it
      // does, and the price of being wrong is a second reservation.
    });

    if (!outcome.ok) {
      // Unknown is not failed. RateGain answering 500 — or answering in a shape
      // we cannot read — has very often still written the reservation.
      return {
        supplier: this.code,
        status: mayHaveBooked(outcome.error.code) ? 'PENDING' : 'FAILED',
        error: outcome.error,
      };
    }

    // Spec §7: the booking lives at body.booking, and its confirmation number
    // is lower-camel. Reading a top-level `ConfirmationNumber` finds nothing and
    // reports every successful booking as pending.
    const booking = readRecord(readRecord(outcome.value, 'body'), 'booking');
    const confirmationNumber = readString(booking, 'confirmationNumber');

    if (confirmationNumber === undefined) {
      // A commit we cannot reference is a commit we cannot cancel. Reporting it
      // as pending sends it to reconciliation instead of announcing a
      // confirmation nobody can act on.
      return {
        supplier: this.code,
        status: 'PENDING',
        error: supplierError(
          'SUPPLIER_MALFORMED_RESPONSE',
          'commit succeeded without a confirmation number',
        ),
      };
    }

    const status = (readString(booking, 'status') ?? '').toUpperCase();
    const reservationId = readString(booking, 'reservationId');

    return {
      supplier: this.code,
      status: status === 'CONFIRMED' || status === '' ? 'CONFIRMED' : 'PENDING',
      supplierBookingRef: confirmationNumber,
      // Deliberately NOT reported as a hotel confirmation number: RateGain's
      // `reservationId` is its own internal tracking id, and the commit response
      // carries no PMS number at all. It goes to the state cancel will need.
      supplierState: {
        ...(reservationId !== undefined ? { reservationId } : {}),
        ...(readString(state, 'propertyId') !== undefined
          ? { propertyId: readString(state, 'propertyId') as string }
          : { propertyId: String(req.supplierHotelId) }),
        ...(readString(state, 'propertyCode') !== undefined
          ? { propertyCode: readString(state, 'propertyCode') as string }
          : {}),
      },
    };
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  /**
   * `CancelReservation` needs more than a confirmation number: the spec marks
   * `ReservationId`, `PropertyId` and `PropertyCode` required too. They exist
   * only in the commit response, so the booking record carries them here —
   * without them a booking can be made and not unmade.
   */
  async cancel(req: SupplierCancelRequest, ctx: SupplierContext): Promise<SupplierCancelResult> {
    const state = asRecord(req.supplierState);
    const reservationId = readString(state, 'reservationId', 'ReservationId');
    const propertyId = readString(state, 'propertyId', 'PropertyId');
    const propertyCode = readString(state, 'propertyCode', 'PropertyCode');

    const outcome = await callSupplier(ctx, this.#deps, {
      method: 'POST',
      path: '/api/SmartDistribution/CancelReservation',
      body: buildCancelRequest({
        confirmationNumber: req.supplierBookingRef,
        ...(reservationId !== undefined ? { reservationId } : {}),
        ...(propertyId !== undefined ? { propertyId } : {}),
        ...(propertyCode !== undefined ? { propertyCode } : {}),
        demandCancelId: this.#newEchoToken(),
        echoToken: this.#newEchoToken(),
        timestamp: new Date(this.#now()).toISOString(),
      }),
    }, (res) => {
      if (!isRgSuccess(res.body)) {
        return {
          ok: false,
          error: supplierError('SUPPLIER_UNKNOWN_ERROR', rgDescription(res.body) ?? 'cancel rejected'),
        };
      }
      return { ok: true, value: res.body };
    });

    if (!outcome.ok) {
      return {
        supplier: this.code,
        status: mayHaveBooked(outcome.error.code) ? 'PENDING' : 'REJECTED',
        error: outcome.error,
      };
    }

    const body = readRecord(outcome.value, 'body');
    const status = (readString(body, 'status') ?? '').toUpperCase();
    const cancellationNumber = readString(body, 'cancellationNumber');

    return {
      supplier: this.code,
      status: status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
      ...(cancellationNumber !== undefined ? { supplierCancellationRef: cancellationNumber } : {}),
    };
  }
}
