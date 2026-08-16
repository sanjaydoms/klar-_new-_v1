import { describe, expect, it } from 'vitest';
import {
  countryCode,
  currencyCode,
  klarHotelId,
  searchId,
  supplierCode,
  supplierHotelId,
} from '../../domain/shared/brand.js';
import { fromMajor, money, toMajor } from '../../domain/shared/money.js';
import { stayDates } from '../../domain/shared/stay.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms } from '../../domain/rate/cancellation.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { supplierCost, supplierCostFromTotal } from '../../domain/pricing/supplier-cost.js';
import type { MarkupRule } from '../../domain/pricing/markup.js';
import type { Guest } from '../../domain/booking/booking.js';
import type {
  SupplierBookResult,
  SupplierBookingStatusResult,
  SupplierCancelResult,
  SupplierPrecheckResult,
  SupplierRate,
} from '../../suppliers/contract/dto.js';
import { supplierError } from '../../suppliers/contract/errors.js';
import { SupplierRegistry } from '../../suppliers/contract/registry.js';
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
import { fakeConfig, fakeSupplier } from '../testing/fake-supplier.js';
import { BookingService, type BookingRequest } from './booking-service.js';

const INR = currencyCode('INR');
const IN = countryCode('IN');
const RG = supplierCode('RG');

const RULES: MarkupRule[] = [
  { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
];

const PARTY: readonly Guest[] = [
  { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false, email: 'asha@example.com' },
  { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
];

const quotedRate: SupplierRate = {
  supplierRateRef: 'rk-original',
  room: room({ name: 'Deluxe Room' }),
  board: classifyBoard('Bed and Breakfast'),
  occupancy: occupancy([roomRequest(2, 0, [])]),
  cancellation: deriveCancellationTerms({ explicit: true }),
  cost: supplierCost({ base: fromMajor(11_500, INR), taxesIncludedInBase: true }),
  onHoldAllowed: false,
  supplierState: { allocationDetails: 'ALLOC-1', quotedTotalMajor: 11_500 },
};

const precheckAt = (netMajor: number): SupplierPrecheckResult => ({
  supplier: RG,
  available: true,
  cost: supplierCost({ base: fromMajor(netMajor, INR), taxesIncludedInBase: true }),
  room: quotedRate.room,
  board: quotedRate.board,
  cancellation: quotedRate.cancellation,
  supplierRateRef: 'rk-refreshed',
  supplierState: { allocationDetails: 'ALLOC-2' },
});

const CONFIRMED: SupplierBookResult = {
  supplier: RG,
  status: 'CONFIRMED',
  supplierBookingRef: 'RG-CONF-1',
  supplierState: { reservationId: 'RES-9', propertyId: 'P-1', propertyCode: 'HTL001' },
};

interface HarnessOptions {
  readonly precheck?: SupplierPrecheckResult;
  readonly book?: SupplierBookResult | 'throws';
  readonly cancel?: SupplierCancelResult;
  readonly status?: SupplierBookingStatusResult;
  readonly asyncBooking?: boolean;
}

async function harness(opts: HarnessOptions = {}) {
  const registry = new SupplierRegistry();
  const base = fakeSupplier({ code: 'RG' });
  const booked: unknown[] = [];

  registry.register(
    {
      ...base,
      capabilities: { ...base.capabilities, asyncBooking: opts.asyncBooking ?? false },
      precheck: () => Promise.resolve(opts.precheck ?? precheckAt(11_500)),
      book: (req) => {
        booked.push(req);
        if (opts.book === 'throws') throw new Error('adapter blew up inside book');
        return Promise.resolve(opts.book ?? CONFIRMED);
      },
      cancel: () =>
        Promise.resolve(
          opts.cancel ?? { supplier: RG, status: 'CANCELLED', supplierCancellationRef: 'CXL-1' },
        ),
      ...(opts.asyncBooking === true
        ? {
            getBookingStatus: () =>
              Promise.resolve(
                opts.status ?? { supplier: RG, status: 'CONFIRMED' as const },
              ),
          }
        : {}),
    },
    fakeConfig('RG'),
  );

  const rateTokens = new FakeRateTokenStore();
  const pricing = new PricingService(new FakeMarkupProvider(RULES));
  const clock = new FakeClock();
  const bookings = new InMemoryBookingRepository();
  const payments = new FakePaymentGateway();
  const properties = new InMemoryPropertyRepository([
    {
      klarHotelId: 'KLAR-TAJ',
      name: 'Taj Exotica Resort & Spa',
      city: 'Goa',
      address: 'Calwaddo, Benaulim',
      starRating: 5,
    },
  ]);

  const scope = { channel: 'B2C' as const, homeCountry: IN, destinationCountry: IN, nights: 3 };
  const resolved = await pricing.resolve(scope);
  const quotedPrice = pricing.priceRate(quotedRate, RG, scope, resolved);

  const issued = await rateTokens.issue({
    searchId: searchId('KLAR-SRCH-1'),
    supplier: RG,
    supplierHotelId: supplierHotelId('RG-900'),
    klarHotelId: klarHotelId('KLAR-TAJ'),
    rate: quotedRate,
    quotedPrice,
    stay: stayDates('2026-09-10', '2026-09-13'),
    occupancy: occupancy([roomRequest(2, 0, [])]),
    nationality: IN,
    scope,
    markupVersion: resolved.markupVersion,
    validForMs: 900_000,
  });

  const revalidation = new RevalidationService({
    registry,
    rateTokens,
    pricing,
    clock,
    ids: new SequentialIds(),
    logger: silentLogger,
    config: { deadlineMs: 30_000 },
  });

  const service = new BookingService({
    registry,
    revalidation,
    rateTokens,
    bookings,
    properties,
    payments,
    clock,
    ids: new SequentialIds(),
    logger: silentLogger,
    config: { deadlineMs: 60_000 },
  });

  const request = (over: Partial<BookingRequest> = {}): BookingRequest => ({
    dealId: issued.dealId,
    idempotencyKey: 'idem-1',
    guests: PARTY,
    ...over,
  });

  /** The same booking store, reached by a service whose registry is empty. */
  const withoutSupplier = () =>
    new BookingService({
      registry: new SupplierRegistry(),
      revalidation,
      rateTokens,
      bookings,
      properties,
      payments,
      clock,
      ids: new SequentialIds(),
      logger: silentLogger,
      config: { deadlineMs: 60_000 },
    });

  return {
    service,
    request,
    bookings,
    payments,
    rateTokens,
    booked,
    quotedPrice,
    registry,
    withoutSupplier,
  };
}

// ═══ Definition of done: one commit path, end to end ═══════════════════════

describe('committing a booking', () => {
  it('prechecks, charges the server’s figure, retires the deal and books', async () => {
    const h = await harness();
    const outcome = await h.service.commit(h.request());

    expect(outcome.kind).toBe('BOOKED');
    if (outcome.kind !== 'BOOKED') return;

    expect(outcome.booking.status).toBe('CONFIRMED');
    expect(outcome.booking.supplierBookingRef).toBe('RG-CONF-1');
    // 11,500 net + 12% platform markup.
    expect(toMajor(outcome.booking.deal.price.total)).toBe(12_880);
    expect(h.payments.authorized).toEqual([
      { klarBookingId: outcome.booking.klarBookingId, amountMinor: 1_288_000 },
    ]);
    // Retired, so the same deal cannot be booked again.
    expect(h.rateTokens.consumed).toHaveLength(1);
  });

  it('books against the rate reference precheck returned, not the one search issued', async () => {
    // TripJack mints its booking id at review and RateGain refreshes
    // `allocationDetails`. Reading the sealed quote before revalidating would
    // commit against a handle the supplier has already moved on from.
    const h = await harness();
    await h.service.commit(h.request());

    expect(h.booked).toHaveLength(1);
    expect(h.booked[0]).toMatchObject({
      supplierRateRef: 'rk-refreshed',
      supplierState: { allocationDetails: 'ALLOC-2' },
    });
  });

  it('carries the canonical hotel onto the booking, not the supplier’s payload', async () => {
    const h = await harness();
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'BOOKED') throw new Error('expected a booking');

    // What the voucher and the bookings list render from. The reference read
    // these out of the stored raw supplier request, so a third supplier broke
    // the page.
    expect(outcome.booking.deal.hotelName).toBe('Taj Exotica Resort & Spa');
    expect(outcome.booking.deal.room.name).toBe('Deluxe Room');
    expect(outcome.booking.deal.starRating).toBe(5);
  });

  it('keeps everything the cancel will need', async () => {
    // A-3: RateGain's cancel needs ReservationId, PropertyId and PropertyCode,
    // and only the commit response carries them.
    const h = await harness();
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'BOOKED') throw new Error('expected a booking');

    expect(outcome.booking.supplierState).toMatchObject({
      reservationId: 'RES-9',
      propertyId: 'P-1',
      propertyCode: 'HTL001',
    });
  });

  it('records the wire exchange for audit, outside the booking itself', async () => {
    const h = await harness();
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'BOOKED') throw new Error('expected a booking');

    const payloads = await h.bookings.supplierPayloads(outcome.booking.klarBookingId);
    expect(payloads.map((p) => p.operation)).toEqual(['BOOK']);
  });

  it('writes an event trail that explains how the booking got there', async () => {
    const h = await harness();
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'BOOKED') throw new Error('expected a booking');

    const events = await h.bookings.events(outcome.booking.klarBookingId);
    expect(events.map((e) => e.type)).toEqual([
      'PRECHECK_PASSED',
      'PAYMENT_HELD',
      'SUPPLIER_BOOKED',
    ]);
  });
});

describe('a commit that is retried', () => {
  /**
   * The defect this prevents is two rooms and two charges. A double-clicked
   * button, a retried submit and a client that reconnects mid-commit all arrive
   * with the same idempotency key.
   */
  it('answers with the booking it already made, and does not charge again', async () => {
    const h = await harness();
    const first = await h.service.commit(h.request());
    const second = await h.service.commit(h.request());

    if (first.kind !== 'BOOKED' || second.kind !== 'BOOKED') throw new Error('expected bookings');
    expect(second.booking.klarBookingId).toBe(first.booking.klarBookingId);
    expect(second.replayed).toBe(true);
    expect(h.payments.authorized).toHaveLength(1);
    expect(h.booked).toHaveLength(1);
  });

  it('refuses a later commit of a deal that has already been booked', async () => {
    const h = await harness();
    await h.service.commit(h.request());
    const second = await h.service.commit(h.request({ idempotencyKey: 'idem-2' }));

    // The deal was retired by the first commit, so revalidation cannot resolve
    // it at all — refused before anything is charged.
    expect(second.kind).toBe('REFUSED');
    if (second.kind === 'REFUSED') expect(second.reason).toBe('DEAL_NOT_FOUND');
    expect(h.booked).toHaveLength(1);
    expect(h.payments.authorized).toHaveLength(1);
  });

  /**
   * The race the idempotency key cannot see: two commits for the same rate
   * under DIFFERENT keys, both past revalidation before either has retired the
   * deal. Both create a booking row and both charge; retiring the token is what
   * stops the second one reaching the supplier, and its money goes back.
   */
  it('lets only one of two simultaneous commits reach the supplier', async () => {
    const h = await harness();
    const [first, second] = await Promise.all([
      h.service.commit(h.request()),
      h.service.commit(h.request({ idempotencyKey: 'idem-2' })),
    ]);

    const kinds = [first.kind, second.kind].sort();
    expect(kinds).toEqual(['BOOKED', 'REJECTED']);

    const loser = first.kind === 'REJECTED' ? first : second;
    if (loser.kind === 'REJECTED') expect(loser.reason).toBe('DEAL_ALREADY_BOOKED');

    // One room bought, and the loser's customer made whole.
    expect(h.booked).toHaveLength(1);
    expect(h.payments.authorized).toHaveLength(2);
    expect(h.payments.refunded).toHaveLength(1);
  });
});

// ═══ The consent round-trip — Phase 7's other half ═════════════════════════

describe('a price that moved between the review page and the commit', () => {
  it('refuses to charge more than was agreed, and says what it would cost', async () => {
    const h = await harness({ precheck: precheckAt(13_000) });
    const outcome = await h.service.commit(h.request());

    expect(outcome.kind).toBe('CONSENT_REQUIRED');
    if (outcome.kind !== 'CONSENT_REQUIRED') return;
    expect(toMajor(outcome.report.chargeable!.total)).toBe(14_560);
    // Nothing was charged and nothing was booked.
    expect(h.payments.authorized).toHaveLength(0);
    expect(h.booked).toHaveLength(0);
  });

  it('books once the customer has accepted the new figure', async () => {
    const h = await harness({ precheck: precheckAt(13_000) });
    const outcome = await h.service.commit(
      h.request({
        consent: { acceptedTotal: money(1_456_000, INR), acceptedAt: new Date(0) },
      }),
    );

    expect(outcome.kind).toBe('BOOKED');
    if (outcome.kind !== 'BOOKED') return;
    expect(h.payments.authorized[0]?.amountMinor).toBe(1_456_000);
  });

  it('asks again when the price moved further than the customer accepted', async () => {
    const h = await harness({ precheck: precheckAt(14_000) });
    const outcome = await h.service.commit(
      h.request({
        consent: { acceptedTotal: money(1_456_000, INR), acceptedAt: new Date(0) },
      }),
    );

    expect(outcome.kind).toBe('CONSENT_REQUIRED');
    expect(h.payments.authorized).toHaveLength(0);
  });

  it('passes a price drop on without asking anyone', async () => {
    const h = await harness({ precheck: precheckAt(11_000) });
    const outcome = await h.service.commit(h.request());

    expect(outcome.kind).toBe('BOOKED');
    // 11,000 + 12%.
    expect(h.payments.authorized[0]?.amountMinor).toBe(1_232_000);
  });

  it('refuses a substituted room outright, consent or not', async () => {
    const h = await harness({
      precheck: { ...precheckAt(11_500), room: room({ name: 'Garden View Room' }) },
    });
    const outcome = await h.service.commit(
      h.request({
        consent: { acceptedTotal: money(9_999_999, INR), acceptedAt: new Date(0) },
      }),
    );

    expect(outcome.kind).toBe('REFUSED');
    if (outcome.kind === 'REFUSED') expect(outcome.reason).toBe('ROOM_CHANGED');
    expect(h.payments.authorized).toHaveLength(0);
  });

  it('refuses a sold-out room', async () => {
    const h = await harness({ precheck: { supplier: RG, available: false } });
    const outcome = await h.service.commit(h.request());

    expect(outcome.kind).toBe('REFUSED');
    if (outcome.kind === 'REFUSED') expect(outcome.reason).toBe('SOLD_OUT');
  });
});

// ═══ What happens when things go wrong ═════════════════════════════════════

describe('a party that does not match what was priced', () => {
  it('is refused before any money moves', async () => {
    const h = await harness();
    const outcome = await h.service.commit(
      h.request({ guests: [PARTY[0] as Guest] }), // two adults were priced
    );

    expect(outcome.kind).toBe('REJECTED');
    if (outcome.kind === 'REJECTED') expect(outcome.reason).toBe('INVALID_PARTY');
    expect(h.payments.authorized).toHaveLength(0);
    // And the deal is still bookable: nothing was spent on a request we refused.
    expect(h.rateTokens.consumed).toHaveLength(0);
  });
});

describe('a payment that is declined', () => {
  it('leaves a failed booking and never reaches the supplier', async () => {
    const h = await harness();
    h.payments.declineNext = true;

    const outcome = await h.service.commit(h.request());
    expect(outcome.kind).toBe('REJECTED');
    if (outcome.kind === 'REJECTED') expect(outcome.reason).toBe('PAYMENT_DECLINED');
    expect(h.booked).toHaveLength(0);

    const booking = await h.bookings.findByIdempotencyKey('idem-1');
    expect(booking?.status).toBe('FAILED');
    // The deal was not retired: nothing was sold, and the customer may pay again.
    expect(h.rateTokens.consumed).toHaveLength(0);
  });
});

describe('a supplier that refuses the booking', () => {
  it('fails the booking and returns the money', async () => {
    const h = await harness({
      book: {
        supplier: RG,
        status: 'FAILED',
        error: supplierError('SUPPLIER_BAD_REQUEST', 'rate no longer sellable'),
      },
    });

    const outcome = await h.service.commit(h.request());
    expect(outcome.kind).toBe('FAILED');
    if (outcome.kind !== 'FAILED') return;

    expect(outcome.booking.status).toBe('FAILED');
    expect(h.payments.refunded).toEqual([
      { klarBookingId: outcome.booking.klarBookingId, amountMinor: 1_288_000 },
    ]);

    const stored = await h.bookings.findById(outcome.booking.klarBookingId);
    expect(stored?.refund?.status).toBe('COMPLETED');
  });

  /**
   * The audit's central finding, at the level above the adapter. A supplier
   * that did not answer has not refused: it may be holding the room. Refunding
   * on an unknown outcome leaves KLAR paying for a booking it told the customer
   * did not happen.
   */
  it('does NOT refund a supplier that never answered', async () => {
    const h = await harness({
      book: {
        supplier: RG,
        status: 'PENDING',
        supplierBookingRef: 'RG-MAYBE-1',
        error: supplierError('SUPPLIER_TIMEOUT', 'no answer inside the budget'),
      },
    });

    const outcome = await h.service.commit(h.request());
    expect(outcome.kind).toBe('PENDING');
    if (outcome.kind !== 'PENDING') return;

    expect(outcome.booking.status).toBe('SUPPLIER_PENDING');
    expect(h.payments.refunded).toEqual([]);
  });

  it('treats an adapter that threw as unknown, not as failed', async () => {
    const h = await harness({ book: 'throws' });
    const outcome = await h.service.commit(h.request());

    expect(outcome.kind).toBe('PENDING');
    expect(h.payments.refunded).toEqual([]);
  });
});

// ═══ Settling a booking the supplier left pending ══════════════════════════

describe('confirming a pending booking', () => {
  const pending: SupplierBookResult = {
    supplier: RG,
    status: 'PENDING',
    supplierBookingRef: 'RG-PENDING-1',
    poll: { intervalMs: 5_000, maxWaitMs: 180_000 },
  };

  it('asks the supplier and settles it', async () => {
    const h = await harness({ book: pending, asyncBooking: true });
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'PENDING') throw new Error('expected a pending booking');

    const settled = await h.service.confirm(outcome.booking.klarBookingId);
    expect(settled?.status).toBe('CONFIRMED');
  });

  it('refunds when the supplier says it never completed', async () => {
    const h = await harness({
      book: pending,
      asyncBooking: true,
      status: { supplier: RG, status: 'FAILED' },
    });
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'PENDING') throw new Error('expected a pending booking');

    const settled = await h.service.confirm(outcome.booking.klarBookingId);
    expect(settled?.status).toBe('FAILED');
    expect(h.payments.refunded).toHaveLength(1);
  });

  /**
   * Guessing either way costs money: confirmed sells a room that may not exist,
   * failed refunds one that does.
   */
  it('sends a booking it cannot poll to a human', async () => {
    const h = await harness({ book: pending, asyncBooking: false });
    const outcome = await h.service.commit(h.request());
    if (outcome.kind !== 'PENDING') throw new Error('expected a pending booking');

    const settled = await h.service.confirm(outcome.booking.klarBookingId);
    expect(settled?.status).toBe('MANUAL_REVIEW');
    expect(h.payments.refunded).toEqual([]);
  });
});

// ═══ Cancelling ════════════════════════════════════════════════════════════

describe('cancelling a booking', () => {
  it('cancels with the supplier, using the state only the commit knew', async () => {
    const h = await harness();
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('CANCELLED');
    if (result.kind !== 'CANCELLED') return;

    expect(result.booking.status).toBe('CANCELLED');
    expect(toMajor(result.refunded!)).toBe(12_880);
    expect(h.payments.refunded).toHaveLength(1);
  });

  it('deducts a supplier penalty from what is returned', async () => {
    const h = await harness({
      cancel: {
        supplier: RG,
        status: 'CANCELLED',
        penalty: supplierCostFromTotal({
          total: fromMajor(2_000, INR),
          taxesIncludedInBase: true,
        }),
      },
    });
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    if (result.kind !== 'CANCELLED') throw new Error('expected a cancellation');
    expect(toMajor(result.refunded!)).toBe(10_880);
  });

  /**
   * An FX rate picked at refund time is a rate nobody quoted. Deducting a
   * converted penalty would return an amount that reconciles against neither
   * the charge nor the invoice.
   */
  it('sends a penalty in another currency to a human rather than converting it', async () => {
    const h = await harness({
      cancel: {
        supplier: RG,
        status: 'CANCELLED',
        penalty: supplierCostFromTotal({
          total: fromMajor(25, currencyCode('USD')),
          taxesIncludedInBase: true,
        }),
      },
    });
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    if (result.kind !== 'CANCELLED') throw new Error('expected a cancellation');
    expect(result.refunded).toBeNull();
    expect(h.payments.refunded).toEqual([]);

    const events = await h.bookings.events(booked.booking.klarBookingId);
    expect(events.map((e) => e.type)).toContain('REFUND_NEEDS_REVIEW');
  });

  it('puts the booking back when the supplier refuses to cancel it', async () => {
    const h = await harness({
      cancel: {
        supplier: RG,
        status: 'REJECTED',
        error: supplierError('SUPPLIER_BAD_REQUEST', 'past the cancellation deadline'),
      },
    });
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('REJECTED');
    if (result.kind !== 'REJECTED') return;
    // The customer still has their stay, and still has their money paid for it.
    expect(result.booking.status).toBe('CONFIRMED');
    expect(h.payments.refunded).toEqual([]);
  });

  /**
   * A cancel whose outcome is unknown may well have gone through. Reporting it
   * as rejected leaves the customer expecting a stay that no longer exists.
   */
  it('holds a cancellation the supplier has not settled', async () => {
    const h = await harness({ cancel: { supplier: RG, status: 'PENDING' } });
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('PENDING');
    if (result.kind !== 'PENDING') return;
    expect(result.booking.status).toBe('CANCELLATION_PENDING');
    expect(h.payments.refunded).toEqual([]);
  });

  /**
   * A refused cancellation puts the booking back where it was. Hardcoding
   * CONFIRMED laundered an unsettled booking into a terminal confirmed one —
   * and CONFIRMED is terminal for the poller, so nothing would have settled it.
   */
  it('restores the status the booking actually had when a cancellation is refused', async () => {
    const h = await harness({
      book: { supplier: RG, status: 'ON_HOLD', supplierBookingRef: 'RG-HOLD-1' },
      cancel: {
        supplier: RG,
        status: 'REJECTED',
        error: supplierError('SUPPLIER_BAD_REQUEST', 'past the deadline'),
      },
    });
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a held booking');
    expect(booked.booking.status).toBe('ON_HOLD');

    const result = await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('REJECTED');
    if (result.kind !== 'REJECTED') return;
    expect(result.booking.status).toBe('ON_HOLD');
  });

  /**
   * Nothing was sent, so nothing was refused. Reporting a refusal told the
   * customer the supplier had declined, and left the booking stranded in
   * CANCELLATION_PENDING where no path settles it.
   */
  it('does not report a cancellation it never attempted as a refusal', async () => {
    const h = await harness();
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    // The supplier is gone by the time the customer asks to cancel — its
    // credentials were pulled, so the composition root no longer registers it.
    const result = await h.withoutSupplier().cancel(booked.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('UNAVAILABLE');
    if (result.kind !== 'UNAVAILABLE') return;
    // And the stay is still theirs, not stuck mid-cancellation.
    expect(result.booking.status).toBe('CONFIRMED');
  });

  it('will not cancel a booking that already failed', async () => {
    const h = await harness({
      book: { supplier: RG, status: 'FAILED', error: supplierError('SUPPLIER_BAD_REQUEST', 'no') },
    });
    const failed = await h.service.commit(h.request());
    if (failed.kind !== 'FAILED') throw new Error('expected a failure');

    const result = await h.service.cancel(failed.booking.klarBookingId, 'changed plans');
    expect(result.kind).toBe('NOT_CANCELLABLE');
  });

  it('refunds a cancellation exactly once', async () => {
    // The in-request path, the poller and the reconciliation worker all reach
    // the same booking.
    const h = await harness();
    const booked = await h.service.commit(h.request());
    if (booked.kind !== 'BOOKED') throw new Error('expected a booking');

    await h.service.cancel(booked.booking.klarBookingId, 'changed plans');
    await h.service.cancel(booked.booking.klarBookingId, 'changed plans');

    expect(h.payments.refunded).toHaveLength(1);
  });
});
