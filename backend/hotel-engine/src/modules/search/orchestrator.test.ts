import { describe, expect, it } from 'vitest';
import {
  countryCode,
  currencyCode,
  dealId,
  klarDestinationId,
  type SupplierCode,
} from '../../domain/shared/brand.js';
import { toMajor } from '../../domain/shared/money.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import type { MarkupRegion, MarkupRule } from '../../domain/pricing/markup.js';
import type { Cache, IssuedRateToken, Logger, MarkupProvider, RateTokenStore } from '../ports.js';
import { KeyValueCache } from '../../infrastructure/cache/cache.js';
import { InFlightCoalescer } from '../../infrastructure/cache/coalescer.js';
import { InMemoryKeyValueStore } from '../../infrastructure/rate-token/rate-token-store.js';
import type { UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import type { SupplierSearchTarget } from '../../suppliers/contract/dto.js';
import { SupplierRegistry } from '../../suppliers/contract/registry.js';
import { PricingService } from '../pricing/pricing-service.js';
import {
  FakeClock,
  FakeDestinationResolver,
  FakeMarkupProvider,
  FakeRateTokenStore,
  InMemoryPropertyRepository,
  SequentialIds,
  silentLogger,
  type SeedHotel,
} from '../testing/fakes.js';
import { RG, SC, TJ, fakeConfig, fakeSupplier, type FakeSupplierSpec } from '../testing/fake-supplier.js';
import { SearchOrchestrator, type SearchConfig } from './orchestrator.js';

const INR = currencyCode('INR');
const IN = countryCode('IN');
const DEST: SupplierSearchTarget = { kind: 'DEST_CODE', code: 'GOA' };

const request = (over: Partial<UnifiedHotelSearchRequest> = {}): UnifiedHotelSearchRequest => ({
  target: { kind: 'DESTINATION', destinationId: klarDestinationId('KLAR-DEST-GOA') },
  stay: stayDates('2026-09-10', '2026-09-13'),
  occupancy: occupancy([roomRequest(2, 0, [])]),
  currency: INR,
  nationality: IN,
  channel: 'B2C',
  sort: 'PRICE_ASC',
  page: { page: 1, limit: 20 },
  ...over,
});

interface HarnessOptions {
  readonly suppliers: readonly FakeSupplierSpec[];
  readonly seed?: readonly SeedHotel[];
  readonly rules?: readonly MarkupRule[];
  readonly config?: Partial<SearchConfig>;
  /** Suppliers with no destination mapping, i.e. not eligible for this search. */
  readonly unmapped?: readonly string[];
  /**
   * Suppliers whose `search` throws instead of resolving — an adapter breaking
   * the contract ADR-0004 states, which the fan-out must absorb.
   */
  readonly throwing?: readonly string[];
  /**
   * Suppliers whose `getRates` throws. Distinct from `throwing`, because the
   * enrichment stage calls only `getRates` and had no isolation barrier of its
   * own — the fan-out's fix never reached it.
   */
  readonly ratesThrowing?: readonly string[];
  /** Country the destination record declares. Absent mirrors an AREA search. */
  readonly destinationCountry?: ReturnType<typeof countryCode>;
  readonly clock?: FakeClock;
  readonly markup?: MarkupProvider;
  readonly rateTokenStore?: RateTokenStore;
  readonly cache?: Cache;
  readonly logger?: Logger;
}

function harness(opts: HarnessOptions) {
  const registry = new SupplierRegistry();
  const targets = new Map<SupplierCode, SupplierSearchTarget | null>();

  for (const spec of opts.suppliers) {
    const supplier = fakeSupplier(spec);
    if (opts.throwing?.includes(spec.code) === true) {
      const throwing: typeof supplier = {
        ...supplier,
        search: () => {
          throw new Error(`${spec.code} adapter blew up while mapping`);
        },
      };
      registry.register(throwing, fakeConfig(spec.code));
      targets.set(supplier.code, DEST);
      continue;
    }
    if (opts.ratesThrowing?.includes(spec.code) === true) {
      registry.register(
        {
          ...supplier,
          getRates: () => {
            // What a domain constructor does to a value it cannot represent —
            // a negative tax line, a total outside the safe-integer range —
            // reaching a mapper that runs outside `callSupplier`'s guard.
            throw new Error(`${spec.code} rate mapper blew up`);
          },
        },
        fakeConfig(spec.code),
      );
      targets.set(supplier.code, DEST);
      continue;
    }
    registry.register(supplier, fakeConfig(spec.code));
    targets.set(supplier.code, opts.unmapped?.includes(spec.code) === true ? null : DEST);
  }

  const properties = new InMemoryPropertyRepository(opts.seed ?? []);
  // Returned as the concrete fake so tests can read `.issued`; a caller that
  // supplies its own store holds its own reference to it.
  const rateTokens = new FakeRateTokenStore();
  const clock = opts.clock ?? new FakeClock();
  // A real cache, not a null one: the suite should exercise the code path
  // production takes, including the second search that reuses the first.
  const cache =
    opts.cache ??
    new KeyValueCache({
      kv: new InMemoryKeyValueStore(() => clock.now()),
      now: () => clock.now(),
      logger: silentLogger,
    });

  const orchestrator = new SearchOrchestrator({
    registry,
    destinations: new FakeDestinationResolver(targets, 6_179, opts.destinationCountry),
    properties,
    pricing: new PricingService(opts.markup ?? new FakeMarkupProvider(opts.rules ?? [])),
    rateTokens: opts.rateTokenStore ?? rateTokens,
    cache,
    coalescer: new InFlightCoalescer(),
    clock,
    ids: new SequentialIds(),
    logger: opts.logger ?? silentLogger,
    config: {
      deadlineMs: 15_000,
      homeCountry: IN,
      selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
      rateTokenTtlMs: 900_000,
      ...opts.config,
    },
  });

  return { orchestrator, properties, rateTokens, registry, cache, clock };
}

/** One property, sold by every supplier under its own id. */
const TAJ_SEED: SeedHotel[] = [
  {
    klarHotelId: 'KLAR-TAJ',
    name: 'Taj Exotica Resort and Spa',
    city: 'Goa',
    location: { lat: 15.2596, lng: 73.9188 },
    address: 'Calwaddo, Benaulim, Goa',
    starRating: 5,
    mappings: [
      { supplier: TJ, supplierHotelId: 'TJ-100' },
      { supplier: RG, supplierHotelId: 'RG-900' },
      { supplier: SC, supplierHotelId: 'SC-700' },
    ],
  },
];

const tajFrom = (code: string, id: string, totalMajor: number): FakeSupplierSpec => ({
  code,
  hotels: [
    {
      id,
      name: 'Taj Exotica Resort and Spa',
      city: 'Goa',
      location: { lat: 15.2596, lng: 73.9188 },
      starRating: 5,
      rates: [{ ref: `${code}-rate`, totalMajor }],
    },
  ],
});

// ═══ Definition of Done, brief §52 ═════════════════════════════════════════

describe('Definition of Done (brief §52)', () => {
  it('scenario 1 — TripJack 10,000 vs RateGain 12,000 → 10,000, winner TripJack', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 10_000), tajFrom('RG', 'RG-900', 12_000)],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(1);
    const hotel = result.hotels[0];
    expect(toMajor(hotel!.bestPrice.total)).toBe(10_000);
    expect(hotel!.featuredDeal?.supplier).toBe(TJ);
  });

  it('scenario 2 — TripJack 12,000 vs RateGain 10,000 → 10,000, winner RateGain', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 10_000)],
    });

    const result = await orchestrator.search(request());
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(10_000);
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(RG);
  });

  it('scenario 3 — TripJack succeeds, RateGain times out → TripJack results, labelled PARTIAL', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        tajFrom('TJ', 'TJ-100', 10_000),
        { code: 'RG', searchFailure: { status: 'TIMEOUT', code: 'SUPPLIER_TIMEOUT' } },
      ],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(TJ);
    // The whole point: results are served, and we do not claim they are the
    // cheapest available when a supplier was never heard from.
    expect(result.priceGuarantee).toBe('PARTIAL');
    expect(result.hotels[0]!.comparison.incompleteSuppliers).toEqual([RG]);
  });

  it('scenario 4 — RateGain succeeds, TripJack times out → RateGain results, labelled PARTIAL', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        { code: 'TJ', searchFailure: { status: 'TIMEOUT', code: 'SUPPLIER_TIMEOUT' } },
        tajFrom('RG', 'RG-900', 11_000),
      ],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(RG);
    expect(result.priceGuarantee).toBe('PARTIAL');
    expect(result.hotels[0]!.comparison.incompleteSuppliers).toEqual([TJ]);
  });

  it('scenario 5 — same property, different supplier ids, different prices → one hotel, cheapest deal', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_500), tajFrom('RG', 'RG-900', 11_800)],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(1);
    const hotel = result.hotels[0];
    expect(toMajor(hotel!.bestPrice.total)).toBe(11_800);
    expect(hotel!.featuredDeal?.supplier).toBe(RG);
    // Both deals survive the merge, and both are bookable.
    expect(hotel!.deals).toHaveLength(2);
    expect(hotel!.deals.every((d) => d.dealId.length > 0)).toBe(true);
    expect(hotel!.comparison.comparedAcross).toEqual([RG, TJ]);
    expect(result.priceGuarantee).toBe('BEST_AVAILABLE');
  });

  it('scenario 6 — both suppliers fail → an empty, controlled result, not an exception', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        { code: 'TJ', searchFailure: { status: 'ERROR', code: 'SUPPLIER_UNAVAILABLE' } },
        { code: 'RG', searchFailure: { status: 'TIMEOUT', code: 'SUPPLIER_TIMEOUT' } },
      ],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toEqual([]);
    expect(result.priceGuarantee).toBe('PARTIAL');
    expect(result.diagnostics.attempts.map((a) => a.status).sort()).toEqual(['ERROR', 'TIMEOUT']);
    expect(result.diagnostics.attempts.every((a) => a.errorCode?.startsWith('SUPPLIER_'))).toBe(true);
  });

  it('scenario 7 — a third supplier needs no change to the engine', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        tajFrom('TJ', 'TJ-100', 12_000),
        tajFrom('RG', 'RG-900', 11_500),
        tajFrom('SC', 'SC-700', 9_900),
      ],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(SC);
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(9_900);
    expect(result.hotels[0]!.deals).toHaveLength(3);
  });
});

// ═══ Pricing symmetry, brief §11/§15 ═══════════════════════════════════════

describe('markup is applied to every supplier alike (regression: D-1)', () => {
  const platform: MarkupRule = {
    layer: 'PLATFORM',
    enabled: true,
    type: 'PERCENTAGE',
    value: 5,
    region: 'ALL',
    basis: 'NET',
  };

  it('does not let markup change which supplier is cheapest', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      rules: [platform],
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(RG);
    // 11,500 + 5%.
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(12_075);
  });

  it('marks every deal up, not only the winner', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      rules: [platform],
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
    });

    const result = await orchestrator.search(request());
    for (const deal of result.hotels[0]!.deals) {
      expect(deal.price.platformMarkup.minor).toBeGreaterThan(0);
    }
  });

  it('raises a price to a supplier-mandated minimum selling price', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        {
          code: 'RG',
          hotels: [
            {
              id: 'RG-900',
              name: 'Taj Exotica Resort and Spa',
              city: 'Goa',
              location: { lat: 15.2596, lng: 73.9188 },
              rates: [{ ref: 'rg-msp', totalMajor: 10_000, mspMajor: 11_000, mspMandatory: true }],
            },
          ],
        },
      ],
    });

    const result = await orchestrator.search(request());
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(11_000);
    expect(toMajor(result.hotels[0]!.featuredDeal!.price.mspUplift)).toBe(1_000);
  });
});

// ═══ Identity, brief §12/§29 ═══════════════════════════════════════════════

describe('canonical identity', () => {
  it('merges the same property sold under different supplier ids', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
    });
    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(1);
    expect(result.diagnostics.hotelsBeforeMerge).toBe(2);
    expect(result.diagnostics.hotelsAfterMerge).toBe(1);
  });

  it('keeps different hotels apart even at identical coordinates', async () => {
    // Suppliers return a shared city-centre pin for properties they could not
    // geocode. Proximity alone must never merge.
    const pin = { lat: 15.4909, lng: 73.8278 };
    const { orchestrator } = harness({
      suppliers: [
        {
          code: 'TJ',
          hotels: [{ id: 'A', name: 'Sunset Villas', city: 'Goa', location: pin, rates: [{ ref: 'a', totalMajor: 8_000 }] }],
        },
        {
          code: 'RG',
          hotels: [{ id: 'B', name: 'Coral Reef Guesthouse', city: 'Goa', location: pin, rates: [{ ref: 'b', totalMajor: 7_000 }] }],
        },
      ],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(2);
    expect(result.diagnostics.mergesPerformed).toBe(0);
  });

  it('does not merge a chain name into one of its sub-brands', async () => {
    const location = { lat: 19.076, lng: 72.8777 };
    const { orchestrator } = harness({
      seed: [
        {
          klarHotelId: 'KLAR-MARRIOTT',
          name: 'Marriott',
          city: 'Mumbai',
          location,
          address: 'Juhu Tara Road, Mumbai',
          starRating: 5,
          mappings: [{ supplier: TJ, supplierHotelId: 'TJ-M1' }],
        },
      ],
      suppliers: [
        {
          code: 'RG',
          hotels: [
            {
              id: 'RG-M2',
              name: 'Marriott Executive Apartments',
              city: 'Mumbai',
              location,
              address: 'Juhu Tara Road, Mumbai',
              starRating: 5,
              rates: [{ ref: 'm2', totalMajor: 9_000 }],
            },
          ],
        },
      ],
    });

    const result = await orchestrator.search(request());
    // A new canonical hotel, not a merge into the chain record.
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0]!.klarHotelId).not.toBe('KLAR-MARRIOTT');
    expect(result.diagnostics.mergesPerformed).toBe(0);
  });

  it('reports the weakest confidence among merged properties', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
    });
    const result = await orchestrator.search(request());
    expect(result.hotels[0]!.matchConfidence).toBe('EXACT_SUPPLIER_MAPPING');
  });
});

// ═══ Indicative pricing and enrichment ═════════════════════════════════════

describe('suppliers whose search returns no bookable rates', () => {
  /** RateGain's real shape: a lead-in price per property and no rate key. */
  const rgIndicative = (indicativeMajor: number, rateMajor?: number): FakeSupplierSpec => ({
    code: 'RG',
    searchReturnsRates: false,
    hotels: [
      {
        id: 'RG-900',
        name: 'Taj Exotica Resort and Spa',
        city: 'Goa',
        location: { lat: 15.2596, lng: 73.9188 },
        indicativeMajor,
      },
    ],
    ...(rateMajor !== undefined
      ? { ratesByHotel: { 'RG-900': [{ ref: 'rg-real', totalMajor: rateMajor }] } }
      : {}),
  });

  it('fetches a real rate when the lead-in price could beat the incumbent', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), rgIndicative(11_000, 11_200)],
    });

    const result = await orchestrator.search(request());
    expect(result.diagnostics.enrichmentCallsIssued).toBe(1);
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(RG);
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(11_200);
    expect(result.hotels[0]!.priceKind).toBe('BOOKABLE');
  });

  /**
   * A dearer lead-in price is ranked last, not discarded.
   *
   * It used to be dropped, on the reasoning that a quote cannot make an
   * already-dearer indicative price the winner. That reasoning compares against
   * the CHEAPEST rate held for the hotel, and the price the customer is shown
   * is the cheapest rate that buys what they searched for (ADR-0007 §2.2) —
   * usually dearer. So a candidate that would have beaten the featured price
   * was discarded for losing to a rate nobody was going to be shown.
   */
  it('still calls for a dearer lead-in price, and keeps the cheaper incumbent', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 10_000), rgIndicative(13_000, 12_900)],
    });

    const result = await orchestrator.search(request());
    expect(result.diagnostics.enrichmentCallsIssued).toBe(1);
    // The quote came back dearer, so the incumbent still wins — which is the
    // outcome the old filter guessed at instead of checking.
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(TJ);
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(10_000);
  });

  it('spends its budget on the best prospects first', async () => {
    // One hotel has no bookable price at all and one has a dearer lead-in.
    // With a single call to spend, the hotel with nothing bookable gets it.
    const { orchestrator } = harness({
      seed: [
        ...TAJ_SEED,
        { klarHotelId: 'KLAR-OTHER', name: 'Sea View Inn', city: 'Goa', mappings: [{ supplier: RG, supplierHotelId: 'RG-901' }] },
      ],
      suppliers: [
        tajFrom('TJ', 'TJ-100', 10_000),
        {
          code: 'RG',
          searchReturnsRates: false,
          hotels: [
            { id: 'RG-900', name: 'Taj Exotica Resort and Spa', city: 'Goa', location: { lat: 15.2596, lng: 73.9188 }, indicativeMajor: 13_000 },
            { id: 'RG-901', name: 'Sea View Inn', city: 'Goa', indicativeMajor: 9_000 },
          ],
          ratesByHotel: {
            'RG-900': [{ ref: 'rg-dear', totalMajor: 12_900 }],
            'RG-901': [{ ref: 'rg-only', totalMajor: 9_100 }],
          },
        },
      ],
      config: { enrichment: { maxCalls: 1, concurrency: 4, minRemainingMs: 0 } },
    });

    const result = await orchestrator.search(request());
    expect(result.diagnostics.enrichmentCallsIssued).toBe(1);
    // The hotel that had no bookable price now has one.
    const seaView = result.hotels.find((h) => h.hotel.name === 'Sea View Inn');
    expect(seaView?.priceKind).toBe('BOOKABLE');
  });

  it('shows a hotel nobody has quoted, marked as indicative', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [rgIndicative(11_000)],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toHaveLength(1);
    expect(result.hotels[0]!.priceKind).toBe('INDICATIVE');
    expect(result.hotels[0]!.featuredDeal).toBeUndefined();
    expect(result.hotels[0]!.deals).toEqual([]);
    // An unpriced hotel can never carry a best-available claim.
    expect(result.hotels[0]!.comparison.priceGuarantee).toBe('PARTIAL');
  });

  it('respects the enrichment budget and reports what it skipped', async () => {
    const many: FakeSupplierSpec = {
      code: 'RG',
      searchReturnsRates: false,
      hotels: Array.from({ length: 10 }, (_, i) => ({
        id: `RG-${i}`,
        name: `Beach Hotel ${i}`,
        city: 'Goa',
        location: { lat: 15.2 + i / 1000, lng: 73.9 },
        indicativeMajor: 5_000 + i,
      })),
      ratesByHotel: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`RG-${i}`, [{ ref: `r${i}`, totalMajor: 5_000 + i }]]),
      ),
    };

    const { orchestrator } = harness({
      suppliers: [many],
      config: { enrichment: { maxCalls: 3, concurrency: 2, minRemainingMs: 100 } },
    });

    const result = await orchestrator.search(request());
    expect(result.diagnostics.enrichmentCallsIssued).toBe(3);
    // Not hidden: the difference between "no cheaper rate" and "we stopped".
    expect(result.diagnostics.enrichmentSkipped).toBe(7);
  });
});

// ═══ Supplier health, brief §34 ════════════════════════════════════════════

describe('supplier health is reported, never swallowed (regression: D-8)', () => {
  it('records an attempt for every supplier, including the ones that failed', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        tajFrom('TJ', 'TJ-100', 10_000),
        { code: 'RG', searchFailure: { status: 'ERROR', code: 'SUPPLIER_AUTH_FAILED' } },
      ],
    });

    const result = await orchestrator.search(request());
    const rg = result.diagnostics.attempts.find((a) => a.supplier === RG);
    expect(rg?.status).toBe('ERROR');
    expect(rg?.errorCode).toBe('SUPPLIER_AUTH_FAILED');
    expect(rg?.retryable).toBe(false);
  });

  it('does not count a supplier that cannot serve the destination as a gap', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 10_000), tajFrom('RG', 'RG-900', 12_000)],
      unmapped: ['RG'],
    });

    const result = await orchestrator.search(request());
    expect(result.diagnostics.attempts.find((a) => a.supplier === RG)?.status).toBe('NOT_ELIGIBLE');
    expect(result.priceGuarantee).toBe('BEST_AVAILABLE');
  });

  it('carries a searchId through the response', async () => {
    const { orchestrator } = harness({ seed: TAJ_SEED, suppliers: [tajFrom('TJ', 'TJ-100', 10_000)] });
    const result = await orchestrator.search(request());
    expect(result.searchId).toMatch(/^KLAR-SRCH-/);
    expect(result.diagnostics.searchId).toBe(result.searchId);
  });
});

describe('diagnostics are logged, not only returned (OPEN-ISSUES §4)', () => {
  function capturingLogger(): Logger & { infos: Array<{ message: string; fields?: Record<string, unknown> }> } {
    const logger = {
      infos: [] as Array<{ message: string; fields?: Record<string, unknown> }>,
      debug: () => undefined,
      info: (message: string, fields?: Record<string, unknown>) => {
        logger.infos.push({ message, fields });
      },
      warn: () => undefined,
      error: () => undefined,
      child: () => logger,
    };
    return logger;
  }

  it('logs the same figures the response carries under diagnostics', async () => {
    const logger = capturingLogger();
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 10_000)],
      logger,
    });

    const result = await orchestrator.search(request());

    const entry = logger.infos.find((i) => i.message === 'search complete');
    expect(entry).toBeDefined();
    expect(entry?.fields?.['searchId']).toBe(result.searchId);
    expect(entry?.fields?.['cache']).toBe(result.diagnostics.cache);
    expect(entry?.fields?.['hotelsAfterMerge']).toBe(result.diagnostics.hotelsAfterMerge);
    expect(entry?.fields?.['deadlineHit']).toBe(result.diagnostics.deadlineHit);
  });
});

// ═══ Presentation ══════════════════════════════════════════════════════════

describe('filter, sort and paginate', () => {
  const threeHotels: FakeSupplierSpec = {
    code: 'TJ',
    hotels: [
      { id: 'H1', name: 'Cheap Inn', city: 'Goa', starRating: 3, location: { lat: 15.1, lng: 73.9 }, rates: [{ ref: 'r1', totalMajor: 4_000 }] },
      { id: 'H2', name: 'Mid Hotel', city: 'Goa', starRating: 4, location: { lat: 15.2, lng: 73.9 }, rates: [{ ref: 'r2', totalMajor: 8_000, board: 'Breakfast' }] },
      { id: 'H3', name: 'Grand Resort', city: 'Goa', starRating: 5, location: { lat: 15.3, lng: 73.9 }, rates: [{ ref: 'r3', totalMajor: 15_000, refundable: true }] },
    ],
  };

  it('sorts by price ascending', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(request());
    expect(result.hotels.map((h) => toMajor(h.bestPrice.total))).toEqual([4_000, 8_000, 15_000]);
  });

  it('sorts by price descending', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(request({ sort: 'PRICE_DESC' }));
    expect(result.hotels.map((h) => toMajor(h.bestPrice.total))).toEqual([15_000, 8_000, 4_000]);
  });

  it('filters by star rating', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(request({ filters: { starRatings: [5] } }));
    expect(result.hotels.map((h) => h.hotel.name)).toEqual(['Grand Resort']);
  });

  it('filters by price range against the marked-up price', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(
      request({ filters: { priceMin: 500_000, priceMax: 1_000_000 } }),
    );
    expect(result.hotels.map((h) => h.hotel.name)).toEqual(['Mid Hotel']);
  });

  it('filters to free cancellation only', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(request({ filters: { freeCancellationOnly: true } }));
    expect(result.hotels.map((h) => h.hotel.name)).toEqual(['Grand Resort']);
  });

  /**
   * D-12: the reference measured paging against the unfiltered set and sliced
   * the filtered one, so a selective filter produced an empty page that also
   * reported no more results.
   */
  it('pages against the filtered set, not the unfiltered one', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const page1 = await orchestrator.search(
      request({ filters: { starRatings: [3, 4] }, page: { page: 1, limit: 1 } }),
    );
    expect(page1.hotels).toHaveLength(1);
    expect(page1.page.matchedHotels).toBe(2);
    expect(page1.page.hasMore).toBe(true);

    const page2 = await orchestrator.search(
      request({ filters: { starRatings: [3, 4] }, page: { page: 2, limit: 1 } }),
    );
    expect(page2.hotels).toHaveLength(1);
    expect(page2.page.hasMore).toBe(false);
  });

  /**
   * The value is what the engine filters on; the label is what a person reads.
   * They were the same string, so the panel offered a meal-plan filter called
   * "BB" — and `Board.label` cannot fill the gap, because it is one supplier's
   * wording for one rate ("BED AND BREAKFAST" from one, "Breakfast" from
   * another) and a facet aggregates across both.
   */
  it('labels the meal-plan facet with something a customer can read', async () => {
    const { orchestrator } = harness({ seed: TAJ_SEED, suppliers: [tajFrom('TJ', 'TJ-100', 12_000)] });
    const result = await orchestrator.search(request());

    const board = result.facets.boards[0];
    expect(board?.value).toBe('RO');
    expect(board?.label).toBe('Room only');
  });

  it('builds facets on the unfiltered set so options never vanish', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(request({ filters: { starRatings: [5] } }));
    expect(result.hotels).toHaveLength(1);
    // The filter selected one hotel; the panel still offers all three ratings.
    expect(result.facets.starRatings.map((f) => f.value).sort()).toEqual(['3', '4', '5']);
    expect(result.facets.totalHotels).toBe(3);
  });

  it('reports destination inventory separately from what it returned', async () => {
    const { orchestrator } = harness({ suppliers: [threeHotels] });
    const result = await orchestrator.search(request());
    expect(result.page.inventoryCount).toBe(6_179);
    expect(result.page.matchedHotels).toBe(3);
  });

  it('orders equal-priced hotels the same way every time', async () => {
    const tie: FakeSupplierSpec = {
      code: 'TJ',
      hotels: [
        { id: 'B', name: 'Beta Hotel', city: 'Goa', rates: [{ ref: 'b', totalMajor: 5_000 }] },
        { id: 'A', name: 'Alpha Hotel', city: 'Goa', rates: [{ ref: 'a', totalMajor: 5_000 }] },
      ],
    };
    const first = await harness({ suppliers: [tie] }).orchestrator.search(request());
    const second = await harness({ suppliers: [tie] }).orchestrator.search(request());
    expect(first.hotels.map((h) => h.hotel.name)).toEqual(second.hotels.map((h) => h.hotel.name));
  });
});

describe('rate tokens', () => {
  it('issues an opaque deal id for every bookable rate', async () => {
    const { orchestrator, rateTokens } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
    });

    const result = await orchestrator.search(request());
    expect(rateTokens.issued).toHaveLength(2);
    for (const deal of result.hotels[0]!.deals) {
      expect(deal.dealId).toMatch(/^deal-/);
      expect(deal.token.expiresAt.getTime()).toBeGreaterThan(0);
    }
  });

  it('never exposes a supplier rate reference to the caller', async () => {
    // The client learns a dealId and nothing else, which is what keeps supplier
    // protocol out of the browser.
    const { orchestrator } = harness({ seed: TAJ_SEED, suppliers: [tajFrom('TJ', 'TJ-100', 12_000)] });
    const result = await orchestrator.search(request());
    expect(JSON.stringify(result.hotels)).not.toContain('TJ-rate');
  });
});

// ═══ Regressions from the Phase 1-5 cross-check ═════════════════════════════

/** A lead-in price and no bookable rate — the shape that triggers enrichment. */
const rgIndicativeOnly = (indicativeMajor: number): FakeSupplierSpec => ({
  code: 'RG',
  searchReturnsRates: false,
  hotels: [
    {
      id: 'RG-900',
      name: 'Taj Exotica Resort and Spa',
      city: 'Goa',
      location: { lat: 15.2596, lng: 73.9188 },
      indicativeMajor,
    },
  ],
});

describe('one supplier cannot take down the search', () => {
  /**
   * ADR-0003 §3 says a supplier call never rejects, and §2 says a supplier is
   * never cancelled because another one finished. Both were promises the
   * contract made and the fan-out could not keep: a bare `Promise.all` rejects
   * on the first rejection, so an adapter that threw — a malformed payload
   * reaching a domain constructor is the realistic route — took every other
   * supplier's results down with it and recorded no attempt for anyone.
   */
  it('records a throwing adapter as its own ERROR and keeps the other results', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
      throwing: ['TJ'],
    });

    const result = await orchestrator.search(request());

    // RateGain answered, so the customer still gets a bookable price.
    expect(result.hotels).toHaveLength(1);
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(11_500);

    const tj = result.diagnostics.attempts.find((a) => a.supplier === TJ);
    expect(tj?.status).toBe('ERROR');
    expect(tj?.errorCode).toBe('SUPPLIER_MALFORMED_RESPONSE');

    // And the claim is downgraded, because one supplier was never heard from.
    expect(result.priceGuarantee).toBe('PARTIAL');
  });

  /**
   * The same rule, at the stage the fan-out's fix never reached.
   *
   * `enrichRates` fanned out to `getRates` through a bare `Promise.all` — B-1's
   * construct exactly, one stage later. Both rate mappers run OUTSIDE
   * `callSupplier`'s parse guard, so one malformed rate on one property threw
   * out of `getRates`, rejected the wave, and rejected `search()` itself: an
   * HTTP 500 for a search whose other supplier had already returned a bookable
   * price, and no `SupplierAttempt` for anyone.
   *
   * Enrichment is an optimisation on top of a search that already has an
   * answer. It has even less business failing the request than the fan-out has.
   */
  it('keeps the search when an enrichment rate call throws', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), rgIndicativeOnly(11_000)],
      ratesThrowing: ['RG'],
    });

    const result = await orchestrator.search(request());

    // TripJack's bookable price survives, which is the whole point.
    expect(result.hotels).toHaveLength(1);
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(12_000);
    expect(result.hotels[0]!.featuredDeal?.supplier).toBe(TJ);
    // The call was made and did not succeed; both are reported honestly.
    expect(result.diagnostics.enrichmentCallsIssued).toBe(1);
    expect(result.diagnostics.enrichmentCallsSucceeded).toBe(0);
  });

  it('still answers when every supplier throws', async () => {
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
      throwing: ['TJ', 'RG'],
    });

    const result = await orchestrator.search(request());
    expect(result.hotels).toEqual([]);
    expect(result.diagnostics.attempts.map((a) => a.status)).toEqual(['ERROR', 'ERROR']);
  });
});

describe('the markup region is a property of the question', () => {
  /** Records which region the pricing engine resolved rules for. */
  class RecordingMarkup implements MarkupProvider {
    readonly asked: MarkupRegion[] = [];
    rulesFor(region: MarkupRegion): Promise<readonly MarkupRule[]> {
      this.asked.push(region);
      return Promise.resolve([]);
    }
    version(): string {
      return 'mk-1';
    }
  }

  const hotelIn = (id: string, country: string, i = 0) => ({
    id,
    name: `Hotel ${id}`,
    city: 'Goa',
    country,
    location: { lat: 15.2596 + i / 1000, lng: 73.9188 },
    starRating: 5,
    rates: [{ ref: `${id}-rate`, totalMajor: 10_000 + i }],
  });

  const regionsAsked = async (
    countries: readonly (string | undefined)[],
    destinationCountry?: ReturnType<typeof countryCode>,
  ): Promise<MarkupRegion[]> => {
    const markup = new RecordingMarkup();
    const { orchestrator } = harness({
      suppliers: [
        {
          code: 'TJ',
          hotels: countries.map((c, i) => {
            const h = hotelIn(`TJ-${i}`, c ?? 'ZZ', i);
            if (c === undefined) {
              const { country: _dropped, ...withoutCountry } = h;
              return withoutCountry;
            }
            return h;
          }),
        },
      ],
      ...(destinationCountry !== undefined ? { destinationCountry } : {}),
      markup,
    });
    await orchestrator.search(request());
    return [...markup.asked].sort();
  };

  /**
   * A property's region is a fact about the property.
   *
   * The region used to be read off the first returned hotel that carried a
   * country and then applied to every hotel on the page — order-dependent, and
   * wrong for anything across a border. Each hotel now prices under its own
   * country, which is also what the detail page does for the same hotel
   * (`pricingCountryOf`); the two screens cannot disagree.
   */
  it('prices each hotel under its own country', async () => {
    expect(await regionsAsked(['IN', 'AE', 'AE'], IN)).toEqual(['DOMESTIC', 'INTERNATIONAL']);
  });

  it('does not let arrival order change any hotel’s region', async () => {
    const forward = await regionsAsked(['IN', 'AE', 'AE'], IN);
    const reversed = await regionsAsked(['AE', 'AE', 'IN'], IN);
    expect(reversed).toEqual(forward);
  });

  /**
   * Most catalogue records carry no country at all — TripJack reports a country
   * *name*, which the mapper refuses to treat as an ISO-2 code. Those fall back
   * to the country of the search, which is the same fallback the detail page
   * applies when it is handed one.
   */
  it('falls back to the destination country for a hotel that carries none', async () => {
    expect(await regionsAsked([undefined, undefined], IN)).toEqual(['DOMESTIC']);
  });

  it('uses the majority inventory country when even the destination has none', async () => {
    // Two AE to one IN, and the answer does not move when the order does.
    expect(await regionsAsked([undefined, 'AE', 'AE'])).toEqual(['INTERNATIONAL']);
    expect(await regionsAsked(['AE', undefined, 'AE'])).toEqual(['INTERNATIONAL']);
  });
});

describe('the post-fan-out stage respects the deadline it was given', () => {
  /** A clock that moves on every reading, so a deadline passes mid-search. */
  class TickingClock extends FakeClock {
    readonly #step: number;
    constructor(step: number) {
      super();
      this.#step = step;
    }
    override now(): number {
      const t = super.now();
      this.advance(this.#step);
      return t;
    }
  }

  /**
   * The catalogue knows this property through TripJack only. RateGain returns
   * the same hotel under its own id, so the matcher has to score it — a tier-3
   * match, and something genuinely worth writing back.
   */
  const TJ_ONLY_SEED: SeedHotel[] = [
    {
      klarHotelId: 'KLAR-TAJ',
      name: 'Taj Exotica Resort and Spa',
      city: 'Goa',
      location: { lat: 15.2596, lng: 73.9188 },
      address: 'Calwaddo, Benaulim, Goa',
      starRating: 5,
      mappings: [{ supplier: TJ, supplierHotelId: 'TJ-100' }],
    },
  ];

  const scenario = {
    seed: TJ_ONLY_SEED,
    suppliers: [tajFrom('TJ', 'TJ-100', 12_000), tajFrom('RG', 'RG-900', 11_500)],
  };

  it('writes the mapping back on a search that finishes in time', async () => {
    const { orchestrator, properties } = harness(scenario);

    const result = await orchestrator.search(request());

    expect(result.diagnostics.deadlineHit).toBe(false);
    expect(properties.persisted.map((m) => String(m.supplierHotelId))).toEqual(['RG-900']);
  });

  /**
   * ADR-0003 budgets one absolute deadline for the whole search, and nothing
   * after the fan-out ever consulted it. The write-backs are the part that can
   * go: they are an investment in the NEXT search, so dropping them changes
   * nothing this customer sees — and the same search still returns its hotel.
   */
  it('skips them once the deadline has gone, without changing the answer', async () => {
    const { orchestrator, properties } = harness({
      ...scenario,
      clock: new TickingClock(60_000),
      config: { deadlineMs: 1 },
    });

    const result = await orchestrator.search(request());

    expect(result.diagnostics.deadlineHit).toBe(true);
    expect(result.hotels).toHaveLength(1);
    expect(toMajor(result.hotels[0]!.bestPrice.total)).toBe(11_500);
    expect(properties.persisted).toEqual([]);
    expect(properties.unresolved).toEqual([]);
  });
});

describe('rate tokens are issued in parallel', () => {
  /** Records how many `issue` calls are in flight at once. */
  class ConcurrencyProbe implements RateTokenStore {
    #n = 0;
    #inFlight = 0;
    maxInFlight = 0;

    resolve(): Promise<null> {
      return Promise.resolve(null);
    }
    reseal(): Promise<void> {
      return Promise.resolve();
    }
    consume(): Promise<boolean> {
      return Promise.resolve(true);
    }

    async issue(): Promise<IssuedRateToken> {
      this.#inFlight += 1;
      this.maxInFlight = Math.max(this.maxInFlight, this.#inFlight);
      // Yield, so a sequential caller cannot accidentally look concurrent.
      await Promise.resolve();
      this.#inFlight -= 1;
      this.#n += 1;
      return { dealId: dealId(`deal-${this.#n}`), expiresAt: new Date(Date.UTC(2030, 0, 1)) };
    }
  }

  /**
   * Every token is a round trip to the token store, and no token depends on
   * another. Issuing them one at a time cost one latency PER RATE, inside the
   * fraction of a second the 15 s deadline has left once the suppliers have
   * taken their 14 (ADR-0003).
   */
  it('does not serialise one round trip per rate', async () => {
    const probe = new ConcurrencyProbe();
    const { orchestrator } = harness({
      seed: TAJ_SEED,
      suppliers: [
        {
          code: 'TJ',
          hotels: [
            {
              id: 'TJ-100',
              name: 'Taj Exotica Resort and Spa',
              city: 'Goa',
              location: { lat: 15.2596, lng: 73.9188 },
              starRating: 5,
              rates: Array.from({ length: 6 }, (_, i) => ({
                ref: `TJ-rate-${i}`,
                totalMajor: 10_000 + i,
              })),
            },
          ],
        },
      ],
      rateTokenStore: probe,
    });

    const result = await orchestrator.search(request());
    expect(result.hotels[0]!.deals).toHaveLength(6);
    expect(probe.maxInFlight).toBeGreaterThan(1);
  });
});
