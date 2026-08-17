import axios from 'axios';

// Create isolated Axios instance for the Visa API
export const visaApiClient = axios.create({
  baseURL: import.meta.env.VITE_VISA_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the fresh bearer token
visaApiClient.interceptors.request.use(
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

// ============ VISA CONFIGURATION PLANS ============

/**
 * Fetch all visa plans for a selected country
 * GET /plans?country=CountryName
 */
export const getVisaPlans = async () => {
  try {
    const response = await visaApiClient.get('/plans');
    return response.data;
  } catch (error: any) {
    console.error('Fetch Visa Plans Error:', error?.response?.data || error.message);
    throw error;
  }
};



/**
 * Submits a completed multi-step visa application form to the database
 * POST /submit
 */
export const submitVisaApplicationForm = async (payload: any) => {
  try {
    const response = await visaApiClient.post('/submit', payload);
    console.log("visaService.api.ts submitVisaApplicationForm response", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Submit Visa Application Error:', error?.response?.data || error.message);
    throw error;
  }
};