import axios from 'axios';

// Create isolated Axios instance for the Cruise API
export const cruiseApiClient = axios.create({
  baseURL: import.meta.env.VITE_CRUISE_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the fresh bearer token
cruiseApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ============ CRUISE ENQUIRY API ============

/**
 * Submit a cruise enquiry form
 * POST /submit
 */
export const submitCruiseEnquiry = async (payload: {
  departurePort: string;
  sailMonth: string;
  nights: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
  source: string;
}) => {
  try {
    const response = await cruiseApiClient.post('/submit', payload);
    console.log('cruiseService.api.ts submitCruiseEnquiry response', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Submit Cruise Enquiry Error:', error?.response?.data || error.message);
    throw error;
  }
};
