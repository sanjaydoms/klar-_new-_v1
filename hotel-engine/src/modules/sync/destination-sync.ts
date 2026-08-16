import type { SupplierCode } from '../../domain/shared/brand.js';
import { normalizeName, nameSimilarity } from '../../domain/hotel/name-normalization.js';
import { clampRadiusKm } from '../../domain/destination/canonical-destination.js';
import type { Logger } from '../ports.js';

/**
 * Reconcile a supplier's destination list against KLAR's own destinations.
 *
 * Supplier destination lists do not agree with each other, and neither is
 * authoritative: RateGain's `getDestinations` returns entries like
 * `"Dehradun India"` with an opaque `destCode`, while TripJack has no
 * destination concept at all and is searched by candidate hotel ids. The
 * canonical destination is KLAR's, and this job records how each supplier
 * names it.
 *
 * As with property matching, an uncertain pairing is recorded rather than
 * guessed: a destination mapped to the wrong code sends every search for that
 * city to a different city.
 */

export interface SupplierDestination {
  readonly code: string;
  /** As the supplier names it, e.g. "Dehradun India". */
  readonly name: string;
  readonly countryCode?: string;
}

export interface CanonicalDestinationRecord {
  readonly klarDestinationId: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly countryCode: string;
  readonly aliases: readonly string[];
}

export type DestinationMatchOutcome =
  | { readonly kind: 'MATCHED'; readonly klarDestinationId: string; readonly score: number }
  | { readonly kind: 'AMBIGUOUS'; readonly candidates: readonly string[] }
  | { readonly kind: 'UNMATCHED' };

/** Confident enough to map without review. */
export const DESTINATION_MATCH_THRESHOLD = 0.8;
/** Two candidates this close together are a coin toss, not a match. */
export const DESTINATION_AMBIGUITY_MARGIN = 0.05;

/**
 * Pair a supplier destination with a canonical one.
 *
 * The country is a hard gate, not a signal: "Springfield" exists in a dozen
 * countries, and a name match across a border is always wrong. Aliases are
 * checked as exact alternatives so "Bombay" resolves to Mumbai without needing
 * to score well against it.
 */
export function matchDestination(
  supplierDestination: SupplierDestination,
  canonical: readonly CanonicalDestinationRecord[],
): DestinationMatchOutcome {
  const eligible =
    supplierDestination.countryCode === undefined
      ? canonical
      : canonical.filter((c) => c.countryCode === supplierDestination.countryCode);
  if (eligible.length === 0) return { kind: 'UNMATCHED' };

  const normalized = normalizeName(supplierDestination.name);

  // Every exact hit, not the first one. `find` returned whichever happened to
  // be first in the list, so a supplier entry with no country — where the
  // country gate above is skipped entirely — silently mapped "Springfield" to
  // one of several Springfields, at score 1, bypassing the ambiguity check that
  // exists for precisely this. An arbitrary choice here sends every search for
  // that city to a different country.
  const exact = eligible.filter(
    (c) =>
      c.normalizedName === normalized ||
      c.aliases.some((a) => normalizeName(a) === normalized),
  );
  if (exact.length > 1) {
    return { kind: 'AMBIGUOUS', candidates: exact.map((c) => c.klarDestinationId) };
  }
  if (exact.length === 1) {
    return { kind: 'MATCHED', klarDestinationId: (exact[0] as CanonicalDestinationRecord).klarDestinationId, score: 1 };
  }

  const scored = eligible
    .map((c) => ({
      id: c.klarDestinationId,
      score: Math.max(
        nameSimilarity(c.name, supplierDestination.name),
        ...c.aliases.map((a) => nameSimilarity(a, supplierDestination.name)),
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best === undefined || best.score < DESTINATION_MATCH_THRESHOLD) {
    return { kind: 'UNMATCHED' };
  }

  const runnerUp = scored[1];
  if (runnerUp !== undefined && best.score - runnerUp.score < DESTINATION_AMBIGUITY_MARGIN) {
    return { kind: 'AMBIGUOUS', candidates: [best.id, runnerUp.id] };
  }

  return { kind: 'MATCHED', klarDestinationId: best.id, score: best.score };
}

export interface DestinationMappingWrite {
  readonly supplier: SupplierCode;
  readonly klarDestinationId: string;
  readonly supplierDestCode: string;
}

export interface DestinationSyncStore {
  listCanonical(): Promise<readonly CanonicalDestinationRecord[]>;
  upsertMapping(mapping: DestinationMappingWrite): Promise<void>;
  recordUnmapped(input: {
    supplier: SupplierCode;
    code: string;
    name: string;
    reason: string;
  }): Promise<void>;
}

export interface DestinationSyncSummary {
  readonly read: number;
  readonly mapped: number;
  readonly ambiguous: number;
  readonly unmatched: number;
  /**
   * Entries that matched a canonical destination another entry had already
   * claimed. Reported rather than silently overwriting the incumbent.
   */
  readonly collided: number;
}

export async function syncSupplierDestinations(input: {
  supplier: SupplierCode;
  destinations: readonly SupplierDestination[];
  store: DestinationSyncStore;
  logger: Logger;
}): Promise<DestinationSyncSummary> {
  const canonical = await input.store.listCanonical();
  let mapped = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let collided = 0;
  const claimed = new Map<string, string>();

  for (const destination of input.destinations) {
    const outcome = matchDestination(destination, canonical);

    if (outcome.kind === 'MATCHED') {
      // `destination_mapping` is keyed `(supplier, klar_destination_id)`, so a
      // second supplier destination resolving to the same canonical place does
      // not add a mapping — it REPLACES the first, and the run reports both as
      // mapped. Whichever code the supplier happened to list last then defines
      // the destination for every future search. Record the clash instead.
      const incumbent = claimed.get(outcome.klarDestinationId);
      if (incumbent !== undefined) {
        await input.store.recordUnmapped({
          supplier: input.supplier,
          code: destination.code,
          name: destination.name,
          reason: `resolves to ${outcome.klarDestinationId}, already mapped from code ${incumbent}`,
        });
        collided += 1;
        continue;
      }
      claimed.set(outcome.klarDestinationId, destination.code);

      await input.store.upsertMapping({
        supplier: input.supplier,
        klarDestinationId: outcome.klarDestinationId,
        supplierDestCode: destination.code,
      });
      mapped += 1;
      continue;
    }

    // Both remaining outcomes go to review. An ambiguous pairing is more
    // dangerous than no pairing: an unmapped destination makes the supplier
    // ineligible, which is visible, while a wrong one silently searches the
    // wrong city.
    await input.store.recordUnmapped({
      supplier: input.supplier,
      code: destination.code,
      name: destination.name,
      reason:
        outcome.kind === 'AMBIGUOUS'
          ? `ambiguous between ${outcome.candidates.join(' and ')}`
          : 'no canonical destination scored above the threshold',
    });
    if (outcome.kind === 'AMBIGUOUS') ambiguous += 1;
    else unmatched += 1;
  }

  const summary = { read: input.destinations.length, mapped, ambiguous, unmatched, collided };
  input.logger.info('destination sync complete', { supplier: input.supplier, ...summary });
  return summary;
}

/**
 * Search radius from a geocoded bounding box.
 *
 * The reference resolved a radius per search from a live geocoder call, which
 * put a third-party HTTP dependency on the critical path of every cold search.
 * It belongs here, computed once when a destination is created or refreshed.
 */
export function radiusFromBoundingBox(box: {
  north: number;
  south: number;
  east: number;
  west: number;
}): number {
  const latSpanKm = Math.abs(box.north - box.south) * 111.32;
  const midLat = ((box.north + box.south) / 2) * (Math.PI / 180);
  const lngSpanKm = Math.abs(box.east - box.west) * 111.32 * Math.cos(midLat);
  // Half the diagonal: the circle that covers the box, not the one inside it.
  return clampRadiusKm(Math.sqrt(latSpanKm ** 2 + lngSpanKm ** 2) / 2);
}
