import { beforeEach, describe, expect, it } from 'vitest';
import { countryCode, supplierCode, supplierHotelId } from '../../domain/shared/brand.js';
import { matchSupplierHotels } from '../matching/matcher.js';
import type { PropertyRepository } from '../ports.js';
import { supplierRefKey } from '../ports.js';
import type { SupplierHotel } from '../../suppliers/contract/dto.js';
import { silentLogger } from './fakes.js';

/**
 * What any PropertyRepository must do, whichever store backs it.
 *
 * Run against the in-memory fake and against PostgreSQL. The fake is what the
 * orchestrator's scenario tests use, so if the two ever diverge those tests
 * stop describing production — and this suite is what catches that.
 */
const TJ = supplierCode('TJ');
const RG = supplierCode('RG');
const IN = countryCode('IN');

const TAJ = {
  name: 'Taj Exotica Resort and Spa',
  city: 'Goa',
  address: 'Calwaddo, Benaulim, Goa',
  location: { lat: 15.2596, lng: 73.9188 },
  starRating: 5,
};

/**
 * A supplier hotel as the matcher receives one.
 *
 * Built directly rather than routed through a fake adapter's `search`: the
 * matcher only reads identity and location fields, and standing up a whole
 * supplier context to produce them obscures what each test is actually about.
 */
function supplierHotelFixture(
  supplier: ReturnType<typeof supplierCode>,
  spec: {
    id: string;
    name: string;
    city?: string;
    address?: string;
    location?: { lat: number; lng: number };
    starRating?: number;
  },
): SupplierHotel {
  return {
    supplier,
    supplierHotelId: supplierHotelId(spec.id),
    name: spec.name,
    ...(spec.address !== undefined ? { address: spec.address } : {}),
    ...(spec.city !== undefined ? { city: spec.city } : {}),
    countryCode: IN,
    ...(spec.location !== undefined ? { location: spec.location } : {}),
    ...(spec.starRating !== undefined ? { starRating: spec.starRating } : {}),
    imageUrls: [],
    amenityLabels: [],
    rates: [],
  };
}

export interface RepositorySubject {
  readonly name: string;
  /** A clean repository. Called before every test. */
  readonly create: () => Promise<PropertyRepository> | PropertyRepository;
}

export function runPropertyRepositorySuite(subject: RepositorySubject): void {
  describe(`PropertyRepository contract — ${subject.name}`, () => {
    let repo: PropertyRepository;

    beforeEach(async () => {
      repo = await subject.create();
    });

    describe('creating and finding', () => {
      it('round-trips a property created from a supplier', async () => {
        const created = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-1'),
          name: TAJ.name,
          address: TAJ.address,
          city: TAJ.city,
          countryCode: IN,
          location: TAJ.location,
          starRating: 5,
          propertyType: 'RESORT',
          imageUrls: ['https://cdn.example/a.jpg'],
          amenityLabels: ['Swimming Pool'],
        });

        expect(created.name).toBe(TAJ.name);
        expect(created.location).toEqual(TAJ.location);
        expect(created.starRating).toBe(5);
        expect(created.images.map((i) => i.url)).toEqual(['https://cdn.example/a.jpg']);
        expect(created.amenities.map((a) => a.label)).toEqual(['Swimming Pool']);

        // Creating it also maps the supplier that supplied it — a canonical
        // hotel no supplier reaches is unreachable.
        const found = await repo.findBySupplierRefs([
          { supplier: TJ, supplierHotelId: supplierHotelId('TJ-1') },
        ]);
        expect(found.get(supplierRefKey(TJ, 'TJ-1'))?.klarHotelId).toBe(created.klarHotelId);
      });

      it('returns nothing for a supplier reference it has never seen', async () => {
        const found = await repo.findBySupplierRefs([
          { supplier: RG, supplierHotelId: supplierHotelId('nope') },
        ]);
        expect(found.size).toBe(0);
      });

      it('handles an empty reference list without a round trip', async () => {
        expect((await repo.findBySupplierRefs([])).size).toBe(0);
      });

      /**
       * Supplier id spaces overlap. The reference looked RateGain property ids
       * up in a TripJack id column (D-11), which usually found nothing and
       * occasionally attached the wrong hotel's name and coordinates.
       */
      it('does not confuse the same id string across two suppliers', async () => {
        const tj = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('12345'),
          name: 'TripJack Property',
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        });
        const rg = await repo.createFromSupplier({
          supplier: RG,
          supplierHotelId: supplierHotelId('12345'),
          name: 'RateGain Property',
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        });
        expect(tj.klarHotelId).not.toBe(rg.klarHotelId);

        const found = await repo.findBySupplierRefs([
          { supplier: TJ, supplierHotelId: supplierHotelId('12345') },
          { supplier: RG, supplierHotelId: supplierHotelId('12345') },
        ]);
        expect(found.get(supplierRefKey(TJ, '12345'))?.name).toBe('TripJack Property');
        expect(found.get(supplierRefKey(RG, '12345'))?.name).toBe('RateGain Property');
      });

      it('resolves a batch of references in one call', async () => {
        for (const n of [1, 2, 3]) {
          await repo.createFromSupplier({
            supplier: TJ,
            supplierHotelId: supplierHotelId(`TJ-${n}`),
            name: `Hotel ${n}`,
            city: 'Goa',
            imageUrls: [],
            amenityLabels: [],
          });
        }
        const found = await repo.findBySupplierRefs([
          { supplier: TJ, supplierHotelId: supplierHotelId('TJ-1') },
          { supplier: TJ, supplierHotelId: supplierHotelId('TJ-3') },
          { supplier: TJ, supplierHotelId: supplierHotelId('TJ-missing') },
        ]);
        expect(found.size).toBe(2);
      });
    });

    describe('candidate narrowing', () => {
      beforeEach(async () => {
        await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-TAJ'),
          name: TAJ.name,
          address: TAJ.address,
          city: TAJ.city,
          countryCode: IN,
          location: TAJ.location,
          starRating: 5,
          imageUrls: [],
          amenityLabels: [],
        });
        await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-OTHER'),
          name: 'Colva Beach Guesthouse',
          city: 'Goa',
          countryCode: IN,
          location: { lat: 15.2793, lng: 73.9226 },
          starRating: 2,
          imageUrls: [],
          amenityLabels: [],
        });
      });

      it('surfaces a plausible candidate for a near-identical name', async () => {
        const candidates = await repo.findMatchCandidates({
          name: 'Taj Exotica Resort & Spa',
          city: 'Goa',
          countryCode: IN,
          location: TAJ.location,
        });
        expect(candidates.map((c) => c.name)).toContain(TAJ.name);
      });

      it('does not surface an unrelated property in the same city', async () => {
        const candidates = await repo.findMatchCandidates({
          name: 'Taj Exotica Resort & Spa',
          city: 'Goa',
          countryCode: IN,
          location: TAJ.location,
        });
        expect(candidates.map((c) => c.name)).not.toContain('Colva Beach Guesthouse');
      });

      it('returns nothing for a name with no distinguishing tokens', async () => {
        // "The Hotel" would otherwise match every generically-named property.
        expect(await repo.findMatchCandidates({ name: 'The Hotel', city: 'Goa' })).toEqual([]);
      });

      it('carries the supplier mappings on a candidate', async () => {
        // The matcher needs them: a candidate this supplier already maps to is
        // not a match for a different property of the same supplier.
        const [candidate] = await repo.findMatchCandidates({
          name: 'Taj Exotica Resort and Spa',
          city: 'Goa',
        });
        expect(candidate?.supplierMappings.map((m) => m.supplier)).toContain(TJ);
      });
    });

    describe('mapping write-back', () => {
      it('makes a persisted mapping resolvable at tier 1', async () => {
        const hotel = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-1'),
          name: TAJ.name,
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        });

        await repo.persistMapping({
          klarHotelId: hotel.klarHotelId,
          supplier: RG,
          supplierHotelId: supplierHotelId('RG-9'),
          confidence: 'HIGH_CONFIDENCE',
          matchedBy: ['NORMALIZED_NAME', 'PROXIMITY'],
        });

        const found = await repo.findBySupplierRefs([
          { supplier: RG, supplierHotelId: supplierHotelId('RG-9') },
        ]);
        expect(found.get(supplierRefKey(RG, 'RG-9'))?.klarHotelId).toBe(hotel.klarHotelId);
      });

      it('is idempotent — persisting the same mapping twice changes nothing', async () => {
        const hotel = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-1'),
          name: TAJ.name,
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        });
        const mapping = {
          klarHotelId: hotel.klarHotelId,
          supplier: RG,
          supplierHotelId: supplierHotelId('RG-9'),
          confidence: 'HIGH_CONFIDENCE' as const,
          matchedBy: ['NORMALIZED_NAME' as const, 'PROXIMITY' as const],
        };

        await repo.persistMapping(mapping);
        await repo.persistMapping(mapping);
        await repo.persistMapping(mapping);

        const found = await repo.findBySupplierRefs([
          { supplier: RG, supplierHotelId: supplierHotelId('RG-9') },
        ]);
        const resolved = found.get(supplierRefKey(RG, 'RG-9'));
        expect(resolved?.klarHotelId).toBe(hotel.klarHotelId);
        expect(resolved?.supplierMappings.filter((m) => m.supplier === RG)).toHaveLength(1);
      });

      /**
       * One supplier sells one canonical hotel under one id.
       *
       * The schema enforces this with a unique index on
       * `(klar_hotel_id, supplier)` — a second property from the same supplier
       * is the false merge, and the database is right to refuse it. What it
       * must not do is throw: the matcher screens for this in memory, but the
       * screen is a read and then a write with nothing between them, so two
       * concurrent searches both pass it and one loses the race. A correctly
       * refused write-back is not a reason for a customer's search to fail.
       *
       * The two implementations disagreed here before this test: the in-memory
       * one silently replaced the incumbent mapping — reassigning one
       * property's identity to another — while PostgreSQL raised a constraint
       * violation that nothing caught.
       */
      it('refuses a second property from the same supplier, and does not throw', async () => {
        const hotel = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-1'),
          name: TAJ.name,
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        });

        const base = {
          klarHotelId: hotel.klarHotelId,
          supplier: RG,
          confidence: 'HIGH_CONFIDENCE' as const,
          matchedBy: ['NORMALIZED_NAME' as const, 'PROXIMITY' as const],
        };

        expect(await repo.persistMapping({ ...base, supplierHotelId: supplierHotelId('RG-9') }))
          .toBe(true);
        expect(await repo.persistMapping({ ...base, supplierHotelId: supplierHotelId('RG-OTHER') }))
          .toBe(false);

        // The incumbent still owns the mapping; the newcomer got none.
        const found = await repo.findBySupplierRefs([
          { supplier: RG, supplierHotelId: supplierHotelId('RG-9') },
          { supplier: RG, supplierHotelId: supplierHotelId('RG-OTHER') },
        ]);
        expect(found.get(supplierRefKey(RG, 'RG-9'))?.klarHotelId).toBe(hotel.klarHotelId);
        expect(found.get(supplierRefKey(RG, 'RG-OTHER'))).toBeUndefined();
      });

      /**
       * A supplier id already in the catalogue keeps the hotel it already has.
       *
       * The Postgres implementation inserted the canonical row first and let
       * `ON CONFLICT DO NOTHING` decline the mapping, which left a hotel no
       * supplier mapped to — "unreachable", in the words of the comment above
       * that very transaction. The backfill counted each one as `created`,
       * and every orphan then sat in the candidate pool for future matching,
       * a duplicate name at the same coordinates that nothing could ever
       * resolve to.
       */
      it('returns the existing hotel rather than minting an unreachable one', async () => {
        const input = {
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-DUP'),
          name: 'Duplicate Inn',
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        };

        const first = await repo.createFromSupplier(input);
        const second = await repo.createFromSupplier(input);

        expect(second.klarHotelId).toBe(first.klarHotelId);
        // And the record that came back is a usable one, not a bare shell.
        expect(second.supplierMappings.map((m) => String(m.supplierHotelId))).toEqual(['TJ-DUP']);

        // The id still resolves to exactly one hotel.
        const found = await repo.findBySupplierRefs([
          { supplier: TJ, supplierHotelId: supplierHotelId('TJ-DUP') },
        ]);
        expect(found.get(supplierRefKey(TJ, 'TJ-DUP'))?.klarHotelId).toBe(first.klarHotelId);
      });

      it('reports a genuinely new mapping as persisted', async () => {
        const hotel = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-1'),
          name: TAJ.name,
          city: 'Goa',
          imageUrls: [],
          amenityLabels: [],
        });

        expect(
          await repo.persistMapping({
            klarHotelId: hotel.klarHotelId,
            supplier: RG,
            supplierHotelId: supplierHotelId('RG-9'),
            confidence: 'HIGH_CONFIDENCE',
            matchedBy: ['NORMALIZED_NAME', 'PROXIMITY'],
          }),
        ).toBe(true);
      });
    });

    describe('the review queue', () => {
      it('records a pair too weak to merge', async () => {
        await repo.recordUnresolved({
          supplier: RG,
          supplierHotelId: supplierHotelId('RG-X'),
          name: 'Ambiguous Beach Hotel',
          score: 0.6,
          reason: 'only 1 independent signal',
        });
        // Recording it must not create a canonical hotel or a mapping.
        const found = await repo.findBySupplierRefs([
          { supplier: RG, supplierHotelId: supplierHotelId('RG-X') },
        ]);
        expect(found.size).toBe(0);
      });

      it('collapses repeats of the same unresolved pair', async () => {
        // The same property fails to match on every subsequent search; without
        // deduplication the queue fills with one decision repeated.
        const candidate = {
          supplier: RG,
          supplierHotelId: supplierHotelId('RG-X'),
          name: 'Ambiguous Beach Hotel',
          score: 0.6,
          reason: 'only 1 independent signal',
        };
        await repo.recordUnresolved(candidate);
        await expect(repo.recordUnresolved(candidate)).resolves.not.toThrow();
      });
    });

    describe('driving the matcher', () => {
      it('resolves a known property at tier 1 without creating a duplicate', async () => {
        const hotel = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-TAJ'),
          name: TAJ.name,
          address: TAJ.address,
          city: TAJ.city,
          countryCode: IN,
          location: TAJ.location,
          starRating: 5,
          imageUrls: [],
          amenityLabels: [],
        });

        const hotels = [
          supplierHotelFixture(TJ, {
            id: 'TJ-TAJ',
            name: TAJ.name,
            city: 'Goa',
            location: TAJ.location,
            starRating: 5,
          }),
        ];
        const outcome = await matchSupplierHotels(hotels, {
          properties: repo,
          logger: silentLogger,
        });

        expect(outcome.matches[0]?.canonical.klarHotelId).toBe(hotel.klarHotelId);
        expect(outcome.matches[0]?.confidence).toBe('EXACT_SUPPLIER_MAPPING');
      });

      it('merges a second supplier onto the same hotel and remembers it', async () => {
        const hotel = await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-TAJ'),
          name: TAJ.name,
          address: TAJ.address,
          city: TAJ.city,
          countryCode: IN,
          location: TAJ.location,
          starRating: 5,
          imageUrls: [],
          amenityLabels: [],
        });

        const hotels = [
          supplierHotelFixture(RG, {
            id: 'RG-TAJ',
            name: 'Taj Exotica Resort & Spa',
            city: 'Goa',
            address: 'Calwaddo, Benaulim, Goa',
            location: { lat: 15.2597, lng: 73.9189 },
            starRating: 5,
          }),
        ];
        const outcome = await matchSupplierHotels(hotels, {
          properties: repo,
          logger: silentLogger,
        });

        expect(outcome.matches[0]?.canonical.klarHotelId).toBe(hotel.klarHotelId);
        expect(outcome.mergesPerformed).toBe(1);

        // Written back, so the next search resolves it at tier 1.
        const found = await repo.findBySupplierRefs([
          { supplier: RG, supplierHotelId: supplierHotelId('RG-TAJ') },
        ]);
        expect(found.get(supplierRefKey(RG, 'RG-TAJ'))?.klarHotelId).toBe(hotel.klarHotelId);
      });

      it('keeps two different properties apart at the same coordinates', async () => {
        const pin = { lat: 15.4909, lng: 73.8278 };
        await repo.createFromSupplier({
          supplier: TJ,
          supplierHotelId: supplierHotelId('TJ-A'),
          name: 'Sunset Villas',
          city: 'Goa',
          countryCode: IN,
          location: pin,
          imageUrls: [],
          amenityLabels: [],
        });

        const hotels = [
          supplierHotelFixture(RG, {
            id: 'RG-B',
            name: 'Coral Reef Guesthouse',
            city: 'Goa',
            location: pin,
          }),
        ];
        const outcome = await matchSupplierHotels(hotels, {
          properties: repo,
          logger: silentLogger,
        });

        expect(outcome.mergesPerformed).toBe(0);
        expect(outcome.matches[0]?.confidence).toBe('UNMATCHED');
      });
    });
  });
}
