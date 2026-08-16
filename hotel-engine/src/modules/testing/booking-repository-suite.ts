import { beforeEach, describe, expect, it } from 'vitest';
import {
  currencyCode,
  dealId,
  klarBookingId,
  klarHotelId,
  supplierCode,
  supplierHotelId,
} from '../../domain/shared/brand.js';
import { money } from '../../domain/shared/money.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { room } from '../../domain/rate/room.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { deriveCancellationTerms } from '../../domain/rate/cancellation.js';
import { supplierCostFromTotal } from '../../domain/pricing/supplier-cost.js';
import { priceFromCost } from '../../domain/pricing/customer-price.js';
import type { Booking } from '../../domain/booking/booking.js';
import type { BookingRepository } from '../ports.js';

/**
 * What any BookingRepository must do, whichever store backs it.
 *
 * Run against the in-memory fake and against PostgreSQL, for the reason the
 * property-repository suite exists: four separate defects in this codebase were
 * hidden by a fake that accepted something the real store refuses (§1.3, B-3,
 * C-8, D-1's revert check). Everything here is a refusal or a race, because
 * those are exactly the behaviours a permissive fake quietly certifies as
 * correct — and on this table the cost of being wrong is a second reservation
 * or a second refund.
 */
const TJ = supplierCode('TJ');
const INR = currencyCode('INR');
const rs = (rupees: number) => money(Math.round(rupees * 100), INR);
const AT = new Date('2026-08-14T09:00:00Z');

export const bookingFixture = (over: Partial<Booking> = {}): Booking => {
  const cost = supplierCostFromTotal({ total: rs(10_000), taxesIncludedInBase: true });
  return {
    klarBookingId: klarBookingId('KLAR-BKG-0001'),
    publicToken: 'tok-0001',
    idempotencyKey: 'idem-0001',
    supplier: TJ,
    status: 'PRECHECK_PASSED',
    stay: stayDates('2026-09-10', '2026-09-13'),
    deal: {
      dealId: dealId('DEAL-1'),
      supplier: TJ,
      supplierHotelId: supplierHotelId('100000001234'),
      klarHotelId: klarHotelId('KLAR-1111'),
      hotelName: 'Taj Exotica Resort & Spa',
      hotelAddress: 'Calwaddo, Benaulim, Goa',
      room: room({ name: 'Deluxe Room' }),
      board: classifyBoard('Breakfast'),
      occupancy: occupancy([roomRequest(2, 0, [])]),
      cancellation: deriveCancellationTerms({ explicit: true }),
      cost,
      price: priceFromCost(cost, {
        region: 'ALL',
        channel: 'B2C',
        rules: [],
        nights: 3,
        supplier: TJ,
      }),
      quotedAt: AT,
    },
    guests: [
      { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false, email: 'a@example.com' },
      { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
    ],
    channel: 'B2C',
    createdAt: AT,
    updatedAt: AT,
    ...over,
  };
};

export interface BookingRepositorySubject {
  readonly name: string;
  /** A clean repository. Called before every test. */
  readonly create: () => Promise<BookingRepository> | BookingRepository;
}

export function runBookingRepositorySuite(subject: BookingRepositorySubject): void {
  describe(`BookingRepository contract — ${subject.name}`, () => {
    let repo: BookingRepository;

    beforeEach(async () => {
      repo = await subject.create();
    });

    describe('creating and finding', () => {
      it('round-trips a booking with its canonical snapshot intact', async () => {
        const created = await repo.create(bookingFixture());
        expect(created.created).toBe(true);

        const found = await repo.findById(klarBookingId('KLAR-BKG-0001'));
        expect(found).not.toBeNull();
        // The snapshot is what the voucher and the bookings list render from, so
        // it has to survive the round trip whole — not as a supplier payload the
        // UI then has to interpret.
        expect(found?.deal.hotelName).toBe('Taj Exotica Resort & Spa');
        expect(found?.deal.room.name).toBe('Deluxe Room');
        expect(found?.deal.board.code).toBe(classifyBoard('Breakfast').code);
        expect(found?.deal.price.total.minor).toBe(1_000_000);
        expect(found?.deal.cost.total.minor).toBe(1_000_000);
        expect(found?.guests).toHaveLength(2);
        expect(found?.stay.nights).toBe(3);
        expect(found?.status).toBe('PRECHECK_PASSED');
      });

      it('finds a booking by its public token, for a guest with no account', async () => {
        await repo.create(bookingFixture());
        const found = await repo.findByPublicToken('tok-0001');
        expect(found?.klarBookingId).toBe('KLAR-BKG-0001');
      });

      it('does not answer with someone else’s booking for an unknown token', async () => {
        await repo.create(bookingFixture());
        expect(await repo.findByPublicToken('tok-guess')).toBeNull();
        expect(await repo.findById(klarBookingId('KLAR-BKG-9999'))).toBeNull();
      });

      /**
       * The defect this exists to prevent is two rooms and two charges. A
       * double-clicked button, a retried submit and a client that reconnects
       * mid-commit all arrive with the same key.
       */
      it('refuses a second booking under the same idempotency key', async () => {
        await repo.create(bookingFixture());

        const again = await repo.create(
          bookingFixture({
            klarBookingId: klarBookingId('KLAR-BKG-0002'),
            publicToken: 'tok-0002',
          }),
        );

        expect(again.created).toBe(false);
        if (!again.created) {
          expect(again.reason).toBe('DUPLICATE');
          // And it hands back the booking that already exists, so a retry can
          // answer with the original rather than with an error.
          expect(again.existing.klarBookingId).toBe('KLAR-BKG-0001');
        }
        expect(await repo.findById(klarBookingId('KLAR-BKG-0002'))).toBeNull();
      });

      it('finds a booking by the idempotency key it was created with', async () => {
        await repo.create(bookingFixture());
        const found = await repo.findByIdempotencyKey('idem-0001');
        expect(found?.klarBookingId).toBe('KLAR-BKG-0001');
      });

      it('lists a user’s bookings, newest first', async () => {
        await repo.create(bookingFixture({ userId: 'user-1' }));
        await repo.create(
          bookingFixture({
            klarBookingId: klarBookingId('KLAR-BKG-0002'),
            publicToken: 'tok-0002',
            idempotencyKey: 'idem-0002',
            userId: 'user-1',
            createdAt: new Date('2026-08-14T11:00:00Z'),
          }),
        );
        await repo.create(
          bookingFixture({
            klarBookingId: klarBookingId('KLAR-BKG-0003'),
            publicToken: 'tok-0003',
            idempotencyKey: 'idem-0003',
            userId: 'someone-else',
          }),
        );

        const mine = await repo.findByUser('user-1', 10);
        expect(mine.map((b) => String(b.klarBookingId))).toEqual([
          'KLAR-BKG-0002',
          'KLAR-BKG-0001',
        ]);
      });
    });

    describe('findUnsettled — the reconciliation worker’s query', () => {
      /**
       * `create()` always sets `updated_at` to `created_at` (there is no
       * "created already stale" case a real booking goes through), so
       * ordering by `updated_at` has to be produced the way production
       * produces it: create, then `advance` — the same write `confirm`/
       * `cancel` use — with an explicit `at`.
       */
      async function createUnsettled(
        n: number,
        status: 'SUPPLIER_PENDING' | 'CANCELLATION_PENDING' | 'MANUAL_REVIEW' | 'PAYMENT_HELD',
        updatedAt: Date,
      ): Promise<void> {
        const id = klarBookingId(`KLAR-BKG-000${n}`);
        await repo.create(
          bookingFixture({
            klarBookingId: id,
            publicToken: `tok-000${n}`,
            idempotencyKey: `idem-000${n}`,
            status,
          }),
        );
        await repo.advance({ id, to: status, expect: [status], at: updatedAt });
      }

      it('returns SUPPLIER_PENDING, CANCELLATION_PENDING, MANUAL_REVIEW and PAYMENT_HELD, oldest first', async () => {
        await repo.create(bookingFixture({ status: 'CONFIRMED' }));
        await createUnsettled(2, 'SUPPLIER_PENDING', new Date('2026-08-14T12:00:00Z'));
        await createUnsettled(3, 'MANUAL_REVIEW', new Date('2026-08-14T10:00:00Z'));
        await createUnsettled(4, 'CANCELLATION_PENDING', new Date('2026-08-14T11:00:00Z'));

        const unsettled = await repo.findUnsettled(10);

        // The settled CONFIRMED booking is absent; the rest are oldest first.
        expect(unsettled.map((b) => String(b.klarBookingId))).toEqual([
          'KLAR-BKG-0003',
          'KLAR-BKG-0004',
          'KLAR-BKG-0002',
        ]);
      });

      it('respects the limit', async () => {
        await createUnsettled(1, 'SUPPLIER_PENDING', new Date('2026-08-14T09:00:00Z'));
        await createUnsettled(2, 'SUPPLIER_PENDING', new Date('2026-08-14T10:00:00Z'));

        const unsettled = await repo.findUnsettled(1);
        expect(unsettled).toHaveLength(1);
      });
    });

    describe('advancing a booking', () => {
      it('moves it on and records what the supplier gave back', async () => {
        await repo.create(bookingFixture({ status: 'PAYMENT_HELD' }));

        const moved = await repo.advance({
          id: klarBookingId('KLAR-BKG-0001'),
          to: 'CONFIRMED',
          expect: ['PAYMENT_HELD', 'SUPPLIER_PENDING'],
          patch: {
            supplierBookingRef: 'TJ-BOOK-556677',
            hotelConfirmationNumber: 'PMS-42',
            // A confirmation number alone cannot cancel a RateGain booking (A-3).
            supplierState: { reservationId: 'RES-9', propertyId: 'P-1' },
          },
          at: new Date('2026-08-14T09:05:00Z'),
        });

        expect(moved?.status).toBe('CONFIRMED');
        expect(moved?.supplierBookingRef).toBe('TJ-BOOK-556677');
        expect(moved?.hotelConfirmationNumber).toBe('PMS-42');
        expect(moved?.supplierState).toMatchObject({ reservationId: 'RES-9', propertyId: 'P-1' });
        expect((await repo.findById(klarBookingId('KLAR-BKG-0001')))?.status).toBe('CONFIRMED');
      });

      /**
       * The race the store has to settle, not the caller.
       *
       * The in-request path, the status poller and the reconciliation worker all
       * read a booking and then write it. Checking the current status in
       * application code is a read followed by a write with nothing between
       * them — B-3's shape exactly — so the check belongs in the same statement
       * as the write.
       */
      it('refuses a write from a status the booking is no longer in', async () => {
        await repo.create(bookingFixture({ status: 'PAYMENT_HELD' }));
        const id = klarBookingId('KLAR-BKG-0001');

        const first = await repo.advance({
          id,
          to: 'CONFIRMED',
          expect: ['PAYMENT_HELD'],
          at: AT,
        });
        expect(first?.status).toBe('CONFIRMED');

        // The loser of the race. Its answer is "someone else got there first",
        // not an exception and not a silent overwrite.
        const second = await repo.advance({
          id,
          to: 'FAILED',
          expect: ['PAYMENT_HELD'],
          at: AT,
        });
        expect(second).toBeNull();
        expect((await repo.findById(id))?.status).toBe('CONFIRMED');
      });

      it('reports an unknown booking as not advanced rather than throwing', async () => {
        const moved = await repo.advance({
          id: klarBookingId('KLAR-BKG-NOPE'),
          to: 'CONFIRMED',
          expect: ['PAYMENT_HELD'],
          at: AT,
        });
        expect(moved).toBeNull();
      });
    });

    describe('refunds', () => {
      const claim = {
        kind: 'FAILED_BOOKING' as const,
        status: 'PROCESSING' as const,
        method: 'GATEWAY' as const,
        amount: rs(10_000),
        referenceId: 'KLAR-BKG-0001',
        attemptedAt: AT,
      };

      /**
       * Only one caller may move money.
       *
       * `claimRefund` in the domain decides whether a refund is OWED; this
       * decides who pays it. Both are needed, because all three refund paths can
       * pass the domain check at the same instant — and a fake that let the
       * second claim through would certify a double refund as correct.
       */
      it('lets exactly one caller claim a refund', async () => {
        await repo.create(bookingFixture({ status: 'FAILED' }));
        const id = klarBookingId('KLAR-BKG-0001');

        expect(await repo.claimRefund(id, claim)).toBe(true);
        expect(await repo.claimRefund(id, claim)).toBe(false);

        const after = await repo.findById(id);
        expect(after?.refund?.status).toBe('PROCESSING');
        expect(after?.refund?.amount.minor).toBe(1_000_000);
      });

      it('lets a refund that failed be claimed again', async () => {
        // A refund that could not be paid still has to be paid.
        await repo.create(bookingFixture({ status: 'FAILED' }));
        const id = klarBookingId('KLAR-BKG-0001');

        expect(await repo.claimRefund(id, claim)).toBe(true);
        await repo.settleRefund(id, { ...claim, status: 'FAILED', error: 'gateway timeout' });

        expect(await repo.claimRefund(id, claim)).toBe(true);
      });

      it('will not re-claim a refund that completed', async () => {
        await repo.create(bookingFixture({ status: 'FAILED' }));
        const id = klarBookingId('KLAR-BKG-0001');

        expect(await repo.claimRefund(id, claim)).toBe(true);
        await repo.settleRefund(id, {
          ...claim,
          status: 'COMPLETED',
          providerRefundId: 'rfnd_1',
          completedAt: new Date('2026-08-14T09:10:00Z'),
        });

        expect(await repo.claimRefund(id, claim)).toBe(false);
        const after = await repo.findById(id);
        expect(after?.refund?.status).toBe('COMPLETED');
        expect(after?.refund?.providerRefundId).toBe('rfnd_1');
      });

      it('does not claim a refund on a booking that does not exist', async () => {
        expect(await repo.claimRefund(klarBookingId('KLAR-BKG-NOPE'), claim)).toBe(false);
      });
    });

    describe('the audit trail', () => {
      it('keeps supplier payloads out of the booking and available to operations', async () => {
        await repo.create(bookingFixture());
        const id = klarBookingId('KLAR-BKG-0001');

        await repo.recordSupplierPayload({
          klarBookingId: id,
          supplier: TJ,
          operation: 'BOOK',
          request: { bookingId: 'BK-1' },
          response: { order: { status: 'SUCCESS' } },
          recordedAt: AT,
        });

        const payloads = await repo.supplierPayloads(id);
        expect(payloads).toHaveLength(1);
        expect(payloads[0]?.operation).toBe('BOOK');
        expect(payloads[0]?.response).toMatchObject({ order: { status: 'SUCCESS' } });

        // And nothing a customer surface reads carries the wire format: the
        // booking itself is canonical.
        const booking = await repo.findById(id);
        expect(JSON.stringify(booking)).not.toContain('bookingId');
      });

      it('purges only payloads recorded before the cutoff, and reports how many', async () => {
        await repo.create(bookingFixture());
        const id = klarBookingId('KLAR-BKG-0001');

        await repo.recordSupplierPayload({
          klarBookingId: id,
          supplier: TJ,
          operation: 'BOOK',
          request: {},
          response: {},
          recordedAt: new Date('2026-01-01T00:00:00Z'),
        });
        await repo.recordSupplierPayload({
          klarBookingId: id,
          supplier: TJ,
          operation: 'STATUS',
          request: {},
          response: {},
          recordedAt: new Date('2026-06-01T00:00:00Z'),
        });

        const purged = await repo.purgeSupplierPayloadsBefore(new Date('2026-03-01T00:00:00Z'));
        expect(purged).toBe(1);

        const remaining = await repo.supplierPayloads(id);
        expect(remaining).toHaveLength(1);
        expect(remaining[0]?.operation).toBe('STATUS');
      });

      it('appends events in order and never rewrites one', async () => {
        await repo.create(bookingFixture());
        const id = klarBookingId('KLAR-BKG-0001');

        await repo.appendEvent({
          klarBookingId: id,
          type: 'PRECHECK_PASSED',
          status: 'PRECHECK_PASSED',
          occurredAt: AT,
        });
        await repo.appendEvent({
          klarBookingId: id,
          type: 'SUPPLIER_BOOKED',
          status: 'CONFIRMED',
          detail: { supplierBookingRef: 'TJ-1' },
          occurredAt: new Date('2026-08-14T09:05:00Z'),
        });
        await repo.appendEvent({
          klarBookingId: id,
          type: 'SUPPLIER_BOOKED',
          status: 'CONFIRMED',
          occurredAt: new Date('2026-08-14T09:05:00Z'),
        });

        const events = await repo.events(id);
        // Three rows, including the two that look alike: this is a log, and a
        // log that deduplicates has lost the thing it was keeping.
        expect(events).toHaveLength(3);
        expect(events.map((e) => e.type)).toEqual([
          'PRECHECK_PASSED',
          'SUPPLIER_BOOKED',
          'SUPPLIER_BOOKED',
        ]);
        expect(events[1]?.detail).toMatchObject({ supplierBookingRef: 'TJ-1' });
      });
    });
  });
}
