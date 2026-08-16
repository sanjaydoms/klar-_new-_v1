export const CABIN_CLASSES = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;
export const FARE_TYPES = ['REGULAR', 'STUDENT', 'SENIOR_CITIZEN'] as const;
export const VALID_PAX_TYPES = ['ADULT', 'CHILD', 'INFANT'] as const;

export const ERROR_CODES = {
    INVALID_ROUTE_SEQUENCE: 'INVALID_ROUTE_SEQUENCE',
    INVALID_CABIN_CLASS: 'INVALID_CABIN_CLASS',
    INVALID_ADULT_COUNT: 'INVALID_ADULT_COUNT',
    INVALID_CHILD_COUNT: 'INVALID_CHILD_COUNT',
    INVALID_INFANT_COUNT: 'INVALID_INFANT_COUNT',
    MAX_PASSENGER_EXCEEDED: 'MAX_PASSENGER_EXCEEDED',
    INFANT_MORE_THAN_ADULT: 'INFANT_MORE_THAN_ADULT',
    EMPTY_ROUTE_INFOS: 'EMPTY_ROUTE_INFOS',
    INVALID_ROUTE_COUNT: 'INVALID_ROUTE_COUNT',
    INVALID_AIRPORT_CODE: 'INVALID_AIRPORT_CODE',
    INVALID_TRAVEL_DATE: 'INVALID_TRAVEL_DATE',
    SAME_ORIGIN_DESTINATION: 'SAME_ORIGIN_DESTINATION',
    DATE_NOT_ASCENDING: 'DATE_NOT_ASCENDING',
    DATE_TOO_FAR: 'DATE_TOO_FAR',
    INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
    PREFERRED_AIRLINE_LIMIT: 'PREFERRED_AIRLINE_LIMIT',
    INVALID_FARE_TYPE: 'INVALID_FARE_TYPE',
    CHILD_OR_INFANT_WITH_SPECIAL_FARE: 'CHILD_OR_INFANT_WITH_SPECIAL_FARE'
} as const;

/**
 * TripJack mints the priceIds inside a Search response with a 15-minute life
 * ("PriceIds in the response are valid for 15 minutes" — Flights API v2.0). Any
 * cache holding a search response is really holding those priceIds, so it must
 * expire first — otherwise a cache hit hands the user a dead id and Review fails
 * with 1071 "Fare no longer available" long after the search looked fine.
 *
 * The 60s margin is the gap between reading a cached result and reaching Review.
 */
export const PRICE_ID_LIFETIME_SECONDS = 15 * 60;
export const SEARCH_CACHE_TTL_SECONDS = PRICE_ID_LIFETIME_SECONDS - 60;

export const MAX_PASSENGERS = 9;
export const MIN_ADULT = 1;
export const MAX_ROUTE_INFOS = 6;
export const MAX_PREFERRED_AIRLINES = 10;
export const AIRPORT_CODE_REGEX = /^[A-Z]{3}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;