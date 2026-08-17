import { describe, expect, it } from 'vitest';
import { countryCode, currencyCode, klarBookingId, supplierHotelId } from '../../domain/shared/brand.js';
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
import { TripJackAdapter } from './adapter.js';
import { DEFAULT_TRIPJACK_TUNING, TRIPJACK } from './config.js';
import {
  TJ_BOOK_RESPONSE,
  TJ_BOOKING_DETAILS_PENDING,
  TJ_CANCEL_RESPONSE,
  TJ_INTERNAL_FAILURE,
  TJ_LISTING_RESPONSE,
  TJ_PRICING_RESPONSE,
  TJ_REVIEW_RESPONSE,
  TJ_STATIC_DETAIL_RESPONSE,
} from './fixtures.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { toStaticDetail, toSupplierCost, toSupplierHotel, toSupplierRate } from './response.js';
import { buildBookRequest, buildListingRequest } from './request.js';

const INR = currencyCode('INR');
const ctx = () => testContext(TRIPJACK);

/** TEST_OCCUPANCY is two adults, and a commit must be given both of them. */
const TWO_ADULTS: readonly SupplierGuest[] = [
  { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
  { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
];

const adapter = (routes: readonly StubRoute[]): TripJackAdapter => {
  const transport = stubTransport(routes);
  return new TripJackAdapter({
    hms: transport,
    oms: transport,
    credentials: {
      hmsBaseUrl: 'https://hms.example',
      omsBaseUrl: 'https://oms.example',
      apiKey: 'k',
      agencyId: 'a',
      imageBaseUrl: 'https://cdn.tripjack.example',
    },
    resolveNationality: () => Promise.resolve('101'),
    newCorrelationId: () => 'corr-fixed',
    breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
    now: frozenClock(),
    sleep: instantSleep,
  });
};

const searchIds = [
  supplierHotelId('100000001234'),
  supplierHotelId('100000005678'),
  supplierHotelId('100000009999'),
];

describe('TripJack cost mapping', () => {
  it('treats totalPrice as authoritative and derives the base from it', () => {
    const cost = toSupplierCost(
      { basePrice: 10_000, totalPrice: 12_000, taxes: 1_500, mf: 400, mft: 100, currency: 'INR' },
      INR,
    );
    expect(cost).not.toBeNull();
    expect(toMajor(cost!.total)).toBe(12_000);
    expect(toMajor(cost!.taxes)).toBe(1_500);
    expect(toMajor(cost!.fees)).toBe(500); // mf + mft
    expect(toMajor(cost!.base)).toBe(10_000);
    expect(isCostConsistent(cost!)).toBe(true);
  });

  it('bends the base, not the total, when the parts disagree', () => {
    // The total is what TripJack invoices and what cancellation liability is
    // measured against, so a base that disagrees is the field to give up.
    const cost = toSupplierCost({ basePrice: 9_999, totalPrice: 12_000, taxes: 1_500, currency: 'INR' }, INR);
    expect(toMajor(cost!.total)).toBe(12_000);
    expect(toMajor(cost!.base)).toBe(10_500);
    expect(isCostConsistent(cost!)).toBe(true);
  });

  it('falls back to an unsplit total when taxes exceed it', () => {
    const cost = toSupplierCost({ totalPrice: 1_000, taxes: 5_000, currency: 'INR' }, INR);
    expect(toMajor(cost!.total)).toBe(1_000);
    expect(cost!.taxes.minor).toBe(0);
    expect(isCostConsistent(cost!)).toBe(true);
  });

  it('rejects an option with no usable total', () => {
    expect(toSupplierCost({ currency: 'INR' }, INR)).toBeNull();
    expect(toSupplierCost({ totalPrice: 0, currency: 'INR' }, INR)).toBeNull();
  });

  it('uses the option currency over the request currency', () => {
    const cost = toSupplierCost({ totalPrice: 100, currency: 'AED' }, INR);
    expect(cost!.currency).toBe('AED');
  });
});

describe('TripJack hotel mapping', () => {
  const mapped = () =>
    toSupplierHotel(TJ_LISTING_RESPONSE.hotels[0], {
      currency: INR,
      requestedOccupancy: TEST_OCCUPANCY,
      correlationId: 'corr-1',
      images: createImageResolver('https://cdn.tripjack.example'),
    });

  it('carries identity, geo and star rating', () => {
    const h = mapped();
    expect(h?.supplierHotelId).toBe('100000001234');
    expect(h?.location).toEqual({ lat: 15.2596, lng: 73.9188 });
    expect(h?.starRating).toBe(5);
    expect(h?.propertyType).toBe('RESORT');
  });

  it('resolves both absolute and bare-filename images', () => {
    expect(mapped()?.imageUrls).toEqual([
      'https://cdn.tripjack.example/hotels/taj-1.jpg',
      'https://cdn.tripjack.example/taj-2.jpg',
    ]);
  });

  it('leaves refundability unknown when listing sent no cancellation block', () => {
    // Listing never returns one, so the reference's derived `false` rendered a
    // hard "Non-Refundable" on every card with no evidence for it.
    const rate = mapped()?.rates.find((r) => r.supplierRateRef === 'opt-unknown-cxl-1');
    expect(rate?.cancellation.refundable).toBe('UNKNOWN');
  });

  it('reads an explicit refundable flag with its free-cancellation date', () => {
    const rate = mapped()?.rates.find((r) => r.supplierRateRef === 'opt-refundable-1');
    expect(rate?.cancellation.refundable).toBe('TRUE');
    expect(rate?.cancellation.freeUntil).toBe('2026-09-05T00:00:00Z');
  });

  it('seals the session values Review will need into supplierState', () => {
    const rate = mapped()?.rates[0];
    expect(rate?.supplierState).toMatchObject({
      correlationId: 'corr-1',
      hid: '100000001234',
      optionId: 'opt-refundable-1',
    });
  });

  it('carries compliance requirements through', () => {
    const rate = mapped()?.rates.find((r) => r.supplierRateRef === 'opt-refundable-1');
    expect(rate?.compliance).toEqual({ panRequired: true, passportRequired: false, gstType: 'B2C' });
  });

  it('classifies a bundled multi-room option as MIXED', () => {
    // CRSM/CRCM bundle differing rooms or meal plans into one offer; calling it
    // a Deluxe Room would put it in an equivalence class it does not belong in.
    const h = toSupplierHotel(
      {
        tjHotelId: '1',
        name: 'X',
        options: [
          {
            id: 'o1',
            optionType: 'CRSM',
            pricing: { totalPrice: 1_000, currency: 'INR' },
            roomInfo: [{ name: 'Deluxe Room' }],
          },
        ],
      },
      {
        currency: INR,
        requestedOccupancy: TEST_OCCUPANCY,
        correlationId: 'c',
        images: createImageResolver(undefined),
      },
    );
    expect(h?.rates[0]?.room.category).toBe('MIXED');
  });
});

describe('TripJack search', () => {
  it('drops properties TripJack returned with no options', async () => {
    const result = await adapter([
      { path: '/hms/v3/hotel/listing', body: TJ_LISTING_RESPONSE },
    ]).search(
      {
        target: { kind: 'HOTEL_IDS', ids: searchIds },
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        page: 1,
        pageSize: 20,
      },
      ctx(),
    );
    expect(result.hotels.map((h) => h.name)).toEqual(['Taj Exotica Resort & Spa', 'No Amenities Hotel']);
  });

  it('reports candidate ids scanned, not a hotel count', async () => {
    // Goa resolves ~6,179 ids and yields roughly 20 bookable hotels. Surfacing
    // this as a result count, or summing it across suppliers, is a lie.
    const result = await adapter([
      { path: '/hms/v3/hotel/listing', body: TJ_LISTING_RESPONSE },
    ]).search(
      {
        target: { kind: 'HOTEL_IDS', ids: searchIds },
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        page: 1,
        pageSize: 20,
      },
      ctx(),
    );
    expect(result.pageInfo.supplierReportedTotal).toBe(3);
    expect(result.hotels).toHaveLength(2);
  });

  /**
   * A window is scanned in chunks, and a chunk that failed is inventory nobody
   * looked at. Reporting SUCCESS because the surviving chunks returned
   * something claims "best available" over a fraction of the window — and the
   * orchestrator, which trusts this status, then labels the whole search
   * BEST_AVAILABLE.
   */
  it('reports a window whose chunks partly failed as PARTIAL, not SUCCESS', async () => {
    // Two chunks: the first answers, the second is refused.
    const transport = stubTransport([{ path: '/hms/v3/hotel/listing', body: TJ_LISTING_RESPONSE }]);
    let call = 0;
    const flaky: typeof transport = {
      ...transport,
      request: (req, opts) => {
        call += 1;
        if (call > 1) return Promise.resolve({ status: 503, ok: false, body: { message: 'down' } });
        return transport.request(req, opts);
      },
    };

    const tj = new TripJackAdapter({
      hms: flaky,
      oms: flaky,
      credentials: { hmsBaseUrl: 'https://h', omsBaseUrl: 'https://o', apiKey: 'k', agencyId: 'a' },
      resolveNationality: () => Promise.resolve('101'),
      newCorrelationId: () => 'corr-fixed',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
      // One id per call, so the window splits into two chunks.
      tuning: { ...DEFAULT_TRIPJACK_TUNING, idsPerCall: 1, concurrency: 1 },
    });

    const result = await tj.search(
      {
        target: { kind: 'HOTEL_IDS', ids: searchIds },
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        page: 1,
        pageSize: 20,
      },
      ctx(),
    );

    expect(result.hotels.length).toBeGreaterThan(0);
    expect(result.status).toBe('PARTIAL');
  });

  it('refuses a target it cannot serve instead of returning an empty page', async () => {
    const result = await adapter([]).search(
      {
        target: { kind: 'DEST_CODE', code: 'GOA' },
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        page: 1,
        pageSize: 20,
      },
      ctx(),
    );
    expect(result.status).toBe('ERROR');
    expect(result.error?.code).toBe('SUPPLIER_BAD_REQUEST');
  });

  it('surfaces a failure TripJack reported inside a 200', async () => {
    const result = await adapter([
      { path: '/hms/v3/hotel/listing', status: 200, body: TJ_INTERNAL_FAILURE },
    ]).search(
      {
        target: { kind: 'HOTEL_IDS', ids: searchIds },
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        page: 1,
        pageSize: 20,
      },
      ctx(),
    );
    expect(result.status).toBe('ERROR');
    expect(result.hotels).toEqual([]);
  });

  it('maps each page to a fixed id window so pages cannot skip ids', () => {
    const req = buildListingRequest({
      stay: TEST_STAY,
      occupancy: TEST_OCCUPANCY,
      currency: 'INR',
      nationalityId: '101',
      hids: ['100000001234', 'not-a-number'],
      correlationId: 'c',
    });
    // A non-numeric id is dropped rather than sent as NaN, which TripJack
    // answers with a 400 for the entire call.
    expect(req.hids).toEqual([100000001234]);
  });
});

describe('TripJack rates and detail', () => {
  it('maps pricing options and carries the review hash forward', async () => {
    const result = await adapter([
      { path: '/hms/v3/hotel/pricing', body: TJ_PRICING_RESPONSE },
    ]).getRates(
      {
        supplierHotelId: supplierHotelId('100000001234'),
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
      },
      ctx(),
    );
    expect(result.status).toBe('SUCCESS');
    expect(result.rates[0]?.supplierState).toMatchObject({ reviewHash: 'rh-abc123' });
  });

  it('treats a sold-out 400 as no availability, not as a fault', async () => {
    // TripJack answers a sold-out hotel with a 400 and an empty option list.
    // Reporting it as an error would send a healthy hotel to the breaker.
    const result = await adapter([
      { path: '/hms/v3/hotel/pricing', status: 400, body: { options: [] } },
    ]).getRates(
      {
        supplierHotelId: supplierHotelId('100000001234'),
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
      },
      ctx(),
    );
    expect(result.status).toBe('EMPTY');
    expect(result.error).toBeUndefined();
  });

  it('reads static detail out of its links map and keyed amenities', () => {
    const detail = toStaticDetail(
      TJ_STATIC_DETAIL_RESPONSE,
      createImageResolver('https://cdn.tripjack.example'),
    );
    expect(detail.imageUrls).toEqual([
      'https://cdn.tripjack.example/static/taj-hero.jpg',
      'https://cdn.tripjack.example/static/taj-pool.jpg',
    ]);
    expect(detail.amenityLabels).toEqual(['Swimming Pool', 'Spa']);
    expect(detail.address).toBe('Calwaddo, Benaulim, Salcette, Goa 403716');
    expect(detail.starRating).toBe(5);
    expect(detail.checkInTime).toBe('14:00');
  });
});

describe('TripJack booking lifecycle', () => {
  const precheckReq = {
    supplierHotelId: supplierHotelId('100000001234'),
    supplierRateRef: 'opt-refundable-1',
    stay: TEST_STAY,
    occupancy: TEST_OCCUPANCY,
    nationality: TEST_NATIONALITY,
    supplierState: { correlationId: 'corr-1', hid: '100000001234' },
  };

  it('carries the bookingId Review issues into supplierState', async () => {
    const result = await adapter([
      { path: '/hms/v3/hotel/review', body: TJ_REVIEW_RESPONSE },
    ]).precheck(precheckReq, ctx());
    expect(result.available).toBe(true);
    expect(result.supplierState).toMatchObject({ bookingId: 'TJ-BOOK-556677' });
    expect(toMajor(result.cost!.total)).toBe(12_000);
  });

  it('refuses to book without the bookingId Review issued', async () => {
    // Inventing one would create an order nobody can reconcile.
    const result = await adapter([{ path: '/oms/v3/hotel/book', body: TJ_BOOK_RESPONSE }]).book(
      {
        klarBookingId: klarBookingId('KLR-1'),
        supplierHotelId: supplierHotelId('100000001234'),
        supplierRateRef: 'opt-refundable-1',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        guests: TWO_ADULTS,
        holdOnly: false,
        supplierState: {},
        idempotencyKey: 'idem-1',
      },
      ctx(),
    );
    expect(result.status).toBe('FAILED');
    expect(result.error?.code).toBe('SUPPLIER_BAD_REQUEST');
  });

  it('will not answer a hold request by committing', async () => {
    // TripJack declares `supportsHold`, but `/oms/v3/hotel/book` is the commit
    // call and the hold call is not implemented. Ignoring the flag would answer
    // "hold this room" with a reservation the customer is liable for.
    const transport = stubTransport([{ path: '/oms/v3/hotel/book', body: TJ_BOOK_RESPONSE }]);
    const tj = new TripJackAdapter({
      hms: transport,
      oms: transport,
      credentials: { hmsBaseUrl: 'https://h', omsBaseUrl: 'https://o', apiKey: 'k', agencyId: 'a' },
      resolveNationality: () => Promise.resolve('101'),
      newCorrelationId: () => 'corr-fixed',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });

    const result = await tj.book(
      {
        klarBookingId: klarBookingId('KLR-1'),
        supplierHotelId: supplierHotelId('100000001234'),
        supplierRateRef: 'opt-refundable-1',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        guests: TWO_ADULTS,
        holdOnly: true,
        supplierState: { bookingId: 'TJ-BOOK-556677' },
        idempotencyKey: 'idem-1',
      },
      ctx(),
    );

    expect(result.status).toBe('FAILED');
    expect(transport.calls).toHaveLength(0);
  });

  it('confirms a successful book without asking to be polled', async () => {
    const result = await adapter([{ path: '/oms/v3/hotel/book', body: TJ_BOOK_RESPONSE }]).book(
      {
        klarBookingId: klarBookingId('KLR-1'),
        supplierHotelId: supplierHotelId('100000001234'),
        supplierRateRef: 'opt-refundable-1',
        stay: TEST_STAY,
        occupancy: TEST_OCCUPANCY,
        nationality: TEST_NATIONALITY,
        guests: TWO_ADULTS,
        holdOnly: false,
        supplierState: { bookingId: 'TJ-BOOK-556677' },
        idempotencyKey: 'idem-1',
      },
      ctx(),
    );
    expect(result.status).toBe('CONFIRMED');
    expect(result.supplierBookingRef).toBe('TJ-BOOK-556677');
    // `poll` is for a booking that has not settled. Returning it on a confirmed
    // one invites the caller to wait for a confirmation it already holds.
    expect(result.poll).toBeUndefined();
  });

  it('treats an unrecognised order status as pending, not as failed', async () => {
    // Calling it failed would refund a booking the hotel may still confirm.
    const result = await adapter([
      { path: '/oms/v3/hotel/booking-details', body: TJ_BOOKING_DETAILS_PENDING },
    ]).getBookingStatus('TJ-BOOK-556677', ctx());
    expect(result.status).toBe('PENDING');
  });

  it('groups travellers per room, lead first', () => {
    // The lead is the guest who was marked, not the one who happened to be
    // listed first: RateGain decided it positionally, so the same party in a
    // different order put different names on the two suppliers' bookings.
    const allocated = allocateGuests(TEST_OCCUPANCY, [
      { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
      { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
    ]);
    if (!allocated.ok) throw new Error(allocated.reason);

    const req = buildBookRequest({
      bookingId: 'B1',
      rooms: allocated.rooms,
      lead: allocated.lead,
    });
    expect(req.roomTravellerInfo).toHaveLength(1);
    expect(req.roomTravellerInfo[0]?.travellerInfo).toHaveLength(2);
    expect(req.roomTravellerInfo[0]?.travellerInfo[0]?.firstName).toBe('Asha');
    expect(req.roomTravellerInfo[0]?.travellerInfo[0]?.isLeadPax).toBe(true);
  });

  it('reports an accepted cancellation as cancelled, not as pending', async () => {
    /**
     * TripJack's success signal is `status.success`, and `status` is an OBJECT.
     * Reading a top-level status STRING found nothing, so every successful
     * cancellation came back PENDING — and nothing polls a pending
     * cancellation, so the booking stayed in `CANCELLATION_PENDING` and the
     * customer was never refunded for a stay TripJack had already released.
     */
    const result = await adapter([
      { path: '/oms/v3/hotel/cancel-booking', body: TJ_CANCEL_RESPONSE },
    ]).cancel({ supplierBookingRef: 'TJ-BOOK-556677' }, ctx());
    expect(result.status).toBe('CANCELLED');
    expect(result.supplierCancellationRef).toBe('TJ-CXL-4411');
  });

  it('stays pending when TripJack acknowledges without a reference', async () => {
    // Success with nothing to quote back is not a cancellation we can evidence.
    const result = await adapter([
      { path: '/oms/v3/hotel/cancel-booking', body: { status: { success: true } } },
    ]).cancel({ supplierBookingRef: 'TJ-BOOK-556677' }, ctx());
    expect(result.status).toBe('PENDING');
  });
});

describe('TripJack credentials', () => {
  it('sends the key under exactly one header name', async () => {
    // The reference sent it under six, plus a spoofed Chrome User-Agent (D-16).
    const { tripJackHeaders } = await import('./config.js');
    const headers = tripJackHeaders({
      hmsBaseUrl: 'x',
      omsBaseUrl: 'y',
      apiKey: 'KEY',
      agencyId: 'AG',
    });
    expect(Object.values(headers).filter((v) => v === 'KEY')).toHaveLength(1);
    expect(Object.keys(headers)).toEqual(['apikey', 'agencyid']);
    expect(JSON.stringify(headers)).not.toContain('Mozilla');
  });

  it('does not require a country name to be a country code', () => {
    const h = toSupplierHotel(
      { tjHotelId: '1', name: 'X', country: 'India', options: [{ id: 'o', pricing: { totalPrice: 100, currency: 'INR' } }] },
      {
        currency: INR,
        requestedOccupancy: TEST_OCCUPANCY,
        correlationId: 'c',
        images: createImageResolver(undefined),
      },
    );
    // "India" is a display string, not ISO-2. Coercing it would produce a
    // country code that no lookup matches.
    expect(h?.countryCode).toBeUndefined();
    expect(
      toSupplierHotel(
        { tjHotelId: '1', name: 'X', country: 'IN', options: [{ id: 'o', pricing: { totalPrice: 100, currency: 'INR' } }] },
        {
          currency: INR,
          requestedOccupancy: TEST_OCCUPANCY,
          correlationId: 'c',
          images: createImageResolver(undefined),
        },
      )?.countryCode,
    ).toBe(countryCode('IN'));
  });
});

// ═══ Regressions from the second cross-check ════════════════════════════════

describe('TripJack mapping is defensive about what it is handed', () => {
  const mapCtx = {
    currency: INR,
    requestedOccupancy: TEST_OCCUPANCY,
    correlationId: 'corr-1',
    images: createImageResolver(undefined),
  };

  /**
   * `rating` is not necessarily a star count. A review score of 8.5 arrives in
   * the same shape, and unbounded it reached the star facet as a "9-star"
   * bucket, the star filter, and the matcher's STAR_RATING signal — where an
   * 8.5 can never sit within one of a real 5. RateGain's reader already bounds
   * its own.
   */
  it('ignores a rating that cannot be a star rating', () => {
    const h = toSupplierHotel(
      { tjHotelId: 'TJ-1', name: 'Review Score Inn', rating: 8.5, options: [] },
      mapCtx,
    );
    expect(h?.starRating).toBeUndefined();
  });

  it('still reads a real star rating', () => {
    const h = toSupplierHotel(
      { tjHotelId: 'TJ-1', name: 'Five Star Inn', rating: 5, options: [] },
      mapCtx,
    );
    expect(h?.starRating).toBe(5);
  });

  /**
   * Occupancy is part of the equivalence class, so an invented adult count
   * files the deal in the wrong comparability bucket and prices a party nobody
   * described. The same mistake as defaulting a traveller's nationality inside
   * an adapter (A-5), and the children branch two lines below already had the
   * right answer: fall back to what was asked for.
   */
  it('does not invent an adult count the supplier did not send', () => {
    const rate = toSupplierRate(
      {
        id: 'opt-1',
        pricing: { totalPrice: 10_000, currency: 'INR' },
        roomInfo: [{ name: 'Deluxe Room' }],
      },
      {
        currency: INR,
        // Ask for ONE adult, so an invented 2 and the correct fallback differ.
        requestedOccupancy: occupancy([roomRequest(1, 0, [])]),
        correlationId: 'c',
        hid: 'TJ-1',
      },
    );
    expect(rate?.occupancy.rooms[0]?.adults).toBe(1);
  });

  it('reads the occupancy TripJack did send', () => {
    const rate = toSupplierRate(
      {
        id: 'opt-1',
        pricing: { totalPrice: 10_000, currency: 'INR' },
        roomInfo: [{ name: 'Deluxe Room', numberOfAdults: 3 }],
      },
      {
        currency: INR,
        requestedOccupancy: occupancy([roomRequest(1, 0, [])]),
        correlationId: 'c',
        hid: 'TJ-1',
      },
    );
    expect(rate?.occupancy.rooms[0]?.adults).toBe(3);
  });

  /**
   * One unmappable option is one option. Mapping the list with a bare `.map`
   * let a single malformed price throw out of the whole hotel, losing every
   * other rate on a property that was otherwise perfectly bookable.
   */
  it('keeps the mappable rates when one option is malformed', () => {
    const skipped: number[] = [];
    const h = toSupplierHotel(
      {
        tjHotelId: 'TJ-1',
        name: 'Mixed Data Inn',
        options: [
          // A price no Money can hold.
          { id: 'bad', pricing: { totalPrice: 1e18, currency: 'INR' } },
          {
            id: 'good',
            pricing: { totalPrice: 10_000, currency: 'INR' },
            roomInfo: [{ name: 'Deluxe Room', numberOfAdults: 2 }],
          },
        ],
      },
      { ...mapCtx, onSkippedRate: (_error, index) => skipped.push(index) },
    );

    expect(h?.rates).toHaveLength(1);
    expect(h?.rates[0]?.supplierRateRef).toBe('good');
    // Dropped, and reported — "we mapped 1 of 2" is diagnosable.
    expect(skipped).toEqual([0]);
  });
});
