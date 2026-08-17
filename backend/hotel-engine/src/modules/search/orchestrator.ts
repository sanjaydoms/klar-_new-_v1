import type { KlarHotelId, SupplierCode } from '../../domain/shared/brand.js';
import type { CanonicalHotel } from '../../domain/hotel/canonical-hotel.js';
import { weakest, type MatchConfidence } from '../../domain/hotel/match-confidence.js';
import type { CustomerPrice } from '../../domain/pricing/customer-price.js';
import { comparePrices } from '../../domain/pricing/customer-price.js';
import { occupancySignature } from '../../domain/rate/occupancy.js';
import type { SupplierDeal } from '../../domain/deal/supplier-deal.js';
import { selectFeaturedDeal, type SelectionPolicy } from '../../domain/deal/selection.js';
import type { UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import { dynamicCacheKeyParts } from '../../domain/search/request.js';
import type {
  IndicativeOffer,
  MergedHotel,
  SearchDiagnostics,
  SupplierAttempt,
  UnifiedSearchResult,
} from '../../domain/search/result.js';
import { incompleteSuppliers, priceGuaranteeFor } from '../../domain/search/result.js';
import { deadlineIn, type Deadline } from '../../suppliers/contract/context.js';
import type { SupplierRegistry, RegisteredSupplier } from '../../suppliers/contract/registry.js';
import type {
  SupplierHotel,
  SupplierRate,
  SupplierSearchResult,
  SupplierSearchTarget,
} from '../../suppliers/contract/dto.js';
import type {
  Cache,
  CacheTtl,
  Clock,
  Coalescer,
  DestinationResolver,
  IdGenerator,
  Logger,
  PropertyRepository,
  RateTokenStore,
  SearchMetrics,
} from '../ports.js';
import { matchSupplierHotels, type MatchResult } from '../matching/matcher.js';
import {
  PricingService,
  pricingCountryKey,
  pricingCountryOf,
  type PricingScope,
  type ResolvedPricing,
} from '../pricing/pricing-service.js';
import { fanOut } from './fanout.js';
import {
  enrichRates,
  type EnrichmentBudget,
  type EnrichmentCandidate,
} from './enrichment.js';
import { applyFilters, applySort, buildFacets, paginate } from './present.js';

/**
 * One KLAR search across every enabled supplier.
 *
 * ```
 * validate → resolve destination → select suppliers → FAN OUT (one deadline)
 *   → match → price → enrich where it could change the answer
 *   → merge → compare → filter → sort → paginate → respond with supplier health
 * ```
 *
 * Match and price are separate and ordered: matching never sees a price, and
 * pricing never sees another supplier. Comparison is the only step that sees
 * both, and by then every figure is a `CustomerPrice` produced by one engine
 * from one set of rules — which is what makes "cheapest" mean anything.
 */
export interface SearchConfig {
  /** Absolute wall-clock budget for the whole search. */
  readonly deadlineMs: number;
  readonly homeCountry: PricingScope['homeCountry'];
  readonly selectionPolicy: SelectionPolicy;
  readonly enrichment?: EnrichmentBudget;
  /** How long an issued rate token stays valid. */
  readonly rateTokenTtlMs: number;
  /** How long supplier results may be reused. Absent ⇒ ADR-0005 §4's window. */
  readonly cacheTtl?: CacheTtl;
}

export interface OrchestratorDeps {
  readonly registry: SupplierRegistry;
  readonly destinations: DestinationResolver;
  readonly properties: PropertyRepository;
  readonly pricing: PricingService;
  readonly rateTokens: RateTokenStore;
  readonly cache: Cache;
  readonly coalescer: Coalescer;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly config: SearchConfig;
  /** Absent means diagnostics are logged but not aggregated for `GET /metrics`. */
  readonly metrics?: SearchMetrics;
}

/**
 * The country this hotel was priced under, for sealing into its quote.
 *
 * The same precedence the pricing pass used (`pricingCountryOf`), recorded so
 * that revalidation reproduces the region rather than re-deriving it from a
 * later request that may resolve differently.
 */
const canonicalPricingCountry = (
  hotel: CanonicalHotel,
  scope: PricingScope,
): PricingScope['destinationCountry'] => pricingCountryOf(hotel.countryCode, scope.destinationCountry);

/**
 * What a search fetched from suppliers, and nothing else.
 *
 * Deliberately below the pricing engine and below the rate tokens. Caching a
 * finished `UnifiedSearchResult` would hand two customers the same `dealId` —
 * and a deal is single-use, so the second one to book is refused (ADR-0008) —
 * and would freeze the markup that priced it. Cache the network; recompute the
 * meaning. Everything downstream of here is deterministic and cheap.
 */
interface CachedFanout {
  readonly results: readonly SupplierSearchResult[];
  readonly attempts: readonly SupplierAttempt[];
  /** Supplier windows fetched so far. Page N needs enough of them. */
  readonly windows: number;
}

/** Enough rounds to page deep, few enough to bound a cold search. */
const MAX_WINDOWS = 5;

export const DEFAULT_SEARCH_CACHE_TTL: CacheTtl = {
  // ADR-0005 §4: dynamic availability lives 60-180 s. The reference held fully
  // priced results for 15 minutes and served prices it could not honour.
  freshMs: 120_000,
  // Only ever served when a fresh fetch came back empty.
  staleMs: 180_000,
};

const countHotels = (f: CachedFanout): number =>
  f.results.reduce((n, r) => n + r.hotels.length, 0);

const hasMoreInventory = (f: CachedFanout): boolean =>
  f.results.some((r) => r.pageInfo.hasMore);

/** The newest attempt per supplier, so health describes the latest fetch. */
function mergeAttempts(
  held: readonly SupplierAttempt[],
  fresh: readonly SupplierAttempt[],
): readonly SupplierAttempt[] {
  const byCode = new Map(held.map((a) => [String(a.supplier), a]));
  for (const attempt of fresh) byCode.set(String(attempt.supplier), attempt);
  return [...byCode.values()];
}

/**
 * A partial answer is never cached.
 *
 * A supplier that timed out once would otherwise have its absence frozen into
 * the entry and served to everyone for the whole window — turning one transient
 * failure into two minutes of "best of the suppliers that responded" for every
 * customer, with no supplier call able to correct it.
 */
const isCacheable = (f: CachedFanout): boolean =>
  f.windows > 0 && incompleteSuppliers(f.attempts).length === 0;

interface Bucket {
  readonly klarHotelId: KlarHotelId;
  canonical: CanonicalHotel;
  readonly deals: SupplierDeal[];
  readonly indicative: IndicativeOffer[];
  readonly confidences: MatchConfidence[];
  readonly suppliers: Set<SupplierCode>;
}

export class SearchOrchestrator {
  readonly #d: OrchestratorDeps;

  constructor(deps: OrchestratorDeps) {
    this.#d = deps;
  }

  async search(request: UnifiedHotelSearchRequest): Promise<UnifiedSearchResult> {
    const searchId = this.#d.ids.searchId();
    const startedAt = this.#d.clock.now();
    const deadline = deadlineIn(this.#d.config.deadlineMs, startedAt);
    const controller = new AbortController();
    const logger = this.#d.logger.child({ searchId });

    // 1-2. Which suppliers can serve this destination, and how each wants it
    //      expressed. Supplier destination codes never leave this step.
    const selected = this.#d.registry.selectFor({
      ...(request.suppliers !== undefined ? { requested: request.suppliers } : {}),
    });
    const targets = await this.#d.destinations.resolveTargets(
      request.target,
      selected.map((s) => ({
        code: s.config.code,
        searchTargets: s.supplier.capabilities.searchTargets,
      })),
    );

    // 3. Fan out — or reuse what a recent identical search already fetched.
    const fetched = await this.#supplierResults(request, selected, targets, {
      deadline,
      signal: controller.signal,
      logger,
      searchId,
    });
    const { results, attempts } = fetched;

    const supplierHotels = results.flatMap((r) => r.hotels);

    // 4. Canonical identity, before anything is priced.
    //
    // The catalogue write-backs are an investment in the NEXT search, not a
    // dependency of this one: a mapping persisted here saves a tier-3 scoring
    // pass later. Once the deadline has gone they are the one part of this
    // stage that can be dropped without changing what the customer is shown,
    // so they are — ADR-0003's deadline is supposed to bound the whole search,
    // and until now nothing after the fan-out consulted it at all.
    const withinDeadline = !deadline.hasPassed(this.#d.clock.now());
    if (!withinDeadline) {
      logger.warn('deadline passed before matching; skipping catalogue write-backs', {
        searchId,
        elapsedMs: this.#d.clock.now() - startedAt,
      });
    }
    const matched = await matchSupplierHotels(supplierHotels, {
      properties: this.#d.properties,
      logger,
      persistMatches: withinDeadline,
    });

    // 5. One pricing context for the whole search.
    const regionCountry = await this.#regionCountry(request.target, supplierHotels);
    const scope: PricingScope = {
      channel: request.channel,
      homeCountry: this.#d.config.homeCountry,
      nights: request.stay.nights,
      ...(regionCountry !== undefined ? { destinationCountry: regionCountry } : {}),
    };
    // Rules per distinct country present, not one region for the whole page.
    // A property's own country decides its region and the search-level country
    // is the fallback — the same precedence the detail page applies, so the two
    // screens cannot price one hotel differently (`pricingCountryOf`).
    const pricingByCountry = await this.#d.pricing.resolveByCountry(
      [
        regionCountry,
        ...matched.matches.map((m) => pricingCountryOf(m.canonical.countryCode, regionCountry)),
      ],
      scope,
    );
    const resolvedPricing = pricingByCountry.get(pricingCountryKey(regionCountry)) as ResolvedPricing;
    const pricingFor = (hotel: CanonicalHotel): ResolvedPricing =>
      pricingByCountry.get(pricingCountryKey(pricingCountryOf(hotel.countryCode, regionCountry))) ??
      resolvedPricing;

    // 6. Enrich only where a lead-in price could actually beat what we hold.
    const enrichment = await enrichRates(
      {
        request,
        candidates: this.#enrichmentCandidates(matched.matches, scope, pricingFor),
        suppliersByCode: new Map(selected.map((s) => [s.config.code, s])),
        deadline,
        signal: controller.signal,
        ...(this.#d.config.enrichment !== undefined ? { budget: this.#d.config.enrichment } : {}),
      },
      { clock: this.#d.clock, ids: this.#d.ids, logger, searchId },
    );

    // 7-8. Merge into canonical hotels, then choose a winner per hotel.
    const merged = await this.#merge({
      matches: matched.matches,
      enriched: enrichment.rates,
      scope,
      pricingFor,
      attempts,
      searchId,
      request,
    });

    // 9-11. Present.
    const facets = buildFacets(merged);
    const filtered = applyFilters(merged, request.filters);
    const centre = request.target.kind === 'AREA' ? request.target.centre : undefined;
    const sorted = applySort(filtered, request.sort, centre);
    const page = paginate(sorted, request.page.page, request.page.limit);

    const finishedAt = this.#d.clock.now();
    controller.abort();

    const diagnostics: SearchDiagnostics = {
      searchId,
      totalDurationMs: finishedAt - startedAt,
      deadlineMs: this.#d.config.deadlineMs,
      deadlineHit: deadline.hasPassed(finishedAt),
      attempts,
      cache: fetched.cache,
      hotelsBeforeMerge: supplierHotels.length,
      hotelsAfterMerge: merged.length,
      mergesPerformed: matched.mergesPerformed,
      mergesRejectedLowConfidence: matched.rejectedLowConfidence,
      enrichmentCallsIssued: enrichment.callsIssued,
      enrichmentCallsSucceeded: enrichment.callsSucceeded,
      enrichmentSkipped: enrichment.skipped,
    };
    // The only place this is logged in full — OPEN-ISSUES §4: "SearchDiagnostics
    // carries the data; nothing exports it." One line here covers every caller
    // (the API edge, cache warming) rather than each duplicating it.
    logger.info('search complete', { ...diagnostics });
    this.#d.metrics?.record(diagnostics);

    return {
      searchId,
      hotels: page.items,
      page: {
        page: page.page,
        limit: page.limit,
        hasMore: page.hasMore,
        matchedHotels: page.matched,
        inventoryCount: await this.#d.destinations.inventoryCount(request.target),
      },
      facets,
      priceGuarantee: priceGuaranteeFor(attempts),
      diagnostics,
    };
  }

  /**
   * The supplier results this search needs, fetched or reused.
   *
   * **A KLAR page is a slice of an accumulating list, not a re-fetch.** The page
   * number is threaded into every supplier request — TripJack scans a window of
   * candidate ids at `(page-1) * idsPerPage`, RateGain starts at supplier page
   * `(page-1) * pagesPerSearch + 1` — and the merged result was then sliced at
   * `(page-1) * limit` a second time. So page 2 asked the suppliers for a fresh
   * window of inventory and then threw away its first `limit` hotels: they were
   * shown to nobody, on any page. A window that yielded fewer than `limit`
   * merged hotels produced an empty page reporting `hasMore: false`, which
   * tells a customer the inventory is exhausted while most of it is unseen.
   *
   * Accumulating fixes both, and is what makes the cache key correct: the entry
   * belongs to a SEARCH, not to a page, which is why `dynamicCacheKeyParts`
   * excludes the page number. It is the reference implementation's master list
   * (teardown §3.1), which is also where request coalescing earns its place.
   */
  async #supplierResults(
    request: UnifiedHotelSearchRequest,
    selected: readonly RegisteredSupplier[],
    targets: Map<SupplierCode, SupplierSearchTarget | null>,
    ctx: {
      deadline: Deadline;
      signal: AbortSignal;
      logger: Logger;
      searchId: ReturnType<IdGenerator['searchId']>;
    },
  ): Promise<CachedFanout & { cache: SearchDiagnostics['cache'] }> {
    const key = dynamicCacheKeyParts(
      request,
      occupancySignature(request.occupancy),
      selected.map((s) => s.config.code),
      this.#d.pricing.markupVersion(),
    ).join('|');

    const needed = request.page.page * request.page.limit;
    const cached = await this.#d.cache.get<CachedFanout>(key);

    let held: CachedFanout =
      cached.state === 'HIT' ? cached.value : { results: [], attempts: [], windows: 0 };

    // Enough already, and nothing to ask for.
    if (countHotels(held) >= needed || (held.windows > 0 && !hasMoreInventory(held))) {
      return { ...held, cache: 'HIT' };
    }

    /**
     * One fetch per key, however many customers ask at once.
     *
     * A popular destination whose entry has just expired arrives as N identical
     * searches in the same second; without this each pays for its own fan-out
     * and the suppliers get N times the traffic exactly when they can least
     * serve it (TripJack's WAF, ADR-0000 §3.1b).
     */
    const filled = await this.#d.coalescer.run(`${key}|${needed}`, async () => {
      let working = held;

      while (
        countHotels(working) < needed &&
        working.windows < MAX_WINDOWS &&
        // The first window is always attempted — a search with no answer at all
        // is worse than a late one, and `fanOut` bounds each supplier itself.
        // Only the EXTRA rounds are gated on what is left of the budget.
        (working.windows === 0 ||
          (hasMoreInventory(working) && !ctx.deadline.hasPassed(this.#d.clock.now())))
      ) {
        const window = await fanOut(
          {
            // The supplier window advances; the customer's page does not decide
            // it twice.
            request: { ...request, page: { ...request.page, page: working.windows + 1 } },
            suppliers: selected,
            targets,
            deadline: ctx.deadline,
            signal: ctx.signal,
          },
          { clock: this.#d.clock, ids: this.#d.ids, logger: ctx.logger, searchId: ctx.searchId },
        );

        working = {
          results: [...working.results, ...window.results],
          // The latest attempt per supplier: what the customer is told about
          // supplier health should describe the fetch that just happened.
          attempts: mergeAttempts(working.attempts, window.attempts),
          windows: working.windows + 1,
        };
      }
      return working;
    });

    /**
     * A search that came back with nothing, over an entry we still hold.
     *
     * Serving the older answer beats serving none: the prices are minutes old
     * and every one of them is re-checked at the booking gate before a card is
     * charged. Reported as STALE rather than passed off as fresh.
     */
    if (countHotels(filled) === 0 && cached.state === 'STALE' && countHotels(cached.value) > 0) {
      ctx.logger.warn('serving a stale result: this search returned nothing', {
        searchId: ctx.searchId,
        ageMs: cached.ageMs,
      });
      return { ...cached.value, cache: 'STALE' };
    }

    if (isCacheable(filled)) {
      await this.#d.cache.set(key, filled, this.#d.config.cacheTtl ?? DEFAULT_SEARCH_CACHE_TTL);
    }

    return { ...filled, cache: cached.state === 'HIT' ? 'HIT' : 'MISS' };
  }

  /**
   * Which country's markup rules apply.
   *
   * The destination is the authority: it is fixed before any supplier is
   * called, so the answer cannot change with who replied or how fast. Reading
   * the first hotel that happened to carry a country made the region — and
   * therefore the price — depend on fan-out ordering and on which supplier
   * timed out, and applied one country's rules to a result set that might span
   * a border.
   *
   * A bare coordinate search has no destination record. Rather than fall back
   * to `ALL` — which selects no rule at all unless an `ALL` rule happens to be
   * configured, and would sell at cost — it falls back to the country most of
   * the inventory is in. Majority, not first: a deterministic function of the
   * whole set, tie-broken by code so it never depends on arrival order.
   */
  async #regionCountry(
    target: UnifiedHotelSearchRequest['target'],
    hotels: readonly SupplierHotel[],
  ): Promise<PricingScope['destinationCountry']> {
    const declared = await this.#d.destinations.countryOf(target);
    if (declared !== undefined) return declared;

    const counts = new Map<string, number>();
    for (const h of hotels) {
      if (h.countryCode === undefined) continue;
      counts.set(String(h.countryCode), (counts.get(String(h.countryCode)) ?? 0) + 1);
    }
    if (counts.size === 0) return undefined;

    const [winner] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    return winner?.[0] as PricingScope['destinationCountry'];
  }

  /**
   * Which properties are worth a rate lookup.
   *
   * Only suppliers whose search returns no bookable rates produce candidates,
   * and only where the marked-up lead-in price could beat the bookable price
   * already held for the same canonical hotel.
   */
  #enrichmentCandidates(
    matches: readonly MatchResult[],
    scope: PricingScope,
    pricingFor: (hotel: CanonicalHotel) => ResolvedPricing,
  ): EnrichmentCandidate[] {
    const bestBookable = new Map<KlarHotelId, CustomerPrice>();
    for (const m of matches) {
      for (const rate of m.supplierHotel.rates) {
        const price = this.#d.pricing.priceRate(
          rate,
          m.supplierHotel.supplier,
          scope,
          pricingFor(m.canonical),
        );
        const current = bestBookable.get(m.canonical.klarHotelId);
        if (current === undefined || price.total.minor < current.total.minor) {
          bestBookable.set(m.canonical.klarHotelId, price);
        }
      }
    }

    const candidates: EnrichmentCandidate[] = [];
    for (const m of matches) {
      if (m.supplierHotel.rates.length > 0) continue;
      if (m.supplierHotel.indicativeCost === undefined) continue;

      const indicative = this.#d.pricing.priceIndicative(
        m.supplierHotel.indicativeCost,
        m.supplierHotel.supplier,
        scope,
        pricingFor(m.canonical),
      );
      const incumbent = bestBookable.get(m.canonical.klarHotelId);
      candidates.push({
        supplier: m.supplierHotel.supplier,
        hotel: m.supplierHotel,
        indicativeTotal: indicative.total,
        ...(incumbent !== undefined ? { incumbentTotal: incumbent.total } : {}),
      });
    }
    return candidates;
  }

  async #merge(input: {
    matches: readonly MatchResult[];
    enriched: Map<string, readonly SupplierRate[]>;
    scope: PricingScope;
    pricingFor: (hotel: CanonicalHotel) => ResolvedPricing;
    attempts: readonly SupplierAttempt[];
    searchId: ReturnType<IdGenerator['searchId']>;
    request: UnifiedHotelSearchRequest;
  }): Promise<MergedHotel[]> {
    const buckets = new Map<KlarHotelId, Bucket>();

    for (const match of input.matches) {
      const { supplierHotel, canonical } = match;
      let bucket = buckets.get(canonical.klarHotelId);
      if (bucket === undefined) {
        bucket = {
          klarHotelId: canonical.klarHotelId,
          canonical,
          deals: [],
          indicative: [],
          confidences: [],
          suppliers: new Set(),
        };
        buckets.set(canonical.klarHotelId, bucket);
      }
      bucket.confidences.push(match.confidence);
      bucket.suppliers.add(supplierHotel.supplier);

      const key = `${supplierHotel.supplier}:${String(supplierHotel.supplierHotelId)}`;
      const rates = supplierHotel.rates.length > 0 ? supplierHotel.rates : (input.enriched.get(key) ?? []);

      // Tokens are independent of one another and every one is a round trip to
      // the token store. Issuing them in sequence made the post-fan-out stage
      // cost one latency per RATE — hundreds of them on a busy destination,
      // inside the fraction of a second the 15 s deadline has left once the
      // suppliers have had their 14 (ADR-0003).
      const issued = await Promise.all(
        rates.map(async (rate) => {
          const resolved = input.pricingFor(canonical);
          const price = this.#d.pricing.priceRate(
            rate,
            supplierHotel.supplier,
            input.scope,
            resolved,
          );
          return {
            rate,
            price,
            // The QUOTE is sealed, not just the rate handle. Revalidation
            // compares this exact price against a fresh one; re-deriving it at
            // precheck would move the customer's price whenever a markup rule
            // or a resolved region changed, for a reason that has nothing to do
            // with the supplier.
            token: await this.#d.rateTokens.issue({
              searchId: input.searchId,
              supplier: supplierHotel.supplier,
              supplierHotelId: supplierHotel.supplierHotelId,
              klarHotelId: canonical.klarHotelId,
              rate,
              quotedPrice: price,
              stay: input.request.stay,
              occupancy: input.request.occupancy,
              nationality: input.request.nationality,
              scope: {
                channel: input.scope.channel,
                homeCountry: input.scope.homeCountry,
                ...(canonicalPricingCountry(canonical, input.scope) !== undefined
                  ? { destinationCountry: canonicalPricingCountry(canonical, input.scope) }
                  : {}),
                nights: input.scope.nights,
              },
              markupVersion: resolved.markupVersion,
              validForMs: this.#d.config.rateTokenTtlMs,
            }),
          };
        }),
      );

      for (const { rate, price, token } of issued) {
        bucket.deals.push({
          dealId: token.dealId,
          supplier: supplierHotel.supplier,
          klarHotelId: canonical.klarHotelId,
          supplierHotelId: supplierHotel.supplierHotelId,
          room: rate.room,
          board: rate.board,
          occupancy: rate.occupancy,
          cancellation: rate.cancellation,
          cost: rate.cost,
          price,
          token: { dealId: token.dealId, issuedAt: new Date(this.#d.clock.now()), expiresAt: token.expiresAt },
          ...(rate.allotment !== undefined ? { allotment: rate.allotment } : {}),
          onHoldAllowed: rate.onHoldAllowed,
          ...(rate.compliance !== undefined ? { compliance: rate.compliance } : {}),
        });
      }

      // A lead-in price is kept only when that supplier produced no bookable
      // rate for this hotel — otherwise the real quote supersedes it.
      if (rates.length === 0 && supplierHotel.indicativeCost !== undefined) {
        bucket.indicative.push({
          supplier: supplierHotel.supplier,
          supplierHotelId: String(supplierHotel.supplierHotelId),
          price: this.#d.pricing.priceIndicative(
            supplierHotel.indicativeCost,
            supplierHotel.supplier,
            input.scope,
            input.pricingFor(canonical),
          ),
        });
      }
    }

    const requestedOccupancy = occupancySignature(input.request.occupancy);
    const reliability = this.#d.registry.reliabilityScores();
    const missing = incompleteSuppliers(input.attempts);

    const merged: MergedHotel[] = [];
    for (const bucket of buckets.values()) {
      const comparedAcross = [...bucket.suppliers].sort();
      const base = {
        klarHotelId: bucket.klarHotelId,
        hotel: bucket.canonical,
        indicativeOffers: bucket.indicative,
        matchConfidence: weakest(bucket.confidences),
      };

      if (bucket.deals.length > 0) {
        const selection = selectFeaturedDeal(bucket.deals, {
          policy: this.#d.config.selectionPolicy,
          requestedOccupancy,
          supplierReliability: reliability,
        });
        merged.push({
          ...base,
          featuredDeal: selection.featured,
          deals: bucket.deals,
          alternativeDeals: selection.alternatives,
          bestPrice: selection.featured.price,
          priceKind: 'BOOKABLE',
          comparison: {
            comparedAcross,
            incompleteSuppliers: missing,
            priceGuarantee: priceGuaranteeFor(input.attempts),
            equivalenceClass: selection.featuredGroupKey,
            policy: selection.policy,
          },
        });
        continue;
      }

      // No bookable rate anywhere: show the cheapest lead-in, clearly labelled.
      const cheapestIndicative = bucket.indicative
        .slice()
        .sort((a, b) => comparePrices(a.price, b.price))[0];
      if (cheapestIndicative === undefined) continue;

      merged.push({
        ...base,
        deals: [],
        alternativeDeals: [],
        bestPrice: cheapestIndicative.price,
        priceKind: 'INDICATIVE',
        comparison: {
          comparedAcross,
          incompleteSuppliers: missing,
          // An unpriced hotel can never carry a best-available claim.
          priceGuarantee: 'PARTIAL',
          equivalenceClass: '',
          policy: this.#d.config.selectionPolicy,
        },
      });
    }

    return merged;
  }
}
