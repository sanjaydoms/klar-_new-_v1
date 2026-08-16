import axios from 'axios';
import { BOOKING_API_BASE_URL, BOOKING_API_ENDPOINTS } from '@/config/api.config';
import { tokenStore } from '@/utils/tokenStore';

const api = axios.create({
  baseURL: BOOKING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // Increased from 60s to 120s for slow TripJack operations
});

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

const extractTjError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data?.description) return data.description;
    if (data?.message) return data.message;
    if (data?.errors?.[0]?.message) return data.errors[0].message;
    return error.message;
  }
  return error?.message || 'An unexpected error occurred';
};

/**
 * TripJack Step 3: Review (Precheck)
 * Returns bookingId
 */
export const precheckTJ = async (payload: any) => {
  try {
    console.log('🔍 [TJ-SERVICE] Precheck Request:', JSON.stringify(payload, null, 2));
    const response = await api.post(BOOKING_API_ENDPOINTS.PRECHECK, payload);
    console.log('✅ [TJ-SERVICE] Precheck Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [TJ-SERVICE] Precheck Failed:', error);
    // Propagate the original error so that catch blocks in components can access err.response
    const errMsg = extractTjError(error);
    const enrichedError = new Error(errMsg);
    (enrichedError as any).response = error.response;
    throw enrichedError;
  }
};

// commitTJ and cancelTJ were removed: neither had a single caller. Commit goes
// through commitUnifiedBooking (HotelReviewBooking.tsx) and cancellation through
// hotelBookingService.cancelBooking, both of which are supplier-agnostic.
//
// `precheckTJ` below stays, and deliberately is NOT merged into
// hotelBookingService.precheckBooking. That looks like duplication — same base
// URL, same supplier-agnostic endpoint — but precheckBooking wraps its argument
// as `{ BookReservation: … }`, and hotel-booking-service picks the supplier with
//   payload.propertyId || payload.PropertyId || payload.BookReservation?.propertyID
// (precheck.service.ts:6-12). Note the capital D: wrapped, every term misses, the
// id resolves to "" and a TripJack precheck is routed to the RateGain provider.
// precheckBooking would also drop the top-level bookingId/description from the
// response, strip the `.response` its callers read, and swap 120s/no-retry for
// 30s/2-retries — and a retried precheck mints a fresh bookingId, invalidating
// the one the UI already holds.
//
// The real leak is not this file: it is callers branching on `id.startsWith('TJ:')`
// to decide whether to precheck at all. Fixing that needs a capability flag on the
// unified model, not an id prefix.
