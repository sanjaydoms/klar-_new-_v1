import axios from 'axios';
import { setupInterceptors } from './interceptors';

const cabsAPI = axios.create({
  baseURL: (import.meta.env.VITE_BACKEND_CABS_URL || 'http://localhost:5016').replace(/\/$/, ''),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the customer JWT so authenticated routes (/booking/my-bookings, cancel,
// booking/details) can identify the caller and enforce ownership server-side.
// Guests simply have no token, and the backend treats those bookings as GUEST.
setupInterceptors(cabsAPI);

/**
 * Search for locations using strings
 */
export const searchCabLocations = async (input: string) => {
  console.log('CABS URL:', import.meta.env.VITE_BACKEND_CABS_URL);
  try {
    const response = await cabsAPI.post('/search/location', { input });
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
 * Get latitude and longitude for a placeId
 */
export const getCabLatLong = async (placeId: string) => {
  try {
    const response = await cabsAPI.post('/search/lat-long', { placeId });
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
 * Get cab quotes based on search criteria
 */
export const getCabQuotes = async (searchParams: any) => {
  try {
    console.log('Fetching cab quotes with payload:', JSON.stringify(searchParams, null, 2));
    const response = await cabsAPI.post('/search/quotes', searchParams);
    console.log('Cab quotes response:', response.data);
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
 * Create a new cab booking
 */
export const createCabBooking = async (bookingData: any) => {
  try {
    const response = await cabsAPI.post('/booking/create', bookingData);
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
 * Get booking details
 */
export const getCabBookingDetails = async (bookingIds: string) => {
  try {
    const response = await cabsAPI.get('/booking/details', {
      params: { bookingIds },
    });
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
 * Get user's cab bookings from DB
 */
export const getMyCabBookings = async (userId: string) => {
  try {
    const response = await cabsAPI.get('/booking/my-bookings', {
      params: { userId },
    });
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
 * Get cancellation charges for a cab booking
 */
export const getCabAmendmentCharges = async (bookingId: string) => {
  try {
    const response = await cabsAPI.get('/amendment/charges', {
      params: { bookingId, type: 'CANCELLATION' },
    });
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
 * Cancel a cab booking
 */
export const cancelCabBooking = async (
  bookingId: string,
  remarks: string = 'User requested cancellation',
) => {
  try {
    const response = await cabsAPI.post('/amendment/cancel', {
      bookingId,
      remarks,
      amendmentType: 'CANCELLATION',
    });
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
 * Check if a user has any cab bookings by email
 */
export const checkCabEmailBookings = async (email: string) => {
  try {
    const response = await cabsAPI.get(`/booking/check/${encodeURIComponent(email)}`);
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error?.response?.data || error);
    throw error;
  }
};

export default {
  searchCabLocations,
  getCabLatLong,
  getCabQuotes,
  createCabBooking,
  getCabBookingDetails,
  getMyCabBookings,
  getCabAmendmentCharges,
  cancelCabBooking,
  checkCabEmailBookings,
};
