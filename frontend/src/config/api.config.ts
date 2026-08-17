import { config } from './env.config';

// API endpoint configuration
// In local dev: these are '' (empty) → requests go through Vite proxy
// In production (Vercel): these are the full live backend URLs (e.g. https://search-api.example.com)
export const SEARCH_API_BASE_URL = config.searchApiUrl.trim();
export const BOOKING_API_BASE_URL = config.bookingApiUrl.trim();

// Backward compatibility alias
export const API_BASE_URL = SEARCH_API_BASE_URL;

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/booking/auth/login',
    LOGOUT: '/api/booking/auth/logout',
    REGISTER: '/api/booking/auth/register',
    REFRESH_TOKEN: '/api/booking/auth/refresh',
    VERIFY_EMAIL: '/api/booking/auth/verify-email',
  },

  // Flights
  FLIGHTS: {
    SEARCH: '/flights/search',
    DETAILS: (id: string) => `/flights/${id}`,
    AVAILABILITY: '/flights/availability',
  },

  // Bookings
  BOOKINGS: {
    CREATE: '/api/booking/bookings',
    LIST: '/api/booking/bookings',
    DETAILS: (id: string) => `/api/booking/bookings/${id}`,
    CANCEL: (id: string) => `/api/booking/bookings/${id}/cancel`,
  },

  // Payments
  PAYMENTS: {
    PROCESS: '/api/booking/payments/process',
    VERIFY: '/api/booking/payments/verify',
    METHODS: '/api/booking/payments/methods',
  },

  // Users
  USERS: {
    PROFILE: '/api/booking/users/profile',
    UPDATE_PROFILE: '/api/booking/users/profile',
    PREFERENCES: '/api/booking/users/preferences',
  },
} as const;

export const HOTEL_API_ENDPOINTS = {
  DESTINATIONS: '/api/search/destinations',
  POPULAR_DESTINATIONS: '/api/search/destinations/popular',
  COUNTRY_CITIES: '/api/search/destinations/cities',
  SEARCH: '/api/search/hotels/search',
  STATIC: '/api/search/hotels/static',
  SUGGESTIONS: '/api/search/hotels/suggestions',
  PRODUCTS: (id: string) => `/api/search/hotels/${id}/products`,
};

export const BOOKING_API_ENDPOINTS = {
  SPECIAL_REQUESTS: '/api/booking/special-requests',
  PRECHECK: '/api/booking/precheck',
  COMMIT: '/api/booking/commit',
  CONFIRM: '/api/booking/confirm',
  AMEND_POLICY: '/api/booking/amend/policy',
  CANCEL: '/api/booking/cancel',
  CANCEL_CHARGES: '/api/booking/cancel/charges',
  CREATE: '/api/booking/bookings',
  LIST: '/api/booking/bookings',
  DETAILS: (id: string) => `/api/booking/bookings/${id}`,
  DOWNLOAD_VOUCHER: (id: string) => `/api/booking/templates/hotel/confirmation/client/${id}`,
  DOWNLOAD_INVOICE: (id: string) => `/api/booking/templates/hotel/confirmation/agent/${id}`,
};
