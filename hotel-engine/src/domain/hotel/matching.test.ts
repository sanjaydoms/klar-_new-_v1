import { describe, expect, it } from 'vitest';
import {
  addressOverlap,
  NAME_SIMILARITY,
  nameSimilarity,
  normalizeName,
  significantTokens,
} from './name-normalization.js';
import {
  hasEnoughSignals,
  isMergeable,
  weakest,
  type MatchSignal,
} from './match-confidence.js';
import { distanceMetres, hasUsableLocation } from './canonical-hotel.js';

describe('name normalisation', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalizeName('Hôtel Le Méridien, N. Delhi')).toBe('hotel le meridien n delhi');
  });

  it('drops generic words that carry no distinguishing power', () => {
    expect(significantTokens('The Grand Hotel')).toEqual(['grand']);
  });

  it('falls back to all tokens rather than producing an empty set', () => {
    // Otherwise every generically-named property in a city compares equal.
    expect(significantTokens('The Hotel')).toEqual(['the', 'hotel']);
    expect(nameSimilarity('The Hotel', 'The Resort')).toBeLessThan(NAME_SIMILARITY.MEDIUM);
  });
});

/**
 * D-7: the reference matcher used substring containment gated on length > 5, so
 * "Marriott" merged into "Marriott Executive Apartments".
 */
describe('name similarity (regression: D-7)', () => {
  it('does not treat a chain name as its own sub-brand', () => {
    const score = nameSimilarity('Marriott', 'Marriott Executive Apartments');
    expect(score).toBeLessThan(NAME_SIMILARITY.MEDIUM);
  });

  it('still matches the same hotel written two ways', () => {
    expect(
      nameSimilarity('Taj Exotica Resort & Spa', 'Taj Exotica Resort and Spa'),
    ).toBeGreaterThanOrEqual(NAME_SIMILARITY.HIGH);
  });

  it('matches across word order and punctuation', () => {
    expect(nameSimilarity('Grand Hyatt Goa', 'Hyatt Grand, Goa')).toBeGreaterThanOrEqual(
      NAME_SIMILARITY.HIGH,
    );
  });

  it('separates two properties of one chain in one city', () => {
    expect(
      nameSimilarity('Novotel Goa Candolim', 'Novotel Goa Dona Sylvia'),
    ).toBeLessThan(NAME_SIMILARITY.HIGH);
  });

  it('is symmetric', () => {
    const a = 'Taj Mahal Palace';
    const b = 'The Taj Mahal Palace Hotel';
    expect(nameSimilarity(a, b)).toBe(nameSimilarity(b, a));
  });

  it('scores address overlap as an independent signal', () => {
    expect(
      addressOverlap('Apollo Bunder, Colaba, Mumbai', 'Apollo Bunder Road, Colaba'),
    ).toBeGreaterThan(0.5);
    expect(addressOverlap('Apollo Bunder, Colaba', 'Sahar Road, Andheri East')).toBe(0);
  });
});

describe('merge gating', () => {
  it('never merges below MEDIUM confidence', () => {
    expect(isMergeable('EXACT_SUPPLIER_MAPPING')).toBe(true);
    expect(isMergeable('HIGH_CONFIDENCE')).toBe(true);
    expect(isMergeable('MEDIUM_CONFIDENCE')).toBe(true);
    expect(isMergeable('LOW_CONFIDENCE')).toBe(false);
    expect(isMergeable('UNMATCHED')).toBe(false);
  });

  it('requires two independent signals', () => {
    // Coordinates alone must never merge — suppliers return shared city-centre
    // pins for properties they could not geocode.
    expect(hasEnoughSignals(['PROXIMITY'])).toBe(false);
    expect(hasEnoughSignals(['NORMALIZED_NAME'])).toBe(false);
    expect(hasEnoughSignals(['PROXIMITY', 'NORMALIZED_NAME'])).toBe(true);
  });

  it('accepts a persisted mapping on its own', () => {
    expect(hasEnoughSignals(['PERSISTED_MAPPING'])).toBe(true);
    expect(hasEnoughSignals(['EXTERNAL_ID'])).toBe(true);
  });

  it('counts repeated signals once', () => {
    const signals: MatchSignal[] = ['PROXIMITY', 'PROXIMITY'];
    expect(hasEnoughSignals(signals)).toBe(false);
  });

  it('reports the weakest constituent match, not the best', () => {
    // Otherwise one confident supplier launders an uncertain one.
    expect(weakest(['EXACT_SUPPLIER_MAPPING', 'MEDIUM_CONFIDENCE'])).toBe('MEDIUM_CONFIDENCE');
    expect(weakest([])).toBe('UNMATCHED');
  });
});

describe('location sanity', () => {
  it('rejects the [0,0] no-geocode sentinel', () => {
    expect(hasUsableLocation({ lat: 0, lng: 0 })).toBe(false);
    expect(hasUsableLocation(undefined)).toBe(false);
    expect(hasUsableLocation({ lat: Number.NaN, lng: 12 })).toBe(false);
    expect(hasUsableLocation({ lat: 15.55, lng: 73.75 })).toBe(true);
  });

  it('measures distance in metres', () => {
    // Taj Exotica Benaulim → Colva, roughly 3 km apart.
    const d = distanceMetres({ lat: 15.2596, lng: 73.9188 }, { lat: 15.2793, lng: 73.9226 });
    expect(d).toBeGreaterThan(2_000);
    expect(d).toBeLessThan(4_000);
  });

  it('gives two hotels at identical coordinates no distance to hide behind', () => {
    // Distance says "same place"; the name signal is what must decide.
    const p = { lat: 15.2596, lng: 73.9188 };
    expect(distanceMetres(p, p)).toBe(0);
    expect(nameSimilarity('Beach Resort Goa', 'Sunset Villas Goa')).toBeLessThan(
      NAME_SIMILARITY.MEDIUM,
    );
  });
});
