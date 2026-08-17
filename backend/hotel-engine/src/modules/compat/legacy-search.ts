import { toMajor } from '../../domain/shared/money.js';
import type { SupplierDeal } from '../../domain/deal/supplier-deal.js';
import type {
  MergedHotel,
  PriceGuarantee,
  SearchFacets,
  UnifiedSearchResult,
} from '../../domain/search/result.js';
import { incompleteSuppliers } from '../../domain/search/result.js';
import { legacyPricingBlock, type LegacyPricingBlock } from './legacy-pricing.js';

/**
 * LEGACY. The search response the existing frontend reads (teardown §2.3, §08).
 *
 * **Expiry: deleted when the last legacy reader is gone.** The frontend is out
 * of scope for this rebuild (§38), so the new API serves the old shape while the
 * internal model stays canonical. Field names, fallbacks and quirks here are
 * copied from the consumer — `features/hotels/services/hotelSearchService.ts` —
 * not invented, including the ones that are plainly mistakes:
 *
 *  - `total` means "hotels on THIS page", not the result count. It is misnamed
 *    in the contract and renaming it is a frontend change, not ours.
 *  - `hotelId` is `"TJ:123"`: a supplier's id space used as KLAR's identity,
 *    which is the defect the canonical layer exists to remove. It is emitted
 *    because the frontend routes on it, alongside `klarHotelId` which is what
 *    it should route on.
 *  - `results` is mirrored to `body` and `hotels`, because the consumer reads
 *    `results || body` and other call sites read `hotels`.
 *
 * New canonical fields ship alongside from day one — `klarHotelId`, `dealId`,
 * `deals[]`, `comparison{}`, `priceGuarantee`, `priceKind` — so the frontend can
 * migrate field by field rather than in one release.
 */

export interface LegacyAltDeal {
  readonly source: string;
  readonly price: number;
}

export interface LegacyHotel {
  // ── What the frontend routes and renders on ──────────────────────────────
  readonly hotelId: string;
  readonly name: string;
  readonly address?: string;
  readonly city?: string;
  readonly country?: string;
  readonly starRating?: number;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly images: readonly string[];
  readonly amenities: readonly string[];

  // ── Money. `price` is the displayed total, markup-inclusive ──────────────
  readonly price: number;
  readonly basePrice: number;
  readonly taxAmount: number;
  readonly taxesIncluded: boolean;
  readonly currency: string;
  readonly pricing: LegacyPricingBlock;

  // ── Rate character ───────────────────────────────────────────────────────
  readonly mealBasis?: string;
  readonly hotelBoard: readonly string[];
  /**
   * `undefined` means UNKNOWN and must stay undefined.
   *
   * The consumer's own comment records the bug: `isRefundable ? … :
   * 'Non-Refundable'` turned "no supplier signal" into a false "Non-Refundable"
   * on every card. Absent here, absent there.
   */
  readonly isRefundable?: boolean;
  readonly refundableLabel?: string;
  readonly freeCancellationUntil?: string;
  readonly onHoldAllowed: boolean;
  readonly allotment?: number;

  // ── Provenance ───────────────────────────────────────────────────────────
  readonly source: string;
  readonly altDeal?: LegacyAltDeal;
  /**
   * `propertyCode`, `brandCode` and `correlationId` are deliberately absent.
   *
   * §08 lists them as coming "from the deal's supplier mapping", and they exist
   * only because the old frontend had to hand supplier identifiers back into
   * `/products` — supplier protocol in the browser, the §2.7 violation this
   * rebuild removes. `SupplierDeal` has no `supplierState` to source them from:
   * that state is sealed behind the `dealId` and never leaves the server.
   *
   * Nothing breaks. The consumer falls back to `hotel.propertyCode || id`, and
   * the new products endpoint resolves suppliers from the catalogue rather than
   * trusting whatever the client echoed back.
   */

  // ── Canonical fields, shipped from day one ───────────────────────────────
  readonly klarHotelId: string;
  /** The opaque handle booking takes. Replaces every supplier-shaped id above. */
  readonly dealId?: string;
  readonly priceKind: MergedHotel['priceKind'];
  readonly comparison: MergedHotel['comparison'];
  readonly deals: ReadonlyArray<{
    readonly dealId: string;
    readonly source: string;
    readonly price: number;
    readonly mealBasis: string;
    readonly roomName: string;
    readonly isRefundable?: boolean;
  }>;
}

export interface LegacyFacets {
  readonly starRatingCounts: Readonly<Record<string, number>>;
  readonly propertyTypeCounts: Readonly<Record<string, number>>;
  readonly mealTypeCounts: Readonly<Record<string, number>>;
  readonly amenityCounts: Readonly<Record<string, number>>;
  readonly providerCounts: Readonly<Record<string, number>>;
  readonly minPrice: number;
  readonly maxPrice: number;
  readonly topLocations: ReadonlyArray<{ readonly name: string; readonly count: number }>;
  readonly priceBuckets: ReadonlyArray<{
    readonly min: number;
    readonly max: number;
    readonly count: number;
  }>;
  readonly totalHotels: number;
  readonly altDealCount: number;
}

export interface LegacySearchResponse {
  readonly results: readonly LegacyHotel[];
  /** Same array. The consumer reads `results || body`; other call sites read `hotels`. */
  readonly body: readonly LegacyHotel[];
  readonly hotels: readonly LegacyHotel[];
  /** Hotels on THIS page. Misnamed in the contract, kept as-is. */
  readonly total: number;
  readonly hasMore: boolean;
  readonly inventoryCount: number;
  readonly facets: LegacyFacets;
  readonly meta: Readonly<Record<string, number>> & { readonly matchedHotels: number };

  // ── Canonical, from day one ──────────────────────────────────────────────
  readonly searchId: string;
  /**
   * Carried through rather than flattened to a number (ADR-0007).
   *
   * `PARTIAL` means a supplier was never heard from, and the UI must say "best
   * of the suppliers that responded" rather than claiming a guarantee. Dropping
   * it here would leave the honesty recorded in the engine and undelivered.
   */
  readonly priceGuarantee: PriceGuarantee;
  readonly incompleteSuppliers: readonly string[];
}

/** Supplier-prefixed id, the shape the frontend routes on. */
const legacyHotelId = (hotel: MergedHotel): string => {
  const deal = hotel.featuredDeal ?? hotel.deals[0];
  if (deal !== undefined) return `${String(deal.supplier)}:${String(deal.supplierHotelId)}`;
  const offer = hotel.indicativeOffers[0];
  return offer !== undefined
    ? `${String(offer.supplier)}:${offer.supplierHotelId}`
    : String(hotel.klarHotelId);
};

/**
 * The cheapest deal that is not the featured one.
 *
 * The reference reduced this to `{source, price}` and threw away the rate key,
 * room, board and terms, so the "alternative" it advertised could never be
 * booked (D-4). The legacy shape still only carries a label and a number — that
 * is what the chip renders — but `deals[]` alongside it carries every
 * alternative intact, each with its own `dealId`.
 */
function alternativeOf(hotel: MergedHotel): LegacyAltDeal | undefined {
  const featured = hotel.featuredDeal;
  if (featured === undefined) return undefined;
  const others = hotel.deals.filter((d) => d.dealId !== featured.dealId);
  if (others.length === 0) return undefined;
  const cheapest = others.reduce((best, d) =>
    d.price.total.minor < best.price.total.minor ? d : best,
  );
  return { source: String(cheapest.supplier), price: toMajor(cheapest.price.total) };
}

/** `TRUE`/`FALSE`/`UNKNOWN` → a boolean, or absent when genuinely unknown. */
const refundableFlag = (deal: SupplierDeal | undefined): boolean | undefined => {
  if (deal === undefined) return undefined;
  if (deal.cancellation.refundable === 'TRUE') return true;
  if (deal.cancellation.refundable === 'FALSE') return false;
  return undefined;
};

const counts = (entries: readonly { value: string; count: number }[]): Record<string, number> =>
  Object.fromEntries(entries.map((e) => [e.value, e.count]));

export function toLegacyFacets(facets: SearchFacets): LegacyFacets {
  return {
    starRatingCounts: counts(facets.starRatings),
    propertyTypeCounts: counts(facets.propertyTypes),
    mealTypeCounts: counts(facets.boards),
    amenityCounts: counts(facets.amenities),
    providerCounts: counts(facets.suppliers),
    // The engine holds money in minor units; the legacy panel reads major.
    minPrice: facets.minPrice / 100,
    maxPrice: facets.maxPrice / 100,
    topLocations: facets.areas.map((a) => ({ name: a.value, count: a.count })),
    priceBuckets: facets.priceBuckets.map((b) => ({
      min: b.min / 100,
      max: b.max / 100,
      count: b.count,
    })),
    totalHotels: facets.totalHotels,
    altDealCount: facets.alternativeDealHotels,
  };
}

export function toLegacyHotel(hotel: MergedHotel): LegacyHotel {
  const featured = hotel.featuredDeal;
  const price = hotel.bestPrice;

  return {
    hotelId: legacyHotelId(hotel),
    name: hotel.hotel.name,
    ...(hotel.hotel.address !== undefined ? { address: hotel.hotel.address } : {}),
    ...(hotel.hotel.city !== undefined ? { city: hotel.hotel.city } : {}),
    ...(hotel.hotel.countryCode !== undefined ? { country: String(hotel.hotel.countryCode) } : {}),
    ...(hotel.hotel.starRating !== undefined ? { starRating: hotel.hotel.starRating } : {}),
    ...(hotel.hotel.location !== undefined
      ? { latitude: hotel.hotel.location.lat, longitude: hotel.hotel.location.lng }
      : {}),
    images: hotel.hotel.images.map((i) => i.url),
    amenities: hotel.hotel.amenities.map((a) => a.label),

    price: toMajor(price.total),
    basePrice: toMajor(price.displayBase),
    taxAmount: toMajor(price.taxesAndFees),
    // The consumer treats a zero tax as "already included"; say so explicitly
    // rather than letting it infer.
    taxesIncluded: price.taxesAndFees.minor === 0,
    currency: String(price.currency),
    pricing: legacyPricingBlock(price),

    ...(featured !== undefined ? { mealBasis: featured.board.label } : {}),
    hotelBoard: [...new Set(hotel.deals.map((d) => d.board.label))],
    ...(refundableFlag(featured) !== undefined
      ? { isRefundable: refundableFlag(featured) as boolean }
      : {}),
    // The supplier's own wording when it gave one. Absent stays absent — the
    // consumer renders `refundableLabel ?? … ?? null` and must not be handed a
    // manufactured "Non-Refundable".
    ...(featured?.cancellation.notes !== undefined
      ? { refundableLabel: featured.cancellation.notes }
      : {}),
    ...(featured?.cancellation.freeUntil != null
      ? { freeCancellationUntil: featured.cancellation.freeUntil }
      : {}),
    onHoldAllowed: featured?.onHoldAllowed ?? false,
    ...(featured?.allotment !== undefined ? { allotment: featured.allotment } : {}),

    source: featured !== undefined ? String(featured.supplier) : '',
    ...(alternativeOf(hotel) !== undefined ? { altDeal: alternativeOf(hotel) as LegacyAltDeal } : {}),

    klarHotelId: String(hotel.klarHotelId),
    ...(featured !== undefined ? { dealId: String(featured.dealId) } : {}),
    priceKind: hotel.priceKind,
    comparison: hotel.comparison,
    deals: hotel.deals.map((d) => ({
      dealId: String(d.dealId),
      source: String(d.supplier),
      price: toMajor(d.price.total),
      mealBasis: d.board.label,
      roomName: d.room.name,
      ...(refundableFlag(d) !== undefined ? { isRefundable: refundableFlag(d) as boolean } : {}),
    })),
  };
}

export function toLegacySearchResponse(result: UnifiedSearchResult): LegacySearchResponse {
  const results = result.hotels.map(toLegacyHotel);
  const perSupplier: Record<string, number> = {};
  for (const facet of result.facets.suppliers) {
    // The reference exposed `tjCount` / `rgCount`; keep that spelling for the
    // two suppliers that exist and add the generic map beside it, so a third
    // supplier is visible without a frontend release.
    perSupplier[`${facet.value.toLowerCase()}Count`] = facet.count;
  }

  return {
    results,
    body: results,
    hotels: results,
    total: results.length,
    hasMore: result.page.hasMore,
    inventoryCount: result.page.inventoryCount,
    facets: toLegacyFacets(result.facets),
    meta: { ...perSupplier, matchedHotels: result.page.matchedHotels },

    searchId: String(result.searchId),
    priceGuarantee: result.priceGuarantee,
    // The domain's own definition, not a second one written here. A local
    // filter counted DISABLED and NOT_ELIGIBLE as gaps while `priceGuarantee`
    // — in the same payload — did not, so a response could claim
    // BEST_AVAILABLE and name a supplier as missing in the same breath.
    incompleteSuppliers: incompleteSuppliers(result.diagnostics.attempts).map(String),
  };
}
