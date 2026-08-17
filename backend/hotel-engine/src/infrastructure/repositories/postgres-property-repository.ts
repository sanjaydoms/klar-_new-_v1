import {
  countryCode,
  klarHotelId,
  supplierCode,
  supplierHotelId,
  type CountryCode,
  type KlarHotelId,
  type SupplierCode,
  type SupplierHotelId,
} from '../../domain/shared/brand.js';
import type {
  Amenity,
  CanonicalHotel,
  GeoPoint,
  HotelImage,
  PropertyType,
  SupplierPropertyMapping,
} from '../../domain/hotel/canonical-hotel.js';
import type { MatchConfidence, MatchSignal } from '../../domain/hotel/match-confidence.js';
import { normalizeName, significantTokens } from '../../domain/hotel/name-normalization.js';
import type {
  MappingWriteback,
  MatchCandidateQuery,
  PropertyRepository,
  SupplierRef,
  UnresolvedMatch,
} from '../../modules/ports.js';
import { supplierRefKey } from '../../modules/ports.js';
import type { Database, SqlRow, SqlValue } from '../db/database.js';
import { asJson, asNumber, asString, placeholders } from '../db/database.js';

/**
 * The canonical catalogue, on Postgres.
 *
 * Two queries carry the matcher (ADR-0001):
 *
 *  - **Tier 1** is one bulk lookup for a whole search, not one per hotel.
 *  - **Tiers 3-4** narrow candidates with a trigram index on the normalised
 *    name and a bounding box on `(lat, lng)`, then hand a small set to the
 *    domain to score. Narrowing in SQL and scoring in the domain is what turns
 *    the reference's O(n²) per-search comparison into O(n) indexed lookups.
 */
export interface PostgresPropertyRepositoryOptions {
  /** Trigram floor for candidate retrieval. Below the domain's MEDIUM gate on
   *  purpose: SQL narrows, the domain decides. */
  readonly nameSimilarityFloor?: number;
  /** Bounding-box half-width for the geo pre-filter. */
  readonly candidateRadiusKm?: number;
  readonly maxCandidates?: number;
  readonly newId?: () => string;
  readonly now?: () => Date;
}

interface HotelRow extends SqlRow {
  klar_hotel_id: string;
  name: string;
  normalized_name: string;
  address: string | null;
  city: string | null;
  country_code: string | null;
  postal_code: string | null;
  lat: number | string | null;
  lng: number | string | null;
  star_rating: number | string | null;
  property_type: string | null;
  brand: string | null;
  chain_code: string | null;
  external_ids: unknown;
  images: unknown;
  amenities: unknown;
  updated_at: unknown;
}

interface MappingRow extends SqlRow {
  klar_hotel_id: string;
  supplier: string;
  supplier_hotel_id: string;
  confidence: string;
  matched_by: unknown;
  verified_at: unknown;
  first_seen_at: unknown;
  last_seen_at: unknown;
}

/**
 * The `(klar_hotel_id, supplier)` uniqueness rule, rejecting a write.
 *
 * Matched on SQLSTATE `23505` plus the index name, so an unrelated unique
 * violation still surfaces as the bug it is rather than being swallowed here.
 * The name is checked against the message too, because not every driver
 * populates `constraint` on the error object.
 */
function isOnePerSupplierViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: unknown; constraint?: unknown; message?: unknown };
  if (e.code !== '23505') return false;
  const index = 'supplier_property_mapping_one_per_supplier';
  return (
    e.constraint === index ||
    (typeof e.message === 'string' && e.message.includes(index))
  );
}

const DEG_LAT_KM = 111.32;

/** Degrees of longitude per km shrink with latitude; near the poles they blow up. */
function lngDegreesFor(km: number, lat: number): number {
  const cos = Math.cos((lat * Math.PI) / 180);
  return Math.abs(cos) < 0.01 ? 180 : km / (DEG_LAT_KM * cos);
}

export class PostgresPropertyRepository implements PropertyRepository {
  readonly #db: Database;
  readonly #floor: number;
  readonly #radiusKm: number;
  readonly #maxCandidates: number;
  readonly #newId: () => string;
  readonly #now: () => Date;

  constructor(db: Database, opts: PostgresPropertyRepositoryOptions = {}) {
    this.#db = db;
    this.#floor = opts.nameSimilarityFloor ?? 0.3;
    this.#radiusKm = opts.candidateRadiusKm ?? 2;
    this.#maxCandidates = opts.maxCandidates ?? 25;
    this.#newId = opts.newId ?? (() => `KLAR-${globalThis.crypto.randomUUID()}`);
    this.#now = opts.now ?? (() => new Date());
  }

  // ── Tier 1 ────────────────────────────────────────────────────────────────

  async findBySupplierRefs(refs: readonly SupplierRef[]): Promise<Map<string, CanonicalHotel>> {
    const out = new Map<string, CanonicalHotel>();
    if (refs.length === 0) return out;

    // One round trip for the whole batch, matching supplier and id as a PAIR.
    // A query per hotel makes matching an N+1 problem at forty results a page;
    // matching the two columns independently would join a TripJack id onto a
    // RateGain mapping that happened to share the same string.
    const suppliers = refs.map((r) => String(r.supplier));
    const ids = refs.map((r) => String(r.supplierHotelId));
    const rows = await this.#db.query<HotelRow & { ref_supplier: string; ref_id: string }>(
      `SELECT h.*, m.supplier AS ref_supplier, m.supplier_hotel_id AS ref_id
         FROM unnest($1::text[], $2::text[]) AS q(supplier, hotel_id)
         JOIN supplier_property_mapping m
           ON m.supplier = q.supplier AND m.supplier_hotel_id = q.hotel_id
         JOIN canonical_hotel h ON h.klar_hotel_id = m.klar_hotel_id`,
      [suppliers, ids],
    );
    if (rows.length === 0) return out;

    const mappings = await this.#mappingsFor(rows.map((r) => r.klar_hotel_id));
    for (const row of rows) {
      out.set(
        supplierRefKey(supplierCode(row.ref_supplier), row.ref_id),
        toCanonicalHotel(row, mappings.get(row.klar_hotel_id) ?? []),
      );
    }
    return out;
  }

  async findByKlarHotelId(id: KlarHotelId): Promise<CanonicalHotel | null> {
    const rows = await this.#db.query<HotelRow>(
      'SELECT * FROM canonical_hotel WHERE klar_hotel_id = $1',
      [String(id)],
    );
    const row = rows[0];
    if (row === undefined) return null;
    const mappings = await this.#mappingsFor([row.klar_hotel_id]);
    return toCanonicalHotel(row, mappings.get(row.klar_hotel_id) ?? []);
  }

  // ── Tiers 3-4 ─────────────────────────────────────────────────────────────

  /**
   * Narrow the catalogue to plausible matches.
   *
   * Name similarity is the primary filter, because it is the signal that
   * actually discriminates; the bounding box and the city are corroboration.
   * Coordinates are never used alone — suppliers hand back a shared city-centre
   * pin for properties they could not geocode, so proximity by itself would
   * pull in every ungeocoded hotel in the city.
   */
  async findMatchCandidates(query: MatchCandidateQuery): Promise<readonly CanonicalHotel[]> {
    const normalized = normalizeName(query.name);
    if (significantTokens(query.name).length === 0) return [];

    const conditions: string[] = ['similarity(normalized_name, $1) >= $2'];
    const params: SqlValue[] = [normalized, this.#floor];

    if (query.location !== undefined) {
      const dLat = this.#radiusKm / DEG_LAT_KM;
      const dLng = lngDegreesFor(this.#radiusKm, query.location.lat);
      params.push(
        query.location.lat - dLat,
        query.location.lat + dLat,
        query.location.lng - dLng,
        query.location.lng + dLng,
      );
      const base = params.length - 4;
      // A candidate with no coordinates is still a candidate: the name and
      // address may be enough, and excluding it would lose every hotel the
      // catalogue has not geocoded yet.
      conditions.push(
        `(lat IS NULL OR lng IS NULL OR (lat BETWEEN $${base + 1} AND $${base + 2} AND lng BETWEEN $${base + 3} AND $${base + 4}))`,
      );
    } else if (query.city !== undefined) {
      params.push(query.city.toLowerCase());
      conditions.push(`lower(city) = $${params.length}`);
    }

    if (query.countryCode !== undefined) {
      params.push(String(query.countryCode));
      conditions.push(`(country_code IS NULL OR country_code = $${params.length})`);
    }

    params.push(this.#maxCandidates);
    const rows = await this.#db.query<HotelRow>(
      `SELECT * FROM canonical_hotel
        WHERE ${conditions.join(' AND ')}
        ORDER BY similarity(normalized_name, $1) DESC
        LIMIT $${params.length}`,
      params,
    );
    if (rows.length === 0) return [];

    const mappings = await this.#mappingsFor(rows.map((r) => r.klar_hotel_id));
    return rows.map((row) => toCanonicalHotel(row, mappings.get(row.klar_hotel_id) ?? []));
  }

  // ── Write-back ────────────────────────────────────────────────────────────

  /**
   * Persist a confirmed match so the next search resolves it at tier 1.
   *
   * Idempotent on `(supplier, supplier_hotel_id)`: re-running a search
   * re-confirms the same mapping and only touches `last_seen_at`.
   *
   * The *other* unique index — `(klar_hotel_id, supplier)` — is not covered by
   * that conflict target and cannot be, since Postgres takes one. It fires when
   * a second property of the same supplier is offered for one canonical hotel,
   * and it is right to fire: that is the false merge. The matcher screens for
   * it in memory, but the screen is a read followed by a write with no
   * transaction between them, so two concurrent searches both pass it and one
   * loses the race. Letting that violation propagate would turn a correctly
   * refused write-back into a failed customer search.
   */
  async persistMapping(mapping: MappingWriteback): Promise<boolean> {
    try {
      await this.#writeMapping(mapping);
      return true;
    } catch (error) {
      if (isOnePerSupplierViolation(error)) return false;
      throw error;
    }
  }

  async #writeMapping(mapping: MappingWriteback): Promise<void> {
    await this.#db.query(
      `INSERT INTO supplier_property_mapping
         (supplier, supplier_hotel_id, klar_hotel_id, confidence, matched_by, first_seen_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
       ON CONFLICT (supplier, supplier_hotel_id) DO UPDATE
         SET klar_hotel_id = EXCLUDED.klar_hotel_id,
             confidence    = EXCLUDED.confidence,
             matched_by    = EXCLUDED.matched_by,
             last_seen_at  = EXCLUDED.last_seen_at`,
      [
        String(mapping.supplier),
        String(mapping.supplierHotelId),
        String(mapping.klarHotelId),
        mapping.confidence,
        JSON.stringify(mapping.matchedBy),
        this.#now(),
      ],
    );
  }

  async createFromSupplier(input: {
    supplier: SupplierCode;
    supplierHotelId: SupplierHotelId;
    name: string;
    address?: string;
    city?: string;
    countryCode?: CountryCode;
    location?: GeoPoint;
    starRating?: number;
    propertyType?: PropertyType;
    chainCode?: string;
    imageUrls: readonly string[];
    amenityLabels: readonly string[];
  }): Promise<CanonicalHotel> {
    const id = this.#newId();
    const now = this.#now();
    const images: HotelImage[] = input.imageUrls.map((url) => ({
      url,
      sourcedFrom: input.supplier,
    }));
    const amenities: Amenity[] = input.amenityLabels.map((label) => ({
      code: amenityCode(label),
      label,
      sourcedFrom: input.supplier,
    }));

    // The hotel and its first mapping are one unit of work: a canonical hotel
    // no supplier maps to is unreachable, and a mapping with no hotel violates
    // the foreign key.
    return this.#db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO canonical_hotel
           (klar_hotel_id, name, normalized_name, address, city, country_code,
            lat, lng, star_rating, property_type, chain_code,
            images, amenities, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$14)`,
        [
          id,
          input.name,
          normalizeName(input.name),
          input.address ?? null,
          input.city ?? null,
          input.countryCode !== undefined ? String(input.countryCode) : null,
          input.location?.lat ?? null,
          input.location?.lng ?? null,
          input.starRating ?? null,
          input.propertyType ?? null,
          input.chainCode ?? null,
          JSON.stringify(images),
          JSON.stringify(amenities),
          now,
        ],
      );
      // `DO NOTHING` silently declines when this supplier id is already mapped
      // — which left the canonical row above owned by nobody. An unreachable
      // hotel is exactly what this transaction's comment says must not happen,
      // and the backfill counted each one as `created` while it accumulated in
      // the catalogue and polluted future candidate scoring. `RETURNING` turns
      // the decline into something we can act on.
      const claimed = await tx.query<{ klar_hotel_id: string }>(
        `INSERT INTO supplier_property_mapping
           (supplier, supplier_hotel_id, klar_hotel_id, confidence, matched_by, first_seen_at, last_seen_at)
         VALUES ($1,$2,$3,'EXACT_SUPPLIER_MAPPING','["PERSISTED_MAPPING"]'::jsonb,$4,$4)
         ON CONFLICT (supplier, supplier_hotel_id) DO NOTHING
         RETURNING klar_hotel_id`,
        [String(input.supplier), String(input.supplierHotelId), id, now],
      );

      if (claimed.length === 0) {
        // Someone already owns this supplier id — a repeated document in one
        // backfill batch, or a concurrent creation. Undo our row and return
        // the hotel that actually holds the mapping.
        await tx.query('DELETE FROM canonical_hotel WHERE klar_hotel_id = $1', [id]);
        const existing = await tx.query<HotelRow>(
          `SELECT h.* FROM canonical_hotel h
             JOIN supplier_property_mapping m ON m.klar_hotel_id = h.klar_hotel_id
            WHERE m.supplier = $1 AND m.supplier_hotel_id = $2`,
          [String(input.supplier), String(input.supplierHotelId)],
        );
        const owner = existing[0];
        if (owner === undefined) {
          throw new Error(
            `supplier mapping ${String(input.supplier)}:${String(input.supplierHotelId)} is claimed but unresolvable`,
          );
        }
        const ownerMappings = await this.#mappingsFor([owner.klar_hotel_id], tx);
        return toCanonicalHotel(owner, ownerMappings.get(owner.klar_hotel_id) ?? []);
      }

      const rows = await tx.query<HotelRow>(
        'SELECT * FROM canonical_hotel WHERE klar_hotel_id = $1',
        [id],
      );
      const row = rows[0];
      if (row === undefined) throw new Error(`canonical hotel ${id} vanished after insert`);
      const mappings = await this.#mappingsFor([id], tx);
      return toCanonicalHotel(row, mappings.get(id) ?? []);
    });
  }

  /**
   * Queue a pair an operator should look at.
   *
   * A property that fails to match will fail again on every subsequent search,
   * so the partial unique index collapses repeats into one pending row instead
   * of flooding the queue with the same decision.
   */
  async recordUnresolved(candidate: UnresolvedMatch): Promise<void> {
    await this.#db.query(
      `INSERT INTO match_candidate
         (supplier, supplier_hotel_id, name, nearest_klar_hotel_id, score, reason)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (supplier, supplier_hotel_id) WHERE status = 'PENDING' DO NOTHING`,
      [
        String(candidate.supplier),
        String(candidate.supplierHotelId),
        candidate.name,
        candidate.nearestKlarHotelId !== undefined ? String(candidate.nearestKlarHotelId) : null,
        candidate.score,
        candidate.reason,
      ],
    );
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  async #mappingsFor(
    ids: readonly string[],
    db: Database = this.#db,
  ): Promise<Map<string, SupplierPropertyMapping[]>> {
    const out = new Map<string, SupplierPropertyMapping[]>();
    if (ids.length === 0) return out;

    const rows = await db.query<MappingRow>(
      `SELECT * FROM supplier_property_mapping
        WHERE klar_hotel_id IN (${placeholders(ids.length)})`,
      ids as readonly SqlValue[],
    );
    for (const row of rows) {
      const list = out.get(row.klar_hotel_id) ?? [];
      const verifiedAt = row.verified_at instanceof Date ? row.verified_at : undefined;
      list.push({
        supplier: supplierCode(row.supplier),
        supplierHotelId: supplierHotelId(row.supplier_hotel_id),
        confidence: row.confidence as MatchConfidence,
        matchedBy: asJson<MatchSignal[]>(row.matched_by, []),
        ...(verifiedAt !== undefined ? { verifiedAt } : {}),
        firstSeenAt: row.first_seen_at instanceof Date ? row.first_seen_at : new Date(0),
        lastSeenAt: row.last_seen_at instanceof Date ? row.last_seen_at : new Date(0),
      });
      out.set(row.klar_hotel_id, list);
    }
    return out;
  }
}

/** Stable amenity code from a supplier's free-text label. */
export function amenityCode(label: string): string {
  return normalizeName(label).replace(/\s+/g, '_').toUpperCase();
}

export function toCanonicalHotel(
  row: HotelRow,
  mappings: readonly SupplierPropertyMapping[],
): CanonicalHotel {
  const lat = asNumber(row.lat);
  const lng = asNumber(row.lng);
  const star = asNumber(row.star_rating);
  const address = asString(row.address);
  const city = asString(row.city);
  const country = asString(row.country_code);
  const postal = asString(row.postal_code);
  const propertyType = asString(row.property_type);
  const brand = asString(row.brand);
  const chain = asString(row.chain_code);
  const external = asJson<Record<string, string>>(row.external_ids, {});
  const updated = row.updated_at instanceof Date ? row.updated_at : new Date(0);

  return {
    klarHotelId: klarHotelId(row.klar_hotel_id),
    name: row.name,
    normalizedName: row.normalized_name,
    ...(address !== undefined ? { address } : {}),
    ...(city !== undefined ? { city } : {}),
    ...(country !== undefined ? { countryCode: countryCode(country) } : {}),
    ...(postal !== undefined ? { postalCode: postal } : {}),
    ...(lat !== undefined && lng !== undefined ? { location: { lat, lng } } : {}),
    ...(star !== undefined ? { starRating: star } : {}),
    ...(propertyType !== undefined ? { propertyType: propertyType as PropertyType } : {}),
    ...(brand !== undefined ? { brand } : {}),
    ...(chain !== undefined ? { chainCode: chain } : {}),
    ...(Object.keys(external).length > 0 ? { externalIds: external } : {}),
    images: asJson<HotelImage[]>(row.images, []),
    amenities: asJson<Amenity[]>(row.amenities, []),
    supplierMappings: mappings,
    updatedAt: updated,
  };
}

export type { HotelRow };
export const toKlarHotelId = (v: string): KlarHotelId => klarHotelId(v);
