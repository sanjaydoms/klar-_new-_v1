import { describe, expect, it } from 'vitest';
import { countryCode, currencyCode } from '../../domain/shared/brand.js';
import {
  FakeDestinationResolver,
  InMemoryPropertyRepository,
  type SeedDestination,
  type SeedHotel,
} from '../testing/fakes.js';
import { RG, TJ } from '../testing/fake-supplier.js';
import { fromLegacySearchRequest, type LegacySearchRequest } from './legacy-request.js';

/**
 * The mapper is the only parser between raw JSON and the domain, and it was
 * reaching production tested only *through* the API. Everything here is a
 * defect that survived that.
 */

const IN = countryCode('IN');

const DESTINATIONS: SeedDestination[] = [
  { klarDestinationId: 'KLAR-DEST-GOA', name: 'Goa', countryCode: IN, propertyCount: 6_179 },
  {
    klarDestinationId: 'KLAR-DEST-DXB',
    name: 'Dubai',
    countryCode: countryCode('AE'),
    propertyCount: 3_000,
  },
];

const HOTELS: SeedHotel[] = [
  {
    klarHotelId: 'KLAR-3f2b9c04-taj',
    name: 'Taj Exotica',
    city: 'Goa',
    mappings: [{ supplier: TJ, supplierHotelId: 'TJ-100' }],
  },
];

const deps = (over: Partial<Parameters<typeof fromLegacySearchRequest>[1]> = {}) => ({
  destinations: new FakeDestinationResolver(new Map(), 0, IN, DESTINATIONS),
  properties: new InMemoryPropertyRepository(HOTELS),
  defaultCountry: IN,
  ...over,
});

const base: LegacySearchRequest = {
  destination: 'Goa',
  checkin: '2026-09-10',
  checkout: '2026-09-13',
  countryCode: 'IN',
  currency: 'INR',
  rooms: [{ adults: 2, children: 0, childAges: [] }],
};

const map = (over: Partial<LegacySearchRequest> = {}, d = deps()) =>
  fromLegacySearchRequest({ ...base, ...over }, d);

describe('the destination country is not the guest nationality', () => {
  /**
   * The worst of them.
   *
   * `countryCode` on a legacy payload is the GUEST'S nationality — what
   * suppliers price for. It was being passed as the destination lookup's
   * country filter, which the resolver applies as a hard SQL equality, so an
   * Indian customer searching Dubai matched no destination and got a 404.
   * Every outbound international search was dead.
   */
  it('resolves a destination abroad for a domestic traveller', async () => {
    const result = await map({ destination: 'Dubai', countryCode: 'IN' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.target).toEqual({
      kind: 'DESTINATION',
      destinationId: 'KLAR-DEST-DXB',
    });
    // The nationality still travels — to the suppliers, where it belongs.
    expect(result.request.nationality).toBe(IN);
  });
});

describe('price filters', () => {
  /**
   * `[0, 0]` is the panel's "nothing selected" sentinel and ships on every
   * request once any OTHER filter is touched. Translated literally it filtered
   * for hotels costing nothing, so the result set emptied the moment a
   * customer ticked a star rating.
   */
  it('treats the [0,0] sentinel as no price filter at all', async () => {
    const result = await map({ filters: { priceRange: [0, 0], starRatings: [4] } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.filters?.priceMin).toBeUndefined();
    expect(result.request.filters?.priceMax).toBeUndefined();
    expect(result.request.filters?.starRatings).toEqual([4]);
  });

  it('scales a real range by the currency, not by a hardcoded hundred', async () => {
    const inr = await map({ currency: 'INR', filters: { priceRange: [5_000, 20_000] } });
    expect(inr.ok && inr.request.filters?.priceMin).toBe(500_000);

    // JPY has no minor unit. Scaling by 100 turned a ¥8,000 filter into
    // ¥800,000 and emptied every result.
    const jpy = await map({ currency: 'JPY', filters: { priceRange: [8_000, 20_000] } });
    expect(jpy.ok && jpy.request.filters?.priceMin).toBe(8_000);
    expect(jpy.ok && jpy.request.filters?.priceMax).toBe(20_000);
    expect(currencyCode('JPY')).toBe('JPY');
  });

  /** §2.4 lists `priceRanges` too; it was declared nowhere and dropped. */
  it('covers every selected bucket rather than discarding them', async () => {
    const result = await map({
      filters: { priceRanges: [[2_000, 4_000], [8_000, 12_000]] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // One contiguous span covering both, so no hotel the customer asked to see
    // is hidden by the projection.
    expect(result.request.filters?.priceMin).toBe(200_000);
    expect(result.request.filters?.priceMax).toBe(1_200_000);
  });
});

describe('filters that cannot be honoured are reported', () => {
  /**
   * The canonical hotel has no review score. Dropping the filter silently made
   * the server fill pages with hotels the client then discarded locally, so the
   * customer scrolled near-empty pages while `hasMore` promised more.
   */
  it('names userRatings as unsupported instead of swallowing it', async () => {
    const result = await map({ filters: { userRatings: [4.5] } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unsupportedFilters).toContain('filters.userRatings');
  });

  /**
   * `UNKNOWN` is a real board code meaning "the supplier did not say", so an
   * unclassifiable meal type became a filter matching every hotel whose board
   * could not be classified — widening the filter instead of narrowing it.
   */
  it('does not turn an unrecognised meal type into a match-anything filter', async () => {
    const result = await map({ filters: { mealTypes: ['Breakfast', 'Lunch Included'] } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.filters?.boards).toEqual(['BB']);
    expect(result.unsupportedFilters.some((f) => f.includes('mealTypes'))).toBe(true);
  });

  it('drops an unknown property type rather than casting it through', async () => {
    const result = await map({ filters: { propertyTypes: ['RESORT', 'SPACESHIP'] } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.filters?.propertyTypes).toEqual(['RESORT']);
    expect(result.unsupportedFilters.some((f) => f.includes('propertyTypes'))).toBe(true);
  });
});

describe('hotel ids', () => {
  it('accepts a supplier-prefixed id with stray whitespace', async () => {
    // Detected on a trimmed value and then sliced on the untrimmed one, " TJ:"
    // produced the supplier code " TJ" and 404ed a hotel that exists.
    const result = await map({ hotelId: ' TJ:TJ-100 ' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.target).toEqual({ kind: 'HOTEL', klarHotelId: 'KLAR-3f2b9c04-taj' });
  });

  /**
   * The branch tested for the prefix `KLAR-HOTEL`, which no minted id carries —
   * Postgres mints `KLAR-<uuid>` — so it was dead code, and it cast the id
   * through without checking the catalogue.
   */
  it('accepts a real canonical id and verifies it exists', async () => {
    const found = await map({ destination: 'KLAR-3f2b9c04-taj' });
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.request.target).toEqual({ kind: 'HOTEL', klarHotelId: 'KLAR-3f2b9c04-taj' });
    }

    const missing = await map({ destination: 'KLAR-does-not-exist' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.kind).toBe('UNKNOWN_HOTEL');
  });
});

describe('shape checking at the only parser there is', () => {
  /**
   * Nothing downstream re-checks a type, so a wrong-shaped field became a
   * TypeError several layers in and a 500 where the answer is 400.
   */
  it.each([
    ['destination as a number', { destination: 12_345 as unknown as string }],
    ['currency as a number', { currency: 1 as unknown as string }],
    ['rooms as an object', { rooms: {} as unknown as [] }],
    ['pageNo as text', { pageNo: 'abc' as unknown as number }],
    ['starRatings as text', { filters: { starRatings: 'five' as unknown as number[] } }],
    ['priceRange with one bound', { filters: { priceRange: [100] as unknown as [number, number] } }],
  ])('refuses %s with a reason rather than throwing', async (_label, over) => {
    const result = await map(over as Partial<LegacySearchRequest>);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('INVALID');
  });
});

describe('suppliers', () => {
  it('refuses a provider the registry does not know', async () => {
    const result = await map(
      { providers: ['TRIPJACK'] },
      deps({ knownSuppliers: new Set(['TJ', 'RG']) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('UNKNOWN_SUPPLIER');
    }
  });

  it('passes through the ones it does know', async () => {
    const result = await map(
      { providers: ['TJ'] },
      deps({ knownSuppliers: new Set(['TJ', 'RG']) }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.suppliers).toEqual([TJ]);
    expect(RG).toBe('RG');
  });
});

describe('sort', () => {
  /**
   * The frontend's own default is `price_asc`. Defaulting to anything else
   * paginated the server in one order while the client re-sorted the page it
   * was handed — the D-13 defect `present.ts` says is being avoided.
   */
  it('defaults to the order the frontend defaults to', async () => {
    const result = await map({ sortBy: undefined });
    expect(result.ok && result.request.sort).toBe('PRICE_ASC');
  });

  it('maps the legacy names', async () => {
    const desc = await map({ sortBy: 'price_desc' });
    expect(desc.ok && desc.request.sort).toBe('PRICE_DESC');

    const rating = await map({ sortBy: 'rating_desc' });
    expect(rating.ok && rating.request.sort).toBe('RATING_DESC');

    const recommended = await map({ sortBy: 'price_rating' });
    expect(recommended.ok && recommended.request.sort).toBe('RECOMMENDED');
  });
});
