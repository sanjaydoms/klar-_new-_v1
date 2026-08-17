import { toMajor } from '../../domain/shared/money.js';
import type { HotelDetailResult, RoomProduct } from '../../domain/detail/detail-result.js';
import type { PriceGuarantee } from '../../domain/search/result.js';
import { legacyPricingBlock, type LegacyPricingBlock } from './legacy-pricing.js';

/**
 * LEGACY. The `/hotels/:propertyId/products` response (teardown §3.2, §08).
 *
 * **Expiry: deleted when `HotelDetailPage` reads the canonical shape.**
 *
 * The shape is taken from the consumer, `pages/Hotels/HotelDetailPage.tsx`,
 * which flattens it as:
 *
 * ```
 * body.products[] → room.rate[] | room.rates[] → resolveRatePricing(rate)
 * ```
 *
 * and reads `rateKey`/`RoomSelectionKey`, `boardName`, `allotment`,
 * `cancellationPolicies`, `rateComments`, `offers`, `roomCode`, `name` off the
 * pair. Every price it renders comes back through `resolveRatePricing`, so the
 * whole money surface is `pricing{}` — see `legacy-pricing.ts`.
 *
 * One deliberate difference. The reference grouped a supplier's options by room
 * NAME, which put a refundable and a non-refundable rate for the same room in
 * one bucket. Products here are equivalence classes, so those are two entries;
 * the page renders one row each, which is what the customer is actually
 * choosing between.
 */

export interface LegacyRate {
  /**
   * The opaque handle, in the field the page already reads.
   *
   * It used to be the supplier's own rate key, which the browser then had to
   * hand back inside a native booking envelope (§2.7). A `dealId` resolves
   * server-side, so the page keeps working and the supplier protocol is gone.
   */
  readonly rateKey: string;
  readonly dealId: string;
  readonly pricing: LegacyPricingBlock;
  readonly currency: string;
  readonly boardName: string;
  readonly adults: number;
  readonly children: number;
  readonly allotment?: number;
  readonly cancellationPolicies: ReadonlyArray<{ readonly from: string; readonly amount: number }>;
  readonly rateComments?: string;
  readonly offers: readonly never[];
  readonly source: string;
  readonly isRefundable?: boolean;
}

export interface LegacyProduct {
  readonly name: string;
  readonly roomCode?: string;
  readonly boardName: string;
  readonly rate: readonly LegacyRate[];
  /** The page reads `room.rate` or `room.rates`; both are the same array. */
  readonly rates: readonly LegacyRate[];
  readonly roomFacility: readonly never[];
  /** Canonical: the equivalence key these rates share. */
  readonly equivalenceKey: string;
  readonly offeredBy: readonly string[];
}

export interface LegacyProductsResponse {
  readonly body: {
    readonly products: readonly LegacyProduct[];
    readonly hotelId: string;
    readonly name: string;
    readonly description?: string;
    readonly images: readonly string[];
    readonly amenities: readonly string[];
    readonly policies: readonly string[];
    readonly checkInTime?: string;
    readonly checkOutTime?: string;
  };
  /** Mirrored, because the page reads `responseBody?.products || response.products`. */
  readonly products: readonly LegacyProduct[];
  readonly status: true;

  // ── Canonical, from day one ──────────────────────────────────────────────
  readonly klarHotelId: string;
  readonly featuredDealId?: string;
  readonly priceGuarantee: PriceGuarantee;
  readonly incompleteSuppliers: readonly string[];
}

function toLegacyProduct(product: RoomProduct): LegacyProduct {
  const rates: LegacyRate[] = product.offers.map((offer) => ({
    rateKey: String(offer.dealId),
    dealId: String(offer.dealId),
    pricing: legacyPricingBlock(offer.price),
    currency: String(offer.price.currency),
    boardName: offer.board.label,
    adults: offer.occupancy.rooms.reduce((n, r) => n + r.adults, 0),
    children: offer.occupancy.rooms.reduce((n, r) => n + r.children, 0),
    ...(offer.allotment !== undefined ? { allotment: offer.allotment } : {}),
    cancellationPolicies: offer.cancellation.windows.map((w) => ({
      from: w.from,
      amount: toMajor(w.penalty),
    })),
    ...(offer.cancellation.notes !== undefined ? { rateComments: offer.cancellation.notes } : {}),
    offers: [],
    source: String(offer.supplier),
    // UNKNOWN stays absent: the page must not render a manufactured
    // "Non-Refundable" for a rate no supplier described.
    ...(offer.cancellation.refundable === 'TRUE'
      ? { isRefundable: true }
      : offer.cancellation.refundable === 'FALSE'
        ? { isRefundable: false }
        : {}),
  }));

  return {
    name: product.room.name,
    ...(product.room.code !== undefined ? { roomCode: product.room.code } : {}),
    boardName: product.board.label,
    rate: rates,
    rates,
    roomFacility: [],
    equivalenceKey: product.key,
    offeredBy: product.offeredBy.map(String),
  };
}

export function toLegacyProductsResponse(detail: HotelDetailResult): LegacyProductsResponse {
  const products = detail.products.map(toLegacyProduct);

  return {
    body: {
      products,
      hotelId: String(detail.klarHotelId),
      name: detail.hotel.name,
      ...(detail.content.description !== undefined
        ? { description: detail.content.description }
        : {}),
      images: detail.content.images.map((i) => i.url),
      amenities: detail.content.amenities.map((a) => a.label),
      policies: detail.content.policies,
      ...(detail.content.checkInTime !== undefined
        ? { checkInTime: detail.content.checkInTime }
        : {}),
      ...(detail.content.checkOutTime !== undefined
        ? { checkOutTime: detail.content.checkOutTime }
        : {}),
    },
    products,
    status: true,

    klarHotelId: String(detail.klarHotelId),
    ...(detail.featuredDeal !== undefined
      ? { featuredDealId: String(detail.featuredDeal.dealId) }
      : {}),
    priceGuarantee: detail.priceGuarantee,
    incompleteSuppliers: detail.diagnostics.attempts
      .filter((a) => a.status !== 'SUCCESS' && a.status !== 'EMPTY')
      .map((a) => String(a.supplier)),
  };
}
