import { NO_CACHE } from '../../infrastructure/cache/cache.js';
import { InFlightCoalescer } from '../../infrastructure/cache/coalescer.js';
import { describe, expect, it } from 'vitest';
import { countryCode, currencyCode, klarDestinationId } from '../../domain/shared/brand.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import type { MarkupRule } from '../../domain/pricing/markup.js';
import type { UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import type { UnifiedSearchResult } from '../../domain/search/result.js';
import type { HotelDetailResult } from '../../domain/detail/detail-result.js';
import type { SupplierCode } from '../../domain/shared/brand.js';
import type { SupplierSearchTarget } from '../../suppliers/contract/dto.js';
import { SupplierRegistry } from '../../suppliers/contract/registry.js';
import { PricingService } from '../pricing/pricing-service.js';
import { SearchOrchestrator } from '../search/orchestrator.js';
import { HotelDetailService } from '../detail/detail-service.js';
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
import { RG, TJ, fakeConfig, fakeSupplier, type FakeSupplierSpec } from '../testing/fake-supplier.js';
import { toLegacySearchResponse } from './legacy-search.js';
import { toLegacyProductsResponse } from './legacy-products.js';

const INR = currencyCode('INR');
const IN = countryCode('IN');

/**
 * The frontend's own price resolver, reproduced from
 * `features/hotels/utils/ratePricing.ts`.
 *
 * Encoded here rather than imported: nothing in `src/` may reach into
 * `_reference/`, and what matters is the *contract* — the order in which the
 * consumer reads fields. If the projection satisfies this, the real frontend
 * reads the sell price no matter which branch it takes.
 */
function resolveRatePricing(
  rate: Record<string, unknown>,
  fallbackCurrency = 'INR',
): { totalPrice: number; basePrice: number; taxesAndFees: number; currency: string } {
  const num = (v: unknown): number => {
    if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
    if (v === undefined || v === null || v === '') return 0;
    const parsed = Number(String(v).replace(/,/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const p = (rate['pricing'] ?? {}) as Record<string, unknown>;

  const totalPrice = round2(num(p['finalTotalPrice'] ?? rate['price'] ?? p['totalPrice'] ?? 0));
  const taxesAndFees = round2(num(p['taxesAndFees']));
  const basePrice = round2(
    p['basePrice'] != null ? num(p['basePrice']) : Math.max(0, totalPrice - taxesAndFees),
  );
  return {
    totalPrice,
    basePrice,
    taxesAndFees,
    currency: String(p['currency'] ?? rate['currency'] ?? fallbackCurrency),
  };
}

// ── A search and a detail result to project ─────────────────────────────────

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

/** 12% platform + 5% channel, so a pre-markup total is visibly wrong. */
const RULES: MarkupRule[] = [
  { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
  { layer: 'CHANNEL', enabled: true, type: 'PERCENTAGE', value: 5, region: 'ALL', basis: 'NET' },
];

const hotelSpec = (code: string, id: string, totalMajor: number): FakeSupplierSpec => ({
  code,
  hotels: [
    {
      id,
      name: 'Taj Exotica Resort and Spa',
      city: 'Goa',
      country: 'IN',
      location: { lat: 15.2596, lng: 73.9188 },
      starRating: 5,
      amenities: ['Swimming Pool'],
      rates: [
        {
          ref: `${code}-deluxe-bb`,
          totalMajor,
          taxMajor: 900,
          roomName: 'Deluxe Room',
          board: 'Breakfast',
          refundable: true,
        },
      ],
    },
  ],
});

async function searchResult(
  specs: ReadonlyArray<FakeSupplierSpec & { maintenance?: boolean }> = [
    hotelSpec('TJ', 'TJ-100', 12_000),
    hotelSpec('RG', 'RG-900', 11_500),
  ],
): Promise<UnifiedSearchResult> {
  const registry = new SupplierRegistry();
  const targets = new Map<SupplierCode, SupplierSearchTarget | null>();
  for (const spec of specs) {
    const supplier = fakeSupplier(spec);
    registry.register(
      supplier,
      fakeConfig(spec.code, spec.maintenance === true ? { maintenanceMode: true } : {}),
    );
    targets.set(supplier.code, { kind: 'DEST_CODE', code: 'GOA' });
  }

  const request: UnifiedHotelSearchRequest = {
    target: { kind: 'DESTINATION', destinationId: klarDestinationId('KLAR-DEST-GOA') },
    stay: stayDates('2026-09-10', '2026-09-13'),
    occupancy: occupancy([roomRequest(2, 0, [])]),
    currency: INR,
    nationality: IN,
    channel: 'B2C',
    sort: 'PRICE_ASC',
    page: { page: 1, limit: 20 },
  };

  return new SearchOrchestrator({
    registry,
    destinations: new FakeDestinationResolver(targets, 6_179, IN),
    properties: new InMemoryPropertyRepository(TAJ_SEED),
    pricing: new PricingService(new FakeMarkupProvider(RULES)),
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
  }).search(request);
}

async function detailResult(): Promise<HotelDetailResult> {
  const specs: FakeSupplierSpec[] = [
    {
      code: 'TJ',
      ratesByHotel: {
        'TJ-100': [
          { ref: 'TJ-SECRET-RATEKEY-A', totalMajor: 12_000, taxMajor: 900, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
          { ref: 'TJ-SECRET-RATEKEY-B', totalMajor: 10_800, taxMajor: 800, roomName: 'Deluxe Room', board: 'Breakfast', refundable: false },
        ],
      },
      detailsByHotel: {
        'TJ-100': {
          description: 'A beachfront resort in south Goa.',
          policies: ['Check-in from 14:00'],
          imageUrls: ['https://img.example/tj-1.jpg'],
          amenityLabels: ['Swimming Pool'],
          checkInTime: '14:00',
        },
      },
    },
    {
      code: 'RG',
      ratesByHotel: {
        'RG-900': [
          { ref: 'RG-SECRET-RATEKEY-C', totalMajor: 11_500, taxMajor: 900, roomName: 'Deluxe Room', board: 'Breakfast', refundable: true },
        ],
      },
    },
  ];

  const registry = new SupplierRegistry();
  for (const spec of specs) registry.register(fakeSupplier(spec), fakeConfig(spec.code));

  const result = await new HotelDetailService({
    registry,
    properties: new InMemoryPropertyRepository(TAJ_SEED),
    pricing: new PricingService(new FakeMarkupProvider(RULES)),
    rateTokens: new FakeRateTokenStore(),
    clock: new FakeClock(),
    ids: new SequentialIds(),
    logger: silentLogger,
    config: {
      deadlineMs: 20_000,
      homeCountry: IN,
      selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
      rateTokenTtlMs: 900_000,
      includeContent: true,
    },
  }).detail({
    hotelId: 'KLAR-TAJ',
    stay: stayDates('2026-09-10', '2026-09-13'),
    occupancy: occupancy([roomRequest(2, 0, [])]),
    currency: INR,
    nationality: IN,
    channel: 'B2C',
    destinationCountry: IN,
  });

  return result as HotelDetailResult;
}

// ═══ The money surface ═════════════════════════════════════════════════════

describe('the price the frontend resolves is the sell price', () => {
  /**
   * The consumer reads `pricing.finalTotalPrice ?? price ?? pricing.totalPrice`.
   * The reference had those disagree — `pricing.totalPrice` was the pre-markup
   * figure — and the detail page took the last branch, so the B2C margin
   * vanished between the card and the review page. Every branch must land on
   * the same number.
   */
  it('yields the same total down every branch the resolver can take', async () => {
    const projected = toLegacySearchResponse(await searchResult());
    const hotel = projected.results[0] as unknown as Record<string, unknown>;
    const pricing = hotel['pricing'] as Record<string, unknown>;

    const expected = hotel['price'];
    expect(pricing['finalTotalPrice']).toBe(expected);
    expect(pricing['totalPrice']).toBe(expected);

    // And through the resolver itself, including with fields knocked out to
    // force each fallback.
    expect(resolveRatePricing(hotel).totalPrice).toBe(expected);
    expect(resolveRatePricing({ ...hotel, pricing: { ...pricing, finalTotalPrice: undefined } }).totalPrice).toBe(expected);
    expect(resolveRatePricing({ ...hotel, price: undefined, pricing: { ...pricing, finalTotalPrice: undefined } }).totalPrice).toBe(expected);
  });

  it('carries the markup, so this is not two zeroes agreeing', async () => {
    const projected = toLegacySearchResponse(await searchResult());
    const hotel = projected.results[0]!;
    // Cheapest supplier net is 11,500; the sell price must exceed it.
    expect(hotel.price).toBeGreaterThan(11_500);
    expect(hotel.pricing.supplierNetForAudit).toBe(11_500);
  });

  /**
   * `buildPublicPricing` guaranteed `basePrice + taxesAndFees === totalPrice`
   * by DERIVING one side rather than summing named parts, because a summed
   * figure is what left the breakdown short of the total. `CustomerPrice`
   * carries the same identity; the projection must not break it.
   */
  it('keeps basePrice + taxesAndFees === totalPrice', async () => {
    const projected = toLegacySearchResponse(await searchResult());
    for (const hotel of projected.results) {
      expect(hotel.basePrice + hotel.taxAmount).toBeCloseTo(hotel.price, 2);
      const resolved = resolveRatePricing(hotel as unknown as Record<string, unknown>);
      expect(resolved.basePrice + resolved.taxesAndFees).toBeCloseTo(resolved.totalPrice, 2);
    }
  });
});

// ═══ The legacy card ═══════════════════════════════════════════════════════

describe('the legacy search envelope', () => {
  it('serves every field the consumer maps', async () => {
    const projected = toLegacySearchResponse(await searchResult());

    expect(projected.results).toBe(projected.body);
    expect(projected.results).toBe(projected.hotels);
    // `total` is hotels on THIS page, misnamed in the contract and kept so.
    expect(projected.total).toBe(projected.results.length);
    expect(projected.inventoryCount).toBe(6_179);

    const hotel = projected.results[0]!;
    expect(hotel.hotelId).toMatch(/^(TJ|RG):/);
    expect(hotel.name).toBe('Taj Exotica Resort and Spa');
    expect(hotel.city).toBe('Goa');
    expect(hotel.starRating).toBe(5);
    expect(hotel.latitude).toBeCloseTo(15.2596, 4);
    expect(hotel.source).toMatch(/^(TJ|RG)$/);
    expect(hotel.currency).toBe('INR');
    expect(hotel.mealBasis).toBeTruthy();
  });

  it('routes on a supplier-prefixed id while shipping the canonical one beside it', async () => {
    const hotel = toLegacySearchResponse(await searchResult()).results[0]!;
    // RateGain is cheaper, so it is featured and owns the legacy id.
    expect(hotel.hotelId).toBe('RG:RG-900');
    expect(hotel.klarHotelId).toBe('KLAR-TAJ');
    expect(hotel.dealId).toBeTruthy();
  });

  /**
   * The consumer's own comment records the bug it fixed: `isRefundable ? … :
   * 'Non-Refundable'` turned "no supplier signal" into a false
   * "Non-Refundable" on every card. Absent must stay absent.
   */
  it('leaves refundability undefined when no supplier said', async () => {
    const noSignal = [
      { ...hotelSpec('TJ', 'TJ-100', 12_000) },
    ].map((spec) => ({
      ...spec,
      hotels: spec.hotels!.map((h) => ({
        ...h,
        rates: h.rates!.map(({ refundable: _drop, ...rest }) => rest),
      })),
    }));

    const hotel = toLegacySearchResponse(await searchResult(noSignal)).results[0]!;
    expect(hotel.isRefundable).toBeUndefined();
    expect(hotel.refundableLabel).toBeUndefined();
  });

  it('reports the cheapest non-featured deal as altDeal, with the real one alongside', async () => {
    const projected = toLegacySearchResponse(await searchResult());
    const hotel = projected.results[0]!;

    // TripJack at 12,000 loses to RateGain at 11,500 but stays bookable.
    expect(hotel.altDeal?.source).toBe('TJ');
    expect(hotel.altDeal!.price).toBeGreaterThan(hotel.price);

    // D-4: the reference reduced the alternative to a label and a number. The
    // canonical field beside it carries the whole thing, with its own dealId.
    const alternative = hotel.deals.find((d) => d.dealId !== hotel.dealId);
    expect(alternative?.source).toBe('TJ');
    expect(alternative?.roomName).toBe('Deluxe Room');
    expect(alternative?.dealId).toBeTruthy();
  });

  it('projects the facet panel under the names it renders', async () => {
    const { facets } = toLegacySearchResponse(await searchResult());

    expect(facets.starRatingCounts['5']).toBe(1);
    expect(facets.providerCounts).toEqual({ RG: 1, TJ: 1 });
    expect(facets.totalHotels).toBe(1);
    expect(facets.altDealCount).toBe(1);
    expect(Object.keys(facets.mealTypeCounts).length).toBeGreaterThan(0);
    // Minor units inside the engine, major on the wire.
    expect(facets.minPrice).toBeLessThan(100_000);
    expect(facets.priceBuckets.every((b) => b.min < 100_000)).toBe(true);
  });

  /**
   * ADR-0007: the projection must carry `priceGuarantee` and `priceKind`
   * through rather than flattening them to a number. Without them the honesty
   * is recorded in the engine and never delivered.
   */
  it('carries priceGuarantee and priceKind rather than flattening them', async () => {
    const whole = toLegacySearchResponse(await searchResult());
    expect(whole.priceGuarantee).toBe('BEST_AVAILABLE');
    expect(whole.results[0]?.priceKind).toBe('BOOKABLE');
    expect(whole.incompleteSuppliers).toEqual([]);

    const partial = toLegacySearchResponse(
      await searchResult([
        hotelSpec('TJ', 'TJ-100', 12_000),
        { code: 'RG', searchFailure: { status: 'TIMEOUT', code: 'SUPPLIER_TIMEOUT' } },
      ]),
    );
    expect(partial.priceGuarantee).toBe('PARTIAL');
    expect(partial.incompleteSuppliers).toEqual(['RG']);
  });

  /**
   * The two fields must agree, because they are two views of one fact.
   *
   * `incompleteSuppliers` was recomputed here with a filter that counted any
   * status other than SUCCESS or EMPTY, while `priceGuarantee` — in the same
   * payload — uses the domain's rule, which excludes a supplier that is
   * switched off or does not serve the destination. A response could therefore
   * claim BEST_AVAILABLE and name a missing supplier in the same breath.
   */
  it('does not name a supplier as missing that the guarantee does not count', async () => {
    const response = toLegacySearchResponse(
      await searchResult([
        hotelSpec('TJ', 'TJ-100', 12_000),
        // Switched off by an operator: not a gap in the comparison.
        { code: 'RG', maintenance: true },
      ]),
    );

    expect(response.priceGuarantee).toBe('BEST_AVAILABLE');
    expect(response.incompleteSuppliers).toEqual([]);
  });
});

// ═══ The legacy products page ══════════════════════════════════════════════

describe('the legacy products response', () => {
  it('flattens the way the detail page flattens it', async () => {
    const projected = toLegacyProductsResponse(await detailResult());

    expect(projected.products).toBe(projected.body.products);
    expect(projected.status).toBe(true);

    for (const room of projected.products) {
      expect(room.rate).toBe(room.rates);
      for (const rate of room.rate) {
        const resolved = resolveRatePricing(rate as unknown as Record<string, unknown>);
        expect(resolved.totalPrice).toBeGreaterThan(0);
        expect(resolved.basePrice + resolved.taxesAndFees).toBeCloseTo(resolved.totalPrice, 2);
      }
    }
  });

  /**
   * The reference grouped a supplier's options by room NAME, so a refundable
   * and a non-refundable rate for the same room shared one bucket and the
   * cheaper one represented both.
   */
  it('splits one room name into separate products by refundability', async () => {
    const projected = toLegacyProductsResponse(await detailResult());
    const deluxe = projected.products.filter((p) => p.name === 'Deluxe Room');

    expect(deluxe.length).toBeGreaterThan(1);
    expect(new Set(deluxe.map((p) => p.equivalenceKey)).size).toBe(deluxe.length);
  });

  it('puts a dealId where the supplier rate key used to be', async () => {
    const projected = toLegacyProductsResponse(await detailResult());
    const rates = projected.products.flatMap((p) => p.rate);

    expect(rates.length).toBeGreaterThan(0);
    for (const rate of rates) {
      expect(rate.rateKey).toBe(rate.dealId);
      expect(rate.rateKey).toMatch(/^deal-/);
    }
    // No supplier rate reference survives the projection.
    const serialised = JSON.stringify(projected);
    expect(serialised).not.toContain('SECRET-RATEKEY');
  });

  it('carries merged content and the canonical ids', async () => {
    const projected = toLegacyProductsResponse(await detailResult());

    expect(projected.body.hotelId).toBe('KLAR-TAJ');
    expect(projected.klarHotelId).toBe('KLAR-TAJ');
    expect(projected.featuredDealId).toBeTruthy();
    expect(projected.body.description).toBe('A beachfront resort in south Goa.');
    expect(projected.body.images).toContain('https://img.example/tj-1.jpg');
    expect(projected.body.policies).toEqual(['Check-in from 14:00']);
    expect(projected.priceGuarantee).toBe('BEST_AVAILABLE');
  });
});

// ═══ The projection is one-way ═════════════════════════════════════════════

describe('the projection is confined to the edge', () => {
  /**
   * §08 calls for "one module, explicitly named as legacy, with an expiry".
   *
   * The API edge is where it belongs and is expected to import it — that is
   * what an edge projection is. The *engine* must never read it back: a legacy
   * shape that leaks into the domain, the modules, a supplier adapter or the
   * database layer is how the old model outlives the projection that was meant
   * to retire it.
   */
  it('is imported by the API edge and by nothing deeper', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = `${dir}/${entry}`;
        if (statSync(path).isDirectory()) return walk(path);
        return path.endsWith('.ts') ? [path] : [];
      });

    const importsCompat = (file: string): boolean =>
      /from '.*compat\//.test(readFileSync(file, 'utf8'));

    const engine = walk('src').filter(
      (f) =>
        !f.includes('/compat/') &&
        // The edge and its composition root may translate outward.
        !f.startsWith('src/api/') &&
        !f.startsWith('src/composition/'),
    );

    expect(engine.filter(importsCompat)).toEqual([]);
    // And it really is reachable from the edge, so this is not vacuous.
    expect(walk('src/api').filter(importsCompat).length).toBeGreaterThan(0);
  });
});
