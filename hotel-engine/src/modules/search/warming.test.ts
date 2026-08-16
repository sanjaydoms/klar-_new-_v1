import { describe, expect, it } from 'vitest';
import { klarDestinationId } from '../../domain/shared/brand.js';
import type { UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import type { UnifiedSearchResult } from '../../domain/search/result.js';
import { silentLogger, IN, INR } from '../testing/fakes.js';
import { CacheWarmer, type Searcher } from './warming.js';

function target(id: string): UnifiedHotelSearchRequest {
  return {
    target: { kind: 'DESTINATION', destinationId: klarDestinationId(id) },
    stay: { checkIn: '2026-09-01', checkOut: '2026-09-03', nights: 2 },
    occupancy: { rooms: [{ adults: 2, children: 0, childAges: [] }] },
    currency: INR,
    nationality: IN,
    channel: 'B2C',
    sort: 'PRICE_ASC',
    page: { page: 1, limit: 20 },
  };
}

const emptyResult = {} as UnifiedSearchResult;

describe('CacheWarmer', () => {
  it('runs every target through the searcher', async () => {
    const seen: string[] = [];
    const searcher: Searcher = {
      search: (req) => {
        seen.push(String(req.target.kind === 'DESTINATION' ? req.target.destinationId : ''));
        return Promise.resolve(emptyResult);
      },
    };
    const warmer = new CacheWarmer(searcher, silentLogger, {
      targets: [target('A'), target('B'), target('C')],
      intervalMs: 60_000,
      concurrency: 2,
    });

    const result = await warmer.runOnce();

    expect(result).toEqual({ warmed: 3, failed: 0, total: 3 });
    expect(seen.sort()).toEqual(['A', 'B', 'C']);
  });

  it('isolates one failing target from the rest of the pass', async () => {
    const searcher: Searcher = {
      search: (req) => {
        const id = req.target.kind === 'DESTINATION' ? String(req.target.destinationId) : '';
        return id === 'BAD' ? Promise.reject(new Error('supplier timed out')) : Promise.resolve(emptyResult);
      },
    };
    const warmer = new CacheWarmer(searcher, silentLogger, {
      targets: [target('A'), target('BAD'), target('C')],
      intervalMs: 60_000,
      concurrency: 3,
    });

    const result = await warmer.runOnce();

    expect(result).toEqual({ warmed: 2, failed: 1, total: 3 });
  });

  it('skips a tick that starts while the previous pass is still running', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const searcher: Searcher = {
      search: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 10));
        inFlight -= 1;
        return emptyResult;
      },
    };
    const warmer = new CacheWarmer(searcher, silentLogger, {
      targets: [target('A'), target('B')],
      intervalMs: 60_000,
      concurrency: 1,
    });

    const first = warmer.runOnce();
    const second = await warmer.runOnce();
    await first;

    expect(second).toEqual({ warmed: 0, failed: 0, total: 2 });
    expect(maxInFlight).toBe(1);
  });

  it('start() is a no-op with no targets, and stop() is safe before start()', () => {
    const searcher: Searcher = { search: () => Promise.resolve(emptyResult) };
    const warmer = new CacheWarmer(searcher, silentLogger, {
      targets: [],
      intervalMs: 60_000,
      concurrency: 1,
    });

    expect(() => warmer.start()).not.toThrow();
    expect(() => warmer.stop()).not.toThrow();
  });
});
