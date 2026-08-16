import { afterAll } from 'vitest';
import { runPropertyRepositorySuite } from '../../modules/testing/property-repository-suite.js';
import { runBookingRepositorySuite } from '../../modules/testing/booking-repository-suite.js';
import {
  InMemoryBookingRepository,
  InMemoryPropertyRepository,
} from '../../modules/testing/fakes.js';
import { createTestDatabase, type TestDatabase } from '../testing/pglite.js';
import { PostgresPropertyRepository } from './postgres-property-repository.js';
import { PostgresBookingRepository } from './postgres-booking-repository.js';

/**
 * One contract, two implementations.
 *
 * The in-memory repository is what the orchestrator's scenario tests run
 * against, and the Postgres one is what production runs against. If they ever
 * disagree, those scenario tests stop describing the real system — so both are
 * held to the same assertions here.
 *
 * The Postgres side is a real PostgreSQL 16 in-process (PGlite), so the
 * migrations, the unique indexes, the trigram similarity and the `ON CONFLICT`
 * clauses are genuinely exercised rather than approximated.
 */

runPropertyRepositorySuite({
  name: 'in-memory',
  create: () => new InMemoryPropertyRepository(),
});

let pg: TestDatabase | undefined;
let sequence = 0;

runPropertyRepositorySuite({
  name: 'PostgreSQL',
  create: async () => {
    pg ??= await createTestDatabase();
    await pg.truncate();
    sequence = 0;
    return new PostgresPropertyRepository(pg.db, {
      // Deterministic ids keep failures readable; production uses a UUID.
      newId: () => {
        sequence += 1;
        return `KLAR-PG-${sequence}`;
      },
    });
  },
});

runBookingRepositorySuite({
  name: 'in-memory',
  create: () => new InMemoryBookingRepository(),
});

runBookingRepositorySuite({
  name: 'PostgreSQL',
  create: async () => {
    pg ??= await createTestDatabase();
    await pg.truncate();
    return new PostgresBookingRepository(pg.db, { now: () => new Date('2026-08-14T09:00:00Z') });
  },
});

afterAll(async () => {
  await pg?.close();
});
