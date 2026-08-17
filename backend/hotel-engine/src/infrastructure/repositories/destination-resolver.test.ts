import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { countryCode, klarDestinationId, klarHotelId, supplierCode } from '../../domain/shared/brand.js';
import type { SupplierTargetCapability } from '../../modules/ports.js';
import { createTestDatabase, type TestDatabase } from '../testing/pglite.js';
import { PostgresDestinationResolver } from './postgres-destination-resolver.js';

/**
 * Destination resolution against a real PostgreSQL.
 *
 * This is the module the reference did not have: it resolved destinations
 * per supplier, in two unrelated functions with India-specific rules wired
 * into them. Here one canonical destination is translated into whatever shape
 * each supplier accepts.
 */
const TJ = supplierCode('TJ');
const RG = supplierCode('RG');
const XX = supplierCode('XX');

const RG_CAPS: SupplierTargetCapability = { code: RG, searchTargets: ['DEST_CODE', 'GEO'] };
const TJ_CAPS: SupplierTargetCapability = { code: TJ, searchTargets: ['HOTEL_IDS', 'SINGLE_HOTEL'] };
const XX_CAPS: SupplierTargetCapability = { code: XX, searchTargets: ['DEST_CODE'] };

const GOA = klarDestinationId('KLAR-DEST-GOA');
let pg: TestDatabase;
let resolver: PostgresDestinationResolver;

beforeEach(async () => {
  pg ??= await createTestDatabase();
  await pg.truncate();
  resolver = new PostgresDestinationResolver(pg.db);

  await pg.db.query(
    `INSERT INTO canonical_destination
       (klar_destination_id, name, normalized_name, kind, country_code, lat, lng, radius_km, property_count)
     VALUES ($1, 'Goa', 'goa', 'REGION', 'IN', 15.2993, 74.1240, 60, 6179)`,
    [String(GOA)],
  );
});

afterAll(async () => {
  await pg?.close();
});

const seedHotel = async (id: string, lat: number, lng: number, mappings: [string, string][]) => {
  await pg.db.query(
    `INSERT INTO canonical_hotel (klar_hotel_id, name, normalized_name, lat, lng)
     VALUES ($1, $2, $2, $3, $4)`,
    [id, `hotel ${id}`, lat, lng],
  );
  for (const [supplier, supplierHotelId] of mappings) {
    await pg.db.query(
      `INSERT INTO supplier_property_mapping (supplier, supplier_hotel_id, klar_hotel_id, confidence)
       VALUES ($1, $2, $3, 'EXACT_SUPPLIER_MAPPING')`,
      [supplier, supplierHotelId, id],
    );
  }
};

describe('destination targets', () => {
  it('gives a mapped supplier its own destination code', async () => {
    await pg.db.query(
      `INSERT INTO destination_mapping (supplier, klar_destination_id, supplier_dest_code)
       VALUES ('RG', $1, 'GOA-RG-001')`,
      [String(GOA)],
    );

    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [RG_CAPS],
    );
    expect(targets.get(RG)).toEqual({ kind: 'DEST_CODE', code: 'GOA-RG-001' });
  });

  it('falls back to a geofilter when there is no code', async () => {
    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [RG_CAPS],
    );
    expect(targets.get(RG)).toEqual({
      kind: 'GEO',
      centre: { lat: 15.2993, lng: 74.124 },
      radiusKm: 60,
    });
  });

  it('honours a mapping that asks for geo even though a code exists', async () => {
    await pg.db.query(
      `INSERT INTO destination_mapping (supplier, klar_destination_id, supplier_dest_code, use_geo_filter)
       VALUES ('RG', $1, 'GOA-RG-001', true)`,
      [String(GOA)],
    );
    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [RG_CAPS],
    );
    expect(targets.get(RG)?.kind).toBe('GEO');
  });

  /**
   * TripJack has no destination concept: a listing call prices only the ids it
   * is handed. This query is what replaces the reference's `resolveForTJ`.
   */
  it('resolves candidate hotel ids for an id-list supplier', async () => {
    await seedHotel('H-IN-1', 15.2596, 73.9188, [['TJ', 'TJ-1']]);
    await seedHotel('H-IN-2', 15.4909, 73.8278, [['TJ', 'TJ-2']]);

    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [TJ_CAPS],
    );
    const target = targets.get(TJ);
    expect(target?.kind).toBe('HOTEL_IDS');
    if (target?.kind === 'HOTEL_IDS') {
      expect([...target.ids].map(String).sort()).toEqual(['TJ-1', 'TJ-2']);
    }
  });

  it('excludes hotels outside the destination radius', async () => {
    await seedHotel('H-NEAR', 15.2596, 73.9188, [['TJ', 'TJ-NEAR']]);
    // Mumbai — inside a naive bounding box on latitude, far outside 60 km.
    await seedHotel('H-FAR', 19.076, 72.8777, [['TJ', 'TJ-FAR']]);

    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [TJ_CAPS],
    );
    const target = targets.get(TJ);
    if (target?.kind === 'HOTEL_IDS') {
      expect([...target.ids].map(String)).toEqual(['TJ-NEAR']);
    } else {
      expect.fail('expected an id-list target');
    }
  });

  it('trims the corners a bounding box leaves behind', async () => {
    // A box around a 60 km radius reaches ~85 km at its corners. A hotel there
    // is inside the box and outside the destination — the neighbouring towns
    // that made the reference's results look wrong.
    await seedHotel('H-CORNER', 15.2993 + 0.5, 74.124 + 0.5, [['TJ', 'TJ-CORNER']]);
    await seedHotel('H-CENTRE', 15.2993, 74.124, [['TJ', 'TJ-CENTRE']]);

    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [TJ_CAPS],
    );
    const target = targets.get(TJ);
    if (target?.kind === 'HOTEL_IDS') {
      expect([...target.ids].map(String)).toEqual(['TJ-CENTRE']);
    } else {
      expect.fail('expected an id-list target');
    }
  });

  it('returns nothing for an id-list supplier with no inventory here', async () => {
    // An empty id list is not a search; saying so beats sending a request that
    // can only come back empty.
    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [TJ_CAPS],
    );
    expect(targets.get(TJ)).toBeNull();
  });

  it('reports a supplier that can serve neither shape as ineligible', async () => {
    // XX takes only a destination code and has no mapping for Goa.
    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: GOA },
      [XX_CAPS],
    );
    expect(targets.get(XX)).toBeNull();
  });

  it('reports every supplier as ineligible for an unknown destination', async () => {
    const targets = await resolver.resolveTargets(
      { kind: 'DESTINATION', destinationId: klarDestinationId('nope') },
      [RG_CAPS, TJ_CAPS],
    );
    expect(targets.get(RG)).toBeNull();
    expect(targets.get(TJ)).toBeNull();
  });
});

describe('single-hotel and area targets', () => {
  it('gives each supplier its own id for a specific hotel', async () => {
    await seedHotel('H-TAJ', 15.2596, 73.9188, [
      ['TJ', 'TJ-100'],
      ['RG', 'RG-900'],
    ]);

    const targets = await resolver.resolveTargets(
      { kind: 'HOTEL', klarHotelId: klarHotelId('H-TAJ') },
      [TJ_CAPS, { code: RG, searchTargets: ['SINGLE_HOTEL', 'DEST_CODE'] }],
    );
    expect(targets.get(TJ)).toEqual({ kind: 'SINGLE_HOTEL', id: 'TJ-100' });
    expect(targets.get(RG)).toEqual({ kind: 'SINGLE_HOTEL', id: 'RG-900' });
  });

  it('excludes a supplier that does not sell the hotel', async () => {
    await seedHotel('H-TAJ', 15.2596, 73.9188, [['TJ', 'TJ-100']]);
    const targets = await resolver.resolveTargets(
      { kind: 'HOTEL', klarHotelId: klarHotelId('H-TAJ') },
      [TJ_CAPS, { code: RG, searchTargets: ['SINGLE_HOTEL'] }],
    );
    expect(targets.get(RG)).toBeNull();
  });

  it('clamps an area radius to the supported range', async () => {
    const targets = await resolver.resolveTargets(
      { kind: 'AREA', centre: { lat: 15.3, lng: 73.9 }, radiusKm: 5_000 },
      [RG_CAPS],
    );
    const target = targets.get(RG);
    expect(target?.kind).toBe('GEO');
    if (target?.kind === 'GEO') expect(target.radiusKm).toBe(500);
  });
});

describe('inventory count', () => {
  it('reports the destination property count for display', async () => {
    // The "showing 40 of 6,179" figure. Display only — it never drives paging.
    expect(await resolver.inventoryCount({ kind: 'DESTINATION', destinationId: GOA })).toBe(6_179);
  });

  it('reports zero for a target that has no destination record', async () => {
    expect(
      await resolver.inventoryCount({ kind: 'HOTEL', klarHotelId: klarHotelId('H-TAJ') }),
    ).toBe(0);
  });
});

// ═══ Free-text lookup ══════════════════════════════════════════════════════

describe('resolving free text to a destination', () => {
  /**
   * The existing frontend sends `destination: "Goa"`, not an id (teardown
   * §2.2), so the API edge has to resolve text. The reference resolved it
   * against a *RateGain* table, which is how "Goa" came to mean whichever Goa
   * that supplier had.
   */
  it('matches an exact normalised name at full confidence', async () => {
    const [best] = await resolver.lookup({ text: 'Goa' });
    expect(best?.klarDestinationId).toBe(GOA);
    expect(best?.score).toBe(1);
    expect(best?.propertyCount).toBe(6_179);
  });

  it('is case- and punctuation-insensitive', async () => {
    expect((await resolver.lookup({ text: '  GOA!  ' }))[0]?.klarDestinationId).toBe(GOA);
  });

  /**
   * The regression this section exists for.
   *
   * Aliases are stored as an operator wrote them — "Bombay" — and the query
   * arrives normalised, so `aliases @> to_jsonb($1)` compared "bombay" against
   * "Bombay" and matched nothing. The one case an alias exists for is exactly
   * the one trigram similarity cannot rescue: "Bombay" and "mumbai" share no
   * trigram, so the lookup returned nothing at all.
   */
  it('finds a destination through an alias that shares nothing with its name', async () => {
    await pg.db.query(
      `INSERT INTO canonical_destination
         (klar_destination_id, name, normalized_name, kind, country_code, lat, lng, radius_km, aliases, property_count)
       VALUES ('D-MUM', 'Mumbai', 'mumbai', 'CITY', 'IN', 19.076, 72.8777, 40, '["Bombay"]'::jsonb, 4000)`,
    );

    const [best] = await resolver.lookup({ text: 'Bombay' });
    expect(best?.klarDestinationId).toBe('D-MUM');
    expect(best?.score).toBe(1);
  });

  it('narrows by country when one is given', async () => {
    expect(await resolver.lookup({ text: 'Goa', countryCode: countryCode('AE') })).toEqual([]);
    expect((await resolver.lookup({ text: 'Goa', countryCode: countryCode('IN') })).length).toBe(1);
  });

  it('returns nothing rather than guessing at a place we do not sell', async () => {
    expect(await resolver.lookup({ text: 'Atlantis' })).toEqual([]);
    expect(await resolver.lookup({ text: '   ' })).toEqual([]);
  });
});
