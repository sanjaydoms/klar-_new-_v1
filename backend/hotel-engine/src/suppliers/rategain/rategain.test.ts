import { describe, expect, it } from 'vitest';
import { currencyCode, klarBookingId, supplierHotelId } from '../../domain/shared/brand.js';
import { toMajor } from '../../domain/shared/money.js';
import { isCostConsistent } from '../../domain/pricing/supplier-cost.js';
import { CircuitBreaker } from '../common/circuit-breaker.js';
import { createImageResolver } from '../common/images.js';
import type { SupplierGuest } from '../contract/dto.js';
import { allocateGuests } from '../contract/guests.js';
import {
  TEST_NATIONALITY,
  TEST_OCCUPANCY,
  TEST_STAY,
  frozenClock,
  instantSleep,
  stubTransport,
  testContext,
  type StubRoute,
} from '../testing/harness.js';
import { RateGainAdapter } from './adapter.js';
import { RATEGAIN, RATEGAIN_CAPABILITIES } from './config.js';
import {
  RG_BEST_PROPERTIES_PAGED,
  RG_BEST_PROPERTIES_RESPONSE,
  RG_CANCEL_RESPONSE,
  RG_COMMIT_RESPONSE,
  RG_FAILURE_RESPONSE,
  RG_GET_PRODUCTS_RESPONSE,
  RG_PRECHECK_RESPONSE,
} from './fixtures.js';
import {
  isRgSuccess,
  readFeeSplit,
  readMinimumSellingPrice,
  readQuotedTotalMajor,
  readStarRating,
  readTaxSplit,
  toProductsHotel,
  toSearchHotel,
  toSupplierCost,
} from './response.js';
import { buildBestPropertiesRequest, buildReservationRequest, toRgRooms } from './request.js';

const INR = currencyCode('INR');
const ctx = () => testContext(RATEGAIN);
const PROPERTY = 'ChIJCYQhdhVDXz4R5lEANKNzFlA';

/** TEST_OCCUPANCY is two adults, and a commit must be given both of them. */
const TWO_ADULTS: readonly SupplierGuest[] = [
  { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
  { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
];

const adapter = (routes: readonly StubRoute[]): RateGainAdapter =>
  new RateGainAdapter({
    transport: stubTransport(routes),
    credentials: {
      baseUrl: 'https://sandbox-smartdistribution.rategain.com',
      apiKey: 'k',
      apiSecret: 's',
      imageBaseUrl: 'https://images.rategain.example',
    },
    newEchoToken: () => 'echo-fixed',
    breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
    now: frozenClock(),
    sleep: instantSleep,
  });

const searchReq = {
  target: { kind: 'DEST_CODE' as const, code: 'GOA' },
  stay: TEST_STAY,
  occupancy: TEST_OCCUPANCY,
  nationality: TEST_NATIONALITY,
  page: 1,
  pageSize: 10,
};

const productRates = async () => {
  const result = await adapter([
    { path: '/api/SmartDistribution/getproducts', body: RG_GET_PRODUCTS_RESPONSE },
  ]).getRates(
    {
      supplierHotelId: supplierHotelId(PROPERTY),
      stay: TEST_STAY,
      occupancy: TEST_OCCUPANCY,
      nationality: TEST_NATIONALITY,
    },
    ctx(),
  );
  return result;
};

/**
 * Spec v1.5.3 §4: `taxes[].included` and `Fees[].Included` mean
 * "included in total price". Anything marked false is charged ON TOP.
 */
describe('taxes and fees (spec §4)', () => {
  it('separates what is inside the quote from what is charged on top', () => {
    const split = readTaxSplit(
      {
        allIncluded: false,
        taxes: [
          { included: true, clientAmount: '900.00', clientCurrency: 'INR' },
          { included: false, clientAmount: '250.00', clientCurrency: 'INR' },
        ],
      },
      INR,
    );
    expect(split).toEqual({ includedMajor: 900, excludedMajor: 250 });
  });

  /**
   * The same list, one level shallower. Reading only the nested form made an
   * unrecognised shape indistinguishable from a rate with no tax on it — so an
   * excluded tax vanished and the quote came in under what the customer would
   * be charged. Silent, and in the direction that costs money.
   *
   * `readFeeSplit` already accepted a bare array; the two now agree.
   */
  it('reads a tax list that arrives as a bare array', () => {
    const split = readTaxSplit(
      [
        { included: true, clientAmount: '900.00', clientCurrency: 'INR' },
        { included: false, clientAmount: '250.00', clientCurrency: 'INR' },
      ],
      INR,
    );
    expect(split).toEqual({ includedMajor: 900, excludedMajor: 250 });
  });

  it('charges a bare-array excluded tax on top of the quoted total', () => {
    const cost = toSupplierCost(
      {
        totalPrice: '10000.00',
        taxes: [{ included: false, clientAmount: '250.00', clientCurrency: 'INR' }],
      },
      INR,
    );
    expect(toMajor(cost!.total)).toBe(10_250);
    expect(toMajor(cost!.taxes)).toBe(250);
    expect(isCostConsistent(cost!)).toBe(true);
  });

  it('counts a tax once when it is restated in another currency', () => {
    const split = readTaxSplit(
      {
        allIncluded: false,
        taxes: [
          { included: false, amount: '250.00', clientAmount: '250.00', clientCurrency: 'INR' },
          { included: false, amount: '3.00', clientAmount: '3.00', clientCurrency: 'USD' },
        ],
      },
      INR,
    );
    expect(split.excludedMajor).toBe(250);
  });

  it('honours allIncluded as the per-entry default', () => {
    const split = readTaxSplit(
      { allIncluded: true, taxes: [{ clientAmount: '900.00', clientCurrency: 'INR' }] },
      INR,
    );
    expect(split).toEqual({ includedMajor: 900, excludedMajor: 0 });
  });

  it('reads Fees with the same semantics', () => {
    const split = readFeeSplit(
      [
        { Name: 'Cleaning Fee', Included: false, Amount: '500.00', Currency: 'INR' },
        { Name: 'Resort Fee', Included: false, Amount: '200.00', Currency: 'INR' },
        { Name: 'City Tax', Included: true, Amount: '100.00', Currency: 'INR' },
      ],
      INR,
    );
    expect(split).toEqual({ includedMajor: 100, excludedMajor: 700 });
  });
});

describe('cost construction (spec §4)', () => {
  const deluxeRefundable = RG_GET_PRODUCTS_RESPONSE.body.products[0]?.rate[0];

  /**
   * The money bug this replaces: the previous mapper subtracted every tax from
   * the quoted total. Excluded taxes and fees are payable on top, so a guest
   * quoted 11,500 would have been asked for 12,450 at the hotel.
   */
  it('adds excluded taxes and fees to the payable total', () => {
    const cost = toSupplierCost(deluxeRefundable, INR);
    // 11,500 quoted + 250 excluded tax + 500 cleaning + 200 resort.
    expect(toMajor(cost!.total)).toBe(12_450);
    // 900 included + 250 excluded.
    expect(toMajor(cost!.taxes)).toBe(1_150);
    // 700 of excluded fees.
    expect(toMajor(cost!.fees)).toBe(700);
    expect(toMajor(cost!.base)).toBe(10_600);
    expect(isCostConsistent(cost!)).toBe(true);
  });

  it('marks a quote with nothing on top as tax-inclusive', () => {
    const cost = toSupplierCost(
      {
        totalPrice: '10000.00',
        taxes: { allIncluded: true, taxes: [{ clientAmount: '900', clientCurrency: 'INR' }] },
      },
      INR,
    );
    expect(cost!.taxesIncludedInBase).toBe(true);
    expect(toMajor(cost!.total)).toBe(10_000);
  });

  it('records disclosed commission without adding it to the cost', () => {
    const cost = toSupplierCost({ totalPrice: '10000.00', CommissionAmt: '1150.00' }, INR);
    expect(toMajor(cost!.commission!)).toBe(1_150);
    expect(toMajor(cost!.total)).toBe(10_000);
  });

  it('reads totalPrice, totalNet and RoomRate as stay totals', () => {
    expect(readQuotedTotalMajor({ totalPrice: '11500.00' })).toBe(11_500);
    expect(readQuotedTotalMajor({ totalNet: '11500.00' })).toBe(11_500);
    expect(readQuotedTotalMajor({ RoomRate: 11_500 })).toBe(11_500);
  });

  /**
   * §4: `sellingRate` is the "Minimum selling price (Only For B2C Partner)",
   * and `isMandatory` means the "partner must sell at or above the MSP". It
   * constrains the price; it is not what RateGain charges us.
   */
  it('never treats sellingRate as a cost', () => {
    expect(readQuotedTotalMajor({ sellingRate: '12650.00' })).toBeUndefined();
    const cost = toSupplierCost({ totalPrice: '11500.00', sellingRate: '12650.00' }, INR);
    expect(toMajor(cost!.total)).toBe(11_500);
  });

  it('reads the MSP and whether it is mandatory', () => {
    const msp = readMinimumSellingPrice({ sellingRate: '12650.00', isMandatory: true }, INR);
    expect(toMajor(msp!.amount)).toBe(12_650);
    expect(msp!.mandatory).toBe(true);
    expect(
      readMinimumSellingPrice({ sellingRate: '12650.00' }, INR)?.mandatory,
    ).toBe(false);
    expect(readMinimumSellingPrice({}, INR)).toBeUndefined();
  });
});

describe('bestproperties (spec §3)', () => {
  const mapped = () =>
    toSearchHotel(RG_BEST_PROPERTIES_RESPONSE.body[0], {
      currency: INR,
      images: createImageResolver('https://images.rategain.example'),
    });

  /**
   * The spec's hotel object has one indicative `price` and no rate key. An
   * earlier version looked for `roomRates`/`options` here and dropped any hotel
   * without them — which would have discarded every search result.
   */
  it('declares that its search returns no bookable rates', () => {
    expect(RATEGAIN_CAPABILITIES.searchReturnsRates).toBe(false);
  });

  it('returns properties with an indicative price and no rates', () => {
    const h = mapped();
    expect(h?.rates).toEqual([]);
    expect(toMajor(h!.indicativeCost!.total)).toBe(11_500);
  });

  it('parses a star rating out of a categoryCode string', () => {
    // "5S", "4EST", "4 Star Hotel" — never a number.
    expect(readStarRating({ categoryCode: '5S' })).toBe(5);
    expect(readStarRating({ categoryCode: '4EST' })).toBe(4);
    expect(readStarRating({ categoryName: '4 Star Hotel' })).toBe(4);
    expect(readStarRating({})).toBeUndefined();
    expect(mapped()?.starRating).toBe(5);
  });

  it('merges grouped facilities into the amenity list', () => {
    expect(mapped()?.amenityLabels).toEqual(
      expect.arrayContaining(['Free WiFi', 'Swimming Pool', 'Spa', 'Fitness Center']),
    );
  });

  it('reports no amenities when the feed sent none', () => {
    const bare = toSearchHotel(RG_BEST_PROPERTIES_RESPONSE.body[1], {
      currency: INR,
      images: createImageResolver(undefined),
    });
    expect(bare?.amenityLabels).toEqual([]);
  });

  it('resolves absolute and bare-filename images', () => {
    expect(mapped()?.imageUrls).toEqual([
      'https://images.rategain.example/sunset-resort-front.jpg',
      'https://images.rategain.example/sunset-resort-pool.jpg',
    ]);
  });

  it('keeps every property, since none of them carry rates', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/bestproperties', body: RG_BEST_PROPERTIES_RESPONSE },
    ]).search(searchReq, ctx());
    expect(result.status).toBe('SUCCESS');
    expect(result.hotels).toHaveLength(2);
  });

  /**
   * The readers in `parse.ts` never throw, but what they feed does: `money()`
   * rejects a value that is not a safe integer once scaled. Running that guard
   * inside a bare `.map` meant one unusable record threw out of `search()`,
   * past the fan-out, and took the whole KLAR search down — including the
   * other supplier's perfectly good results.
   */
  it('drops a property it cannot map instead of failing the search', async () => {
    const poisoned = {
      ...RG_BEST_PROPERTIES_RESPONSE,
      body: [
        // A price no `Money` can hold. Whatever produced it, it is one bad
        // property, and one bad property is not a failed search.
        { propertyId: 'RG-BAD', propertyName: 'Bad Data Inn', price: 1e18 },
        ...RG_BEST_PROPERTIES_RESPONSE.body,
      ],
    };

    const result = await adapter([
      { path: '/api/SmartDistribution/bestproperties', body: poisoned },
    ]).search(searchReq, ctx());

    expect(result.status).toBe('SUCCESS');
    expect(result.hotels).toHaveLength(2);
    expect(result.hotels.map((h) => String(h.supplierHotelId))).not.toContain('RG-BAD');
  });

  it('pages at ten, as the spec fixes it', () => {
    // "Default page size is 10, no option to change the page size."
    expect(RATEGAIN_CAPABILITIES.pageSize).toBe(10);
  });

  /**
   * Ten per page against TripJack's densified ~100. Fetching one page would
   * make RateGain look like it never has the cheapest rate when it was simply
   * barely asked; the pages go out concurrently, so this costs quota not time.
   */
  it('pulls several supplier pages per KLAR page when the destination is deep', async () => {
    const transport = stubTransport([
      { path: '/api/SmartDistribution/bestproperties', body: RG_BEST_PROPERTIES_PAGED },
    ]);
    const rg = new RateGainAdapter({
      transport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });

    const result = await rg.search(searchReq, ctx());
    expect(result.pageInfo.supplierPagesConsumed).toBe(4);
    expect(transport.calls.map((c) => (c.body as { pageNo: number }).pageNo)).toEqual([1, 2, 3, 4]);
    expect(result.pageInfo.hasMore).toBe(true);
  });

  it('does not request pages beyond the reported record count', async () => {
    const transport = stubTransport([
      { path: '/api/SmartDistribution/bestproperties', body: RG_BEST_PROPERTIES_RESPONSE },
    ]);
    const rg = new RateGainAdapter({
      transport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });

    const result = await rg.search(searchReq, ctx());
    expect(transport.calls).toHaveLength(1);
    expect(result.pageInfo.hasMore).toBe(false);
  });

  it('clamps the geofilter radius to the supported 5-200km', () => {
    const tiny = buildBestPropertiesRequest({
      target: { kind: 'GEO', centre: { lat: 15.3, lng: 73.9 }, radiusKm: 2 },
      stay: TEST_STAY,
      occupancy: TEST_OCCUPANCY,
      nationality: TEST_NATIONALITY,
      currency: 'INR',
      pageNo: 1,
      echoToken: 'e',
      minRadiusKm: 5,
      maxRadiusKm: 200,
    });
    const huge = buildBestPropertiesRequest({
      target: { kind: 'GEO', centre: { lat: 15.3, lng: 73.9 }, radiusKm: 900 },
      stay: TEST_STAY,
      occupancy: TEST_OCCUPANCY,
      nationality: TEST_NATIONALITY,
      currency: 'INR',
      pageNo: 1,
      echoToken: 'e',
      minRadiusKm: 5,
      maxRadiusKm: 200,
    });
    expect(tiny?.Geofilter?.radius).toBe(5);
    expect(huge?.Geofilter?.radius).toBe(200);
  });

  it('searches a list of properties via comma-separated PropertyId', () => {
    // `PropertyId` takes "id1,id2,id3", so an id-list search is supported.
    const req = buildBestPropertiesRequest({
      target: {
        kind: 'HOTEL_IDS',
        ids: [supplierHotelId('id1'), supplierHotelId('id2')],
      },
      stay: TEST_STAY,
      occupancy: TEST_OCCUPANCY,
      nationality: TEST_NATIONALITY,
      currency: 'INR',
      pageNo: 1,
      echoToken: 'e',
      minRadiusKm: 5,
      maxRadiusKm: 200,
    });
    expect(req?.PropertyId).toBe('id1,id2');
  });

  it('reads success and failure from the documented envelope', () => {
    expect(isRgSuccess(RG_BEST_PROPERTIES_RESPONSE)).toBe(true);
    expect(isRgSuccess(RG_FAILURE_RESPONSE)).toBe(false);
    expect(isRgSuccess({ header: { status: 'Success' } })).toBe(true);
  });
});

describe('getproducts (spec §4)', () => {
  it('finds every rate across every product', async () => {
    const result = await productRates();
    expect(result.status).toBe('SUCCESS');
    expect(result.rates.map((r) => r.supplierRateRef)).toEqual([
      'rk-deluxe-refundable',
      'rk-deluxe-nonref',
      'rk-standard-unknown-cxl',
    ]);
  });

  /** Room name and code are on the product; the rate has neither. */
  it('takes the room name from the product, not the rate', async () => {
    const result = await productRates();
    expect(result.rates[0]?.room.name).toBe('DELUXE ROOM');
    expect(result.rates[0]?.room.code).toBe('483146225');
    expect(result.rates[2]?.room.name).toBe('STANDARD ROOM');
  });

  /**
   * The whole two-phase path, end to end: search a destination, then price one
   * of its properties using only what the search returned. `PropertyCode` and
   * `BrandCode` are Required on getproducts and exist nowhere but the search
   * response, so dropping them makes every RateGain rate lookup fail.
   */
  it('sends PropertyCode and BrandCode taken from the search response', async () => {
    const searchTransport = stubTransport([
      { path: '/api/SmartDistribution/bestproperties', body: RG_BEST_PROPERTIES_RESPONSE },
    ]);
    const searcher = new RateGainAdapter({
      transport: searchTransport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });
    const found = await searcher.search(searchReq, ctx());
    const hotel = found.hotels[0];
    expect(hotel?.supplierState).toMatchObject({
      propertyCode: 'HTL001',
      brandCode: 'SEI6SEI6SEI=',
    });

    const ratesTransport = stubTransport([
      { path: '/api/SmartDistribution/getproducts', body: RG_GET_PRODUCTS_RESPONSE },
    ]);
    const pricer = new RateGainAdapter({
      transport: ratesTransport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });
    await pricer.getRates(
      {
        supplierHotelId: hotel!.supplierHotelId,
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        supplierState: hotel!.supplierState as Readonly<Record<string, unknown>>,
      },
      ctx(),
    );

    const sent = ratesTransport.calls[0]?.body as Record<string, unknown>;
    expect(sent['PropertyCode']).toBe('HTL001');
    expect(sent['BrandCode']).toBe('SEI6SEI6SEI=');
    expect(sent['propertyID']).toBe(PROPERTY);
  });

  it('carries allocationDetails forward, since commit requires it', async () => {
    // Spec §7: "use allocationDetails if it is not null on precheck and
    // CommitReservation". Dropping it makes the supplier reject the booking.
    const result = await productRates();
    expect(result.rates[0]?.supplierState).toMatchObject({
      allocationDetails: '1755061692000003B1000B1',
      propertyCode: 'HTL001',
      brandCode: 'SEI6SEI6SEI=',
    });
  });

  it('records the MSP separately from the cost', async () => {
    const result = await productRates();
    const rate = result.rates[0];
    expect(toMajor(rate!.minimumSellingPrice!.amount)).toBe(12_650);
    expect(rate!.minimumSellingPrice!.mandatory).toBe(true);
    expect(toMajor(rate!.cost.total)).toBe(12_450);
  });

  it('flags a RECHECK rate as needing re-pricing', async () => {
    const result = await productRates();
    expect(result.rates[0]?.rateStatus).toBe('BOOKABLE');
    expect(result.rates[2]?.rateStatus).toBe('RECHECK');
  });

  it('derives refundability from zero-penalty windows', async () => {
    const result = await productRates();
    expect(result.rates[0]?.cancellation.tier).toBe('REFUNDABLE');
    /**
     * An instant, not the naive string the endpoint sent.
     *
     * `getproducts` writes `"2026-09-05 00:00:00"` with no zone while the
     * reservation endpoints write `"2026-09-05T00:00:00+05:30"` for the same
     * deadline. Passing both through made two spellings of one policy compare
     * unequal, and every RateGain commit was refused as CANCELLATION_CHANGED.
     */
    expect(result.rates[0]?.cancellation.freeUntil).toBe('2026-09-05T00:00:00+05:30');
  });

  it('gives a precheck deadline the same instant as the search that quoted it', async () => {
    // The two endpoints format differently; the adapter is what absorbs that.
    const products = await productRates();
    const precheck = await adapter([
      { path: '/api/SmartDistribution/PreCheckReservation', body: RG_PRECHECK_RESPONSE },
    ]).precheck(
      {
        supplierHotelId: supplierHotelId(PROPERTY),
        supplierRateRef: 'rk-deluxe-refundable',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        supplierState: { quotedTotalMajor: 11_500 },
      },
      ctx(),
    );

    expect(precheck.cancellation?.freeUntil).toBe(products.rates[0]?.cancellation.freeUntil);
  });

  it('reads a non-refundable note out of free-text rate comments', async () => {
    const result = await productRates();
    expect(result.rates[1]?.cancellation.tier).toBe('NON_REFUNDABLE');
  });

  it('leaves refundability unknown when nothing was stated', async () => {
    const result = await productRates();
    expect(result.rates[2]?.cancellation.refundable).toBe('UNKNOWN');
  });

  it('maps board codes to the normalised vocabulary', async () => {
    const result = await productRates();
    expect(result.rates[0]?.board.code).toBe('BB');
    expect(result.rates[1]?.board.code).toBe('RO');
  });

  it('maps the hotel alongside its rates', () => {
    const hotel = toProductsHotel(RG_GET_PRODUCTS_RESPONSE.body, {
      currency: INR,
      requestedOccupancy: TEST_OCCUPANCY,
      images: createImageResolver(undefined),
    });
    expect(hotel?.name).toBe('Sunset Beach Resort');
    expect(hotel?.starRating).toBe(5);
    expect(hotel?.rates).toHaveLength(3);
  });
});

describe('booking lifecycle (spec §6-8)', () => {
  const precheckReq = {
    supplierHotelId: supplierHotelId(PROPERTY),
    supplierRateRef: 'rk-deluxe-refundable',
    stay: TEST_STAY,
    occupancy: TEST_OCCUPANCY,
    nationality: TEST_NATIONALITY,
    supplierState: {
      quotedTotalMajor: 11_500,
      propertyCode: 'HTL001',
      brandCode: 'SEI6SEI6SEI=',
      allocationDetails: '1755061692000003B1000B1',
    },
  };

  it('reads the confirmed rate out of body.preCheckResponse', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/PreCheckReservation', body: RG_PRECHECK_RESPONSE },
    ]).precheck(precheckReq, ctx());

    expect(result.available).toBe(true);
    expect(result.room?.name).toBe('DELUXE ROOM');
    // 11,500 quoted, 900 tax already inside it, nothing on top.
    expect(toMajor(result.cost!.total)).toBe(11_500);
  });

  it('carries the fresh allocationDetails and MSP into commit state', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/PreCheckReservation', body: RG_PRECHECK_RESPONSE },
    ]).precheck(precheckReq, ctx());

    expect(result.supplierState).toMatchObject({
      allocationDetails: '1755061692000463B1003B1',
      quotedTotalMajor: 11_500,
      sellingRateMajor: 12_650,
    });
  });

  it('sends allocationDetails and RoomTypeCode on the envelope', async () => {
    const transport = stubTransport([
      { path: '/api/SmartDistribution/PreCheckReservation', body: RG_PRECHECK_RESPONSE },
    ]);
    const rg = new RateGainAdapter({
      transport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });
    await rg.precheck(
      { ...precheckReq, supplierState: { ...precheckReq.supplierState, roomTypeCode: 'DBL.ST' } },
      ctx(),
    );

    const sent = transport.calls[0]?.body as { BookReservation: Record<string, unknown> };
    const selection = (sent.BookReservation['RoomSelection'] as Record<string, unknown>[])[0];
    expect(selection?.['allocationDetails']).toBe('1755061692000003B1000B1');
    expect(selection?.['RoomTypeCode']).toBe('DBL.ST');
    expect(sent.BookReservation['PropertyCode']).toBe('HTL001');
    expect(sent.BookReservation['BrandCode']).toBe('SEI6SEI6SEI=');
  });

  /**
   * §7: the booking lives at `body.booking` and its reference is
   * `confirmationNumber`. Reading a top-level `ConfirmationNumber` finds
   * nothing and reports every successful booking as pending.
   */
  it('reads the confirmation from body.booking.confirmationNumber', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/CommitReservation', body: RG_COMMIT_RESPONSE },
    ]).book(
      {
        klarBookingId: klarBookingId('KLR-1'),
        supplierHotelId: supplierHotelId(PROPERTY),
        supplierRateRef: 'rk-deluxe-refundable',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        guests: TWO_ADULTS,
        holdOnly: false,
        supplierState: { quotedTotalMajor: 11_500, sellingRateMajor: 12_650 },
        idempotencyKey: 'idem-1',
      },
      ctx(),
    );
    expect(result.status).toBe('CONFIRMED');
    expect(result.supplierBookingRef).toBe('O1HJB58#MTUMJLV');

    // `reservationId` is RateGain's own internal tracking id, NOT the hotel's
    // PMS confirmation number — the commit response carries no PMS number at
    // all. Reporting it as one would print a meaningless reference on the
    // voucher. It belongs to the state cancel needs.
    expect(result.hotelConfirmationNumber).toBeUndefined();
    expect(result.supplierState).toMatchObject({
      reservationId: '02afb037-6f3b-4ce3-aebd-c2cc3d3dba14',
    });
  });

  /**
   * §8 marks `ReservationId`, `PropertyId` and `PropertyCode` required on
   * cancel, and they exist only in the commit response. Losing them leaves a
   * booking that can be made and not unmade.
   */
  it('sends the identifiers cancel requires, carried from the booking', async () => {
    const transport = stubTransport([
      { path: '/api/SmartDistribution/CancelReservation', body: RG_CANCEL_RESPONSE },
    ]);
    const rg = new RateGainAdapter({
      transport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });

    await rg.cancel(
      {
        supplierBookingRef: 'O1HJB58#MTUMJLV',
        supplierState: {
          reservationId: '02afb037-6f3b-4ce3-aebd-c2cc3d3dba14',
          propertyId: PROPERTY,
          propertyCode: 'HTL001',
        },
      },
      ctx(),
    );

    const sent = transport.calls[0]?.body as Record<string, unknown>;
    expect(sent['ConfirmationNumber']).toBe('O1HJB58#MTUMJLV');
    expect(sent['ReservationId']).toBe('02afb037-6f3b-4ce3-aebd-c2cc3d3dba14');
    expect(sent['PropertyId']).toBe(PROPERTY);
    expect(sent['PropertyCode']).toBe('HTL001');
  });

  it('rejects a precheck with no quoted net rather than sending zero', async () => {
    // `BookingRate` is required and must be what the rate quoted. Sending zero
    // would be rejected, or worse accepted against a price nobody agreed to.
    const result = await adapter([
      { path: '/api/SmartDistribution/PreCheckReservation', body: RG_PRECHECK_RESPONSE },
    ]).precheck(
      {
        supplierHotelId: supplierHotelId(PROPERTY),
        supplierRateRef: 'rk-deluxe-refundable',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        supplierState: {},
      },
      ctx(),
    );
    expect(result.available).toBe(false);
    expect(result.error?.code).toBe('SUPPLIER_BAD_REQUEST');
  });

  it('carries the quoted net on the rate, so precheck works from the rate alone', async () => {
    const rates = await productRates();
    expect(rates.rates[0]?.supplierState).toMatchObject({
      quotedTotalMajor: 12_450,
      sellingRateMajor: 12_650,
    });
  });

  it('echoes SellingRate on commit for the B2C commissionable model', async () => {
    // Added by spec revision 1.5.3 for the "Net Rate + Commission" model.
    const transport = stubTransport([
      { path: '/api/SmartDistribution/CommitReservation', body: RG_COMMIT_RESPONSE },
    ]);
    const rg = new RateGainAdapter({
      transport,
      credentials: { baseUrl: 'https://x', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });
    await rg.book(
      {
        klarBookingId: klarBookingId('KLR-1'),
        supplierHotelId: supplierHotelId(PROPERTY),
        supplierRateRef: 'rk-deluxe-refundable',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        guests: TWO_ADULTS,
        holdOnly: false,
        supplierState: { quotedTotalMajor: 11_500, sellingRateMajor: 12_650 },
        idempotencyKey: 'idem-1',
      },
      ctx(),
    );
    const sent = transport.calls[0]?.body as { BookReservation: Record<string, unknown> };
    expect(sent.BookReservation['BookingRate']).toBe(11_500);
    expect(sent.BookReservation['SellingRate']).toBe(12_650);
    expect(sent.BookReservation['DemandBookingId']).toBe('KLR-1');
  });

  it('will not commit without the totalNet precheck confirmed', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/CommitReservation', body: RG_COMMIT_RESPONSE },
    ]).book(
      {
        klarBookingId: klarBookingId('KLR-1'),
        supplierHotelId: supplierHotelId(PROPERTY),
        supplierRateRef: 'rk-deluxe-refundable',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        guests: [{ firstName: 'A', lastName: 'B', isPrimary: true, isChild: false }],
        holdOnly: false,
        supplierState: {},
        idempotencyKey: 'idem-1',
      },
      ctx(),
    );
    expect(result.status).toBe('FAILED');
    expect(result.error?.code).toBe('SUPPLIER_BAD_REQUEST');
  });

  it('reads the cancellation number from body.cancellationNumber', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/CancelReservation', body: RG_CANCEL_RESPONSE },
    ]).cancel({ supplierBookingRef: 'O1HJB58#MTUMJLV' }, ctx());
    expect(result.status).toBe('CANCELLED');
    expect(result.supplierCancellationRef).toBe('KZ2VZSPYXUO6ZV');
  });

  it('surfaces RateGain error codes as a normalised failure', async () => {
    const result = await adapter([
      { path: '/api/SmartDistribution/PreCheckReservation', body: RG_FAILURE_RESPONSE },
    ]).precheck(precheckReq, ctx());
    expect(result.available).toBe(false);
    expect(result.error?.code).toBe('SUPPLIER_RATE_EXPIRED');
  });
});

describe('reservation envelope', () => {
  /** The allocation the adapter would hand the builder, for TEST_OCCUPANCY. */
  const party = (guests: readonly SupplierGuest[]) => {
    const allocated = allocateGuests(TEST_OCCUPANCY, guests);
    if (!allocated.ok) throw new Error(allocated.reason);
    return allocated.rooms;
  };

  /**
   * Built server-side. In the reference the browser assembled this — which is
   * why adding a third supplier would have needed a frontend release.
   */
  it('sends RoomRate per room per night, as the spec requires', () => {
    const req = buildReservationRequest({
      propertyId: PROPERTY,
      rateRef: 'rk-1',
      stay: TEST_STAY, // 3 nights
      rooms: party([
        { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
        { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
      ]), // 1 room
      nationality: TEST_NATIONALITY,
      currency: 'INR',
      bookingRateMajor: 11_400,
      demandBookingId: 'd1',
      echoToken: 'e1',
      session: 's1',
      timestamp: '2026-08-13T00:00:00Z',
      resStatus: 1,
    });
    expect(req.BookReservation.RoomSelection[0]?.RoomRate).toBe(3_800);
    expect(req.BookReservation.BookingRate).toBe(11_400);
  });

  it('strips punctuation from guest names', () => {
    const req = buildReservationRequest({
      propertyId: 'p',
      rateRef: 'r',
      stay: TEST_STAY,
      rooms: party([
        { firstName: "O'Brien-Smith", lastName: 'De La Cruz', isPrimary: true, isChild: false },
        { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
      ]),
      nationality: TEST_NATIONALITY,
      currency: 'INR',
      bookingRateMajor: 1_000,
      echoToken: 'e',
      session: 's',
      timestamp: 't',
      resStatus: 1,
    });
    expect(req.BookReservation.RoomSelection[0]?.Guest[0]?.FirstName).toBe('OBrienSmith');
  });

  it('always sends a child age, because the rate depends on it', () => {
    // Spec §3: "children age mandatory if children>0".
    const rooms = toRgRooms({ rooms: [{ adults: 2, children: 1, childAges: [12] }] });
    expect(rooms[0]?.paxes).toEqual([{ type: 'Child', age: 12 }]);
  });
});
