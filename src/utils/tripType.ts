export type TripType = 'oneway' | 'return' | 'multicity';

/**
 * Canonical trip-type vocabulary: 'oneway' | 'return' | 'multicity'.
 *
 * Six dialects exist in the wild and all funnel through shared storage or
 * navigation: desktop 'oneway|return|multicity', mobile 'oneway|round|multi',
 * BookingPage's 'one-way|multi-city', the mobile review pages' internal
 * 'roundtrip', and the backend searchQuery.searchType 'RETURN|MULTICITY'.
 * Comparing any of them against a literal from another dialect silently never
 * matches — that is how BookingPage's back button sent every trip to
 * /flights/return and TravellerInfo's Cancel sent every trip to
 * /flights/oneway. Normalize before comparing; write canonical values into
 * shared storage.
 */
export function normalizeTripType(raw: unknown): TripType {
  switch (
    String(raw ?? '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  ) {
    case 'return':
    case 'round':
    case 'roundtrip':
      return 'return';
    case 'multicity':
    case 'multi':
      return 'multicity';
    default:
      return 'oneway';
  }
}

/** The flight search page for a trip type, accepting any dialect. */
export function flightSearchRoute(raw: unknown): string {
  return `/flights/${normalizeTripType(raw)}`;
}

/** Canonical trip type from the shared flightSearchParams storage key. */
export function storedTripType(): TripType {
  try {
    const params = JSON.parse(sessionStorage.getItem('flightSearchParams') || '{}');
    return normalizeTripType(params.tripType);
  } catch {
    return 'oneway';
  }
}
