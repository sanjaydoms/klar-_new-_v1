import { describe, expect, it } from 'vitest';
import { klarBookingId } from '../../domain/shared/brand.js';
import type { Booking } from '../../domain/booking/booking.js';
import { bookingFixture } from '../testing/booking-repository-suite.js';
import { InMemoryBookingRepository, silentLogger } from '../testing/fakes.js';
import { BookingReconciler, type Confirmer } from './reconciler.js';

function fakeConfirmer(
  outcomes: Record<string, Booking | null | Error>,
): Confirmer & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    confirm: (id) => {
      calls.push(String(id));
      const outcome = outcomes[String(id)];
      if (outcome instanceof Error) return Promise.reject(outcome);
      return Promise.resolve(outcome ?? null);
    },
  };
}

describe('BookingReconciler', () => {
  it('calls confirm() on every unsettled booking and counts a status change as settled', async () => {
    const repo = new InMemoryBookingRepository();
    const id = klarBookingId('KLAR-BKG-0001');
    await repo.create(bookingFixture({ klarBookingId: id, status: 'SUPPLIER_PENDING' }));
    await repo.advance({ id, to: 'SUPPLIER_PENDING', expect: ['SUPPLIER_PENDING'], at: new Date() });

    const confirmer = fakeConfirmer({
      [String(id)]: { ...bookingFixture({ klarBookingId: id }), status: 'CONFIRMED' },
    });
    const reconciler = new BookingReconciler(repo, confirmer, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      concurrency: 3,
    });

    const result = await reconciler.runOnce();

    expect(confirmer.calls).toEqual([String(id)]);
    expect(result).toEqual({ checked: 1, settled: 1, failed: 0 });
  });

  it('does not count a no-op confirm (status unchanged) as settled', async () => {
    const repo = new InMemoryBookingRepository();
    const id = klarBookingId('KLAR-BKG-0001');
    await repo.create(bookingFixture({ klarBookingId: id, status: 'MANUAL_REVIEW' }));
    await repo.advance({ id, to: 'MANUAL_REVIEW', expect: ['MANUAL_REVIEW'], at: new Date() });

    // confirm() only acts on SUPPLIER_PENDING; MANUAL_REVIEW is returned unchanged.
    const confirmer = fakeConfirmer({
      [String(id)]: { ...bookingFixture({ klarBookingId: id }), status: 'MANUAL_REVIEW' },
    });
    const reconciler = new BookingReconciler(repo, confirmer, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      concurrency: 3,
    });

    const result = await reconciler.runOnce();
    expect(result).toEqual({ checked: 1, settled: 0, failed: 0 });
  });

  it('isolates one failing confirm from the rest of the pass', async () => {
    const repo = new InMemoryBookingRepository();
    const good = klarBookingId('KLAR-BKG-0001');
    const bad = klarBookingId('KLAR-BKG-0002');
    await repo.create(bookingFixture({ klarBookingId: good, status: 'SUPPLIER_PENDING' }));
    await repo.advance({ id: good, to: 'SUPPLIER_PENDING', expect: ['SUPPLIER_PENDING'], at: new Date() });
    await repo.create(
      bookingFixture({
        klarBookingId: bad,
        publicToken: 'tok-0002',
        idempotencyKey: 'idem-0002',
        status: 'SUPPLIER_PENDING',
      }),
    );
    await repo.advance({ id: bad, to: 'SUPPLIER_PENDING', expect: ['SUPPLIER_PENDING'], at: new Date() });

    const confirmer = fakeConfirmer({
      [String(good)]: { ...bookingFixture({ klarBookingId: good }), status: 'CONFIRMED' },
      [String(bad)]: new Error('supplier unreachable'),
    });
    const reconciler = new BookingReconciler(repo, confirmer, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      concurrency: 3,
    });

    const result = await reconciler.runOnce();
    expect(result).toEqual({ checked: 2, settled: 1, failed: 1 });
  });

  it('skips a tick that starts while the previous pass is still running', async () => {
    const repo = new InMemoryBookingRepository();
    let inFlight = 0;
    let maxInFlight = 0;
    const confirmer: Confirmer = {
      confirm: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 10));
        inFlight -= 1;
        return null;
      },
    };
    const id = klarBookingId('KLAR-BKG-0001');
    await repo.create(bookingFixture({ klarBookingId: id, status: 'SUPPLIER_PENDING' }));
    await repo.advance({ id, to: 'SUPPLIER_PENDING', expect: ['SUPPLIER_PENDING'], at: new Date() });

    const reconciler = new BookingReconciler(repo, confirmer, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      concurrency: 1,
    });

    const first = reconciler.runOnce();
    const second = await reconciler.runOnce();
    await first;

    expect(second).toEqual({ checked: 0, settled: 0, failed: 0 });
    expect(maxInFlight).toBe(1);
  });

  it('start() is idempotent and stop() is safe before start()', () => {
    const repo = new InMemoryBookingRepository();
    const reconciler = new BookingReconciler(repo, { confirm: () => Promise.resolve(null) }, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      concurrency: 1,
    });

    expect(() => {
      reconciler.start();
      reconciler.start();
      reconciler.stop();
      reconciler.stop();
    }).not.toThrow();
  });
});
