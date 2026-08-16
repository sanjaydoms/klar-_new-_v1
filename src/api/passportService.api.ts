import axios from 'axios';

// Create isolated Axios instance for the Passport API
export const passportApiClient = axios.create({
  baseURL: import.meta.env.VITE_PASSPORT_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the fresh bearer token
passportApiClient.interceptors.request.use(
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

// ============ PASSPORT SERVICE TYPES ============

export interface PassportQuotePayload {
  source: 'b2c';
  service: 'New passport' | 'Renewal' | 'Reissue' | 'Police Clearance Certificate';
  applicant: 'Adult' | 'Minor';
  city: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
}

// ============ PASSPORT SERVICE APIS ============

/**
 * Submits a passport quote request to the database
 * POST /quote
 */
export const submitPassportQuote = async (payload: PassportQuotePayload) => {
  try {
    const response = await passportApiClient.post('/passport/quote', payload);
    console.log('passportService.api.ts submitPassportQuote response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Submit Passport Quote Error:', error?.response?.data || error.message);
    throw error;
  }
};