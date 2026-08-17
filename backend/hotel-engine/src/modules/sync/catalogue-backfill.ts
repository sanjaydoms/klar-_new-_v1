import { countryCode, supplierHotelId, type SupplierCode } from '../../domain/shared/brand.js';
import type { GeoPoint, PropertyType } from '../../domain/hotel/canonical-hotel.js';
import { hasUsableLocation } from '../../domain/hotel/canonical-hotel.js';
import type { Logger, PropertyRepository } from '../ports.js';
import { supplierRefKey } from '../ports.js';

/**
 * Seed the canonical catalogue from the legacy MongoDB hotel collection.
 *
 * ADR-0005: that collection is an **upstream source**, not a runtime
 * dependency. It holds roughly 1.6 M TripJack-derived documents keyed by
 * `tjHotelId`, which is exactly the problem the canonical layer exists to fix —
 * so the backfill reads it once, mints KLAR identities, and records TripJack as
 * one supplier mapping among the eventual several.
 *
 * The transformation is pure and separately tested; the apply step is
 * idempotent, so a re-run after a partial failure resumes rather than
 * duplicating.
 */

/** A document as the legacy collection stores it. Nothing here is trusted. */
export interface LegacyHotelDocument {
  readonly tjHotelId?: unknown;
  readonly name?: unknown;
  readonly cityName?: unknown;
  readonly countryName?: unknown;
  readonly starRating?: unknown;
  readonly address?: unknown;
  readonly location?: { readonly coordinates?: unknown } | null;
  readonly images?: unknown;
  readonly accTypeDesc?: unknown;
  readonly accMultiDesc?: unknown;
  readonly accomodationType?: unknown;
}

export interface BackfillRecord {
  readonly supplierHotelId: string;
  readonly name: string;
  readonly city?: string;
  readonly countryCode?: string;
  readonly address?: string;
  readonly starRating?: number;
  readonly location?: GeoPoint;
  readonly propertyType?: PropertyType;
  readonly imageUrls: readonly string[];
  readonly amenityLabels: readonly string[];
}

export type SkipReason =
  | 'NO_SUPPLIER_ID'
  | 'NO_NAME'
  | 'BAD_COORDINATES'
  | 'IMPLAUSIBLE_STAR_RATING';

export interface TransformResult {
  readonly record?: BackfillRecord;
  readonly skipped?: SkipReason;
}

/**
 * Country names, not codes: the legacy collection stores `countryName`.
 *
 * Only exact, unambiguous names map. Anything else leaves the country unset —
 * a wrong country code silently changes which markup region a hotel is priced
 * under, so guessing is worse than omitting.
 */
const COUNTRY_BY_NAME: Readonly<Record<string, string>> = {
  india: 'IN',
  'united arab emirates': 'AE',
  singapore: 'SG',
  thailand: 'TH',
  malaysia: 'MY',
  indonesia: 'ID',
  'sri lanka': 'LK',
  maldives: 'MV',
  nepal: 'NP',
  'united kingdom': 'GB',
  'united states': 'US',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  spain: 'ES',
  australia: 'AU',
};

const PROPERTY_TYPE_BY_KEYWORD: ReadonlyArray<readonly [RegExp, PropertyType]> = [
  [/\bresort\b/i, 'RESORT'],
  [/\b(apartment|serviced|studio)\b/i, 'APARTMENT'],
  [/\b(villa|bungalow|cottage)\b/i, 'VILLA'],
  [/\b(hostel|dorm)\b/i, 'HOSTEL'],
  [/\b(guest\s*house|guesthouse)\b/i, 'GUESTHOUSE'],
  [/\bhomestay\b/i, 'HOMESTAY'],
  [/\bmotel\b/i, 'MOTEL'],
  [/\blodge\b/i, 'LODGE'],
  [/\b(camp|tent)\b/i, 'CAMP'],
  [/\b(hotel|inn|palace)\b/i, 'HOTEL'],
];

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;

/**
 * One legacy document → one canonical record, or a reason it was skipped.
 *
 * Skipping is reported rather than silent. A backfill that quietly drops 40,000
 * documents looks exactly like one that succeeded.
 */
export function transformLegacyHotel(doc: LegacyHotelDocument): TransformResult {
  const supplierId = str(doc.tjHotelId);
  if (supplierId === undefined) return { skipped: 'NO_SUPPLIER_ID' };

  const name = str(doc.name);
  if (name === undefined) return { skipped: 'NO_NAME' };

  // Mongo stores [lng, lat] — the reverse of every other representation here.
  // Getting this backwards puts Goa in Somalia, and the `[0,0]` sentinel puts
  // it in the Gulf of Guinea alongside every other ungeocoded property.
  let location: GeoPoint | undefined;
  const coords = doc.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    const candidate = { lat, lng };
    if (hasUsableLocation(candidate)) location = candidate;
    else if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { skipped: 'BAD_COORDINATES' };
    }
  }

  const starRaw = Number(doc.starRating);
  if (Number.isFinite(starRaw) && (starRaw < 0 || starRaw > 5)) {
    return { skipped: 'IMPLAUSIBLE_STAR_RATING' };
  }
  const starRating = Number.isFinite(starRaw) && starRaw > 0 ? starRaw : undefined;

  const countryName = str(doc.countryName)?.toLowerCase();
  const country = countryName !== undefined ? COUNTRY_BY_NAME[countryName] : undefined;

  const typeText = [str(doc.accTypeDesc), str(doc.accMultiDesc), str(doc.accomodationType), name]
    .filter(Boolean)
    .join(' ');
  let propertyType: PropertyType | undefined;
  for (const [pattern, type] of PROPERTY_TYPE_BY_KEYWORD) {
    if (pattern.test(typeText)) {
      propertyType = type;
      break;
    }
  }

  const imageUrls = Array.isArray(doc.images)
    ? [...new Set(doc.images.filter((i): i is string => typeof i === 'string' && /^https?:\/\//i.test(i)))]
    : [];

  return {
    record: {
      supplierHotelId: supplierId,
      name,
      ...(str(doc.cityName) !== undefined ? { city: str(doc.cityName) as string } : {}),
      ...(country !== undefined ? { countryCode: country } : {}),
      ...(str(doc.address) !== undefined ? { address: str(doc.address) as string } : {}),
      ...(starRating !== undefined ? { starRating } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(propertyType !== undefined ? { propertyType } : {}),
      imageUrls,
      // The legacy collection carries no amenity data, and inventing some from
      // the star rating is precisely the defect this rebuild removed (D-18).
      amenityLabels: [],
    },
  };
}

export interface BackfillSummary {
  readonly read: number;
  readonly created: number;
  readonly alreadyPresent: number;
  readonly skipped: Readonly<Record<SkipReason, number>>;
}

export interface BackfillOptions {
  readonly supplier: SupplierCode;
  readonly properties: PropertyRepository;
  readonly logger: Logger;
  readonly batchSize?: number;
}

/**
 * Apply a stream of legacy documents.
 *
 * Idempotent: a document whose supplier id already maps to a canonical hotel is
 * counted and skipped, so re-running after a partial failure resumes instead of
 * minting a second identity for the same property.
 */
export async function backfillCatalogue(
  documents: AsyncIterable<LegacyHotelDocument> | Iterable<LegacyHotelDocument>,
  opts: BackfillOptions,
): Promise<BackfillSummary> {
  const batchSize = opts.batchSize ?? 500;
  const skipped: Record<SkipReason, number> = {
    NO_SUPPLIER_ID: 0,
    NO_NAME: 0,
    BAD_COORDINATES: 0,
    IMPLAUSIBLE_STAR_RATING: 0,
  };

  let read = 0;
  let created = 0;
  let alreadyPresent = 0;
  let batch: BackfillRecord[] = [];

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;

    const existing = await opts.properties.findBySupplierRefs(
      batch.map((r) => ({
        supplier: opts.supplier,
        supplierHotelId: supplierHotelId(r.supplierHotelId),
      })),
    );

    // A legacy collection of 1.6 M documents repeats ids. Deduplicating only
    // against the store missed repeats *within* a batch, so the same property
    // was created twice — and `created` counted both.
    const seen = new Set<string>();

    for (const record of batch) {
      // The store's own key function, not a hand-rolled copy of its format: a
      // private duplicate of a shared key is how the in-memory repository
      // quietly stopped agreeing with the real one (§1.3).
      const key = supplierRefKey(opts.supplier, record.supplierHotelId);
      if (existing.has(key) || seen.has(key)) {
        alreadyPresent += 1;
        continue;
      }
      seen.add(key);
      await opts.properties.createFromSupplier({
        supplier: opts.supplier,
        supplierHotelId: supplierHotelId(record.supplierHotelId),
        name: record.name,
        ...(record.address !== undefined ? { address: record.address } : {}),
        ...(record.city !== undefined ? { city: record.city } : {}),
        ...(record.countryCode !== undefined ? { countryCode: countryCode(record.countryCode) } : {}),
        ...(record.location !== undefined ? { location: record.location } : {}),
        ...(record.starRating !== undefined ? { starRating: record.starRating } : {}),
        ...(record.propertyType !== undefined ? { propertyType: record.propertyType } : {}),
        imageUrls: record.imageUrls,
        amenityLabels: record.amenityLabels,
      });
      created += 1;
    }
    batch = [];
  };

  for await (const doc of documents as AsyncIterable<LegacyHotelDocument>) {
    read += 1;
    const { record, skipped: reason } = transformLegacyHotel(doc);
    if (reason !== undefined) {
      skipped[reason] += 1;
      continue;
    }
    if (record !== undefined) batch.push(record);
    if (batch.length >= batchSize) await flush();
  }
  await flush();

  const summary: BackfillSummary = { read, created, alreadyPresent, skipped };
  opts.logger.info('catalogue backfill complete', { ...summary, skipped: { ...skipped } });
  return summary;
}
