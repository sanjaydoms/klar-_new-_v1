// Corrected flights.api.ts - Fix the getMultiCityNextPage function

import { formatFlightSearchPayload } from '@/utils/searchFlightPayload.helper';
import axios from 'axios';

const flightsAPI = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_FLIGHT_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    apikey: '312879d86166f2-27d9-4b96-ae2b-292a8d0108f8',
  },
});

let latestPayload: any = null;

export const searchFlights = async (params: any) => {
  console.log('Print inside API', params);
  latestPayload = params;
  const page = params.page || 1;
  const limit = params.limit || 10;
  const payload = formatFlightSearchPayload(params);
  const response = await flightsAPI.post(
    `/api/flights/search?page=${page}&limit=${limit}`,
    payload,
  );
  return response.data;
};

export const MultiCitySearchFlights = async (params: any) => {
  console.log('Print inside API', params);
  latestPayload = params;
  const page = params.page || 1;
  const limit = params.limit || 10;
  const payload = formatFlightSearchPayload(params);
  const response = await flightsAPI.post(
    `/api/flights/multi-city/search?page=${page}&limit=${limit}`,
    payload,
  );
  return response.data;
};

// CORRECTED getMultiCityNextPage function
export const getMultiCityNextPage = async (
  sessionId: string,
  cursor: string,
  limit: number = 10,
) => {
  try {
    const response = await flightsAPI.get(`/api/multi-city/next/${sessionId}`, {
      params: { cursor, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching next page:', error);
    throw error;
  }
};

// CORRECTED getMultiCityLegFlights function
export const getMultiCityLegFlights = async (
  sessionId: string,
  legKey: string,
  cursor?: string,
  limit: number = 10,
) => {
  try {
    const response = await flightsAPI.get(`/api/multi-city/leg/${sessionId}/${legKey}`, {
      params: { cursor, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching leg flights:', error);
    throw error;
  }
};

// CORRECTED getMultiCityFlightBySegmentId function
export const getMultiCityFlightBySegmentId = async (sessionId: string, segmentId: string) => {
  try {
    const response = await flightsAPI.get(`/api/multi-city/flight/${sessionId}/${segmentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching flight by segment ID:', error);
    throw error;
  }
};

// CORRECTED clearMultiCitySession function
export const clearMultiCitySession = async (sessionId: string) => {
  try {
    const response = await flightsAPI.delete(`/api/multi-city/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error clearing session:', error);
    throw error;
  }
};

/**
 * Flight details by segment id.
 *
 * DEAD — no caller, and it could never have worked: `/api/flights/segment/:id`
 * is not registered by any flight-service router, so the fetch 404s, and the
 * catch below RETURNS the Error rather than throwing it, handing callers a
 * truthy non-flight object. Its two former callers now render from the search
 * result they already hold (see ReturnFlight/flightDetailsView.ts).
 *
 * Left in place rather than deleted only because it is the record of a backend
 * route someone intended to build. Delete it, or build the route.
 */
export async function getFlightDetailsBySegmentId(segmentId: string) {
  if (!latestPayload) {
    throw new Error('No search payload found. Please search flights first.');
  }

  const apiUrl = import.meta.env.VITE_BACKEND_FLIGHT_URL;
  const payload = formatFlightSearchPayload(latestPayload);

  try {
    const response = await fetch(`${apiUrl}/api/flights/segment/${segmentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch flight details');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.warn('Segment API failed, returning mock details:', error);
    return error;
  }
}

/**
 * getting fare rules
 */
export const getFareRule = async (fareRuleId: string) => {
  const apiUrl = import.meta.env.VITE_BACKEND_FLIGHT_URL;
  const flowType = 'SEARCH';
  const payload = { flowType, id: fareRuleId };
  try {
    const response = await fetch(`${apiUrl}/api/flights/fare-rule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fare rule');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.warn('Fare rule API failed:', error);
    throw error;
  }
};

/**
 * Get booking details and store user form data
 */
export const getBookingDetails = async (
  bookingData: {
    bookingId: string;
    status: 'CONFIRMED';
    paymentInfos: Array<{
      amount: number;
    }>;
    travellerInfo: Array<{
      ti: string;
      fN: string;
      lN: string;
      pt: 'ADULT' | 'CHILD' | 'INFANT';
      dob: string;
      pNat: string;
      pNum: string;
      eD: string;
      pid?: string;
      di?: string;
      ssrBaggageInfos?: Array<{
        key: string;
        code: string;
      }>;
      ssrMealInfos?: Array<{
        key: string;
        code: string;
      }>;
      ssrSeatInfos?: Array<{
        key: string;
        code: string;
      }>;
      ssrExtraServiceInfos?: Array<{
        key: string;
        code: string;
      }>;
    }>;
    gstInfo?: {
      gstNumber: string;
      registeredName: string;
      email: string;
      mobile: string;
      address: string;
    };
    deliveryInfo: {
      emails: string[];
      contacts: string[];
    };
    contactInfo: {
      emails: string[];
      contacts: string[];
      ecn?: string;
    };
  },
  token?: string,
) => {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await flightsAPI.post('/api/flights/booking-details', bookingData, {
      headers: headers,
    });

    console.log('booking details response we got', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to get booking details:', error);
    throw error;
  }
};

/**
 * Check price availability for selected flights
 */
export const checkPriceAvailability = async (priceIds: string[], searchId?: string) => {
  try {
    const payload: any = { priceIds };
    if (searchId) payload.searchId = searchId;
    const response = await flightsAPI.post('/api/flights/review', payload);
    console.log('review api response we got', response);
    return response.data;
  } catch (error: any) {
    console.warn('Price availability check failed:', error);
    throw error;
  }
};

/**
 * Get seat map for a booking
 */
export const getSeatMap = async (bookingId: string) => {
  try {
    const response = await flightsAPI.post('/api/flights/seat', { bookingId });
    console.log('seat map api response we got', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to fetch seat map:', error);
    throw error;
  }
};

/**
 * Create an instant booking
 */
export const createInstantBooking = async (bookingData: {
  bookingId: string;
  totalAmount: number;
  deliveryEmail: string;
  deliveryPhone: string;
  emergencyContact?: {
    name: string;
    email: string;
    phone: string;
  };
  travellers: Array<{
    type: 'adult' | 'child' | 'infant';
    title: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }>;
}) => {
  try {
    const cleanTitle = (title: string): string => {
      const cleaned = title.replace(/\./g, '').trim();
      const validTitles = ['Mr', 'Mrs', 'Ms', 'Master'];
      return validTitles.includes(cleaned) ? cleaned : 'Mr';
    };

    const cleanEmail = (email: string): string => {
      const trimmedEmail = email?.trim() || '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedEmail)) {
        return trimmedEmail;
      }
      return 'guest@example.com';
    };

    const cleanedTravellers = bookingData.travellers.map((traveller) => ({
      ...traveller,
      title: cleanTitle(traveller.title),
      firstName: traveller.firstName?.trim() || '',
      lastName: traveller.lastName?.trim() || '',
      dateOfBirth: traveller.dateOfBirth || '',
    }));

    const enrichedBookingData = {
      ...bookingData,
      travellers: cleanedTravellers,
      deliveryEmail: cleanEmail(bookingData.deliveryEmail),
      deliveryPhone: bookingData.deliveryPhone?.trim() || '+1234567890',
    };

    console.log('Cleaned booking payload:', JSON.stringify(enrichedBookingData, null, 2));

    const response = await flightsAPI.post('/api/flights/booking/instant', enrichedBookingData);
    console.log('instant booking response we got', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to create instant booking:', error);
    throw error;
  }
};

/**
 * Get user's flight bookings
 */
export const getMyFlightBookings = async (token?: string, id?: string) => {
  try {
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await flightsAPI.get(`/api/flights/my-booking/${id}`, {
      headers: Object.keys(headers).length ? headers : undefined,
    });

    console.log('My flight bookings response:', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to fetch flight bookings:', error);
    throw error;
  }
};

/**
 * Get booking details by booking ID
 */
export const getTripJackBooking = async (bookingId: string) => {
  try {
    const response = await flightsAPI.get(`/api/flights/my-booking/tripjack/${bookingId}`);
    console.log('TripJack booking response:', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to fetch TripJack booking:', error);
    throw error;
  }
};

/**
 * Get cancellation charges for a booking
 */
export const getCancellationCharges = async (
  bookingId: string,
  cancellationData: {
    bookingId: string;
    remarks?: string;
    trips?: Array<{
      src: string;
      dest: string;
      departureDate: string;
      travellers: Array<{
        fn: string;
        ln: string;
      }>;
    }>;
  },
) => {
  try {
    console.log('The cancellation data we get', JSON.stringify(cancellationData, null, 2));
    const response = await flightsAPI.post(
      `/api/flights/my-booking/tripjack/${bookingId}/cancellation/charges`,
      {
        remarks: cancellationData.remarks,
        trips: cancellationData.trips,
      },
    );

    console.log('Cancellation charges response:', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to fetch cancellation charges:', error);
    throw error;
  }
};

/**
 * Confirm cancellation for a booking
 */
export const confirmCancellation = async (
  bookingId: string,
  cancellationData: {
    bookingId: string;
    remarks?: string;
    trips?: Array<{
      src: string;
      dest: string;
      departureDate: string;
      travellers: Array<{
        fn: string;
        ln: string;
      }>;
    }>;
  },
) => {
  try {
    const response = await flightsAPI.post(
      `/api/flights/my-booking/tripjack/${bookingId}/cancellation`,
      {
        remarks: cancellationData.remarks,
        trips: cancellationData.trips,
      },
    );

    console.log('Cancellation confirmation response:', response);
    return response.data;
  } catch (error: any) {
    console.warn('Failed to confirm cancellation:', error);
    throw error;
  }
};

export const reviewFlight = async (searchId: string, priceIds: string[]) => {
  const payload = { searchId, priceIds };
  const response = await flightsAPI.post('/flights/review', payload);
  return response.data;
};

export const revalidateFlight = async (reviewId: string) => {
  const payload = { reviewId };
  const response = await flightsAPI.post('/api/flightsreview/revalidate', payload);
  return response.data;
};

export const getFlightSegmentDetails = async (segmentId: string, payload: any) => {
  const response = await flightsAPI.post(`/flights/segment/${segmentId.split(',')[0]}`, payload);
  return response.data;
};

/**
 * Search flights with filters and sorting as query parameters
 */
export const searchFlightsWithFilters = async (params: any) => {
  const queryParams = new URLSearchParams();

  const page = params.page || 1;
  const limit = params.limit || 10;

  if (params.primarySort) {
    queryParams.append('primary', params.primarySort);
  }
  if (params.secondarySort && params.secondarySort !== 'NONE') {
    queryParams.append('secondary', params.secondarySort);
  }

  if (params.stops && params.stops.length > 0) {
    params.stops.forEach((stop: string) => {
      queryParams.append('stops', stop);
    });
  }

  if (params.refundType && params.refundType.length > 0) {
    params.refundType.forEach((type: string) => {
      queryParams.append('refundType', type);
    });
  }

  if (params.minPrice !== undefined && params.minPrice > 0) {
    queryParams.append('minPrice', params.minPrice.toString());
  }
  if (params.maxPrice !== undefined && params.maxPrice < 100000) {
    queryParams.append('maxPrice', params.maxPrice.toString());
  }

  if (params.arrivalTime && params.arrivalTime.length > 0) {
    params.arrivalTime.forEach((time: string) => {
      queryParams.append('arrivalTime', time);
    });
  }

  const payload = formatFlightSearchPayload(params.searchQuery);

  const response = await flightsAPI.post(
    `/api/flights/search?page=${page}&limit=${limit}&${queryParams.toString()}`,
    payload,
  );

  return response.data;
};

/**
 * Search one-way flights without pagination
 */
export const searchOneWayFlights = async (params: {
  cabinClass: string;
  paxInfo: {
    ADULT: number;
    CHILD: number;
    INFANT: number;
  };
  routeInfos: Array<{
    fromCityOrAirport: { code: string };
    toCityOrAirport: { code: string };
    travelDate: string;
  }>;
  searchModifiers: {
    isDirectFlight: boolean;
    isConnectingFlight: boolean;
    pft: string;
  };
}) => {
  try {
    console.log('Search one-way flights payload:', params);

    const response = await flightsAPI.post('/api/search/oneway', params);

    console.log('One-way search response:', response);
    return response.data;
  } catch (error: any) {
    console.error('Error searching one-way flights:', error);
    throw error;
  }
};
