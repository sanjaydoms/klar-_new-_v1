import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/pglite.js';
import { loadMigrations, migrate } from './migrate.js';

/**
 * The schema's own guarantees, checked against a real PostgreSQL.
 *
 * Constraints and unique indexes are load-bearing here — they are what stops a
 * false merge or a duplicated review item at the storage layer rather than by
 * convention. A constraint nobody has watched reject anything is a comment.
 */
let pg: TestDatabase;

beforeEach(async () => {
  pg ??= await createTestDatabase();
  await pg.truncate();
});

afterAll(async () => {
  await pg?.close();
});

const insertHotel = async (id: string, name = 'Test Hotel'): Promise<void> => {
  await pg.db.query(
    `INSERT INTO canonical_hotel (klar_hotel_id, name, normalized_name) VALUES ($1, $2, $2)`,
    [id, name],
  );
};

describe('migrations', () => {
  it('are idempotent — a second run applies nothing', async () => {
    // The runner is called on every boot, so re-running must be a no-op.
    const ran = await migrate(pg.db, loadMigrations());
    expect(ran).toEqual([]);
  });

  it('record what they applied', async () => {
    const rows = await pg.db.query<{ name: string }>('SELECT name FROM schema_migration');
    expect(rows.map((r) => r.name)).toContain('001_catalogue.sql');
  });

  it('installed pg_trgm, which the matcher depends on', async () => {
    const rows = await pg.db.query<{ s: number }>(
      `SELECT similarity('taj exotica resort', 'taj exotica resort and spa') AS s`,
    );
    expect(Number(rows[0]?.s)).toBeGreaterThan(0.5);
  });
});

describe('supplier_property_mapping', () => {
  it('refuses two properties from one supplier on the same hotel', async () => {
    // The false-merge failure mode, refused by the database. Two distinct
    // TripJack properties collapsing into one canonical hotel would show a
    // customer a price for somewhere they are not staying.
    await insertHotel('H1');
    await pg.db.query(
      `INSERT INTO supplier_property_mapping (supplier, supplier_hotel_id, klar_hotel_id, confidence)
       VALUES ('TJ', 'TJ-1', 'H1', 'EXACT_SUPPLIER_MAPPING')`,
    );

    await expect(
      pg.db.query(
        `INSERT INTO supplier_property_mapping (supplier, supplier_hotel_id, klar_hotel_id, confidence)
         VALUES ('TJ', 'TJ-2', 'H1', 'HIGH_CONFIDENCE')`,
      ),
    ).rejects.toThrow();
  });

  it('allows two different suppliers on the same hotel', async () => {
    await insertHotel('H1');
    await pg.db.query(
      `INSERT INTO supplier_property_mapping (supplier, supplier_hotel_id, klar_hotel_id, confidence)
       VALUES ('TJ', 'TJ-1', 'H1', 'EXACT_SUPPLIER_MAPPING'),
              ('RG', 'RG-1', 'H1', 'HIGH_CONFIDENCE')`,
    );
    const rows = await pg.db.query('SELECT 1 FROM supplier_property_mapping WHERE klar_hotel_id = $1', ['H1']);
    expect(rows).toHaveLength(2);
  });

  it('rejects a confidence the matcher would never merge on', async () => {
    // LOW_CONFIDENCE and UNMATCHED must not be storable as mappings: they are
    // decisions not to merge.
    await insertHotel('H1');
    await expect(
      pg.db.query(
        `INSERT INTO supplier_property_mapping (supplier, supplier_hotel_id, klar_hotel_id, confidence)
         VALUES ('TJ', 'TJ-1', 'H1', 'LOW_CONFIDENCE')`,
      ),
    ).rejects.toThrow();
  });

  it('removes mappings when the hotel goes', async () => {
    await insertHotel('H1');
    await pg.db.query(
      `INSERT INTO supplier_property_mapping (supplier, supplier_hotel_id, klar_hotel_id, confidence)
       VALUES ('TJ', 'TJ-1', 'H1', 'EXACT_SUPPLIER_MAPPING')`,
    );
    await pg.db.query('DELETE FROM canonical_hotel WHERE klar_hotel_id = $1', ['H1']);
    expect(await pg.db.query('SELECT 1 FROM supplier_property_mapping')).toHaveLength(0);
  });
});

describe('canonical_hotel constraints', () => {
  it('rejects impossible coordinates', async () => {
    await expect(
      pg.db.query(
        `INSERT INTO canonical_hotel (klar_hotel_id, name, normalized_name, lat, lng)
         VALUES ('H9', 'X', 'x', 991, 73)`,
      ),
    ).rejects.toThrow();
  });

  it('rejects an out-of-range star rating', async () => {
    await expect(
      pg.db.query(
        `INSERT INTO canonical_hotel (klar_hotel_id, name, normalized_name, star_rating)
         VALUES ('H9', 'X', 'x', 9)`,
      ),
    ).rejects.toThrow();
  });
});

describe('match_candidate', () => {
  it('keeps one pending row per unresolved pair', async () => {
    // The same property fails to match on every search; without this the
    // review queue fills with one decision repeated hundreds of times.
    const insert = `INSERT INTO match_candidate (supplier, supplier_hotel_id, name)
                    VALUES ('RG', 'RG-X', 'Ambiguous Hotel')
                    ON CONFLICT (supplier, supplier_hotel_id) WHERE status = 'PENDING' DO NOTHING`;
    await pg.db.query(insert);
    await pg.db.query(insert);
    await pg.db.query(insert);
    expect(await pg.db.query('SELECT 1 FROM match_candidate')).toHaveLength(1);
  });

  it('allows a new pending row once the old one is resolved', async () => {
    await pg.db.query(
      `INSERT INTO match_candidate (supplier, supplier_hotel_id, name, status)
       VALUES ('RG', 'RG-X', 'Ambiguous Hotel', 'REJECTED')`,
    );
    await pg.db.query(
      `INSERT INTO match_candidate (supplier, supplier_hotel_id, name)
       VALUES ('RG', 'RG-X', 'Ambiguous Hotel')`,
    );
    expect(await pg.db.query('SELECT 1 FROM match_candidate')).toHaveLength(2);
  });
});

describe('destinations', () => {
  it('rejects a radius beyond the supported range', async () => {
    await expect(
      pg.db.query(
        `INSERT INTO canonical_destination
           (klar_destination_id, name, normalized_name, kind, country_code, lat, lng, radius_km)
         VALUES ('D1', 'Goa', 'goa', 'REGION', 'IN', 15.3, 73.9, 900)`,
      ),
    ).rejects.toThrow();
  });

  it('removes supplier mappings when the destination goes', async () => {
    await pg.db.query(
      `INSERT INTO canonical_destination
         (klar_destination_id, name, normalized_name, kind, country_code, lat, lng, radius_km)
       VALUES ('D1', 'Goa', 'goa', 'REGION', 'IN', 15.3, 73.9, 60)`,
    );
    await pg.db.query(
      `INSERT INTO destination_mapping (supplier, klar_destination_id, supplier_dest_code)
       VALUES ('RG', 'D1', 'GOA')`,
    );
    await pg.db.query('DELETE FROM canonical_destination WHERE klar_destination_id = $1', ['D1']);
    expect(await pg.db.query('SELECT 1 FROM destination_mapping')).toHaveLength(0);
  });
});
