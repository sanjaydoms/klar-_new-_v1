import type { CanonicalHotel } from '../../domain/hotel/canonical-hotel.js';
import { distanceMetres, hasUsableLocation } from '../../domain/hotel/canonical-hotel.js';
import type { MatchConfidence, MatchSignal } from '../../domain/hotel/match-confidence.js';
import { hasEnoughSignals, isMergeable, shouldPersistMapping } from '../../domain/hotel/match-confidence.js';
import { NAME_SIMILARITY, addressOverlap, nameSimilarity } from '../../domain/hotel/name-normalization.js';
import type { SupplierHotel } from '../../suppliers/contract/dto.js';
import type { Logger, PropertyRepository, SupplierRef } from '../ports.js';
import { supplierRefKey } from '../ports.js';

/**
 * Resolve supplier properties to KLAR's own identity (ADR-0001).
 *
 * The tiers, and the rule that at least two independent signals are required
 * before anything merges, live in the domain. This module is the part that
 * needs the catalogue: it looks up persisted mappings, scores candidates, and
 * writes back what it resolves so the next search for the same destination is a
 * tier-1 lookup.
 *
 * A false merge shows a customer a price for a property they will not be
 * staying in, so every ambiguous case resolves to "separate hotels" and is
 * queued for review rather than guessed at.
 */

/** Tier 3 merges and persists; tier 4 merges and is flagged. */
export const PROXIMITY_HIGH_M = 150;
export const PROXIMITY_MEDIUM_M = 500;

export interface MatchResult {
  readonly supplierHotel: SupplierHotel;
  readonly canonical: CanonicalHotel;
  readonly confidence: MatchConfidence;
  readonly matchedBy: readonly MatchSignal[];
}

export interface MatchOutcome {
  readonly matches: readonly MatchResult[];
  readonly mergesPerformed: number;
  readonly rejectedLowConfidence: number;
  /**
   * Mappings the store declined because that supplier already maps the hotel.
   * Nonzero means concurrent searches are racing the same property — worth
   * seeing, and not an error.
   */
  readonly writeBacksRefused: number;
}

interface Scored {
  readonly canonical: CanonicalHotel;
  readonly confidence: MatchConfidence;
  readonly signals: MatchSignal[];
  readonly score: number;
}

/**
 * Do the two sides carry the same third-party id under the same scheme?
 *
 * Empty on either side is not agreement. A blank value is not agreement either
 * — suppliers pad absent ids with empty strings, and two blanks matching would
 * merge every property that lacks one.
 */
export function externalIdsAgree(
  supplier: Readonly<Record<string, string>> | undefined,
  candidate: Readonly<Record<string, string>> | undefined,
): boolean {
  if (supplier === undefined || candidate === undefined) return false;
  for (const [scheme, value] of Object.entries(supplier)) {
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    if (candidate[scheme]?.trim() === value.trim()) return true;
  }
  return false;
}

/**
 * Score one supplier property against one catalogue candidate.
 *
 * Name similarity is token-set, not substring containment: the extra tokens in
 * a longer name count against the match, so "Marriott" does not merge into
 * "Marriott Executive Apartments".
 */
export function scoreCandidate(
  supplierHotel: SupplierHotel,
  candidate: CanonicalHotel,
): Scored | null {
  const signals: MatchSignal[] = [];

  // Tier 2 — a neutral third-party identifier for the same PROPERTY.
  //
  // Both sides must agree on the scheme as well as the value: `giata:1234567`
  // matches `giata:1234567` and nothing else. Comparing values across schemes —
  // or against a chain code, as an earlier version did — would let a brand
  // identifier stand in for a property identifier and merge every hotel of that
  // chain into one canonical record, at the highest confidence and with a
  // persisted mapping written back. Inert until a content source is licensed
  // (ADR-0000 §7); activating it needs no change here.
  if (externalIdsAgree(supplierHotel.externalIds, candidate.externalIds)) {
    return {
      canonical: candidate,
      confidence: 'EXACT_SUPPLIER_MAPPING',
      signals: ['EXTERNAL_ID'],
      score: 1,
    };
  }

  const nameScore = nameSimilarity(supplierHotel.name, candidate.name);
  if (nameScore >= NAME_SIMILARITY.MEDIUM) signals.push('NORMALIZED_NAME');

  // Coordinates alone never merge — suppliers hand back a shared city-centre
  // pin for properties they could not geocode, so proximity on its own is
  // evidence of nothing.
  let distance: number | undefined;
  if (hasUsableLocation(supplierHotel.location) && hasUsableLocation(candidate.location)) {
    distance = distanceMetres(supplierHotel.location, candidate.location);
    if (distance <= PROXIMITY_MEDIUM_M) signals.push('PROXIMITY');
  }

  const addressScore = addressOverlap(supplierHotel.address, candidate.address);
  if (addressScore >= 0.5) signals.push('ADDRESS_TOKENS');

  const sameCity =
    supplierHotel.city !== undefined &&
    candidate.city !== undefined &&
    supplierHotel.city.trim().toLowerCase() === candidate.city.trim().toLowerCase();
  if (sameCity) signals.push('CITY');

  const starsClose =
    supplierHotel.starRating !== undefined &&
    candidate.starRating !== undefined &&
    Math.abs(supplierHotel.starRating - candidate.starRating) <= 1;
  if (starsClose) signals.push('STAR_RATING');

  if (!hasEnoughSignals(signals)) return null;

  const closeEnoughHigh = distance !== undefined && distance <= PROXIMITY_HIGH_M;
  const closeEnoughMedium = distance !== undefined && distance <= PROXIMITY_MEDIUM_M;

  if (nameScore >= NAME_SIMILARITY.HIGH && closeEnoughHigh && addressScore >= 0.5) {
    return { canonical: candidate, confidence: 'HIGH_CONFIDENCE', signals, score: nameScore };
  }
  if (nameScore >= NAME_SIMILARITY.MEDIUM && closeEnoughMedium && sameCity && starsClose) {
    return { canonical: candidate, confidence: 'MEDIUM_CONFIDENCE', signals, score: nameScore };
  }
  return { canonical: candidate, confidence: 'LOW_CONFIDENCE', signals, score: nameScore };
}

export interface MatcherDeps {
  readonly properties: PropertyRepository;
  readonly logger: Logger;
  /**
   * Write confirmed matches and review-queue entries back.
   *
   * Off in read-only contexts such as previews, and off once a search has
   * overrun its deadline — both write-backs help the *next* search and neither
   * changes what this one returns.
   */
  readonly persistMatches?: boolean;
}

/**
 * Resolve a batch of supplier properties in one pass.
 *
 * Tier 1 is a single bulk lookup for the whole batch rather than one query per
 * hotel; only what it misses goes on to candidate scoring.
 */
export async function matchSupplierHotels(
  supplierHotels: readonly SupplierHotel[],
  deps: MatcherDeps,
): Promise<MatchOutcome> {
  if (supplierHotels.length === 0) {
    return { matches: [], mergesPerformed: 0, rejectedLowConfidence: 0, writeBacksRefused: 0 };
  }

  const refs: SupplierRef[] = supplierHotels.map((h) => ({
    supplier: h.supplier,
    supplierHotelId: h.supplierHotelId,
  }));
  const known = await deps.properties.findBySupplierRefs(refs);

  const matches: MatchResult[] = [];
  let mergesPerformed = 0;
  let rejectedLowConfidence = 0;
  let writeBacksRefused = 0;

  for (const supplierHotel of supplierHotels) {
    const key = supplierRefKey(supplierHotel.supplier, supplierHotel.supplierHotelId);
    const mapped = known.get(key);

    // Tier 1.
    if (mapped !== undefined) {
      matches.push({
        supplierHotel,
        canonical: mapped,
        confidence: 'EXACT_SUPPLIER_MAPPING',
        matchedBy: ['PERSISTED_MAPPING'],
      });
      continue;
    }

    const candidates = await deps.properties.findMatchCandidates({
      name: supplierHotel.name,
      ...(supplierHotel.location !== undefined ? { location: supplierHotel.location } : {}),
      ...(supplierHotel.city !== undefined ? { city: supplierHotel.city } : {}),
      ...(supplierHotel.countryCode !== undefined ? { countryCode: supplierHotel.countryCode } : {}),
    });

    let best: Scored | null = null;
    for (const candidate of candidates) {
      // A candidate this supplier already maps to elsewhere is not a match for
      // a *different* property of the same supplier.
      if (candidate.supplierMappings.some((m) => m.supplier === supplierHotel.supplier)) continue;
      const scored = scoreCandidate(supplierHotel, candidate);
      if (scored === null) continue;
      if (best === null || scored.score > best.score) best = scored;
    }

    if (best !== null && isMergeable(best.confidence)) {
      matches.push({
        supplierHotel,
        canonical: best.canonical,
        confidence: best.confidence,
        matchedBy: best.signals,
      });
      mergesPerformed += 1;

      if (deps.persistMatches !== false && shouldPersistMapping(best.confidence)) {
        const persisted = await deps.properties.persistMapping({
          klarHotelId: best.canonical.klarHotelId,
          supplier: supplierHotel.supplier,
          supplierHotelId: supplierHotel.supplierHotelId,
          confidence: best.confidence,
          matchedBy: best.signals,
        });
        // The store already maps this supplier to this hotel under another id.
        // The screen above missed it because a concurrent search wrote between
        // the read and this write. This search's merge still stands — it was
        // decided on the state we loaded — and the next one re-evaluates.
        if (!persisted) {
          writeBacksRefused += 1;
          deps.logger.debug('mapping refused: supplier already maps this hotel', {
            supplier: supplierHotel.supplier,
            supplierHotelId: supplierHotel.supplierHotelId,
            klarHotelId: best.canonical.klarHotelId,
          });
        }
      }
      continue;
    }

    // Below MEDIUM the property stands alone. A duplicate in the results is a
    // far cheaper mistake than sending someone to the wrong hotel.
    if (best !== null) {
      rejectedLowConfidence += 1;
      if (deps.persistMatches !== false) {
        await deps.properties.recordUnresolved({
          supplier: supplierHotel.supplier,
          supplierHotelId: supplierHotel.supplierHotelId,
          name: supplierHotel.name,
          nearestKlarHotelId: best.canonical.klarHotelId,
          score: best.score,
          reason: `only ${new Set(best.signals).size} independent signal(s): ${best.signals.join(', ')}`,
        });
      }
      deps.logger.debug('match rejected as too weak', {
        supplier: supplierHotel.supplier,
        name: supplierHotel.name,
        score: best.score,
      });
    }

    const created = await deps.properties.createFromSupplier({
      supplier: supplierHotel.supplier,
      supplierHotelId: supplierHotel.supplierHotelId,
      name: supplierHotel.name,
      ...(supplierHotel.address !== undefined ? { address: supplierHotel.address } : {}),
      ...(supplierHotel.city !== undefined ? { city: supplierHotel.city } : {}),
      ...(supplierHotel.countryCode !== undefined ? { countryCode: supplierHotel.countryCode } : {}),
      ...(supplierHotel.location !== undefined ? { location: supplierHotel.location } : {}),
      ...(supplierHotel.starRating !== undefined ? { starRating: supplierHotel.starRating } : {}),
      ...(supplierHotel.propertyType !== undefined ? { propertyType: supplierHotel.propertyType } : {}),
      ...(supplierHotel.chainCode !== undefined ? { chainCode: supplierHotel.chainCode } : {}),
      imageUrls: supplierHotel.imageUrls,
      amenityLabels: supplierHotel.amenityLabels,
    });

    matches.push({
      supplierHotel,
      canonical: created,
      confidence: 'UNMATCHED',
      matchedBy: [],
    });
  }

  return { matches, mergesPerformed, rejectedLowConfidence, writeBacksRefused };
}
