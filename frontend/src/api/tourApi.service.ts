import axios from 'axios';

// 1. Create configured Axios client using Vite environment variable
export const tourApiClient = axios.create({
  baseURL: import.meta.env.VITE_TOURS_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor to automatically attach JWT token
tourApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------------

export enum DestinationType {
  DOMESTIC = 'Domestic Travel',
  INTERNATIONAL = 'International Travel',
}

export enum PortalSource {
  B2B = 'B2B',
  B2C = 'B2C',
}

export interface ITourQueryPayload {
  destinationType: DestinationType | string;
  fullName: string;
  contactNumber: string;
  email: string;
  destinationName: string;
  travelDate: string;
  numberOfTravellers: number;
  specialRequirements?: string;
  source?: PortalSource | string;
}

// ---------------------------------------------------------------------------
// API HELPER FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Submit a tour package query form
 * POST /api/tours/query/submit
 */
export const submitTourQuery = async (payload: ITourQueryPayload) => {
  try {
    const response = await tourApiClient.post('/query/submit', payload);
    return response.data;
  } catch (error: any) {
    console.error('Submit Tour Query API failed:', error?.response || error);
    throw error;
  }
};