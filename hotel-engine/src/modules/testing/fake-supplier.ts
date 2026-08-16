import {
  countryCode,
  supplierCode,
  supplierHotelId,
  type CurrencyCode,
  type SupplierCode,
} from '../../domain/shared/brand.js';
import { fromMajor } from '../../domain/shared/money.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms } from '../../domain/rate/cancellation.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { supplierCost, supplierCostFromTotal } from '../../domain/pricing/supplier-cost.js';
import type { HotelSupplier, SupplierCapabilities } from '../../suppliers/contract/hotel-supplier.js';
import type { SupplierContext } from '../../suppliers/contract/context.js';
import type {
  SupplierHotel,
  SupplierHotelDetails,
  SupplierRate,
  SupplierSearchResult,
  SupplierRatesResult,
} from '../../suppliers/contract/dto.js';
import { supplierError, type SupplierErrorCode } from '../../suppliers/contract/errors.js';
import type { SupplierConfig } from '../../suppliers/contract/registry.js';

/**
 * A supplier with scripted behaviour, for driving the orchestrator.
 *
 * Real adapters are covered by the shared contract suite; these exist to put
 * the *orchestrator* through the scenarios in the brief's Definition of Done —
 * one supplier cheaper, the other cheaper, one timing out, both failing, a
 * third supplier appearing.
 */

const INR = 'INR' as CurrencyCode;
const OCCUPANCY = occupancy([roomRequest(2, 0, [])]);

export interface FakeRateSpec {
  readonly ref: string;
  /** Stay total the supplier charges KLAR, in major units. */
  readonly totalMajor: number;
  readonly taxMajor?: number;
  readonly board?: string;
  readonly roomName?: string;
  readonly refundable?: boolean;
  readonly mspMajor?: number;
  readonly mspMandatory?: boolean;
}

export interface FakeHotelSpec {
  readonly id: string;
  readonly name: string;
  readonly city?: string;
  readonly location?: { lat: number; lng: number };
  readonly address?: string;
  /** ISO-3166 alpha-2, for tests that exercise region-aware markup. */
  readonly country?: string;
  readonly starRating?: number;
  readonly rates?: readonly FakeRateSpec[];
  /** A lead-in price, for suppliers whose search returns no bookable rates. */
  readonly indicativeMajor?: number;
  readonly amenities?: readonly string[];
}

export interface FakeDetailSpec {
  readonly name?: string;
  readonly description?: string;
  readonly policies?: readonly string[];
  readonly imageUrls?: readonly string[];
  readonly amenityLabels?: readonly string[];
  readonly checkInTime?: string;
  readonly checkOutTime?: string;
}

export interface FakeSupplierSpec {
  readonly code: string;
  readonly hotels?: readonly FakeHotelSpec[];
  /** Rates returned by `getRates`, keyed by supplier hotel id. */
  readonly ratesByHotel?: Readonly<Record<string, readonly FakeRateSpec[]>>;
  /** Static content returned by `getHotelDetails`, keyed by supplier hotel id. */
  readonly detailsByHotel?: Readonly<Record<string, FakeDetailSpec>>;
  readonly searchReturnsRates?: boolean;
  /** Fail search with this outcome instead of answering. */
  readonly searchFailure?: { status: SupplierSearchResult['status']; code: SupplierErrorCode };
  readonly ratesFailure?: SupplierErrorCode;
  /**
   * What a precheck confirms: a stay total in major units, or SOLD_OUT.
   * Absent means the supplier could not be asked at all.
   */
  readonly precheckAt?: number | 'SOLD_OUT';
  /**
   * How a commit answers. Absent means the supplier refuses, which keeps a test
   * that did not think about booking from accidentally booking.
   */
  readonly bookAs?: 'CONFIRMED' | 'ON_HOLD' | 'PENDING' | 'FAILED';
  readonly cancelAs?: 'CANCELLED' | 'PENDING' | 'REJECTED';
  /** Simulated latency, in the fake clock's terms. */
  readonly latencyMs?: number;
  readonly capabilities?: Partial<SupplierCapabilities>;
}

function toRate(spec: FakeRateSpec): SupplierRate {
  const cost =
    spec.taxMajor !== undefined
      ? supplierCostFromTotal({
          total: fromMajor(spec.totalMajor, INR),
          taxes: fromMajor(spec.taxMajor, INR),
          taxesIncludedInBase: false,
        })
      : supplierCost({ base: fromMajor(spec.totalMajor, INR), taxesIncludedInBase: true });

  return {
    supplierRateRef: spec.ref,
    room: room({ name: spec.roomName ?? 'Deluxe Room' }),
    board: classifyBoard(spec.board ?? 'Room Only'),
    occupancy: OCCUPANCY,
    cancellation: deriveCancellationTerms(
      spec.refundable === undefined
        ? {}
        : {
            explicit: spec.refundable,
            windows: spec.refundable
              ? [
                  { from: '2026-01-01T00:00:00Z', penalty: fromMajor(0, INR) },
                  { from: '2026-09-05T00:00:00Z', penalty: fromMajor(spec.totalMajor, INR) },
                ]
              : [],
          },
    ),
    cost,
    ...(spec.mspMajor !== undefined
      ? {
          minimumSellingPrice: {
            amount: fromMajor(spec.mspMajor, INR),
            mandatory: spec.mspMandatory ?? true,
          },
        }
      : {}),
    onHoldAllowed: false,
    supplierState: { ref: spec.ref },
  };
}

export function fakeSupplier(spec: FakeSupplierSpec): HotelSupplier {
  const code = supplierCode(spec.code);

  const toHotel = (h: FakeHotelSpec): SupplierHotel => ({
    supplier: code,
    supplierHotelId: supplierHotelId(h.id),
    name: h.name,
    ...(h.address !== undefined ? { address: h.address } : {}),
    ...(h.city !== undefined ? { city: h.city } : {}),
    ...(h.country !== undefined ? { countryCode: countryCode(h.country) } : {}),
    ...(h.location !== undefined ? { location: h.location } : {}),
    ...(h.starRating !== undefined ? { starRating: h.starRating } : {}),
    imageUrls: [],
    amenityLabels: h.amenities ?? [],
    rates: (h.rates ?? []).map(toRate),
    /**
     * Property-scoped state, for a supplier whose rates need a second call.
     *
     * RateGain's `getproducts` requires `PropertyCode` and `BrandCode`, both of
     * which arrive with the PROPERTY from `bestproperties` (A-1). A fake that
     * did not hand them out — and, below, did not refuse a rate call that
     * arrives without them — cannot see a caller that failed to carry them.
     */
    ...(spec.searchReturnsRates === false
      ? { supplierState: { propertyCode: `PC-${h.id}` } }
      : {}),
    ...(h.indicativeMajor !== undefined
      ? {
          indicativeCost: supplierCost({
            base: fromMajor(h.indicativeMajor, INR),
            taxesIncludedInBase: true,
          }),
        }
      : {}),
  });

  return {
    code,
    capabilities: {
      searchTargets: ['DEST_CODE', 'GEO', 'HOTEL_IDS', 'SINGLE_HOTEL'],
      searchReturnsRates: spec.searchReturnsRates ?? true,
      supportsHold: false,
      supportsAmendment: false,
      asyncBooking: false,
      countries: [],
      rateValidityMs: 900_000,
      maxConcurrency: 4,
      pageSize: 20,
      ...spec.capabilities,
    },

    search: (_req, _ctx: SupplierContext): Promise<SupplierSearchResult> => {
      if (spec.searchFailure !== undefined) {
        return Promise.resolve({
          supplier: code,
          status: spec.searchFailure.status,
          hotels: [],
          pageInfo: { hasMore: false, supplierPagesConsumed: 0 },
          responseTimeMs: spec.latencyMs ?? 0,
          error: supplierError(spec.searchFailure.code, 'scripted failure'),
        });
      }
      const hotels = (spec.hotels ?? []).map(toHotel);
      return Promise.resolve({
        supplier: code,
        status: hotels.length > 0 ? 'SUCCESS' : 'EMPTY',
        hotels,
        pageInfo: { hasMore: false, supplierPagesConsumed: 1, supplierReportedTotal: hotels.length },
        responseTimeMs: spec.latencyMs ?? 0,
      });
    },

    getHotelDetails: (req): Promise<SupplierHotelDetails | null> => {
      const detail = spec.detailsByHotel?.[String(req.supplierHotelId)];
      if (detail === undefined) return Promise.resolve(null);
      return Promise.resolve({
        supplier: code,
        supplierHotelId: req.supplierHotelId,
        name: detail.name ?? 'Hotel',
        ...(detail.description !== undefined ? { description: detail.description } : {}),
        ...(detail.checkInTime !== undefined ? { checkInTime: detail.checkInTime } : {}),
        ...(detail.checkOutTime !== undefined ? { checkOutTime: detail.checkOutTime } : {}),
        imageUrls: detail.imageUrls ?? [],
        amenityLabels: detail.amenityLabels ?? [],
        policies: detail.policies ?? [],
      });
    },

    getRates: (req): Promise<SupplierRatesResult> => {
      if (spec.ratesFailure !== undefined) {
        return Promise.resolve({
          supplier: code,
          status: 'ERROR',
          rates: [],
          responseTimeMs: spec.latencyMs ?? 0,
          error: supplierError(spec.ratesFailure, 'scripted rates failure'),
        });
      }
      // What a two-phase supplier does to a rate call assembled without the
      // identifiers only its search returns: it rejects it (A-1).
      if (spec.searchReturnsRates === false && req.supplierState?.['propertyCode'] === undefined) {
        return Promise.resolve({
          supplier: code,
          status: 'ERROR',
          rates: [],
          responseTimeMs: spec.latencyMs ?? 0,
          error: supplierError('SUPPLIER_BAD_REQUEST', 'PropertyCode is required'),
        });
      }
      const rates = (spec.ratesByHotel?.[String(req.supplierHotelId)] ?? []).map(toRate);
      return Promise.resolve({
        supplier: code,
        status: rates.length > 0 ? 'SUCCESS' : 'EMPTY',
        rates,
        responseTimeMs: spec.latencyMs ?? 0,
      });
    },

    /**
     * Scripted, because a precheck is now a flow rather than a stub.
     *
     * Absent, it reports a supplier that could not answer — distinct from a
     * sold-out room, which is what `precheckAt` scripts.
     */
    precheck: (req) => {
      if (spec.precheckAt === undefined) {
        return Promise.resolve({
          supplier: code,
          available: false,
          error: supplierError('SUPPLIER_UNKNOWN_ERROR', 'no precheck scripted'),
        });
      }
      if (spec.precheckAt === 'SOLD_OUT') {
        return Promise.resolve({ supplier: code, available: false });
      }
      // Re-confirm the SAME product at a possibly different price. Building a
      // bare rate here would change the board and the room as a side effect,
      // and a test for a price change would report a substitution instead.
      const template =
        [
          ...(spec.hotels ?? []).flatMap((h) => h.rates ?? []),
          ...Object.values(spec.ratesByHotel ?? {}).flat(),
        ].find((r) => r.ref === req.supplierRateRef) ?? { ref: req.supplierRateRef, totalMajor: 0 };
      const fresh = toRate({ ...template, totalMajor: spec.precheckAt });
      return Promise.resolve({
        supplier: code,
        available: true,
        cost: fresh.cost,
        room: fresh.room,
        board: fresh.board,
        cancellation: fresh.cancellation,
        supplierRateRef: req.supplierRateRef,
        supplierState: req.supplierState,
      });
    },
    book: (req) => {
      if (spec.bookAs === undefined || spec.bookAs === 'FAILED') {
        return Promise.resolve({
          supplier: code,
          status: 'FAILED' as const,
          error: supplierError('SUPPLIER_UNKNOWN_ERROR', 'no booking scripted'),
        });
      }
      return Promise.resolve({
        supplier: code,
        status: spec.bookAs,
        supplierBookingRef: `${String(code)}-BK-${String(req.klarBookingId)}`,
        // The identifiers a cancel will need, which only a commit response
        // carries (A-3).
        supplierState: { reservationId: 'RES-1', propertyId: String(req.supplierHotelId) },
        ...(spec.bookAs === 'PENDING'
          ? { poll: { intervalMs: 5_000, maxWaitMs: 180_000 } }
          : {}),
      });
    },
    cancel: () =>
      Promise.resolve(
        spec.cancelAs === undefined || spec.cancelAs === 'REJECTED'
          ? {
              supplier: code,
              status: 'REJECTED' as const,
              error: supplierError('SUPPLIER_UNKNOWN_ERROR', 'no cancellation scripted'),
            }
          : {
              supplier: code,
              status: spec.cancelAs,
              supplierCancellationRef: `${String(code)}-CXL-1`,
            },
      ),
  };
}

export function fakeConfig(code: string, over: Partial<SupplierConfig> = {}): SupplierConfig {
  return {
    code: supplierCode(code),
    enabled: true,
    priority: 0,
    searchTimeoutMs: 14_000,
    detailTimeoutMs: 20_000,
    bookTimeoutMs: 60_000,
    maxRetries: 1,
    maxConcurrency: 4,
    circuitBreaker: { failureThreshold: 5, openMs: 30_000 },
    countries: [],
    maintenanceMode: false,
    reliabilityScore: 50,
    ...over,
  };
}

export const TJ: SupplierCode = supplierCode('TJ');
export const RG: SupplierCode = supplierCode('RG');
export const SC: SupplierCode = supplierCode('SC');
