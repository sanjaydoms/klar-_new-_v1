import axios from 'axios';

// Create isolated Axios instance for the Charter API
export const charterApiClient = axios.create({
  baseURL: import.meta.env.VITE_CHARTER_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the fresh bearer token
charterApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============ CHARTER SERVICE TYPES ============

export interface CharterQuotePayload {
  from: string;
  to: string;
  departureDateTime: string; // ISO String format
  passengers: number;
  fullName: string;
  mobileNumber: string;
  email: string;
  source: 'b2b' | 'b2c';
}

export interface CharterQuoteResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// ============ CHARTER SERVICE APIS ============

/**
 * Submits a private charter quote request to the backend database
 * POST /charter/quote
 */
export const submitCharterQuote = async (
  payload: CharterQuotePayload
): Promise<CharterQuoteResponse> => {
  try {
    const response = await charterApiClient.post<CharterQuoteResponse>(
      '/charter/quote',
      payload
    );
    console.log('charterService.api.ts submitCharterQuote response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Submit Charter Quote Error:',
      error?.response?.data || error.message
    );
    throw error;
  }
};