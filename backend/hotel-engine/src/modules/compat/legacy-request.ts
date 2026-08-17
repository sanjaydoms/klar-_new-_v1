import {
  countryCode,
  currencyCode,
  klarHotelId,
  supplierCode,
  supplierHotelId,
  type CountryCode,
  type CurrencyCode,
} from '../../domain/shared/brand.js';
import { exponentOf } from '../../domain/shared/money.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { PROPERTY_TYPES, type PropertyType } from '../../domain/hotel/canonical-hotel.js';
import type {
  SearchFilters,
  SearchTarget,
  SortOption,
  UnifiedHotelSearchRequest,
} from '../../domain/search/request.js';
import type { DestinationResolver, PropertyRepository } from '../ports.js';

/**
 * LEGACY. The request the existing frontend sends (teardown §2.2, §2.4).
 *
 * **Expiry: deleted when the frontend sends a canonical request.**
 *
 * Two quirks are load-bearing and neither is ours to fix here:
 *
 *  1. `destination` is overloaded. It is free text — `"Goa"` — *or* a
 *     supplier-prefixed hotel id when the customer picked a hotel by name from
 *     the autocomplete. §2.2 is explicit that the new API should accept this and
 *     must not adopt it internally, so it is resolved to a `SearchTarget` here
 *     and the prefixed form goes no further.
 *  2. Free text has to be resolved against KLAR's own destinations. The
 *     reference resolved it against a *RateGain* table, so "Goa" meant whatever
 *     RateGain thought Goa was, and TripJack was searched by a Mongo `$near`
 *     around a geocoder result that no supplier agreed with.
 *
 * This module is also the ONLY parser between raw JSON and the domain. Nothing
 * downstream re-checks a type, so a field of the wrong shape has to be refused
 * here or it becomes a 500 several layers in.
 */

export interface LegacyRoom {
  readonly adults?: number;
  readonly children?: number;
  readonly childAges?: readonly number[];
}

export interface LegacySearchRequest {
  readonly destination?: string;
  readonly destinationCode?: string;
  readonly hotelId?: string;
  readonly checkin?: string;
  readonly checkout?: string;
  readonly countryCode?: string;
  readonly currency?: string;
  readonly pageNo?: number;
  readonly providers?: readonly string[];
  readonly sortBy?: string;
  readonly filters?: LegacyFilters;
  readonly rooms?: readonly LegacyRoom[];
}

export interface LegacyFilters {
  readonly starRatings?: readonly number[];
  readonly priceRange?: readonly [number, number];
  /** Several selected price buckets. §2.4 lists it; the panel sends both. */
  readonly priceRanges?: ReadonlyArray<readonly [number, number]>;
  readonly mealTypes?: readonly string[];
  readonly propertyTypes?: readonly string[];
  readonly amenities?: readonly string[];
  readonly searchText?: string;
  readonly showOnlyAltDeals?: boolean;
  readonly providers?: readonly string[];
  readonly selectedLocations?: readonly string[];
  /**
   * Review-score buckets ("Excellent 4.5+").
   *
   * Declared so it is visibly *received* and visibly *unsupported*: the
   * canonical hotel carries no review score at all, so there is nothing to
   * filter on. Silently dropping it made the server fill each page with hotels
   * the client then discarded locally, so the customer scrolled near-empty
   * pages while `hasMore` kept promising more. Reported through
   * `unsupportedFilters` instead, so the caller can say so.
   */
  readonly userRatings?: readonly number[];
}

/** Why a legacy request could not become a canonical one. */
export type LegacyRequestError =
  | { readonly kind: 'MISSING_DATES' }
  | { readonly kind: 'MISSING_DESTINATION' }
  | { readonly kind: 'UNKNOWN_DESTINATION'; readonly text: string }
  | { readonly kind: 'UNKNOWN_HOTEL'; readonly id: string }
  | { readonly kind: 'UNKNOWN_SUPPLIER'; readonly codes: readonly string[] }
  | { readonly kind: 'INVALID'; readonly reason: string };

export type LegacyRequestOutcome =
  | {
      readonly ok: true;
      readonly request: UnifiedHotelSearchRequest;
      /** Filters received and not honoured. Empty in the ordinary case. */
      readonly unsupportedFilters: readonly string[];
    }
  | { readonly ok: false; readonly error: LegacyRequestError };

/**
 * `price_asc` → `PRICE_ASC`.
 *
 * An absent `sortBy` means the frontend's own default, which is `price_asc`
 * (`HotelSearchPage` sends it on every search). Defaulting to anything else
 * paginates the server in one order while the client re-sorts the page it was
 * given in another — the D-13 defect `present.ts` says is being avoided.
 */
const SORTS: Readonly<Record<string, SortOption>> = {
  price_asc: 'PRICE_ASC',
  price_desc: 'PRICE_DESC',
  rating_desc: 'RATING_DESC',
  price_rating: 'RECOMMENDED',
  recommended: 'RECOMMENDED',
  distance: 'DISTANCE_ASC',
};
const DEFAULT_SORT: SortOption = 'PRICE_ASC';

const looksLikeSupplierHotelId = (value: string): boolean => /^[A-Z]{2,4}:.+/.test(value.trim());

// ── Shape checking ──────────────────────────────────────────────────────────
//
// The edge parses JSON and hands the result straight here, so every field is
// `unknown` in practice however it is typed. A wrong type must become a 400
// with a reason, not a TypeError several layers down.

const isString = (v: unknown): v is string => typeof v === 'string';
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function numberArray(value: unknown, field: string, problems: string[]): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    problems.push(`${field} must be an array`);
    return undefined;
  }
  const out = value.filter(isFiniteNumber);
  if (out.length !== value.length) problems.push(`${field} must contain only numbers`);
  return out;
}

function stringArray(value: unknown, field: string, problems: string[]): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    problems.push(`${field} must be an array`);
    return undefined;
  }
  const out = value.filter(isString);
  if (out.length !== value.length) problems.push(`${field} must contain only strings`);
  return out;
}

/** A `[min, max]` pair, or nothing when it is not one. */
function range(value: unknown, field: string, problems: string[]): [number, number] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== 2 || !value.every(isFiniteNumber)) {
    problems.push(`${field} must be a [min, max] pair of numbers`);
    return undefined;
  }
  return [value[0] as number, value[1] as number];
}

const PROPERTY_TYPE_SET = new Set<string>(PROPERTY_TYPES);

function toFilters(
  raw: LegacyFilters | undefined,
  currency: CurrencyCode,
  problems: string[],
  unsupported: string[],
): SearchFilters | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push('filters must be an object');
    return undefined;
  }
  // Minor units per major unit is a property of the CURRENCY. Hardcoding 100
  // scaled a ¥8,000 filter to ¥800,000 and emptied every JPY search.
  const factor = 10 ** exponentOf(currency);

  const filters: { -readonly [K in keyof SearchFilters]: SearchFilters[K] } = {};

  const stars = numberArray(raw.starRatings, 'filters.starRatings', problems);
  if (stars !== undefined && stars.length > 0) filters.starRatings = stars;

  /**
   * The price bounds, from either shape the panel sends.
   *
   * `[0, 0]` is the panel's "nothing selected" sentinel, not a request for
   * hotels that cost nothing — and it ships on every request once any OTHER
   * filter is touched. Translating it literally emptied the whole result set
   * the moment a customer ticked a star rating.
   */
  const single = range(raw.priceRange, 'filters.priceRange', problems);
  const buckets = Array.isArray(raw.priceRanges)
    ? raw.priceRanges
        .map((b, i) => range(b, `filters.priceRanges[${i}]`, problems))
        .filter((b): b is [number, number] => b !== undefined)
    : undefined;

  const spans = [...(single !== undefined ? [single] : []), ...(buckets ?? [])].filter(
    ([min, max]) => max > 0 && max >= min,
  );
  if (spans.length > 0) {
    // Several buckets are a union, and the engine filters on one contiguous
    // range, so the span that covers them all is the honest projection: it
    // never hides a hotel the customer asked to see.
    filters.priceMin = Math.round(Math.min(...spans.map((s) => s[0])) * factor);
    filters.priceMax = Math.round(Math.max(...spans.map((s) => s[1])) * factor);
  }

  const meals = stringArray(raw.mealTypes, 'filters.mealTypes', problems);
  if (meals !== undefined && meals.length > 0) {
    /**
     * Only board codes the domain actually recognises.
     *
     * An unclassifiable meal type became `UNKNOWN`, which is a real board code
     * meaning "the supplier did not say" — so filtering for "Lunch Included"
     * returned every hotel whose board could not be classified. Widening a
     * filter is worse than narrowing it: the customer is shown rooms that do
     * not include what they filtered for.
     */
    const codes = meals.map((m) => classifyBoard(m).code).filter((c) => c !== 'UNKNOWN');
    if (codes.length > 0) filters.boards = [...new Set(codes)];
    if (codes.length < meals.length) unsupported.push('filters.mealTypes (unrecognised board)');
  }

  const types = stringArray(raw.propertyTypes, 'filters.propertyTypes', problems);
  if (types !== undefined && types.length > 0) {
    const known = types.filter((t): t is PropertyType => PROPERTY_TYPE_SET.has(t));
    if (known.length > 0) filters.propertyTypes = known;
    if (known.length < types.length) unsupported.push('filters.propertyTypes (unknown type)');
  }

  const amenities = stringArray(raw.amenities, 'filters.amenities', problems);
  if (amenities !== undefined && amenities.length > 0) filters.amenities = amenities;

  if (raw.searchText !== undefined) {
    if (!isString(raw.searchText)) problems.push('filters.searchText must be a string');
    else if (raw.searchText.trim().length > 0) filters.nameContains = raw.searchText.trim();
  }

  const areas = stringArray(raw.selectedLocations, 'filters.selectedLocations', problems);
  if (areas !== undefined && areas.length > 0) filters.areas = areas;

  const providers = stringArray(raw.providers, 'filters.providers', problems);
  if (providers !== undefined && providers.length > 0) {
    filters.suppliers = providers.map(supplierCode);
  }

  // `showOnlyAltDeals` asked for hotels carrying a second, comparable deal.
  // `multiSupplierOnly` is the nearest canonical filter and is not identical —
  // an alternative can come from one supplier — so this is the one field where
  // the projection is an approximation rather than a translation.
  if (raw.showOnlyAltDeals === true) filters.multiSupplierOnly = true;

  // Received, and honestly not honoured: the canonical hotel has no review
  // score to filter on.
  const ratings = numberArray(raw.userRatings, 'filters.userRatings', problems);
  if (ratings !== undefined && ratings.length > 0) unsupported.push('filters.userRatings');

  return Object.keys(filters).length > 0 ? (filters as SearchFilters) : undefined;
}

export interface LegacyRequestDeps {
  readonly destinations: DestinationResolver;
  readonly properties: PropertyRepository;
  /** Guest nationality when the payload names none. */
  readonly defaultCountry: CountryCode;
  /**
   * Supplier codes the registry actually knows.
   *
   * Without it an unknown or misspelled provider yields a search that queries
   * nobody and returns 200 with zero hotels — indistinguishable from genuinely
   * sold-out inventory.
   */
  readonly knownSuppliers?: ReadonlySet<string>;
}

export async function fromLegacySearchRequest(
  legacy: LegacySearchRequest,
  deps: LegacyRequestDeps,
): Promise<LegacyRequestOutcome> {
  const problems: string[] = [];
  const unsupported: string[] = [];

  if (!isString(legacy.checkin) || !isString(legacy.checkout)) {
    return { ok: false, error: { kind: 'MISSING_DATES' } };
  }

  let stay;
  try {
    stay = stayDates(legacy.checkin, legacy.checkout);
  } catch (error) {
    return {
      ok: false,
      error: { kind: 'INVALID', reason: error instanceof Error ? error.message : 'invalid dates' },
    };
  }

  if (legacy.rooms !== undefined && !Array.isArray(legacy.rooms)) {
    return { ok: false, error: { kind: 'INVALID', reason: 'rooms must be an array' } };
  }
  const rooms = (legacy.rooms ?? []).map((r) =>
    roomRequest(
      isFiniteNumber(r?.adults) ? r.adults : 2,
      isFiniteNumber(r?.children) ? r.children : 0,
      Array.isArray(r?.childAges) ? r.childAges.filter(isFiniteNumber) : [],
    ),
  );
  let party;
  try {
    party = occupancy(rooms.length > 0 ? rooms : [roomRequest(2, 0, [])]);
  } catch (error) {
    return {
      ok: false,
      error: { kind: 'INVALID', reason: error instanceof Error ? error.message : 'invalid rooms' },
    };
  }

  if (legacy.countryCode !== undefined && !isString(legacy.countryCode)) {
    return { ok: false, error: { kind: 'INVALID', reason: 'countryCode must be a string' } };
  }
  const nationality =
    isString(legacy.countryCode) && legacy.countryCode.length === 2
      ? countryCode(legacy.countryCode.toUpperCase())
      : deps.defaultCountry;

  if (legacy.currency !== undefined && !isString(legacy.currency)) {
    return { ok: false, error: { kind: 'INVALID', reason: 'currency must be a string' } };
  }
  const currency = currencyCode((legacy.currency ?? 'INR').toUpperCase());

  const requested = stringArray(legacy.providers, 'providers', problems);
  if (requested !== undefined && deps.knownSuppliers !== undefined) {
    const unknown = requested.filter((c) => !deps.knownSuppliers?.has(c.toUpperCase()));
    if (unknown.length > 0 && unknown.length === requested.length) {
      // Every supplier asked for is unknown, so this search can only ever be
      // empty. Say so rather than returning a confident nothing.
      return { ok: false, error: { kind: 'UNKNOWN_SUPPLIER', codes: unknown } };
    }
  }

  const filters = toFilters(legacy.filters, currency, problems, unsupported);
  if (problems.length > 0) {
    return { ok: false, error: { kind: 'INVALID', reason: problems.join('; ') } };
  }

  const target = await resolveTarget(legacy, deps);
  if ('error' in target) return { ok: false, error: target.error };

  if (legacy.pageNo !== undefined && !isFiniteNumber(legacy.pageNo)) {
    return { ok: false, error: { kind: 'INVALID', reason: 'pageNo must be a number' } };
  }
  if (legacy.sortBy !== undefined && !isString(legacy.sortBy)) {
    return { ok: false, error: { kind: 'INVALID', reason: 'sortBy must be a string' } };
  }

  const request: UnifiedHotelSearchRequest = {
    target: target.target,
    stay,
    occupancy: party,
    currency,
    nationality,
    channel: 'B2C',
    ...(requested !== undefined && requested.length > 0
      ? { suppliers: requested.map(supplierCode) }
      : {}),
    ...(filters !== undefined ? { filters } : {}),
    sort: SORTS[(legacy.sortBy ?? '').toLowerCase()] ?? DEFAULT_SORT,
    page: { page: Math.max(1, Math.floor(legacy.pageNo ?? 1)), limit: 20 },
  };

  return { ok: true, request, unsupportedFilters: unsupported };
}

/**
 * `destination` → a canonical target.
 *
 * Order matters: an explicit `hotelId` wins, then a `destination` that looks
 * like a supplier-prefixed hotel id, then a canonical id, then free text.
 */
async function resolveTarget(
  legacy: LegacySearchRequest,
  deps: LegacyRequestDeps,
): Promise<{ target: SearchTarget } | { error: LegacyRequestError }> {
  const raw = legacy.hotelId ?? legacy.destination;
  if (raw !== undefined && !isString(raw)) {
    return { error: { kind: 'INVALID', reason: 'destination and hotelId must be strings' } };
  }
  // Trimmed ONCE, here. Detecting on a trimmed value and then slicing the
  // untrimmed one turned " TJ:123" into the supplier code " TJ", which matches
  // no mapping and 404s a hotel that exists.
  const direct = raw?.trim();

  if (direct !== undefined && looksLikeSupplierHotelId(direct)) {
    const at = direct.indexOf(':');
    const found = await deps.properties.findBySupplierRefs([
      {
        supplier: supplierCode(direct.slice(0, at)),
        supplierHotelId: supplierHotelId(direct.slice(at + 1)),
      },
    ]);
    const [hotel] = [...found.values()];
    if (hotel === undefined) return { error: { kind: 'UNKNOWN_HOTEL', id: direct } };
    return { target: { kind: 'HOTEL', klarHotelId: hotel.klarHotelId } };
  }

  /**
   * A canonical id, verified before it is trusted.
   *
   * The prefix tested here used to be `KLAR-HOTEL`, which no minted id has ever
   * carried — Postgres mints `KLAR-<uuid>` — so the branch was dead. It is also
   * checked against the catalogue rather than cast: an unverified id produced a
   * search for a hotel nobody has, answered 200-with-nothing (the customer is
   * told it is sold out rather than unknown), and minted a fresh cache key per
   * bogus id.
   */
  if (direct !== undefined && /^KLAR-/i.test(direct)) {
    const hotel = await deps.properties.findByKlarHotelId(klarHotelId(direct));
    if (hotel === null) return { error: { kind: 'UNKNOWN_HOTEL', id: direct } };
    return { target: { kind: 'HOTEL', klarHotelId: hotel.klarHotelId } };
  }

  const text = legacy.destination?.trim();
  if (text === undefined || text.length === 0) {
    return { error: { kind: 'MISSING_DESTINATION' } };
  }

  /**
   * No country filter.
   *
   * `countryCode` on a legacy payload is the GUEST'S NATIONALITY — it is what
   * the suppliers are asked to price for, and `UnifiedHotelSearchRequest.nationality`
   * is where it belongs. Passing it here filtered the destination lookup by
   * `country_code = 'IN'`, so an Indian customer searching Dubai, Paris or
   * Bangkok matched no destination and got a 404: every outbound international
   * search was dead.
   */
  const candidates = await deps.destinations.lookup({ text, limit: 1 });
  const best = candidates[0];
  if (best === undefined) return { error: { kind: 'UNKNOWN_DESTINATION', text } };

  return { target: { kind: 'DESTINATION', destinationId: best.klarDestinationId } };
}
