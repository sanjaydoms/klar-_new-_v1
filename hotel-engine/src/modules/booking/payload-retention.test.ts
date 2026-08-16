import { describe, expect, it } from 'vitest';
import { klarBookingId, supplierCode } from '../../domain/shared/brand.js';
import { InMemoryBookingRepository, FakeClock, silentLogger } from '../testing/fakes.js';
import { bookingFixture } from '../testing/booking-repository-suite.js';
import { PayloadRetentionJob } from './payload-retention.js';

const TJ = supplierCode('TJ');

describe('PayloadRetentionJob', () => {
  it('purges payloads older than the configured window and reports the count', async () => {
    const repo = new InMemoryBookingRepository();
    const clock = new FakeClock(new Date('2026-08-14T00:00:00Z').getTime());
    const id = klarBookingId('KLAR-BKG-0001');
    await repo.create(bookingFixture({ klarBookingId: id }));

    await repo.recordSupplierPayload({
      klarBookingId: id,
      supplier: TJ,
      operation: 'BOOK',
      request: {},
      response: {},
      recordedAt: new Date('2026-05-01T00:00:00Z'), // > 30 days old
    });
    await repo.recordSupplierPayload({
      klarBookingId: id,
      supplier: TJ,
      operation: 'STATUS',
      request: {},
      response: {},
      recordedAt: new Date('2026-08-10T00:00:00Z'), // within 30 days
    });

    const job = new PayloadRetentionJob(repo, clock, silentLogger, {
      retentionMs: 30 * 24 * 60 * 60 * 1000,
      intervalMs: 60_000,
    });

    const result = await job.runOnce();

    expect(result).toEqual({ purged: 1 });
    const remaining = await repo.supplierPayloads(id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.operation).toBe('STATUS');
  });

  it('skips a tick that starts while the previous pass is still running', async () => {
    const repo = new InMemoryBookingRepository();
    let inFlight = 0;
    let maxInFlight = 0;
    const realPurge = repo.purgeSupplierPayloadsBefore.bind(repo);
    repo.purgeSupplierPayloadsBefore = async (cutoff: Date) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return realPurge(cutoff);
    };

    const clock = new FakeClock();
    const job = new PayloadRetentionJob(repo, clock, silentLogger, {
      retentionMs: 1_000,
      intervalMs: 60_000,
    });

    const first = job.runOnce();
    const second = await job.runOnce();
    await first;

    expect(second).toEqual({ purged: 0 });
    expect(maxInFlight).toBe(1);
  });

  it('start() is idempotent and stop() is safe before start()', () => {
    const repo = new InMemoryBookingRepository();
    const job = new PayloadRetentionJob(repo, new FakeClock(), silentLogger, {
      retentionMs: 1_000,
      intervalMs: 60_000,
    });

    expect(() => {
      job.start();
      job.start();
      job.stop();
      job.stop();
    }).not.toThrow();
  });
});
