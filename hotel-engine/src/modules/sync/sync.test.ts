import { describe, expect, it } from 'vitest';
import { supplierCode, supplierHotelId } from '../../domain/shared/brand.js';
import { InMemoryPropertyRepository, silentLogger } from '../testing/fakes.js';
import {
  backfillCatalogue,
  transformLegacyHotel,
  type LegacyHotelDocument,
} from './catalogue-backfill.js';
import {
  matchDestination,
  radiusFromBoundingBox,
  syncSupplierDestinations,
  type CanonicalDestinationRecord,
  type DestinationMappingWrite,
  type DestinationSyncStore,
  type SupplierDestination,
} from './destination-sync.js';

const TJ = supplierCode('TJ');
const RG = supplierCode('RG');

const legacy = (over: Partial<LegacyHotelDocument> = {}): LegacyHotelDocument => ({
  tjHotelId: '100000001234',
  name: 'Taj Exotica Resort and Spa',
  cityName: 'goa',
  countryName: 'India',
  starRating: 5,
  address: 'Calwaddo, Benaulim',
  // Mongo stores [lng, lat].
  location: { coordinates: [73.9188, 15.2596] },
  images: ['https://cdn.example/a.jpg'],
  accTypeDesc: 'Resort',
  ...over,
});

describe('legacy document transformation', () => {
  it('reads a well-formed document', () => {
    const { record } = transformLegacyHotel(legacy());
    expect(record?.supplierHotelId).toBe('100000001234');
    expect(record?.name).toBe('Taj Exotica Resort and Spa');
    expect(record?.city).toBe('goa');
    expect(record?.countryCode).toBe('IN');
    expect(record?.starRating).toBe(5);
    expect(record?.propertyType).toBe('RESORT');
  });

  /**
   * Mongo stores coordinates as [lng, lat] — the reverse of every other
   * representation in this codebase. Reading them in order puts Goa in Somalia.
   */
  it('reads coordinates in Mongo order, not display order', () => {
    const { record } = transformLegacyHotel(legacy());
    expect(record?.location).toEqual({ lat: 15.2596, lng: 73.9188 });
  });

  it('drops the [0,0] no-geocode sentinel without dropping the hotel', () => {
    const { record, skipped } = transformLegacyHotel(
      legacy({ location: { coordinates: [0, 0] } }),
    );
    expect(skipped).toBeUndefined();
    expect(record?.location).toBeUndefined();
    expect(record?.name).toBe('Taj Exotica Resort and Spa');
  });

  it('skips a document with coordinates that cannot be real', () => {
    expect(transformLegacyHotel(legacy({ location: { coordinates: [999, 15] } })).skipped).toBe(
      'BAD_COORDINATES',
    );
  });

  it('skips documents with nothing to identify them by', () => {
    expect(transformLegacyHotel(legacy({ tjHotelId: null })).skipped).toBe('NO_SUPPLIER_ID');
    expect(transformLegacyHotel(legacy({ name: '  ' })).skipped).toBe('NO_NAME');
  });

  it('skips an impossible star rating rather than clamping it', () => {
    expect(transformLegacyHotel(legacy({ starRating: 9 })).skipped).toBe(
      'IMPLAUSIBLE_STAR_RATING',
    );
  });

  it('leaves the country unset rather than guessing it', () => {
    // A wrong country code silently changes which markup region prices the
    // hotel, so an unrecognised name is better left blank.
    const { record } = transformLegacyHotel(legacy({ countryName: 'Freedonia' }));
    expect(record?.countryCode).toBeUndefined();
  });

  it('keeps only absolute image URLs', () => {
    const { record } = transformLegacyHotel(
      legacy({ images: ['https://cdn.example/a.jpg', 'b.jpg', null, 'https://cdn.example/a.jpg'] }),
    );
    expect(record?.imageUrls).toEqual(['https://cdn.example/a.jpg']);
  });

  it('never invents amenities', () => {
    // The legacy collection has none, and synthesising them from star rating is
    // the defect that made the amenity filter untrustworthy (D-18).
    expect(transformLegacyHotel(legacy()).record?.amenityLabels).toEqual([]);
  });
});

describe('catalogue backfill', () => {
  const docs = (n: number): LegacyHotelDocument[] =>
    Array.from({ length: n }, (_, i) =>
      legacy({ tjHotelId: `1000000000${i}`, name: `Hotel ${i}` }),
    );

  it('creates a canonical hotel and a supplier mapping per document', async () => {
    const properties = new InMemoryPropertyRepository();
    const summary = await backfillCatalogue(docs(3), {
      supplier: TJ,
      properties,
      logger: silentLogger,
    });

    expect(summary).toMatchObject({ read: 3, created: 3, alreadyPresent: 0 });
    const found = await properties.findBySupplierRefs([
      { supplier: TJ, supplierHotelId: supplierHotelId('10000000000') },
    ]);
    expect(found.size).toBe(1);
  });

  /** A backfill over 1.6 M documents will be interrupted; it must resume. */
  it('is idempotent — a second run creates nothing', async () => {
    const properties = new InMemoryPropertyRepository();
    await backfillCatalogue(docs(5), { supplier: TJ, properties, logger: silentLogger });
    const second = await backfillCatalogue(docs(5), {
      supplier: TJ,
      properties,
      logger: silentLogger,
    });

    expect(second).toMatchObject({ read: 5, created: 0, alreadyPresent: 5 });
    expect(properties.hotels.size).toBe(5);
  });

  it('resumes a partial run without duplicating what landed', async () => {
    const properties = new InMemoryPropertyRepository();
    await backfillCatalogue(docs(5).slice(0, 2), {
      supplier: TJ,
      properties,
      logger: silentLogger,
    });
    const resumed = await backfillCatalogue(docs(5), {
      supplier: TJ,
      properties,
      logger: silentLogger,
    });

    expect(resumed).toMatchObject({ created: 3, alreadyPresent: 2 });
    expect(properties.hotels.size).toBe(5);
  });

  it('counts what it skipped instead of dropping it silently', async () => {
    // A backfill that quietly discards 40,000 documents looks exactly like one
    // that succeeded.
    const summary = await backfillCatalogue(
      [legacy(), legacy({ tjHotelId: null }), legacy({ name: '' }), legacy({ starRating: 12 })],
      { supplier: TJ, properties: new InMemoryPropertyRepository(), logger: silentLogger },
    );
    expect(summary.read).toBe(4);
    expect(summary.created).toBe(1);
    expect(summary.skipped).toEqual({
      NO_SUPPLIER_ID: 1,
      NO_NAME: 1,
      BAD_COORDINATES: 0,
      IMPLAUSIBLE_STAR_RATING: 1,
    });
  });

  it('batches lookups instead of querying per document', async () => {
    const properties = new InMemoryPropertyRepository();
    let calls = 0;
    const original = properties.findBySupplierRefs.bind(properties);
    properties.findBySupplierRefs = async (refs) => {
      calls += 1;
      return original(refs);
    };

    await backfillCatalogue(docs(10), {
      supplier: TJ,
      properties,
      logger: silentLogger,
      batchSize: 4,
    });
    expect(calls).toBe(3); // 4 + 4 + 2
  });

  it('accepts an async iterable, so a cursor can stream into it', async () => {
    async function* stream(): AsyncGenerator<LegacyHotelDocument> {
      for (const doc of docs(3)) yield doc;
    }
    const summary = await backfillCatalogue(stream(), {
      supplier: TJ,
      properties: new InMemoryPropertyRepository(),
      logger: silentLogger,
    });
    expect(summary.created).toBe(3);
  });
});

describe('destination matching', () => {
  const canonical: CanonicalDestinationRecord[] = [
    {
      klarDestinationId: 'D-GOA',
      name: 'Goa',
      normalizedName: 'goa',
      countryCode: 'IN',
      aliases: [],
    },
    {
      klarDestinationId: 'D-MUM',
      name: 'Mumbai',
      normalizedName: 'mumbai',
      countryCode: 'IN',
      aliases: ['Bombay'],
    },
    {
      klarDestinationId: 'D-SPR-US',
      name: 'Springfield',
      normalizedName: 'springfield',
      countryCode: 'US',
      aliases: [],
    },
  ];

  it('matches on an exact normalised name', () => {
    expect(
      matchDestination({ code: 'X1', name: 'Goa', countryCode: 'IN' }, canonical),
    ).toMatchObject({ kind: 'MATCHED', klarDestinationId: 'D-GOA' });
  });

  it('matches a historical name through an alias', () => {
    expect(
      matchDestination({ code: 'X2', name: 'Bombay', countryCode: 'IN' }, canonical),
    ).toMatchObject({ kind: 'MATCHED', klarDestinationId: 'D-MUM' });
  });

  it('treats the country as a hard gate', () => {
    // "Springfield" exists in a dozen countries; a name match across a border
    // is always wrong.
    expect(
      matchDestination({ code: 'X3', name: 'Springfield', countryCode: 'IN' }, canonical).kind,
    ).toBe('UNMATCHED');
  });

  it('leaves a weak match unmapped rather than guessing', () => {
    expect(
      matchDestination({ code: 'X4', name: 'Gokarna', countryCode: 'IN' }, canonical).kind,
    ).toBe('UNMATCHED');
  });

  it('reports two near-equal candidates as ambiguous', () => {
    const twins: CanonicalDestinationRecord[] = [
      { klarDestinationId: 'D-A', name: 'North Goa', normalizedName: 'north goa', countryCode: 'IN', aliases: [] },
      { klarDestinationId: 'D-B', name: 'South Goa', normalizedName: 'south goa', countryCode: 'IN', aliases: [] },
    ];
    expect(matchDestination({ code: 'X5', name: 'Goa', countryCode: 'IN' }, twins).kind).toBe(
      'UNMATCHED',
    );
  });
});

describe('destination sync', () => {
  class RecordingStore implements DestinationSyncStore {
    readonly mappings: DestinationMappingWrite[] = [];
    readonly unmapped: Array<{ code: string; reason: string }> = [];
    constructor(private readonly canonical: readonly CanonicalDestinationRecord[]) {}

    listCanonical(): Promise<readonly CanonicalDestinationRecord[]> {
      return Promise.resolve(this.canonical);
    }
    upsertMapping(mapping: DestinationMappingWrite): Promise<void> {
      this.mappings.push(mapping);
      return Promise.resolve();
    }
    recordUnmapped(input: { code: string; reason: string }): Promise<void> {
      this.unmapped.push({ code: input.code, reason: input.reason });
      return Promise.resolve();
    }
  }

  const canonical: CanonicalDestinationRecord[] = [
    { klarDestinationId: 'D-GOA', name: 'Goa', normalizedName: 'goa', countryCode: 'IN', aliases: [] },
    { klarDestinationId: 'D-MUM', name: 'Mumbai', normalizedName: 'mumbai', countryCode: 'IN', aliases: ['Bombay'] },
  ];

  const supplierDestinations: SupplierDestination[] = [
    { code: 'RG-GOA', name: 'Goa', countryCode: 'IN' },
    { code: 'RG-BOM', name: 'Bombay', countryCode: 'IN' },
    { code: 'RG-XYZ', name: 'Nowhere Special', countryCode: 'IN' },
  ];

  it('maps what it can and queues what it cannot', async () => {
    const store = new RecordingStore(canonical);
    const summary = await syncSupplierDestinations({
      supplier: RG,
      destinations: supplierDestinations,
      store,
      logger: silentLogger,
    });

    expect(summary).toMatchObject({ read: 3, mapped: 2, unmatched: 1 });
    expect(store.mappings.map((m) => m.supplierDestCode).sort()).toEqual(['RG-BOM', 'RG-GOA']);
    expect(store.unmapped[0]?.code).toBe('RG-XYZ');
  });

  it('never writes a mapping it is unsure of', async () => {
    // An unmapped destination makes the supplier ineligible, which is visible.
    // A wrong one silently searches the wrong city.
    const store = new RecordingStore(canonical);
    await syncSupplierDestinations({
      supplier: RG,
      destinations: [{ code: 'RG-???', name: 'Goaa Beach Area', countryCode: 'IN' }],
      store,
      logger: silentLogger,
    });
    expect(store.mappings).toEqual([]);
    expect(store.unmapped).toHaveLength(1);
  });
});

describe('radius from a bounding box', () => {
  it('covers the box rather than fitting inside it', () => {
    // Roughly 1° square around Goa: half the diagonal is ~78 km.
    const radius = radiusFromBoundingBox({ north: 15.8, south: 14.9, east: 74.3, west: 73.7 });
    expect(radius).toBeGreaterThan(50);
    expect(radius).toBeLessThan(90);
  });

  it('clamps a tiny place to the usable minimum', () => {
    expect(
      radiusFromBoundingBox({ north: 15.301, south: 15.3, east: 74.001, west: 74.0 }),
    ).toBe(5);
  });

  it('gives an archipelago a genuinely large radius', () => {
    // The Maldives span roughly 8° of latitude. A city-sized default would
    // return nothing for most of it — the case that motivated a per-destination
    // radius in the first place.
    const radius = radiusFromBoundingBox({ north: 7, south: -1, east: 74, west: 72 });
    expect(radius).toBeGreaterThan(400);
    expect(radius).toBeLessThanOrEqual(500);
  });

  it('clamps anything larger than the supported maximum', () => {
    // A geocoder that returns a country-sized box for a city would otherwise
    // search half a continent.
    expect(radiusFromBoundingBox({ north: 35, south: 8, east: 90, west: 68 })).toBe(500);
  });
});

// ═══ Regressions from the second cross-check ════════════════════════════════

describe('backfill duplicates within one batch', () => {
  /**
   * The legacy collection is 1.6 M documents whose whole problem is that it is
   * messy; repeated ids are to be expected. Deduplicating only against the
   * store missed repeats *inside* a batch, so the same property was created
   * twice — and both were counted as `created`.
   */
  it('creates one hotel for an id repeated in the same batch', async () => {
    const properties = new InMemoryPropertyRepository();
    const doc = legacy({ tjHotelId: 'TJ-DUP', name: 'Duplicate Inn' });

    const summary = await backfillCatalogue([doc, doc, doc], {
      supplier: TJ,
      properties,
      logger: silentLogger,
    });

    expect(summary).toMatchObject({ read: 3, created: 1, alreadyPresent: 2 });
    expect(properties.hotels.size).toBe(1);
  });

  it('leaves no hotel that nothing maps to', async () => {
    const properties = new InMemoryPropertyRepository();
    const doc = legacy({ tjHotelId: 'TJ-DUP', name: 'Duplicate Inn' });
    await backfillCatalogue([doc, doc], { supplier: TJ, properties, logger: silentLogger });

    for (const hotel of properties.hotels.values()) {
      expect(hotel.supplierMappings.length).toBeGreaterThan(0);
    }
  });
});

describe('destination matching does not pick arbitrarily', () => {
  const twoSpringfields: CanonicalDestinationRecord[] = [
    {
      klarDestinationId: 'D-SPR-US',
      name: 'Springfield',
      normalizedName: 'springfield',
      countryCode: 'US',
      aliases: [],
    },
    {
      klarDestinationId: 'D-SPR-AU',
      name: 'Springfield',
      normalizedName: 'springfield',
      countryCode: 'AU',
      aliases: [],
    },
  ];

  /**
   * The country gate is described as hard, but it is skipped entirely when the
   * supplier entry carries no country — and the exact-name branch then used
   * `find`, returning whichever record happened to be first, at score 1, past
   * the ambiguity check that exists for this. "A destination mapped to the
   * wrong code sends every search for that city to a different city."
   */
  it('reports two identically-named destinations as ambiguous, not as a match', () => {
    const outcome = matchDestination({ code: 'SPF', name: 'Springfield' }, twoSpringfields);
    expect(outcome.kind).toBe('AMBIGUOUS');
  });

  it('still matches exactly when the country narrows it to one', () => {
    const outcome = matchDestination(
      { code: 'SPF', name: 'Springfield', countryCode: 'AU' },
      twoSpringfields,
    );
    expect(outcome).toEqual({ kind: 'MATCHED', klarDestinationId: 'D-SPR-AU', score: 1 });
  });
});

describe('two supplier destinations claiming one canonical destination', () => {
  const canonical: CanonicalDestinationRecord[] = [
    { klarDestinationId: 'D-GOA', name: 'Goa', normalizedName: 'goa', countryCode: 'IN', aliases: ['Goa India'] },
  ];

  /**
   * `destination_mapping` is keyed `(supplier, klar_destination_id)`, so a
   * second entry resolving to the same place REPLACES the first rather than
   * adding to it — whichever code the supplier happened to list last silently
   * became the definition of that destination, with both reported as mapped.
   */
  it('records the clash instead of overwriting the incumbent', async () => {
    const mappings: Array<{ klarDestinationId: string; supplierDestCode: string }> = [];
    const unmapped: Array<{ code: string; reason: string }> = [];

    const summary = await syncSupplierDestinations({
      supplier: RG,
      destinations: [
        { code: 'GOA', name: 'Goa', countryCode: 'IN' },
        { code: 'GOAIN', name: 'Goa India', countryCode: 'IN' },
      ],
      store: {
        listCanonical: () => Promise.resolve(canonical),
        upsertMapping: (m) => {
          mappings.push({ klarDestinationId: m.klarDestinationId, supplierDestCode: m.supplierDestCode });
          return Promise.resolve();
        },
        recordUnmapped: (u) => {
          unmapped.push({ code: u.code, reason: u.reason });
          return Promise.resolve();
        },
      },
      logger: silentLogger,
    });

    expect(summary).toMatchObject({ read: 2, mapped: 1, collided: 1 });
    expect(mappings).toEqual([{ klarDestinationId: 'D-GOA', supplierDestCode: 'GOA' }]);
    expect(unmapped[0]?.code).toBe('GOAIN');
    expect(unmapped[0]?.reason).toContain('already mapped');
  });
});
