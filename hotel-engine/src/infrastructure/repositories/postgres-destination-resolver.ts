import {
  countryCode,
  klarDestinationId,
  supplierHotelId,
  type CountryCode,
  type SupplierCode,
} from '../../domain/shared/brand.js';
import { normalizeName } from '../../domain/hotel/name-normalization.js';
import { clampRadiusKm } from '../../domain/destination/canonical-destination.js';
import type { SearchTarget } from '../../domain/search/request.js';
import type { SupplierSearchTarget } from '../../suppliers/contract/dto.js';
import type {
  DestinationCandidate,
  DestinationResolver,
  SupplierTargetCapability,
} from '../../modules/ports.js';
import type { Database, SqlRow, SqlValue } from '../db/database.js';
import { asNumber } from '../db/database.js';

/**
 * One KLAR destination, expressed the way each supplier wants it.
 *
 * This is the module the reference did not have. It resolved destinations
 * separately per supplier, in two functions that shared nothing — `resolveForRG`
 * chained regex, text search and a comma fallback against a RateGain table,
 * while `resolveForTJ` ran a Mongo `$near` and returned candidate ids. Both had
 * India-specific rules wired into them. Here the destination is canonical and
 * the supplier-shaped translation is a lookup.
 */
export interface PostgresDestinationResolverOptions {
  /**
   * Candidate ids handed to a supplier that searches by id list.
   *
   * TripJack yields roughly one bookable hotel per twenty candidates, so this
   * is deliberately large — but bounded, because the ids travel in the request
   * body and an unbounded list is rejected outright.
   */
  readonly maxCandidateIds?: number;
  /** Trigram floor for free-text destination lookup. */
  readonly nameSimilarityFloor?: number;
}

interface DestinationRow extends SqlRow {
  klar_destination_id: string;
  country_code: string;
  lat: number | string;
  lng: number | string;
  radius_km: number | string;
  property_count: number;
}

interface MappingRow extends SqlRow {
  supplier: string;
  supplier_dest_code: string | null;
  use_geo_filter: boolean;
}

const DEG_LAT_KM = 111.32;

const asCountry = (value: string | null | undefined): CountryCode | undefined =>
  typeof value === 'string' && value.trim().length === 2
    ? countryCode(value.trim().toUpperCase())
    : undefined;

export class PostgresDestinationResolver implements DestinationResolver {
  readonly #db: Database;
  readonly #maxCandidateIds: number;
  readonly #nameFloor: number;

  constructor(db: Database, opts: PostgresDestinationResolverOptions = {}) {
    this.#db = db;
    this.#maxCandidateIds = opts.maxCandidateIds ?? 3_000;
    this.#nameFloor = opts.nameSimilarityFloor ?? 0.35;
  }

  async resolveTargets(
    target: SearchTarget,
    suppliers: readonly SupplierTargetCapability[],
  ): Promise<Map<SupplierCode, SupplierSearchTarget | null>> {
    const out = new Map<SupplierCode, SupplierSearchTarget | null>();

    // A search for one specific hotel: every supplier that maps the property
    // gets its own id, and the rest cannot serve the question.
    if (target.kind === 'HOTEL') {
      const rows = await this.#db.query<{ supplier: string; supplier_hotel_id: string }>(
        `SELECT supplier, supplier_hotel_id
           FROM supplier_property_mapping
          WHERE klar_hotel_id = $1`,
        [String(target.klarHotelId)],
      );
      const bySupplier = new Map(rows.map((r) => [r.supplier, r.supplier_hotel_id]));
      for (const s of suppliers) {
        const id = bySupplier.get(String(s.code));
        out.set(
          s.code,
          id !== undefined && s.searchTargets.includes('SINGLE_HOTEL')
            ? { kind: 'SINGLE_HOTEL', id: supplierHotelId(id) }
            : null,
        );
      }
      return out;
    }

    const centre =
      target.kind === 'AREA'
        ? { lat: target.centre.lat, lng: target.centre.lng, radiusKm: clampRadiusKm(target.radiusKm) }
        : await this.#destinationCentre(target.destinationId);

    if (centre === null) {
      for (const s of suppliers) out.set(s.code, null);
      return out;
    }

    const mappings =
      target.kind === 'DESTINATION' ? await this.#mappings(target.destinationId) : new Map();

    for (const s of suppliers) {
      out.set(s.code, await this.#targetFor(s, centre, mappings.get(String(s.code))));
    }
    return out;
  }

  /**
   * Free text → canonical destinations.
   *
   * An exact hit on the normalised name or an alias scores 1 and wins outright:
   * "Bombay" must resolve to Mumbai without having to out-score it fuzzily.
   * Everything else falls to the trigram index, ordered by similarity and then
   * by how much inventory KLAR actually has there — between two plausible
   * places of the same name, the one we can sell is the one meant.
   */
  async lookup(query: {
    text: string;
    countryCode?: CountryCode;
    limit?: number;
  }): Promise<readonly DestinationCandidate[]> {
    const normalized = normalizeName(query.text);
    if (normalized.length === 0) return [];

    const params: SqlValue[] = [normalized, this.#nameFloor];
    let countryFilter = '';
    if (query.countryCode !== undefined) {
      params.push(String(query.countryCode));
      countryFilter = `AND country_code = $${params.length}`;
    }
    params.push(Math.max(1, Math.min(query.limit ?? 10, 50)));

    /**
     * Aliases are stored as the operator wrote them — "Bombay", not "bombay" —
     * so they have to be normalised on the way out of the row, not compared
     * raw. `aliases @> to_jsonb($1)` looked right and matched nothing: it is an
     * exact containment test against a normalised needle, so the one thing an
     * alias exists for ("Bombay" → Mumbai, which shares no trigram with it)
     * silently fell through to fuzzy matching and lost.
     *
     * The expression mirrors `normalizeName`: lowercase, non-alphanumerics to
     * single spaces, trimmed. It does not de-accent, so an accented alias needs
     * an unaccented spelling stored alongside it.
     */
    const aliasMatch = `EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(aliases) AS alias(value)
       WHERE btrim(regexp_replace(lower(alias.value), '[^a-z0-9]+', ' ', 'g')) = $1
    )`;

    const rows = await this.#db.query<{
      klar_destination_id: string;
      name: string;
      country_code: string;
      property_count: number;
      score: number | string;
    }>(
      `SELECT klar_destination_id, name, country_code, property_count,
              CASE
                WHEN normalized_name = $1 THEN 1
                WHEN ${aliasMatch} THEN 1
                ELSE similarity(normalized_name, $1)
              END AS score
         FROM canonical_destination
        WHERE (normalized_name = $1
               OR ${aliasMatch}
               OR similarity(normalized_name, $1) >= $2)
          ${countryFilter}
        ORDER BY score DESC, property_count DESC, klar_destination_id ASC
        LIMIT $${params.length}`,
      params,
    );

    return rows.map((row) => ({
      klarDestinationId: klarDestinationId(row.klar_destination_id),
      name: row.name,
      countryCode: countryCode(row.country_code),
      propertyCount: asNumber(row.property_count) ?? 0,
      score: asNumber(row.score) ?? 0,
    }));
  }

  /**
   * The country the search is for. Drives the markup region, so it is read from
   * the destination — the one part of a search that is fixed before any
   * supplier answers.
   */
  async countryOf(target: SearchTarget): Promise<CountryCode | undefined> {
    if (target.kind === 'DESTINATION') {
      const rows = await this.#db.query<{ country_code: string | null }>(
        'SELECT country_code FROM canonical_destination WHERE klar_destination_id = $1',
        [String(target.destinationId)],
      );
      return asCountry(rows[0]?.country_code);
    }
    if (target.kind === 'HOTEL') {
      const rows = await this.#db.query<{ country_code: string | null }>(
        'SELECT country_code FROM canonical_hotel WHERE klar_hotel_id = $1',
        [String(target.klarHotelId)],
      );
      return asCountry(rows[0]?.country_code);
    }
    // An AREA is a bare coordinate pair; there is no record to read a country
    // from. The orchestrator falls back to the inventory for this case.
    return undefined;
  }

  async inventoryCount(target: SearchTarget): Promise<number> {
    if (target.kind !== 'DESTINATION') return 0;
    const rows = await this.#db.query<{ property_count: number }>(
      'SELECT property_count FROM canonical_destination WHERE klar_destination_id = $1',
      [String(target.destinationId)],
    );
    return asNumber(rows[0]?.property_count) ?? 0;
  }

  /**
   * Pick the shape this supplier accepts, in order of how precisely it targets
   * the destination.
   *
   * A mapped destination code is best: it is the supplier's own idea of the
   * place, so its results match its own inventory boundaries. A geofilter is
   * next. An id list is last — accurate, but it puts the burden of knowing the
   * inventory on us.
   */
  async #targetFor(
    supplier: SupplierTargetCapability,
    centre: { lat: number; lng: number; radiusKm: number },
    mapping: MappingRow | undefined,
  ): Promise<SupplierSearchTarget | null> {
    const accepts = (kind: SupplierSearchTarget['kind']): boolean =>
      supplier.searchTargets.includes(kind);

    if (
      mapping?.supplier_dest_code !== undefined &&
      mapping.supplier_dest_code !== null &&
      mapping.use_geo_filter !== true &&
      accepts('DEST_CODE')
    ) {
      return { kind: 'DEST_CODE', code: mapping.supplier_dest_code };
    }

    if (accepts('GEO')) {
      return { kind: 'GEO', centre: { lat: centre.lat, lng: centre.lng }, radiusKm: centre.radiusKm };
    }

    if (accepts('HOTEL_IDS')) {
      const ids = await this.#candidateIds(supplier.code, centre);
      // An empty id list is not a search; reporting it as unservable is more
      // honest than sending a request that can only return nothing.
      return ids.length > 0 ? { kind: 'HOTEL_IDS', ids } : null;
    }

    // A supplier with a code we could not map and no geo support cannot serve
    // this destination. NOT_ELIGIBLE, not a failure.
    return null;
  }

  /**
   * Candidate supplier hotel ids inside the destination radius.
   *
   * A bounding box on the indexed `(lat, lng)` columns narrows the catalogue,
   * and the Haversine term applied afterwards trims the box's corners — a box
   * around a 25 km radius is 27% larger than the circle, and those corners are
   * the neighbouring towns that made the reference's results look wrong.
   *
   * Ordered nearest-first, so a truncated list is still the most relevant part
   * of the destination rather than an arbitrary slice.
   */
  async #candidateIds(
    supplier: SupplierCode,
    centre: { lat: number; lng: number; radiusKm: number },
  ): Promise<ReturnType<typeof supplierHotelId>[]> {
    const dLat = centre.radiusKm / DEG_LAT_KM;
    const cos = Math.cos((centre.lat * Math.PI) / 180);
    const dLng = Math.abs(cos) < 0.01 ? 180 : centre.radiusKm / (DEG_LAT_KM * cos);

    const rows = await this.#db.query<{ supplier_hotel_id: string }>(
      `SELECT m.supplier_hotel_id
         FROM canonical_hotel h
         JOIN supplier_property_mapping m ON m.klar_hotel_id = h.klar_hotel_id
        WHERE m.supplier = $1
          AND h.lat BETWEEN $2 AND $3
          AND h.lng BETWEEN $4 AND $5
          AND (
            6371 * acos(
              least(1, greatest(-1,
                sin(radians($6)) * sin(radians(h.lat)) +
                cos(radians($6)) * cos(radians(h.lat)) * cos(radians(h.lng) - radians($7))
              ))
            )
          ) <= $8
        ORDER BY (
          6371 * acos(
            least(1, greatest(-1,
              sin(radians($6)) * sin(radians(h.lat)) +
              cos(radians($6)) * cos(radians(h.lat)) * cos(radians(h.lng) - radians($7))
            ))
          )
        ) ASC
        LIMIT $9`,
      [
        String(supplier),
        centre.lat - dLat,
        centre.lat + dLat,
        centre.lng - dLng,
        centre.lng + dLng,
        centre.lat,
        centre.lng,
        centre.radiusKm,
        this.#maxCandidateIds,
      ],
    );
    return rows.map((r) => supplierHotelId(r.supplier_hotel_id));
  }

  async #destinationCentre(
    id: string,
  ): Promise<{ lat: number; lng: number; radiusKm: number } | null> {
    const rows = await this.#db.query<DestinationRow>(
      'SELECT * FROM canonical_destination WHERE klar_destination_id = $1',
      [String(id)],
    );
    const row = rows[0];
    if (row === undefined) return null;

    const lat = asNumber(row.lat);
    const lng = asNumber(row.lng);
    const radiusKm = asNumber(row.radius_km);
    if (lat === undefined || lng === undefined || radiusKm === undefined) return null;
    return { lat, lng, radiusKm: clampRadiusKm(radiusKm) };
  }

  async #mappings(id: string): Promise<Map<string, MappingRow>> {
    const rows = await this.#db.query<MappingRow>(
      'SELECT * FROM destination_mapping WHERE klar_destination_id = $1',
      [String(id)],
    );
    return new Map(rows.map((r) => [r.supplier, r]));
  }
}
