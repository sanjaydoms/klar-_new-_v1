import axios, { AxiosError } from 'axios';
import { BOOKING_API_BASE_URL, BOOKING_API_ENDPOINTS } from '@/config/api.config';
import { tokenStore } from '@/utils/tokenStore';
import {
  BookingPayload,
  PrecheckResponse,
  CommitResponse,
} from '@/features/bookings/types/booking.types';

const api = axios.create({
  baseURL: BOOKING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // Increased to 120s for slow TripJack operations (e.g. cancellations/holds)
});

console.log('🏨 Hotel Booking API initialized with baseURL:', api.defaults.baseURL);

// Attach auth token to every request via tokenStore (set by AuthContext on login/rehydration)
api.interceptors.request.use(
  (config) => {
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const clientType = tokenStore.isGuestToken() ? 'GUEST' : 'B2C';
    config.headers['x-client-type'] = clientType;
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Generate unique request ID for tracking
 */
const generateRequestId = (): string => {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Determine if an API error is a transient network or server error that should be retried.
 */
const isRetryable = (error): boolean =>
  axios.isAxiosError(error) &&
  (error.code === 'ERR_NETWORK' ||
    error.response?.status === 503 ||
    error.response?.status === 504);

/**
 * RateGain error code → user-friendly message map
 */
const RATEGAIN_ERROR_MESSAGES: Record<string, string> = {
  '1999': 'The room rate has expired or is no longer available. Please go back and search again.',
  '1001':
    'Invalid request sent to the hotel supplier. Please try a different room or contact support.',
  '1002': 'Authentication failed with the hotel supplier. Please contact support.',
  '1003': 'The requested room type is no longer available. Please select a different room.',
  '1004':
    'Rate mismatch detected. The room price has changed. Please search again for updated rates.',
  '1005': 'The hotel is fully booked for your selected dates. Please try different dates.',
};

/**
 * Parse RateGain-style error descriptions (e.g. "Message:... ; ErrorCode:1999")
 */
const parseRateGainError = (description: string): string | null => {
  if (!description) return null;
  const match = description.match(/ErrorCode:(\d+)/);
  if (match && match[1]) {
    const code: string = match[1];
    return RATEGAIN_ERROR_MESSAGES[code] || null;
  }
  return null;
};

/**
 * Extract detailed error message from API response
 */
const extractErrorMessage = (error): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Log the full response for debugging
    if (axiosError.response?.data) {
      console.error(
        '🔍 Full backend error response:',
        JSON.stringify(axiosError.response.data, null, 2),
      );
    }

    // Check for response data with error message
    if (axiosError.response?.data) {
      const data = axiosError.response.data as any;

      // Try to parse RateGain error codes for user-friendly messages
      const rateGainMsg = parseRateGainError(data.description || data.message || '');
      if (rateGainMsg) return rateGainMsg;

      if (data.description) return data.description;
      if (data.message) return data.message;
      if (data.error) return data.error;
      if (data.errors) return JSON.stringify(data.errors);
    }

    // Network or timeout errors
    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your internet connection and try again.';
    }
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }

    // HTTP status errors (fallback if no message in response body)
    if (axiosError.response?.status === 400) {
      return 'Invalid booking data. Please verify all details and try again.';
    }
    if (axiosError.response?.status === 404) {
      return 'Booking service not found. Please contact support.';
    }
    if (axiosError.response?.status === 500) {
      return 'Server error. Please try again later or contact support.';
    }

    return axiosError.message || 'An unexpected error occurred';
  }

  return error?.message || 'An unexpected error occurred';
};

/**
 * Fetch available special requests
 */
export const getSpecialRequests = async () => {
  try {
    const requestId = generateRequestId();
    console.log(`[${requestId}] Fetching special requests...`);

    const response = await api.get(BOOKING_API_ENDPOINTS.SPECIAL_REQUESTS);

    console.log(`[${requestId}] Special requests fetched successfully:`, response.data);
    // API returns a direct array, but we also handle wrapped body just in case
    const data = response.data;
    return Array.isArray(data) ? data : data.body || [];
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Perform a booking precheck with retry logic
 */
export const precheckBooking = async (bookingData: any, retries = 2): Promise<PrecheckResponse> => {
  const requestId = generateRequestId();

  try {
    const payload: BookingPayload = {
      BookReservation: bookingData,
    };

    console.log(`[${requestId}] 🔍 PRECHECK - Sending request`);

    const response = await api.post(BOOKING_API_ENDPOINTS.PRECHECK, payload, {
      timeout: 30000, // 30 seconds for precheck
    });

    console.log(`[${requestId}] ✅ PRECHECK SUCCESS: status=${response.data.status}`);

    return {
      status: response.data.status || 'success',
      statusCode: response.data.statusCode || response.status,
      body: response.data.body,
      message: response.data.message,
    };
  } catch (error) {
    // Retry on transient 503/504 or network errors
    if (retries > 0 && isRetryable(error)) {
      console.warn(
        `[${requestId}] PRECHECK transient error, retrying in 1s... (${retries} retries left)`,
      );
      await new Promise((r) => setTimeout(r, 1000));
      return precheckBooking(bookingData, retries - 1);
    }
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Finalize the booking commitment with retry logic
 */
export const commitBooking = async (bookingData: any, retries = 2): Promise<CommitResponse> => {
  const requestId = generateRequestId();

  try {
    const payload: BookingPayload = {
      BookReservation: bookingData,
    };

    console.log(`[${requestId}] 📝 COMMIT - Sending request`);

    const response = await api.post(BOOKING_API_ENDPOINTS.COMMIT, payload, {
      timeout: 60000, // 60 seconds for commit (longer timeout)
    });

    console.log(`[${requestId}] ✅ COMMIT SUCCESS: status=${response.data.status}`);

    return {
      status: response.data.status || 'success',
      statusCode: response.data.statusCode || response.status,
      body: response.data.body,
      message: response.data.message,
    };
  } catch (error) {
    // Retry on transient 503/504 or network errors
    if (retries > 0 && isRetryable(error)) {
      console.warn(
        `[${requestId}] COMMIT transient error, retrying in 1s... (${retries} retries left)`,
      );
      await new Promise((r) => setTimeout(r, 1000));
      return commitBooking(bookingData, retries - 1);
    }
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Finalize the booking commitment using the unified agnostic payload (MMT-Style)
 */
export const commitUnifiedBooking = async (
  payload: { bookingFormData: any; providerContext: any; meta: any },
  retries = 2,
): Promise<CommitResponse> => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] 📝 UNIFIED COMMIT - Sending request`);

    const response = await api.post(BOOKING_API_ENDPOINTS.COMMIT, payload, {
      timeout: 60000, // 60 seconds for commit
    });

    console.log(`[${requestId}] ✅ UNIFIED COMMIT SUCCESS: status=${response.data.status}`);

    return {
      status: response.data.status || 'success',
      statusCode: response.data.statusCode || response.status,
      body: response.data.body,
      message: response.data.message,
    };
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Confirm a held booking
 */
export const confirmBooking = async (payload: { bookingId: string; paymentInfos?: any[] }) => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] 💳 CONFIRM - Sending request`);

    const response = await api.post(BOOKING_API_ENDPOINTS.CONFIRM, payload, {
      timeout: 120000, // 120s — TripJack confirm-book can be slow (payment processing)
    });

    console.log(`[${requestId}] ✅ CONFIRM SUCCESS:`, JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Fetch bookings list from the backend
 */
export const getBookings = async (status?: string) => {
  const requestId = generateRequestId();

  try {
    const params: any = {};
    if (status) params.status = status;
    params.clientType = tokenStore.isGuestToken() ? 'GUEST' : 'B2C';

    console.log(`[${requestId}] Fetching bookings...`, params);

    const response = await api.get(BOOKING_API_ENDPOINTS.LIST, { params });

    console.log(`[${requestId}] Bookings fetched successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (cancelData: any) => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] Canceling booking:`, cancelData);

    const response = await api.post(BOOKING_API_ENDPOINTS.CANCEL, cancelData);

    console.log(`[${requestId}] Booking canceled successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Get cancellation charges for a booking
 */
export const getCancelCharges = async (bookingId: string) => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] Fetching cancellation charges for:`, bookingId);
    const response = await api.get(BOOKING_API_ENDPOINTS.CANCEL_CHARGES, {
      params: { bookingId },
    });

    console.log(`[${requestId}] Cancellation charges fetched successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Get all bookings
 */
export const getHotelBookings = async () => {
  const requestId = generateRequestId();

  try {
    const clientType = tokenStore.isGuestToken() ? 'GUEST' : 'B2C';
    console.log(`[${requestId}] Fetching all bookings for ${clientType}...`);
    const response = await api.get(BOOKING_API_ENDPOINTS.LIST, {
      params: { clientType }
    });

    console.log(`[${requestId}] Bookings fetched successfully:`, response.data);
    if (response.data.body === null || response.data.body === undefined) {
      throw new Error('API_NULL_BODY');
    }
    return response.data.body;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Get specific booking details
 */
export const getHotelBookingDetails = async (id: string) => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] Fetching booking details for:`, id);
    const response = await api.get(BOOKING_API_ENDPOINTS.DETAILS(id));

    console.log(`[${requestId}] Booking details fetched successfully:`, response.data);
    return response.data.body;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};
/**
 * Get modification policy for a booking
 */
export const getModificationPolicy = async (confirmationNumber: string) => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] Fetching modification policy for:`, confirmationNumber);
    const response = await api.get(BOOKING_API_ENDPOINTS.AMEND_POLICY, {
      params: { confirmationNumber },
    });

    console.log(`[${requestId}] Modification policy fetched successfully:`, response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error?.response?.data || error);
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      const fieldErrors = error.response.data.errors
        .map((e: any) => e.message || e.field + ': ' + e.error)
        .join(', ');
      throw new Error(
        fieldErrors || error.response?.data?.message || error.message || 'An error occurred',
      );
    }
    throw new Error(error?.response?.data?.message || error?.message || 'An error occurred');
  }
};

/**
 * Download booking PDF (Voucher or Invoice) from the backend
 */
export const downloadBookingPdf = async (bookingId: string, type: 'Voucher' | 'GST_Invoice'): Promise<Blob> => {
  const requestId = generateRequestId();

  try {
    console.log(`[${requestId}] Fetching PDF ${type} for booking:`, bookingId);
    
    const endpoint = type === 'Voucher' 
      ? BOOKING_API_ENDPOINTS.DOWNLOAD_VOUCHER(bookingId) 
      : BOOKING_API_ENDPOINTS.DOWNLOAD_INVOICE(bookingId);

    const response = await api.get(endpoint, {
      responseType: 'blob', // Important for downloading files
      timeout: 60000,
    });

    console.log(`[${requestId}] PDF ${type} fetched successfully.`);
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error?.response?.data || error);
    
    // If the blob itself contains a JSON error message, we try to parse it
    if (error.response && error.response.data && error.response.data.type === 'application/json') {
      try {
        const errorText = await error.response.data.text();
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.description || errorJson.message || 'Failed to download PDF');
      } catch (e) {
        // Fall back to standard error handling
      }
    }
    
    throw new Error(error?.message || 'Failed to download PDF');
  }
};/**
 * Check if bookings exist for an email address (public check)
 */
export const checkEmailBookings = async (email: string): Promise<boolean> => {
  try {
    const response = await api.get(`/api/booking/bookings/check/${encodeURIComponent(email)}`);
    return !!response.data?.body?.hasBookings;
  } catch (error) {
    console.error('Error checking bookings by email:', error);
    return false;
  }
};
