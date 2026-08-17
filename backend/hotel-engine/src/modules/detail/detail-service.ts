import type { CountryCode, CurrencyCode, KlarHotelId, SupplierCode } from '../../domain/shared/brand.js';
import { klarHotelId, supplierCode, supplierHotelId } from '../../domain/shared/brand.js';
import type { StayDates } from '../../domain/shared/stay.js';
import type { CanonicalHotel, Amenity, HotelImage } from '../../domain/hotel/canonical-hotel.js';
import type { Occupancy } from '../../domain/rate/occupancy.js';
import { occupancySignature } from '../../domain/rate/occupancy.js';
import type { SupplierDeal } from '../../domain/deal/supplier-deal.js';
import { groupByEquivalence } from '../../domain/deal/equivalence.js';
import { selectFeaturedDeal, type SelectionPolicy } from '../../domain/deal/selection.js';
import { comparePrices } from '../../domain/pricing/customer-price.js';
import type { SupplierAttempt } from '../../domain/search/result.js';
import { priceGuaranteeFor } from '../../domain/search/result.js';
import type {
  HotelContent,
  HotelDetailResult,
  RoomProduct,
} from '../../domain/detail/detail-result.js';
import { sortProducts } from '../../domain/detail/detail-result.js';
import { deadlineIn, type Deadline, type SupplierContext } from '../../suppliers/contract/context.js';
import type { SupplierRegistry, RegisteredSupplier } from '../../suppliers/contract/registry.js';
import type { SupplierHotelDetails, SupplierRate } from '../../suppliers/contract/dto.js';
import type { Clock, IdGenerator, Logger, PropertyRepository, RateTokenStore } from '../ports.js';
import {
  PricingService,
  pricingCountryOf,
  type PricingScope,
  type ResolvedPricing,
} from '../pricing/pricing-service.js';
import { isolateSupplierCall } from '../supplier-isolation.js';

/**
 * One hotel, priced by every supplier that sells it.
 *
 * The reference's products endpoint is the one place its abstraction held —
 * twenty-one lines, no supplier knowledge, and adding a supplier required no
 * change to it (teardown §3.2). That property is kept here. What is added is
 * everything the reference did *around* it: it resolved a single supplier from
 * the id prefix and asked only that one, so a hotel sold by both suppliers was
 * priced by whichever one happened to own the id the customer clicked. A detail
 * page that cannot compare is a search result the customer cannot verify.
 *
 * Search and detail share the pricing engine, the equivalence rule and the
 * selection policy, so the number here matches the number on the card. The
 * reference re-priced independently at detail and picked the pre-markup total,
 * which is how the B2C margin disappeared between the two screens.
 */
export interface DetailConfig {
  /** Absolute wall-clock budget for the whole detail request. */
  readonly deadlineMs: number;
  readonly homeCountry: PricingScope['homeCountry'];
  readonly selectionPolicy: SelectionPolicy;
  readonly rateTokenTtlMs: number;
  /**
   * Ask suppliers for static content as well as rates.
   *
   * Off makes the page a pure rate lookup against the canonical record, which
   * is what a re-price after a filter change wants; on is the first load.
   */
  readonly includeContent?: boolean;
}

export interface DetailDeps {
  readonly registry: SupplierRegistry;
  readonly properties: PropertyRepository;
  readonly pricing: PricingService;
  readonly rateTokens: RateTokenStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly config: DetailConfig;
}

export interface HotelDetailRequest {
  /** Canonical id, or a legacy `TJ:123` supplier-prefixed one. */
  readonly hotelId: string;
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  readonly currency: CurrencyCode;
  readonly nationality: CountryCode;
  readonly channel: 'B2C' | 'B2B';
  /** Restrict to these suppliers. Absent ⇒ every supplier that maps the hotel. */
  readonly suppliers?: readonly SupplierCode[];
  /**
   * The country the search that led here priced under.
   *
   * Only consulted when the hotel's own record carries no country, which is the
   * common case — see `pricingCountryOf`. A deep link that arrives without it
   * falls back to region `ALL`, so callers that have it should pass it.
   */
  readonly destinationCountry?: CountryCode;
}

/** Nothing in the catalogue answers to this id. A 404, not a failure. */
export const HOTEL_NOT_FOUND = Symbol('HOTEL_NOT_FOUND');
export type HotelDetailOutcome = HotelDetailResult | typeof HOTEL_NOT_FOUND;

interface SupplierWork {
  readonly registered: RegisteredSupplier;
  readonly supplierHotelId: string;
  readonly supplierState?: Readonly<Record<string, unknown>>;
}

export class HotelDetailService {
  readonly #d: DetailDeps;

  constructor(deps: DetailDeps) {
    this.#d = deps;
  }

  async detail(request: HotelDetailRequest): Promise<HotelDetailOutcome> {
    const searchId = this.#d.ids.searchId();
    const startedAt = this.#d.clock.now();
    const deadline = deadlineIn(this.#d.config.deadlineMs, startedAt);
    const controller = new AbortController();
    const logger = this.#d.logger.child({ searchId, hotelId: request.hotelId });

    const hotel = await this.#resolve(request.hotelId);
    if (hotel === null) return HOTEL_NOT_FOUND;

    const work = this.#workFor(hotel, request.suppliers);

    /**
     * The property's own country decides its markup region, and the country of
     * the search that led here is the fallback.
     *
     * That precedence is `pricingCountryOf`, and search applies the same one
     * per hotel. Taking the hotel's country alone looked more accurate and was
     * worse: most catalogue records carry none — TripJack reports a country
     * *name*, which `toSupplierHotel` correctly refuses to treat as an ISO-2
     * code — so detail would have resolved region `ALL` for a hotel search had
     * priced `DOMESTIC`, and with region-specific rules configured `ALL` matches
     * no rule at all. Search quotes with margin, detail sells at cost: D-1,
     * rebuilt between the card and the room list.
     */
    const pricingCountry = pricingCountryOf(hotel.countryCode, request.destinationCountry);
    const scope: PricingScope = {
      channel: request.channel,
      homeCountry: this.#d.config.homeCountry,
      nights: request.stay.nights,
      ...(pricingCountry !== undefined ? { destinationCountry: pricingCountry } : {}),
    };
    const resolvedPricing = await this.#d.pricing.resolve(scope);

    const gathered = await Promise.all(
      work.map((w) => this.#askSupplier(w, request, deadline, controller.signal, searchId, logger)),
    );

    const attempts: SupplierAttempt[] = gathered.map((g) => g.attempt);
    const deals = await this.#toDeals(gathered, hotel, request, scope, resolvedPricing, searchId);

    const finishedAt = this.#d.clock.now();
    controller.abort();

    const products = this.#toProducts(deals);
    const featured =
      deals.length > 0
        ? selectFeaturedDeal(deals, {
            policy: this.#d.config.selectionPolicy,
            requestedOccupancy: occupancySignature(request.occupancy),
            supplierReliability: this.#d.registry.reliabilityScores(),
          }).featured
        : undefined;

    return {
      klarHotelId: hotel.klarHotelId,
      hotel,
      content: this.#mergeContent(hotel, gathered),
      stay: request.stay,
      products,
      ...(featured !== undefined ? { featuredDeal: featured } : {}),
      deals,
      priceGuarantee: priceGuaranteeFor(attempts),
      policy: this.#d.config.selectionPolicy,
      diagnostics: {
        totalDurationMs: finishedAt - startedAt,
        deadlineMs: this.#d.config.deadlineMs,
        deadlineHit: deadline.hasPassed(finishedAt),
        attempts,
        suppliersMapped: work.length,
        ratesReturned: deals.length,
      },
    };
  }

  /**
   * A hotel from either id shape.
   *
   * The frontend still routes with `"TJ:123"` — a supplier's id space used as
   * KLAR's identity, which is the defect the canonical layer exists to remove
   * (teardown §2). Accepting it here is a compatibility affordance and nothing
   * more: it is resolved to a canonical hotel immediately and the prefixed form
   * never travels further in.
   */
  async #resolve(hotelId: string): Promise<CanonicalHotel | null> {
    const separator = hotelId.indexOf(':');
    if (separator > 0) {
      const supplier = supplierCode(hotelId.slice(0, separator));
      const id = supplierHotelId(hotelId.slice(separator + 1));
      const found = await this.#d.properties.findBySupplierRefs([
        { supplier, supplierHotelId: id },
      ]);
      const [first] = [...found.values()];
      return first ?? null;
    }
    return this.#d.properties.findByKlarHotelId(klarHotelId(hotelId));
  }

  /**
   * Which suppliers to ask, and under which of their own ids.
   *
   * Only suppliers that actually map this property: asking one that does not
   * would mean guessing an id, and a guessed id either fails or — worse —
   * prices a different hotel.
   */
  #workFor(hotel: CanonicalHotel, requested?: readonly SupplierCode[]): SupplierWork[] {
    const allowed = requested === undefined ? undefined : new Set(requested);
    const work: SupplierWork[] = [];

    for (const mapping of hotel.supplierMappings) {
      if (allowed !== undefined && !allowed.has(mapping.supplier)) continue;
      const registered = this.#d.registry.get(mapping.supplier);
      // Unregistered or switched off. Not a gap in the comparison — the
      // supplier is not selling today.
      if (registered === undefined || !registered.config.enabled) continue;
      if (registered.config.maintenanceMode) continue;
      work.push({ registered, supplierHotelId: String(mapping.supplierHotelId) });
    }
    return work;
  }

  /**
   * The property-scoped state a two-phase supplier's rate call requires.
   *
   * One extra call, made only for suppliers that declare `searchReturnsRates:
   * false`, and only when the caller did not already carry the state. The
   * alternative — persisting `PropertyCode`/`BrandCode` on the mapping row —
   * buys one round trip and pays for it with a schema change, a write path and
   * a staleness question about identifiers the supplier may reissue.
   */
  async #propertyState(
    work: SupplierWork,
    request: HotelDetailRequest,
    ctx: SupplierContext,
  ): Promise<Readonly<Record<string, unknown>> | undefined> {
    const id = supplierHotelId(work.supplierHotelId);
    if (!work.registered.supplier.capabilities.searchTargets.includes('SINGLE_HOTEL')) {
      return undefined;
    }

    const found = await work.registered.supplier.search(
      {
        target: { kind: 'SINGLE_HOTEL', id },
        stay: request.stay,
        occupancy: request.occupancy,
        nationality: request.nationality,
        page: 1,
        pageSize: 1,
      },
      ctx,
    );
    return found.hotels.find((h) => String(h.supplierHotelId) === work.supplierHotelId)
      ?.supplierState;
  }

  /** Rates, and optionally static content, from one supplier. */
  async #askSupplier(
    work: SupplierWork,
    request: HotelDetailRequest,
    deadline: Deadline,
    signal: AbortSignal,
    searchId: ReturnType<IdGenerator['searchId']>,
    logger: Logger,
  ): Promise<{
    supplier: SupplierCode;
    attempt: SupplierAttempt;
    rates: readonly SupplierRate[];
    details: SupplierHotelDetails | null;
  }> {
    const code = work.registered.config.code;
    const ctx = {
      supplier: code,
      searchId,
      correlationId: this.#d.ids.correlationId(),
      deadline: deadline.withBudget(work.registered.config.detailTimeoutMs, this.#d.clock.now()),
      signal,
      logger: logger.child({ supplier: code }),
      currency: request.currency,
    };

    const outcome = await isolateSupplierCall(
      code,
      async () => {
        const id = supplierHotelId(work.supplierHotelId);

        /**
         * A two-phase supplier needs its property state before it can be asked
         * for rates, and a detail page has never run a search to collect it.
         *
         * This is A-1 on the path A-1 did not cover. `getproducts` marks
         * `PropertyCode` and `BrandCode` Required and both arrive with the
         * PROPERTY from `bestproperties` — so a rate call assembled from the
         * catalogue alone goes out missing them and is rejected. From the
         * outside that reads as "RateGain has no availability for this hotel",
         * which is exactly how the search-side version of this defect was
         * nearly mis-diagnosed.
         *
         * The single-hotel search that fetches it is the same call the
         * orchestrator makes, and `searchReturnsRates` is the supplier's own
         * declaration that it is needed — so no supplier is named here.
         */
        const state = work.registered.supplier.capabilities.searchReturnsRates
          ? work.supplierState
          : (work.supplierState ?? (await this.#propertyState(work, request, ctx)));

        // Rates and static content are independent calls to the same supplier;
        // running them in sequence would spend two round trips of the budget
        // to answer one page.
        const [rates, details] = await Promise.all([
          work.registered.supplier.getRates(
            {
              supplierHotelId: id,
              stay: request.stay,
              occupancy: request.occupancy,
              nationality: request.nationality,
              ...(state !== undefined ? { supplierState: state } : {}),
            },
            ctx,
          ),
          this.#d.config.includeContent === true
            ? work.registered.supplier.getHotelDetails({ supplierHotelId: id }, ctx)
            : Promise.resolve(null),
        ]);
        return { rates, details };
      },
      { clock: this.#d.clock, logger },
    );

    if (!outcome.ok) {
      return {
        supplier: code,
        rates: [],
        details: null,
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

    const { rates, details } = outcome.value;
    return {
      supplier: code,
      rates: rates.rates,
      details,
      attempt: {
        supplier: code,
        status: rates.status,
        durationMs: rates.responseTimeMs,
        hotelsReturned: rates.rates.length > 0 ? 1 : 0,
        dealsReturned: rates.rates.length,
        supplierPagesConsumed: 1,
        ...(rates.error !== undefined
          ? { errorCode: rates.error.code, retryable: rates.error.retryable }
          : {}),
      },
    };
  }

  /** Every supplier rate, priced by the one engine and sealed behind a dealId. */
  async #toDeals(
    gathered: ReadonlyArray<{ supplier: SupplierCode; rates: readonly SupplierRate[] }>,
    hotel: CanonicalHotel,
    request: HotelDetailRequest,
    scope: PricingScope,
    resolved: ResolvedPricing,
    searchId: ReturnType<IdGenerator['searchId']>,
  ): Promise<SupplierDeal[]> {
    const flat = gathered.flatMap((g) => g.rates.map((rate) => ({ supplier: g.supplier, rate })));

    // Concurrent for the same reason search's are (B-4): every token is a round
    // trip and none of them depends on another.
    const issued = await Promise.all(
      flat.map(async ({ supplier, rate }) => {
        const price = this.#d.pricing.priceRate(rate, supplier, scope, resolved);
        return {
          supplier,
          rate,
          price,
          // The quote is sealed here exactly as search seals it, so a deal
          // booked from the detail page revalidates against the price that
          // page showed — not against whatever today's rules would produce.
          token: await this.#d.rateTokens.issue({
            searchId,
            supplier,
            supplierHotelId: supplierHotelId(this.#supplierIdFor(hotel, supplier)),
            klarHotelId: hotel.klarHotelId,
            rate,
            quotedPrice: price,
            stay: request.stay,
            occupancy: request.occupancy,
            nationality: request.nationality,
            scope: {
              channel: scope.channel,
              homeCountry: scope.homeCountry,
              ...(scope.destinationCountry !== undefined
                ? { destinationCountry: scope.destinationCountry }
                : {}),
              nights: scope.nights,
            },
            markupVersion: resolved.markupVersion,
            validForMs: this.#d.config.rateTokenTtlMs,
          }),
        };
      }),
    );

    return issued.map(({ supplier, rate, price, token }) => ({
      dealId: token.dealId,
      supplier,
      klarHotelId: hotel.klarHotelId,
      supplierHotelId: supplierHotelId(this.#supplierIdFor(hotel, supplier)),
      room: rate.room,
      board: rate.board,
      occupancy: rate.occupancy,
      cancellation: rate.cancellation,
      cost: rate.cost,
      price,
      token: {
        dealId: token.dealId,
        issuedAt: new Date(this.#d.clock.now()),
        expiresAt: token.expiresAt,
      },
      ...(rate.allotment !== undefined ? { allotment: rate.allotment } : {}),
      onHoldAllowed: rate.onHoldAllowed,
      ...(rate.compliance !== undefined ? { compliance: rate.compliance } : {}),
    }));
  }

  #supplierIdFor(hotel: CanonicalHotel, supplier: SupplierCode): string {
    const mapping = hotel.supplierMappings.find((m) => m.supplier === supplier);
    return String(mapping?.supplierHotelId ?? '');
  }

  /**
   * Group offers into the products a page renders as rows.
   *
   * Grouping is by equivalence class, so a refundable and a non-refundable rate
   * for the same room are two rows rather than one row whose price belongs to
   * only half of it.
   */
  #toProducts(deals: readonly SupplierDeal[]): RoomProduct[] {
    const products = groupByEquivalence(deals).map((group): RoomProduct => {
      const offers = group.deals.slice().sort((a, b) => comparePrices(a.price, b.price));
      const lead = offers[0] as SupplierDeal;
      return {
        key: group.keyString,
        room: lead.room,
        board: lead.board,
        occupancy: lead.occupancy,
        refundTier: group.key.refundTier,
        offers,
        leadPrice: lead.price,
        offeredBy: [...new Set(offers.map((o) => o.supplier))].sort(),
      };
    });
    return sortProducts(products);
  }

  /**
   * Canonical content first, supplier content filling the gaps.
   *
   * The canonical record wins on identity — name, address, location, star
   * rating are KLAR's, resolved by the matcher — while descriptions, policies
   * and the richer gallery come from whichever supplier answered. Images and
   * amenities are merged and de-duplicated rather than replaced, because two
   * suppliers photograph different rooms.
   */
  #mergeContent(
    hotel: CanonicalHotel,
    gathered: ReadonlyArray<{ supplier: SupplierCode; details: SupplierHotelDetails | null }>,
  ): HotelContent {
    const answered = gathered.filter((g) => g.details !== null);

    const images = new Map<string, HotelImage>();
    for (const image of hotel.images) images.set(image.url, image);
    const amenities = new Map<string, Amenity>();
    for (const amenity of hotel.amenities) amenities.set(amenity.code, amenity);

    const policies: string[] = [];
    let description: string | undefined;
    let checkInTime: string | undefined;
    let checkOutTime: string | undefined;

    for (const { supplier, details } of answered) {
      const d = details as SupplierHotelDetails;
      description ??= d.description;
      checkInTime ??= d.checkInTime;
      checkOutTime ??= d.checkOutTime;
      for (const policy of d.policies) if (!policies.includes(policy)) policies.push(policy);
      for (const url of d.imageUrls) {
        if (!images.has(url)) images.set(url, { url, sourcedFrom: supplier });
      }
      for (const label of d.amenityLabels) {
        const code = amenityCodeOf(label);
        if (!amenities.has(code)) amenities.set(code, { code, label, sourcedFrom: supplier });
      }
    }

    return {
      ...(description !== undefined ? { description } : {}),
      ...(checkInTime !== undefined ? { checkInTime } : {}),
      ...(checkOutTime !== undefined ? { checkOutTime } : {}),
      policies,
      images: [...images.values()],
      amenities: [...amenities.values()],
      sourcedFrom: answered.map((g) => g.supplier).sort(),
    };
  }
}

/** Matches the catalogue's own derivation, so merged amenities de-duplicate. */
const amenityCodeOf = (label: string): string =>
  label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export type { KlarHotelId };
