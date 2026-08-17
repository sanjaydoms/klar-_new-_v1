import { NO_CACHE } from '../../infrastructure/cache/cache.js';
import { InFlightCoalescer } from '../../infrastructure/cache/coalescer.js';
import { describe, expect, it } from 'vitest';
import {
  countryCode,
  currencyCode,
  klarDestinationId,
  klarHotelId,
  type SupplierCode,
} from '../../domain/shared/brand.js';
import { toMajor } from '../../domain/shared/money.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import type { MarkupRegion, MarkupRule } from '../../domain/pricing/markup.js';
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
import { SearchOrchestrator } from '../search/orchestrator.js';
import {
  HOTEL_NOT_FOUND,
  HotelDetailService,
  type DetailConfig,
  type HotelDetailRequest,
} from './detail-service.js';
import type { HotelDetailResult } from '../../domain/detail/detail-result.js';

const INR = currencyCode('INR');
const IN = countryCode('IN');

/** One property, sold by TripJack and RateGain under their own ids. */
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
    ],
  },
];

const request = (over: Partial<HotelDetailRequest> = {}): HotelDetailRequest => ({
  hotelId: 'KLAR-TAJ',
  stay: stayDates('2026-09-10', '2026-09-13'),
  occupancy: occupancy([roomRequest(2, 0, [])]),
  currency: INR,
  nationality: IN,
  channel: 'B2C',
  ...over,
});

interface HarnessOptions {
  readonly suppliers: readonly FakeSupplierSpec[];
  readonly seed?: readonly SeedHotel[];
  readonly rules?: readonly MarkupRule[];
  readonly config?: Partial<DetailConfig>;
  readonly throwing?: readonly string[];
}

function harness(opts: HarnessOptions) {
  const registry = new SupplierRegistry();
  for (const spec of opts.suppliers) {
    const supplier = fakeSupplier(spec);
    if (opts.throwing?.includes(spec.code) === true) {
      registry.register(
        {
          ...supplier,
          getRates: () => {
            throw new Error(`${spec.code} adapter blew up while mapping rates`);
          },
        },
        fakeConfig(spec.code),
      );
      continue;
    }
    registry.register(supplier, fakeConfig(spec.code));
  }

  const properties = new InMemoryPropertyRepository(opts.seed ?? TAJ_SEED);
  const rateTokens = new FakeRateTokenStore();
  const pricing = new PricingService(new FakeMarkupProvider(opts.rules ?? []));
  const clock = new FakeClock();
  const ids = new SequentialIds();

  const service = new HotelDetailService({
    registry,
    properties,
    pricing,
    rateTokens,
    clock,
    ids,
    logger: silentLogger,
    config: {
      deadlineMs: 20_000,
      homeCountry: IN,
      // ADR-0007: the production policy, stated rather than inherited.
      selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
      rateTokenTtlMs: 900_000,
      ...opts.config,
    },
  });

  return { service, properties, rateTokens, registry, pricing, clock, ids };
}

const detailOf = async (opts: HarnessOptions, over: Partial<HotelDetailRequest> = {}) => {
  const { service } = harness(opts);
  const result = await service.detail(request(over));
  expect(result).not.toBe(HOTEL_NOT_FOUND);
  return result as HotelDetailResult;
};

/** TripJack and RateGain each quoting the same hotel. */
const TJ_RATES: FakeSupplierSpec = {
  code: 'TJ',
  ratesByHotel: {
    'TJ-100': [
      { ref: 'tj-deluxe-bb', totalMajor: 12_000, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
    ],
  },
};

const RG_RATES: FakeSupplierSpec = {
  code: 'RG',
  ratesByHotel: {
    'RG-900': [
      { ref: 'rg-deluxe-bb', totalMajor: 11_500, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
    ],
  },
};

/**
 * RateGain's real shape: search returns no bookable rates, and the rate call
 * needs identifiers that only the search returns (A-1).
 */
const RG_TWO_PHASE: FakeSupplierSpec = {
  code: 'RG',
  searchReturnsRates: false,
  hotels: [{ id: 'RG-900', name: 'Taj Exotica Resort and Spa', city: 'Goa', indicativeMajor: 11_000 }],
  ratesByHotel: {
    'RG-900': [
      { ref: 'rg-deluxe-bb', totalMajor: 11_500, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
    ],
  },
};

describe('a supplier whose rates need a second call', () => {
  /**
   * A-1, on the path A-1 did not cover.
   *
   * The search side learned to carry `PropertyCode`/`BrandCode` from
   * `bestproperties` into `getproducts`. The detail page never runs a search,
   * so it assembled the rate call from the catalogue alone and RateGain
   * rejected every one — which from the outside reads as "RateGain has no
   * availability for this hotel", exactly how the search-side version was
   * nearly mis-diagnosed.
   */
  it('fetches the property state the rate call requires', async () => {
    const result = await detailOf({ suppliers: [RG_TWO_PHASE] });

    const rg = result.diagnostics.attempts.find((a) => a.supplier === RG);
    expect(rg?.status).toBe('SUCCESS');
    expect(result.products.length).toBeGreaterThan(0);
    expect(toMajor(result.products[0]!.leadPrice.total)).toBe(11_500);
  });
});

// ═══ Definition of done: the detail page renders from the canonical model,
//     for both suppliers ════════════════════════════════════════════════════

describe('one hotel, every supplier that sells it', () => {
  it('prices the same property through both suppliers and features the cheaper', async () => {
    const result = await detailOf({ suppliers: [TJ_RATES, RG_RATES] });

    expect(result.klarHotelId).toBe('KLAR-TAJ');
    expect(result.deals).toHaveLength(2);
    expect([...new Set(result.deals.map((d) => d.supplier))].sort()).toEqual(['RG', 'TJ']);
    expect(result.featuredDeal?.supplier).toBe(RG);
    expect(toMajor(result.featuredDeal!.price.total)).toBe(11_500);
    expect(result.priceGuarantee).toBe('BEST_AVAILABLE');
  });

  /**
   * The reference resolved ONE supplier from the id prefix and asked only that
   * one, so a hotel sold by both was priced by whichever happened to own the id
   * the customer clicked. A detail page that cannot compare is a search result
   * the customer cannot verify.
   */
  it('asks every mapped supplier, whichever id the customer arrived on', async () => {
    const viaTj = await detailOf({ suppliers: [TJ_RATES, RG_RATES] }, { hotelId: 'TJ:TJ-100' });
    const viaRg = await detailOf({ suppliers: [TJ_RATES, RG_RATES] }, { hotelId: 'RG:RG-900' });

    for (const result of [viaTj, viaRg]) {
      expect(result.klarHotelId).toBe('KLAR-TAJ');
      expect(result.deals).toHaveLength(2);
      expect(toMajor(result.featuredDeal!.price.total)).toBe(11_500);
    }
  });

  it('does not ask a supplier that does not map the hotel', async () => {
    // SC is registered and healthy, but the catalogue has no mapping for it.
    const result = await detailOf({
      suppliers: [TJ_RATES, RG_RATES, { code: 'SC', ratesByHotel: { 'SC-700': [{ ref: 'sc', totalMajor: 9_000 }] } }],
    });

    expect(result.diagnostics.attempts.map((a) => a.supplier).sort()).toEqual(['RG', 'TJ']);
    expect(result.deals.some((d) => d.supplier === SC)).toBe(false);
  });

  it('reports an unknown hotel as not found rather than as a failure', async () => {
    const { service } = harness({ suppliers: [TJ_RATES] });
    expect(await service.detail(request({ hotelId: 'KLAR-NOPE' }))).toBe(HOTEL_NOT_FOUND);
    expect(await service.detail(request({ hotelId: 'TJ:NOT-MAPPED' }))).toBe(HOTEL_NOT_FOUND);
  });
});

// ═══ The defect this phase exists to not repeat ════════════════════════════

describe('detail and search agree on the price', () => {
  /**
   * D-1, at the other end.
   *
   * In the reference, search and detail priced independently and the detail
   * page picked the pre-markup total, so the B2C margin vanished between the
   * card and the review page — the quote-versus-charge divergence this rebuild
   * exists to end. One pricing engine, one set of rules, both screens.
   */
  it('quotes the number the search card quoted, markup and all', async () => {
    const rules: MarkupRule[] = [
      { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
      { layer: 'CHANNEL', enabled: true, type: 'PERCENTAGE', value: 5, region: 'ALL', basis: 'NET' },
    ];

    const searchSuppliers: FakeSupplierSpec[] = [
      {
        code: 'TJ',
        hotels: [
          {
            id: 'TJ-100',
            name: 'Taj Exotica Resort and Spa',
            city: 'Goa',
            location: { lat: 15.2596, lng: 73.9188 },
            starRating: 5,
            rates: [
              { ref: 'tj-deluxe-bb', totalMajor: 12_000, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
            ],
          },
        ],
      },
      {
        code: 'RG',
        hotels: [
          {
            id: 'RG-900',
            name: 'Taj Exotica Resort and Spa',
            city: 'Goa',
            location: { lat: 15.2596, lng: 73.9188 },
            starRating: 5,
            rates: [
              { ref: 'rg-deluxe-bb', totalMajor: 11_500, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
            ],
          },
        ],
      },
    ];

    // The search side, built the same way the orchestrator's own tests build it.
    const registry = new SupplierRegistry();
    const targets = new Map<SupplierCode, SupplierSearchTarget | null>();
    for (const spec of searchSuppliers) {
      const supplier = fakeSupplier(spec);
      registry.register(supplier, fakeConfig(spec.code));
      targets.set(supplier.code, { kind: 'DEST_CODE', code: 'GOA' });
    }
    const properties = new InMemoryPropertyRepository(TAJ_SEED);
    const pricing = new PricingService(new FakeMarkupProvider(rules));

    const searchRequest: UnifiedHotelSearchRequest = {
      target: { kind: 'DESTINATION', destinationId: klarDestinationId('KLAR-DEST-GOA') },
      stay: stayDates('2026-09-10', '2026-09-13'),
      occupancy: occupancy([roomRequest(2, 0, [])]),
      currency: INR,
      nationality: IN,
      channel: 'B2C',
      sort: 'PRICE_ASC',
      page: { page: 1, limit: 20 },
    };

    const orchestrator = new SearchOrchestrator({
      registry,
      destinations: new FakeDestinationResolver(targets, 100, IN),
      properties,
      pricing,
      rateTokens: new FakeRateTokenStore(),
      cache: NO_CACHE,
      coalescer: new InFlightCoalescer(),
      clock: new FakeClock(),
      ids: new SequentialIds(),
      logger: silentLogger,
      config: {
        deadlineMs: 15_000,
        homeCountry: IN,
        selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
        rateTokenTtlMs: 900_000,
      },
    });

    const searched = await orchestrator.search(searchRequest);
    const cardPrice = searched.hotels[0]!.bestPrice.total;

    const detail = await detailOf({ suppliers: [TJ_RATES, RG_RATES], rules });
    const detailPrice = detail.featuredDeal!.price.total;

    expect(toMajor(detailPrice)).toBe(toMajor(cardPrice));
    // And the markup really was applied, so this is not two zeroes agreeing.
    expect(toMajor(detailPrice)).toBeGreaterThan(11_500);
  });

  /**
   * The version of this test that only compared totals could not see the real
   * hazard, because the fake markup provider returns one rule set for every
   * region — so search and detail could resolve DIFFERENT regions and still
   * agree on a number.
   *
   * The hazard is concrete. Most catalogue records carry no country: TripJack
   * reports a country *name*, which the mapper correctly refuses to treat as an
   * ISO-2 code. Detail keyed off `hotel.countryCode` alone would resolve `ALL`
   * where search resolved `DOMESTIC` from the destination — and with only
   * region-specific rules configured, `resolveRule` matches nothing for `ALL`.
   * Search quotes with margin; detail sells at cost.
   */
  it('resolves the same region as search for a hotel with no country on record', async () => {
    const asked: string[] = [];
    const recording = {
      rulesFor: (region: MarkupRegion) => {
        asked.push(region);
        return Promise.resolve<readonly MarkupRule[]>([
          // DOMESTIC only. An `ALL` resolution finds no rule and sells at cost,
          // which is exactly the divergence this pins down.
          { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'DOMESTIC', basis: 'NET' },
        ]);
      },
      version: () => 'mk-1',
    };

    const properties = new InMemoryPropertyRepository(TAJ_SEED);
    // The seeded hotel carries no country, as most catalogue records do not.
    expect((await properties.findByKlarHotelId(klarHotelId('KLAR-TAJ')))?.countryCode).toBeUndefined();

    const registry = new SupplierRegistry();
    for (const spec of [TJ_RATES, RG_RATES]) {
      registry.register(fakeSupplier(spec), fakeConfig(spec.code));
    }

    const service = new HotelDetailService({
      registry,
      properties,
      pricing: new PricingService(recording),
      rateTokens: new FakeRateTokenStore(),
      clock: new FakeClock(),
      ids: new SequentialIds(),
      logger: silentLogger,
      config: {
        deadlineMs: 20_000,
        homeCountry: IN,
        selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
        rateTokenTtlMs: 900_000,
      },
    });

    const detail = (await service.detail(
      request({ destinationCountry: IN }),
    )) as HotelDetailResult;

    // Search would have resolved DOMESTIC from the destination; so does detail.
    expect(asked).toEqual(['DOMESTIC']);
    // And the margin survived the trip, rather than the rule silently missing.
    expect(toMajor(detail.featuredDeal!.price.total)).toBeGreaterThan(11_500);
    expect(detail.featuredDeal!.price.platformMarkup.minor).toBeGreaterThan(0);
  });
});

// ═══ Products are comparable classes, not the supplier's own grouping ══════

describe('products', () => {
  const MIXED: FakeSupplierSpec = {
    code: 'TJ',
    ratesByHotel: {
      'TJ-100': [
        { ref: 'tj-deluxe-bb-ref', totalMajor: 12_000, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
        { ref: 'tj-deluxe-bb-nr', totalMajor: 10_800, roomName: 'Deluxe Room', board: 'Breakfast', refundable: false },
        { ref: 'tj-suite-ro', totalMajor: 18_000, roomName: 'Presidential Suite', board: 'Room Only', refundable: true },
      ],
    },
  };

  /**
   * The reference grouped TripJack's options by room NAME, which put a
   * refundable and a non-refundable rate for the same room in one bucket and
   * let the cheaper one represent both — the customer clicks a price and finds
   * it buys different terms.
   */
  it('splits one room name into separate products by refundability', async () => {
    const result = await detailOf({ suppliers: [MIXED] });

    const deluxe = result.products.filter((p) => p.room.name === 'Deluxe Room');
    expect(deluxe).toHaveLength(2);
    expect(deluxe.map((p) => p.refundTier).sort()).toEqual(['NON_REFUNDABLE', 'REFUNDABLE']);
  });

  it('orders products by lead price, deterministically', async () => {
    const result = await detailOf({ suppliers: [MIXED] });
    const totals = result.products.map((p) => toMajor(p.leadPrice.total));
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
  });

  it('marks a product both suppliers quote as compared across both', async () => {
    const result = await detailOf({ suppliers: [TJ_RATES, RG_RATES] });

    expect(result.products).toHaveLength(1);
    const product = result.products[0]!;
    expect(product.offeredBy).toEqual(['RG', 'TJ']);
    // Cheapest first, and every offer stays bookable in its own right.
    expect(product.offers.map((o) => toMajor(o.price.total))).toEqual([11_500, 12_000]);
    expect(new Set(product.offers.map((o) => o.dealId)).size).toBe(2);
  });

  it('returns no products and no featured deal when nothing is bookable', async () => {
    const result = await detailOf({
      suppliers: [{ code: 'TJ', ratesByHotel: {} }, { code: 'RG', ratesByHotel: {} }],
    });

    expect(result.products).toEqual([]);
    expect(result.featuredDeal).toBeUndefined();
    expect(result.deals).toEqual([]);
    // Both answered "nothing available", which IS an answer.
    expect(result.priceGuarantee).toBe('BEST_AVAILABLE');
  });
});

// ═══ Supplier isolation, inherited rather than re-implemented ══════════════

describe('one supplier cannot take down the detail page', () => {
  it('keeps the other supplier when an adapter throws', async () => {
    const result = await detailOf({ suppliers: [TJ_RATES, RG_RATES], throwing: ['TJ'] });

    expect(result.deals).toHaveLength(1);
    expect(result.deals[0]?.supplier).toBe(RG);

    const tj = result.diagnostics.attempts.find((a) => a.supplier === TJ);
    expect(tj?.status).toBe('ERROR');
    expect(tj?.errorCode).toBe('SUPPLIER_MALFORMED_RESPONSE');
    // One supplier was never heard from, so the claim is downgraded.
    expect(result.priceGuarantee).toBe('PARTIAL');
  });

  it('labels the page PARTIAL when a supplier errors', async () => {
    const result = await detailOf({
      suppliers: [TJ_RATES, { code: 'RG', ratesFailure: 'SUPPLIER_TIMEOUT' }],
    });

    expect(result.deals).toHaveLength(1);
    expect(result.priceGuarantee).toBe('PARTIAL');
    expect(result.diagnostics.attempts.find((a) => a.supplier === RG)?.errorCode).toBe(
      'SUPPLIER_TIMEOUT',
    );
  });
});

// ═══ Rate tokens ═══════════════════════════════════════════════════════════

describe('rate tokens', () => {
  it('issues an opaque deal id for every offer and leaks no supplier rate key', async () => {
    const { service, rateTokens } = harness({ suppliers: [TJ_RATES, RG_RATES] });
    const result = (await service.detail(request())) as HotelDetailResult;

    expect(rateTokens.issued).toHaveLength(2);
    for (const deal of result.deals) {
      expect(deal.dealId).toMatch(/^deal-/);
      expect(deal.token.expiresAt.getTime()).toBeGreaterThan(0);
    }
    const serialised = JSON.stringify(result.products);
    expect(serialised).not.toContain('tj-deluxe-bb');
    expect(serialised).not.toContain('rg-deluxe-bb');
  });
});

// ═══ Static content ════════════════════════════════════════════════════════

describe('content', () => {
  const WITH_CONTENT: FakeSupplierSpec[] = [
    {
      ...TJ_RATES,
      detailsByHotel: {
        'TJ-100': {
          description: 'A beachfront resort in south Goa.',
          policies: ['Check-in from 14:00'],
          imageUrls: ['https://img.example/tj-1.jpg', 'https://img.example/shared.jpg'],
          amenityLabels: ['Swimming Pool'],
          checkInTime: '14:00',
        },
      },
    },
    {
      ...RG_RATES,
      detailsByHotel: {
        'RG-900': {
          description: 'RateGain copy, which should not displace the first.',
          policies: ['Pets not allowed'],
          imageUrls: ['https://img.example/rg-1.jpg', 'https://img.example/shared.jpg'],
          amenityLabels: ['Swimming Pool', 'Spa'],
        },
      },
    },
  ];

  it('merges galleries and amenities across suppliers without duplicating', async () => {
    const result = await detailOf({ suppliers: WITH_CONTENT, config: { includeContent: true } });

    const urls = result.content.images.map((i) => i.url);
    expect(urls).toContain('https://img.example/tj-1.jpg');
    expect(urls).toContain('https://img.example/rg-1.jpg');
    // Contributed by both; carried once.
    expect(urls.filter((u) => u === 'https://img.example/shared.jpg')).toHaveLength(1);

    const amenities = result.content.amenities.map((a) => a.label).sort();
    expect(amenities).toEqual(['Spa', 'Swimming Pool']);
    expect(result.content.policies).toEqual(['Check-in from 14:00', 'Pets not allowed']);
    expect(result.content.sourcedFrom).toEqual(['RG', 'TJ']);
  });

  it('keeps canonical identity even when a supplier disagrees', async () => {
    const result = await detailOf({ suppliers: WITH_CONTENT, config: { includeContent: true } });

    // The matcher decided what this hotel is called; static content does not
    // get to rename it.
    expect(result.hotel.name).toBe('Taj Exotica Resort and Spa');
    expect(result.hotel.starRating).toBe(5);
  });

  it('does not call for content when the caller only wants a re-price', async () => {
    const result = await detailOf({ suppliers: WITH_CONTENT });
    expect(result.content.sourcedFrom).toEqual([]);
    expect(result.content.description).toBeUndefined();
    // Rates still came back — this is a rate lookup, not a degraded page.
    expect(result.deals).toHaveLength(2);
  });
});

// ═══ Diagnostics ═══════════════════════════════════════════════════════════

describe('diagnostics', () => {
  it('reports one attempt per mapped supplier, answered or not', async () => {
    const result = await detailOf({
      suppliers: [TJ_RATES, { code: 'RG', ratesFailure: 'SUPPLIER_TIMEOUT' }],
    });

    expect(result.diagnostics.suppliersMapped).toBe(2);
    expect(result.diagnostics.attempts).toHaveLength(2);
    expect(result.diagnostics.ratesReturned).toBe(1);
    expect(result.diagnostics.deadlineHit).toBe(false);
  });
});
