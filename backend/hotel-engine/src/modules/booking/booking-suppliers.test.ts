import { describe, expect, it } from 'vitest';
import {
  countryCode,
  currencyCode,
  klarHotelId,
  searchId,
  supplierHotelId,
  type SupplierCode,
} from '../../domain/shared/brand.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import type { MarkupRule } from '../../domain/pricing/markup.js';
import type { Guest } from '../../domain/booking/booking.js';
import type { HotelSupplier } from '../../suppliers/contract/hotel-supplier.js';
import { SupplierRegistry } from '../../suppliers/contract/registry.js';
import { CircuitBreaker } from '../../suppliers/common/circuit-breaker.js';
import { frozenClock, instantSleep, stubTransport, type StubRoute } from '../../suppliers/testing/harness.js';
import { TripJackAdapter } from '../../suppliers/tripjack/adapter.js';
import { TRIPJACK } from '../../suppliers/tripjack/config.js';
import { TJ_BOOK_RESPONSE, TJ_CANCEL_RESPONSE, TJ_REVIEW_RESPONSE } from '../../suppliers/tripjack/fixtures.js';
import { RateGainAdapter } from '../../suppliers/rategain/adapter.js';
import { RATEGAIN } from '../../suppliers/rategain/config.js';
import { RG_CANCEL_RESPONSE, RG_COMMIT_RESPONSE, RG_PRECHECK_RESPONSE } from '../../suppliers/rategain/fixtures.js';
import { PricingService } from '../pricing/pricing-service.js';
import { RevalidationService } from '../revalidation/revalidation-service.js';
import {
  FakeClock,
  FakeMarkupProvider,
  FakePaymentGateway,
  FakeRateTokenStore,
  InMemoryBookingRepository,
  InMemoryPropertyRepository,
  SequentialIds,
  silentLogger,
} from '../testing/fakes.js';
import { fakeConfig } from '../testing/fake-supplier.js';
import { BookingService } from './booking-service.js';
import { testContext } from '../../suppliers/testing/harness.js';

/**
 * The phase's acceptance test: **book through TripJack and through RateGain
 * with one code path.**
 *
 * Both real adapters, both driven by the same `BookingService`, both against
 * recorded payloads. Nothing below the registry knows which supplier it is
 * talking to, and nothing in the service names one. The reference needed 1,013
 * lines of `#commitTripJack` and `#commitRateGain` to do what this file proves
 * is now one flow — and its supplier detection was a five-clause heuristic over
 * the shape of whatever the browser sent (D-9).
 *
 * The quote is sealed from the supplier's OWN precheck answer, so the
 * revalidation gate sees an unchanged product and the test is about committing
 * rather than about a price move. What differs between the two runs is only the
 * fixtures.
 */

const INR = currencyCode('INR');
const IN = countryCode('IN');
const STAY = stayDates('2026-09-10', '2026-09-13');
const PARTY_OF_TWO = occupancy([roomRequest(2, 0, [])]);

const RULES: MarkupRule[] = [
  { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
];

const GUESTS: readonly Guest[] = [
  { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false, email: 'asha@example.com' },
  { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
];

interface SupplierUnderTest {
  readonly name: string;
  readonly code: SupplierCode;
  readonly supplierHotelId: string;
  readonly supplierRateRef: string;
  /** State the supplier's own search would have sealed into the rate token. */
  readonly supplierState: Readonly<Record<string, unknown>>;
  readonly create: (routes: readonly StubRoute[]) => HotelSupplier;
  readonly routes: readonly StubRoute[];
  /** What the recorded commit reports back as its reference. */
  readonly expectedBookingRef: string;
}

const tripjack: SupplierUnderTest = {
  name: 'TripJack',
  code: TRIPJACK,
  supplierHotelId: '100000001234',
  supplierRateRef: 'opt-refundable-1',
  supplierState: { correlationId: 'corr-1', hid: '100000001234', optionId: 'opt-refundable-1' },
  routes: [
    { path: '/hms/v3/hotel/review', body: TJ_REVIEW_RESPONSE },
    { path: '/oms/v3/hotel/book', body: TJ_BOOK_RESPONSE },
    { path: '/oms/v3/hotel/cancel-booking', body: TJ_CANCEL_RESPONSE },
  ],
  create: (routes) => {
    const transport = stubTransport(routes);
    return new TripJackAdapter({
      hms: transport,
      oms: transport,
      credentials: {
        hmsBaseUrl: 'https://hms.example',
        omsBaseUrl: 'https://oms.example',
        apiKey: 'k',
        agencyId: 'a',
      },
      resolveNationality: () => Promise.resolve('101'),
      newCorrelationId: () => 'corr-fixed',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    });
  },
  // TripJack's book consumes the id Review issued, and reports it back.
  expectedBookingRef: 'TJ-BOOK-556677',
};

const rategain: SupplierUnderTest = {
  name: 'RateGain',
  code: RATEGAIN,
  supplierHotelId: 'ChIJCYQhdhVDXz4R5lEANKNzFlA',
  supplierRateRef: 'rk-deluxe-refundable',
  // `quotedTotalMajor` is what the commit sends as `BookingRate`; without it the
  // adapter refuses rather than committing against a price nobody agreed (A-2).
  supplierState: { quotedTotalMajor: 11_500, propertyCode: 'HTL001' },
  routes: [
    { path: '/api/SmartDistribution/PreCheckReservation', body: RG_PRECHECK_RESPONSE },
    { path: '/api/SmartDistribution/CommitReservation', body: RG_COMMIT_RESPONSE },
    { path: '/api/SmartDistribution/CancelReservation', body: RG_CANCEL_RESPONSE },
  ],
  create: (routes) =>
    new RateGainAdapter({
      transport: stubTransport(routes),
      credentials: { baseUrl: 'https://rategain.example', apiKey: 'k', apiSecret: 's' },
      newEchoToken: () => 'echo-fixed',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    }),
  expectedBookingRef: 'O1HJB58#MTUMJLV',
};

async function harness(subject: SupplierUnderTest) {
  const supplier = subject.create(subject.routes);
  const registry = new SupplierRegistry();
  registry.register(supplier, fakeConfig(String(subject.code)));

  const rateTokens = new FakeRateTokenStore();
  const pricing = new PricingService(new FakeMarkupProvider(RULES));
  const clock = new FakeClock();
  const bookings = new InMemoryBookingRepository();
  const payments = new FakePaymentGateway();
  const properties = new InMemoryPropertyRepository([
    { klarHotelId: 'KLAR-TAJ', name: 'Taj Exotica Resort & Spa', city: 'Goa' },
  ]);

  /**
   * Seal the quote from the supplier's own precheck answer.
   *
   * The alternative — inventing a room and a price — would make the
   * revalidation gate report a substitution, and this test would be about the
   * gate rather than about committing. Asking the adapter what it will honour
   * is also the only way to build a quote that is right for BOTH suppliers
   * without special-casing either.
   */
  const confirmed = await supplier.precheck(
    {
      supplierHotelId: supplierHotelId(subject.supplierHotelId),
      supplierRateRef: subject.supplierRateRef,
      stay: STAY,
      occupancy: PARTY_OF_TWO,
      nationality: IN,
      supplierState: subject.supplierState,
    },
    testContext(subject.code),
  );
  expect(confirmed.available, `${subject.name} precheck should confirm the fixture`).toBe(true);

  const scope = { channel: 'B2C' as const, homeCountry: IN, destinationCountry: IN, nights: 3 };
  const resolved = await pricing.resolve(scope);
  const rate = {
    supplierRateRef: confirmed.supplierRateRef ?? subject.supplierRateRef,
    room: confirmed.room!,
    board: confirmed.board!,
    occupancy: PARTY_OF_TWO,
    cancellation: confirmed.cancellation!,
    cost: confirmed.cost!,
    onHoldAllowed: false,
    supplierState: { ...subject.supplierState, ...(confirmed.supplierState ?? {}) },
  };
  const quotedPrice = pricing.priceRate(rate, subject.code, scope, resolved);

  const issued = await rateTokens.issue({
    searchId: searchId('KLAR-SRCH-1'),
    supplier: subject.code,
    supplierHotelId: supplierHotelId(subject.supplierHotelId),
    klarHotelId: klarHotelId('KLAR-TAJ'),
    rate,
    quotedPrice,
    stay: STAY,
    occupancy: PARTY_OF_TWO,
    nationality: IN,
    scope,
    markupVersion: resolved.markupVersion,
    validForMs: 900_000,
  });

  const service = new BookingService({
    registry,
    revalidation: new RevalidationService({
      registry,
      rateTokens,
      pricing,
      clock,
      ids: new SequentialIds(),
      logger: silentLogger,
      config: { deadlineMs: 30_000 },
    }),
    rateTokens,
    bookings,
    properties,
    payments,
    clock,
    ids: new SequentialIds(),
    logger: silentLogger,
    config: { deadlineMs: 60_000 },
  });

  return { service, bookings, payments, dealId: issued.dealId, quotedPrice };
}

describe.each([tripjack, rategain])('booking through $name', (subject) => {
  it('commits, confirms and records the booking', async () => {
    const h = await harness(subject);

    const outcome = await h.service.commit({
      dealId: h.dealId,
      idempotencyKey: `idem-${String(subject.code)}`,
      guests: GUESTS,
    });

    expect(outcome.kind).toBe('BOOKED');
    if (outcome.kind !== 'BOOKED') return;

    expect(outcome.booking.status).toBe('CONFIRMED');
    expect(outcome.booking.supplier).toBe(subject.code);
    expect(outcome.booking.supplierBookingRef).toBe(subject.expectedBookingRef);
    // Canonical, and identical in shape whichever supplier sold it.
    expect(outcome.booking.deal.hotelName).toBe('Taj Exotica Resort & Spa');
    expect(outcome.booking.deal.price.total.minor).toBe(h.quotedPrice.total.minor);
    expect(outcome.booking.payment?.capturedAmount.minor).toBe(h.quotedPrice.total.minor);
    expect(outcome.booking.deal.price.currency).toBe(INR);
  });

  it('cancels what it booked', async () => {
    const h = await harness(subject);
    const booked = await h.service.commit({
      dealId: h.dealId,
      idempotencyKey: `idem-cxl-${String(subject.code)}`,
      guests: GUESTS,
    });
    if (booked.kind !== 'BOOKED') throw new Error(`${subject.name} did not book`);

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('CANCELLED');
    if (result.kind !== 'CANCELLED') return;
    expect(result.booking.status).toBe('CANCELLED');
    expect(h.payments.refunded).toHaveLength(1);
  });

  it('keeps the audit trail of what actually went over the wire', async () => {
    const h = await harness(subject);
    const booked = await h.service.commit({
      dealId: h.dealId,
      idempotencyKey: `idem-audit-${String(subject.code)}`,
      guests: GUESTS,
    });
    if (booked.kind !== 'BOOKED') throw new Error(`${subject.name} did not book`);

    const payloads = await h.bookings.supplierPayloads(booked.booking.klarBookingId);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.supplier).toBe(subject.code);
    // The wire format lives here and only here. The booking record itself is
    // canonical, which is what lets a third supplier be added without touching
    // the bookings page.
    expect(payloads[0]?.request).toBeDefined();
  });
});
