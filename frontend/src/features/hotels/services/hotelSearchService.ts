import axios from 'axios';
import { SEARCH_API_BASE_URL, HOTEL_API_ENDPOINTS } from '@/config/api.config';
import { tokenStore } from '@/utils/tokenStore';
import type {
  HotelSearchParams,
  HotelSearchResponse,
  Destination,
  HotelProductResponse,
  HotelSuggestion,
} from '../types/hotelTypes';

const api = axios.create({
  baseURL: SEARCH_API_BASE_URL,
  timeout: 120000, // 120 seconds for long hotel searches
  headers: {
    'Content-Type': 'application/json',
  },
});

// Singleton trackers for the "Senior Dev" optimization
let activeSearchPromise: Promise<HotelSearchResponse> | null = null;
let activeSearchParams: string | null = null;

/**
 * Cancel any in-flight hotel search. Call this on component unmount to prevent
 * stale promises resolving into unmounted components.
 */
export const cancelActiveSearch = () => {
  activeSearchPromise = null;
  activeSearchParams = null;
};

api.interceptors.request.use(
  (config) => {
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

console.log('🏨 Hotel Search API initialized with baseURL:', api.defaults.baseURL);

let destinationsCache: { data: Destination[]; fetchedAt: number } | null = null;
const DESTINATIONS_TTL_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Search for available destinations
 */
export const searchDestinations = async (): Promise<Destination[]> => {
  if (destinationsCache && Date.now() - destinationsCache.fetchedAt < DESTINATIONS_TTL_MS) {
    return destinationsCache.data;
  }

  try {
    const response = await api.get(HOTEL_API_ENDPOINTS.DESTINATIONS);
    const destinations = response.data.body || [];
    const mapped = destinations.map((dest: any) => ({
      code: dest.destCode || '',
      name: dest.destName || '',
      city: dest.destName?.split(' ')[0] || '', // Extract first word as city
      country: dest.countryName || '',
    }));

    destinationsCache = { data: mapped, fetchedAt: Date.now() };
    return destinationsCache.data;
  } catch (error) {
    console.error('Error fetching destinations:', error);
    throw error;
  }
};

let popularDestinationsPromise: Promise<HotelSuggestion[]> | null = null;

/**
 * Get popular destinations from DB
 */
export const getPopularDestinations = async (): Promise<HotelSuggestion[]> => {
  if (popularDestinationsPromise) {
    return popularDestinationsPromise;
  }

  popularDestinationsPromise = (async () => {
    try {
      const response = await api.get(HOTEL_API_ENDPOINTS.POPULAR_DESTINATIONS);
      return response.data.body || [];
    } catch (error) {
      console.error('Error fetching popular destinations:', error);
      popularDestinationsPromise = null;
      return [];
    }
  })();

  return popularDestinationsPromise;
};

export interface CountryCity {
  name: string;
  country: string;
  hotelCount: number;
}

/**
 * Cities of a country ranked by the inventory we actually hold there.
 *
 * Landing-page tiles are built from this rather than from a hand-written list,
 * so a tile can never send the traveller to a destination with no hotels. One
 * request per country per page load, deduped here and cached for an hour by the
 * response headers; callers keep a curated fallback for a cold catalogue.
 */
const countryCitiesPromises = new Map<string, Promise<CountryCity[]>>();

export const getCountryCities = async (
  country: string,
  limit = 12,
): Promise<CountryCity[]> => {
  const key = `${country.toLowerCase()}::${limit}`;
  const existing = countryCitiesPromises.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await api.get(HOTEL_API_ENDPOINTS.COUNTRY_CITIES, {
        params: { country, limit },
      });
      return (response.data.body || []) as CountryCity[];
    } catch (error) {
      console.error('Error fetching country cities:', error);
      countryCitiesPromises.delete(key);
      return [];
    }
  })();

  countryCitiesPromises.set(key, promise);
  return promise;
};

let popularAreasPromise: Promise<Record<string, Array<{ name: string; description: string; tag?: 'POPULAR' | 'TRENDING' }>>> | null = null;

/**
 * Get popular sub-areas grouped by city key from DB
 */
export const getPopularAreas = async (): Promise<Record<string, Array<{ name: string; description: string; tag?: 'POPULAR' | 'TRENDING' }>>> => {
  if (popularAreasPromise) {
    return popularAreasPromise;
  }

  popularAreasPromise = (async () => {
    try {
      const response = await api.get(HOTEL_API_ENDPOINTS.POPULAR_AREAS);
      return response.data.body || {};
    } catch (error) {
      console.error('Error fetching popular areas:', error);
      popularAreasPromise = null;
      return {};
    }
  })();

  return popularAreasPromise;
};

/**
 * Search for hotel and destination suggestions
 */
export const getHotelSuggestions = async (
  query: string,
  signal?: AbortSignal,
): Promise<HotelSuggestion[]> => {
  if (!query || query.length < 2) return [];

  try {
    const response = await api.get(
      `${HOTEL_API_ENDPOINTS.SUGGESTIONS}?q=${encodeURIComponent(query)}`,
      {
        signal,
      },
    );
    const results = response.data.body || [];
    return results.map((item: any) => ({
      ...item,
      name: item.name || item.label || '',
    }));
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }
    console.error('Error fetching hotel suggestions:', error);
    return [];
  }
};
/**
 * Instant "explore" browse — reads straight from the locally synced hotel
 * catalogue, no dates, no live supplier calls. Used by property-type tiles on
 * the landing page so browsing a city's Villas/Hostels/etc. feels immediate;
 * prices only appear once the user picks dates on the detail page.
 */
export const getStaticHotels = async (
  city: string,
  propertyType?: string,
  page = 1,
): Promise<HotelSearchResponse> => {
  try {
    const response = await api.get(HOTEL_API_ENDPOINTS.STATIC, {
      params: { city, propertyType, page },
    });
    const body = response.data.body || {};
    return {
      hotels: body.hotels || [],
      hasMore: body.hasMore ?? false,
      inventoryCount: body.inventoryCount ?? body.hotels?.length ?? 0,
    };
  } catch (error) {
    console.error('Error fetching static hotels:', error);
    return { hotels: [], hasMore: false, inventoryCount: 0 };
  }
};

/**
 * Search for hotels based on destination, dates, and room requirements
 */
export const searchHotels = async (
  params: HotelSearchParams,
  signal?: AbortSignal,
): Promise<HotelSearchResponse> => {
  try {
    const searchPayload = {
      // If a specific hotel was selected (hotel name search), send its TJ ID as destination
      // so the backend treats it as a direct hotel search (TJ only, no RG needed)
      destination: params.hotelId || params.destination,
      destinationCode: params.destinationCode,
      hotelId: params.hotelId,
      checkin: params.checkin,
      checkout: params.checkout,
      countryCode: params.countryCode || 'IN',
      currency: params.currency || 'INR',
      pageNo: params.pageNo || 1,
      providers: params.providers,
      filters: params.filters,
      sortBy: params.sortBy,
      rooms: params.rooms.map((room: any) => ({
        adults: room.Adults || room.adults || 2,
        children: room.Children || room.children || 0,
        childAges: room.childrenAges || room.childAges || [],
      })),
    };

    // Each unique paramKey (includes pageNo) gets its own request.
    // IMPORTANT: Clear the singleton after success so re-searches and refreshes always go fresh.
    const paramKey = JSON.stringify(searchPayload);
    if (activeSearchPromise && activeSearchParams === paramKey) {
      console.log('[searchHotels] Returning cached active promise for same params');
      return activeSearchPromise;
    }

    activeSearchParams = paramKey;
    activeSearchPromise = (async () => {
      try {
        console.log(
          '🏨 Hotel Search Request sent for destination:',
          searchPayload.destination,
          'page:',
          searchPayload.pageNo,
        );
        const response = await api.post(HOTEL_API_ENDPOINTS.SEARCH, searchPayload, { signal });
        console.log(
          'Hotel Search Response: received',
          (response.data.results || response.data.body || []).length,
          'hotels',
        );

        // API returns unified hotels array in response.data.results, but support 'body' as fallback
        const hotelsData = response.data.results || response.data.body || [];

        // Map Unified API fields to our frontend Hotel interface
        const hotels = hotelsData.map((hotel: any) => {
          // Robust field mapping to handle multiple backend formats
          // hotelId is the primary key from our Unified API
          const id = hotel.hotelId || hotel.propertyId || hotel.PropertyId || hotel.tjHotelId || '';
          const name = hotel.name || hotel.propertyName || hotel.PropertyName || '';
          const address = hotel.address || hotel.street || '';
          const rating = hotel.starRating || parseFloat(hotel.categoryCode) || 0;
          const price = hotel.price || hotel.minPrice || 0;
          const currency = hotel.currency || hotel.Currency || 'INR';

          const computedBase =
            hotel.basePrice ?? (hotel.taxAmount ? price - hotel.taxAmount : price);
          if (computedBase < 0)
            console.warn(
              `[Hotel ${id}] negative basePrice clamped: price=${price}, taxAmount=${hotel.taxAmount}`,
            );

          return {
            id,
            name,
            address,
            city: hotel.city || hotel.destinationName || '',
            country: hotel.country || hotel.countryName || '',
            starRating: rating,
            images: hotel.images || [],
            amenities: hotel.amenities || hotel.hotelAmenities || [],
            minPrice: price,
            price,
            // ── Pricing breakdown (new fields) ───────────────────────────────
            basePrice: Math.max(0, computedBase),
            taxAmount: hotel.taxAmount ?? 0,
            taxesIncluded:
              hotel.taxesIncluded ?? (hotel.taxAmount === 0 || hotel.taxAmount == null),
            // ─────────────────────────────────────────────────────────────────
            currency,
            source: hotel.source,
            isRefundable: hotel.isRefundable,
            refundableLabel: hotel.refundableLabel,
            onHoldAllowed: hotel.onHoldAllowed ?? false,
            mealBasis: hotel.mealBasis || (hotel.hotelBoard?.length ? hotel.hotelBoard[0] : ''),
            // The backend already derives a display-ready label (deriveRefundable)
            // and deliberately omits it when no supplier signal exists. Prefer it,
            // and leave the policy NULL when unknown — the old
            // `isRefundable ? ... : 'Non-Refundable'` fallback turned "no data"
            // into a false "Non-Refundable" on every search card.
            cancellationPolicy:
              hotel.refundableLabel ?? getCancellationPolicyString(hotel) ?? null,
            longitude:
              typeof hotel.longitude === 'string' ? parseFloat(hotel.longitude) : hotel.longitude,
            latitude:
              typeof hotel.latitude === 'string' ? parseFloat(hotel.latitude) : hotel.latitude,
            // Retain legacy fields if components blindly expect them
            propertyCode: hotel.propertyCode || id,
            brandCode: hotel.brandCode || '',
            distance: '',
            originalPrice: null,
            discount: null,
            features: [hotel.mealBasis].filter(Boolean),
            badges: [],
            description: hotel.description || hotel.accMultiDesc || hotel.accTypeDesc || '',
            allotment: hotel.allotment,
            hotelSegment: hotel.hotelSegment || 'Hotel',
            hotelSegments: [hotel.hotelSegment || 'Hotel'].filter(Boolean),
            accTypeDesc: hotel.accTypeDesc,
            accMultiDesc: hotel.accMultiDesc,
            accomodationType: hotel.accomodationType,
            hotelBoards: hotel.hotelBoard || [hotel.mealBasis].filter(Boolean),
            rateComments: '',
            checkInTime: hotel.checkInTime || hotel.checkIn || hotel.checkin_time || '',
            checkOutTime: hotel.checkOutTime || hotel.checkOut || hotel.checkout_time || '',
            altDeal: hotel.altDeal,
            inclusions: hotel.inclusions || [],
            // Carry TripJack session correlationId so Pricing reuses the same Listing session
            correlationId: hotel.rawPayload?._correlationId || hotel.correlationId || '',
            rawPayload: hotel.rawPayload || null,
          };
        });

        const result = {
          hotels,
          meta: response.data.meta,
          total: response.data.total ?? hotels.length,
          hasMore: response.data.hasMore ?? false,
          inventoryCount: response.data.inventoryCount ?? hotels.length,
          facets: response.data.facets,
        };

        // ✅ Clear singleton after success so next search/page always fires a fresh request
        activeSearchPromise = null;
        activeSearchParams = null;

        return result;
      } catch (error) {
        activeSearchPromise = null;
        activeSearchParams = null;
        console.error('Error searching hotels:', error);
        throw error;
      }
    })();

    return activeSearchPromise;
  } catch (error) {
    console.error('Error initiating hotel search:', error);
    throw error;
  }
};

// Helper function to flatten RateGain hotelFacility structure
export const flattenFacilities = (hotelFacility?: any[]): string[] | null => {
  if (!hotelFacility || !Array.isArray(hotelFacility)) return null;

  const amenities: string[] = [];
  const addAmenity = (val: any) => {
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (p && typeof p === 'string') amenities.push(p.trim());
          });
          return;
        }
      } catch (e) { }
    }
    if (val && typeof val === 'string') {
      amenities.push(val.trim());
    }
  };

  hotelFacility.forEach((group: any) => {
    if (group.facilityInfo && Array.isArray(group.facilityInfo)) {
      group.facilityInfo.forEach((info: any) => {
        const name = info.facilityName || info.name || info.description;
        addAmenity(name);
      });
    } else if (group.facilityName) {
      addAmenity(group.facilityName);
    } else if (typeof group === 'string') {
      addAmenity(group);
    }
  });

  return amenities.length > 0 ? amenities : null;
};

// Helper function for short cancellation dates
export const formatCancellationDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * Helper function to get cancellation policy string
 */
export const getCancellationPolicyString = (hotel: any): string | null => {
  const policies = hotel.cancellationPolicies || hotel.CancellationPolicies || [];
  if (Array.isArray(policies) && policies.length > 0) {
    // Find the first policy where amount is 0 (free cancellation period)
    const freePolicy = policies.find((p: any) => parseFloat(p.amount) === 0);

    // Also check for the first policy with a non-zero amount to know when it becomes paid
    const firstPaidPolicy = policies.find((p: any) => parseFloat(p.amount) > 0);

    if (freePolicy && freePolicy.from) {
      if (firstPaidPolicy && firstPaidPolicy.from) {
        return `Free Cancellation till ${formatCancellationDateShort(firstPaidPolicy.from)}`;
      }
      return `Free Cancellation from ${formatCancellationDateShort(freePolicy.from)}`;
    } else if (firstPaidPolicy) {
      return `Cancellation charges apply from ${formatCancellationDateShort(firstPaidPolicy.from)}`;
    }
    // Policies were present but no amount parsed. That is unreadable data, not
    // a non-refundable rate; returning a label here invented the harshest
    // reading of a payload we failed to understand.
    return null;
  }

  if (hotel.cancellationPolicy === 'FREE' || hotel.cancellationPolicy?.toUpperCase() === 'FREE') {
    return 'Free cancellation';
  }

  // No branch reads the policy STRING to decide refundability. This function
  // generates that string; sniffing it here would close the loop and let a
  // supplier's wording decide a contractual fact (D-3).
  const policy = hotel.cancellationPolicy;

  if (hotel.isRefundable === true || hotel.refundable === true) {
    return 'Free cancellation';
  }
  if (hotel.isRefundable === false || hotel.refundable === false) {
    return 'Non-Refundable';
  }

  return policy || null;
};

/**
 * Helper function to extract features from hotel data
 */
export const extractFeatures = (hotel: any): string[] => {
  const features: string[] = [];

  // 1. Board Basis (Meal Plans) - More comprehensive detection
  const board = (hotel.hotelBoard || hotel.boardName || hotel.mealBasis || hotel.board || '')
    .toString()
    .toUpperCase();
  if (board.includes('ALL INCLUSIVE') || board === 'AI') {
    features.push('All Inclusive');
  } else if (board.includes('FULL BOARD') || board === 'FB') {
    features.push('Full Board (Breakfast+Lunch+Dinner)');
  } else if (board.includes('HALF BOARD') || board === 'HB') {
    features.push('Half Board (Breakfast + Lunch/Dinner)');
  } else if (board.includes('BED AND BREAKFAST') || board.includes('BREAKFAST') || board === 'BB') {
    features.push('Breakfast included');
  } else if (board.includes('ROOM ONLY') || board === 'RO' || board === 'EP') {
    features.push('Room Only');
  } else if (board && board !== 'UNDEFINED' && board !== 'NULL') {
    features.push(hotel.hotelBoard || hotel.boardName || hotel.mealBasis || hotel.board);
  }

  // 2. Room Amenities (Top 3 key ones for quick comparison)
  if (hotel.amenities && Array.isArray(hotel.amenities)) {
    const keyAmenities = hotel.amenities
      .filter((a: string) => {
        const lower = a.toLowerCase();
        return (
          lower.includes('wifi') ||
          lower.includes('ac') ||
          lower.includes('air cond') ||
          lower.includes('tv') ||
          lower.includes('television') ||
          lower.includes('mini bar') ||
          lower.includes('balcony') ||
          lower.includes('pool access') ||
          lower.includes('coffee') ||
          lower.includes('safe') ||
          lower.includes('desk') ||
          lower.includes('iron')
        );
      })
      .slice(0, 3);

    keyAmenities.forEach((a: string) => {
      if (!features.includes(a)) features.push(a);
    });
  }

  // 3. Detailed Cancellation Policy
  const cancelStr = getCancellationPolicyString(hotel);
  if (cancelStr) {
    features.push(cancelStr);
  }

  // 4. Allotment / Urgency
  if (hotel.allotment && Number(hotel.allotment) < 5) {
    features.push(`Only ${hotel.allotment} rooms left!`);
  }

  // 5. Room Inclusions (e.g. Free WiFi, Welcome Drink)
  if (hotel.inclusions && Array.isArray(hotel.inclusions)) {
    hotel.inclusions.forEach((inc: any) => {
      if (inc && typeof inc === 'string') {
        const cleanInc = inc.trim();
        if (cleanInc && !features.includes(cleanInc)) {
          features.push(cleanInc);
        }
      }
    });
  }

  return features;
};

/**
 * Get room products for a specific hotel
 */
export const getHotelProducts = async (
  propertyId: string,
  params: {
    PropertyCode: string;
    BrandCode: string;
    checkin: string;
    checkout: string;
    Rooms: Array<{
      numberOfRoom: number;
      adults: number;
      children: number;
      childrenAges?: number[];
    }>;
    destinationCode?: string;
    correlationId?: string;
  },
): Promise<HotelProductResponse> => {
  const cleanHid = propertyId.replace('TJ:', '').replace('RG:', '').trim();
  const payload = {
    hid: cleanHid,
    PropertyCode: params.PropertyCode,
    BrandCode: params.BrandCode,
    destinationCode: params.destinationCode,
    correlationId: params.correlationId,
    checkin: params.checkin,
    checkout: params.checkout,
    rooms: params.Rooms.map((room) => ({
      adults: room.adults,
      children: room.children,
      childAge: room.children > 0 ? room.childrenAges || [] : undefined,
    })),
    currency: 'INR',
  };
  console.log('[getHotelProducts] Fetching pricing for propertyId:', propertyId);

  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await api.post(HOTEL_API_ENDPOINTS.PRODUCTS(propertyId), payload);
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      console.error(
        `[Attempt ${attempt}/${maxRetries}] Hotel products request failed (status ${status}). Payload:`,
        JSON.stringify(payload, null, 2),
      );
      // Retry only on 500/502/503/504 (transient upstream errors)
      if (attempt < maxRetries && status >= 500) {
        console.log(`Retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw error;
    }
  }
  // TypeScript requires a return, but this is unreachable
  throw new Error('Unexpected: exhausted retries without throwing');
};
