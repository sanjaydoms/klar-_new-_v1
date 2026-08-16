import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SEARCH_INSURANCE_API_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to get the token fresh every time
apiClient.interceptors.request.use(
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

// ============ SEARCH & BOOKING FLOW ============

export const searchInsurancePackages = async (payload) => {
  try {
    const response = await apiClient.post('/search', payload);
    return response.data;
  } catch (error) {
    console.error('Server validation error:', error?.response?.data);
    throw error;
  }
};

export const reviewInsurancePlan = async (payload) => {
  try {
    const response = await apiClient.post('/review', payload);
    return response.data;
  } catch (error) {
    console.error(
      'Provider Error Detail:',
      error?.response?.data?.details || error?.response?.data,
    );
    throw error;
  }
};



export const bookInsurancePlan = async (payload, config = {}) => {
  try {
    const response = await apiClient.post("/book", payload, config);
    return response.data;
  } catch (error) {
    console.error('Booking Error:', error?.response?.data);
    throw error;
  }
};





export const getInsuranceBookingDetails = async (bookingId) => {
  try {
    const response = await apiClient.get(`/bookings/${bookingId}?source=B2C_PORTAL`);
    return response.data;
  } catch (error) {
    console.error('Booking Details Error:', error?.response?.data);
    throw error;
  }
};

// ============ MY BOOKINGS APIS ============

/**
 * Get all insurance bookings for the authenticated user
 * GET /bookings
 */
export const getInsuranceBookings = async () => {
  try {
    const response = await apiClient.get('/bookings');
    return response.data;
  } catch (error) {
    console.error('Get Insurance Bookings Error:', error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Get a specific insurance booking by ID from database
 * GET /bookings/:id
 * @param {string} id - The booking ID (MongoDB _id or custom bookingId)
 */
export const getInsuranceBookingById = async (id) => {
  try {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get Insurance Booking By ID Error:', error?.response?.data || error.message);
    throw error;
  }
};

// ============ AMENDMENTS / CANCELLATION APIS ============

/**
 * Raise an amendment/cancellation request to get charges
 * POST /amendment/raise
 * @param {Object} payload - { bookingId: string, remarks: string, type: "CANCELLATION", trips?: any[], travellers?: any[] }
 */
export const raiseInsuranceAmendment = async (payload) => {
  try {
    const response = await apiClient.post('/amendment/raise', payload);
    return response.data;
  } catch (error) {
    console.error('Raise Amendment Error:', error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Cancel/confirm the amendment (final cancellation)
 * POST /amendment/cancel
 * @param {Object} payload - { bookingId: string, remarks: string, type: "CANCELLATION" }
 */
export const cancelInsuranceAmendment = async (payload) => {
  try {
    const response = await apiClient.post('/amendment/cancel', payload);
    return response.data;
  } catch (error) {
    console.error('Cancel Amendment Error:', error?.response?.data || error.message);
    throw error;
  }
};

// Alias for easier naming
export const getInsuranceCancellationCharges = raiseInsuranceAmendment;
export const submitInsuranceCancellation = cancelInsuranceAmendment;
export const cancelInsuranceBooking = cancelInsuranceAmendment;
