import { describe, expect, it } from 'vitest';
import { countryCode, klarHotelId, supplierCode, supplierHotelId } from '../../domain/shared/brand.js';
import type { CanonicalHotel } from '../../domain/hotel/canonical-hotel.js';
import type { SupplierHotel } from '../../suppliers/contract/dto.js';
import { externalIdsAgree, scoreCandidate } from './matcher.js';

const TJ = supplierCode('TJ');
const IN = countryCode('IN');

/**
 * Two Marriotts in the same city — different properties, same brand.
 *
 * This is the pair match tier 2 must never collapse. Their names, coordinates
 * and addresses all differ; the only thing they share is a chain.
 */
const canonicalMarriott = (over: Partial<CanonicalHotel> = {}): CanonicalHotel =>
  ({
    klarHotelId: klarHotelId('KLAR-MARRIOTT-WHITEFIELD'),
    name: 'Marriott Whitefield',
    normalizedName: 'marriott whitefield',
    city: 'Bengaluru',
    address: '8th Road, Whitefield, Bengaluru',
    countryCode: IN,
    location: { lat: 12.9698, lng: 77.7499 },
    starRating: 5,
    chainCode: 'Marriott',
    images: [],
    amenities: [],
    supplierMappings: [],
    ...over,
  }) as CanonicalHotel;

const supplierMarriott = (over: Partial<SupplierHotel> = {}): SupplierHotel => ({
  supplier: TJ,
  supplierHotelId: supplierHotelId('TJ-KORAMANGALA'),
  name: 'Marriott Koramangala',
  city: 'Bengaluru',
  address: '20th Main, Koramangala, Bengaluru',
  countryCode: IN,
  // ~11 km away — nowhere near the 500 m proximity signal.
  location: { lat: 12.9352, lng: 77.6245 },
  starRating: 5,
  chainCode: 'Marriott',
  imageUrls: [],
  amenityLabels: [],
  rates: [],
  ...over,
});

describe('externalIdsAgree', () => {
  it('agrees only on the same value under the same scheme', () => {
    expect(externalIdsAgree({ giata: '1234567' }, { giata: '1234567' })).toBe(true);
    expect(externalIdsAgree({ giata: '1234567' }, { giata: '7654321' })).toBe(false);
    // Same value, different scheme. A GIATA id is not an HRS id.
    expect(externalIdsAgree({ giata: '1234567' }, { hrs: '1234567' })).toBe(false);
  });

  it('treats absent and blank ids as no evidence', () => {
    expect(externalIdsAgree(undefined, { giata: '1' })).toBe(false);
    expect(externalIdsAgree({ giata: '1' }, undefined)).toBe(false);
    expect(externalIdsAgree({}, {})).toBe(false);
    // Suppliers pad missing ids with blanks; two blanks are not a match.
    expect(externalIdsAgree({ giata: '' }, { giata: '' })).toBe(false);
    expect(externalIdsAgree({ giata: '   ' }, { giata: '   ' })).toBe(false);
  });
});

describe('match tier 2 (ADR-0001)', () => {
  /**
   * The regression this file exists for.
   *
   * Tier 2 used to compare the supplier's `chainCode` against the canonical
   * hotel's `externalIds` values. A chain code identifies a brand, so the
   * moment a content source populated `external_ids` every Marriott in the
   * city would have matched the first one at EXACT_SUPPLIER_MAPPING — the
   * highest confidence, ahead of the two-signal rule, and persisted as a
   * tier-1 mapping thereafter. ADR-0001 exists to prevent exactly this.
   */
  it('does not merge two properties of one chain on their chain code', () => {
    const scored = scoreCandidate(
      supplierMarriott(),
      canonicalMarriott({ externalIds: { giata: 'Marriott' } }),
    );
    expect(scored?.confidence).not.toBe('EXACT_SUPPLIER_MAPPING');
  });

  it('does not merge them on a chain code even when both sides carry one', () => {
    const scored = scoreCandidate(
      supplierMarriott({ externalIds: { chain: 'Marriott' } }),
      canonicalMarriott({ externalIds: { giata: 'Marriott' } }),
    );
    // Same value, different scheme — a chain label is not a property identity.
    expect(scored?.confidence).not.toBe('EXACT_SUPPLIER_MAPPING');
  });

  it('still merges on a genuine property-level id, ahead of every other signal', () => {
    const scored = scoreCandidate(
      supplierMarriott({ externalIds: { giata: '1234567' } }),
      canonicalMarriott({ externalIds: { giata: '1234567' } }),
    );
    expect(scored?.confidence).toBe('EXACT_SUPPLIER_MAPPING');
    expect(scored?.signals).toEqual(['EXTERNAL_ID']);
  });

  it('is inert while no content source is licensed (ADR-0000 §7)', () => {
    // Neither side carries external ids today, so tier 2 contributes nothing
    // and the decision falls to the ordinary signal tiers.
    const scored = scoreCandidate(supplierMarriott(), canonicalMarriott());
    expect(scored?.confidence).not.toBe('EXACT_SUPPLIER_MAPPING');
  });
});
