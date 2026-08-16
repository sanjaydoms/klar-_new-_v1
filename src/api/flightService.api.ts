import axios from 'axios';
import { notifyError } from '@/utils/notify';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_FLIGHT_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export const searchOneWayFlights = async (payload: any) => {
  try {
    const response = await apiClient.post('/search/oneway', payload);
    return response.data;
  } catch (error: any) {
    console.error('One-way search failed:', error?.response || error);
    throw error;
  }
};

export const getOnewayFareDetails = async (payload: { sessionId: string; flightKey: string }) => {
  try {
    const response = await apiClient.post('/fare/oneway', payload);
    return response.data;
  } catch (error: any) {
    console.error('Fare API failed:', error?.response || error);
    throw error;
  }
};

export const getReturnFareDetails = async (payload: {
  sessionId: string;
  flightKey: string;
  segment: string;
}) => {
  try {
    const response = await apiClient.post('/fare/return', payload);
    return response.data;
  } catch (error: any) {
    console.error('Fare API failed:', error?.response || error);
    throw error;
  }
};

export const getFareRule = async (payload: { flowType: string; id: string }) => {
  try {
    console.log('Calling fare rule API with payload:', payload);
    const response = await apiClient.post('/fare/rule', payload);
    return response.data;
  } catch (error: any) {
    notifyError('Fare not available. Choose another fare or flight');
    console.error('Fare Rule API failed:', error?.response || error);
    console.error('Request payload:', payload);
    throw error;
  }
};

export const getReviewDetails = async (payload: { priceIds: string[] }) => {
  try {
    const response = await apiClient.post('/review', payload);
    return response.data;
  } catch (error: any) {
    console.error('Review API failed:', error?.response || error);
    throw error;
  }
};

export const getSeatDetails = async (payload: { bookingId: string }) => {
  try {
    const response = await apiClient.post('/seat', payload);
    return response.data;
  } catch (error: any) {
    console.error('Seat API failed:', error?.response || error);
    throw error;
  }
};

export const getAncillaryDetails = async (sessionId: string) => {
  try {
    const response = await apiClient.get(`/ancillary/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Ancillary API failed:', error?.response || error);
    throw error;
  }
};

export const searchReturnFlights = async (payload: {
  cabinClass: string;
  paxInfo: {
    ADULT: number;
    CHILD: number;
    INFANT: number;
  };
  routeInfos: Array<{
    fromCityOrAirport: { code: string };
    toCityOrAirport: { code: string };
    travelDate: string;
  }>;
  searchModifiers: {
    isDirectFlight: boolean;
    isConnectingFlight: boolean;
    pft: string;
  };
}) => {
  try {
    const response = await apiClient.post('/search/return', payload);
    return response.data;
  } catch (error: any) {
    console.error('Return flight search failed:', error?.response || error);
    throw error;
  }
};

export const searchMultiCityFlights = async (payload: {
  cabinClass: string;
  paxInfo: {
    ADULT: number;
    CHILD: number;
    INFANT: number;
  };
  routeInfos: Array<{
    fromCityOrAirport: { code: string };
    toCityOrAirport: { code: string };
    travelDate: string;
  }>;
  searchModifiers: {
    isDirectFlight: boolean;
    isConnectingFlight: boolean;
  };
}) => {
  try {
    const response = await apiClient.post('/search/multicity', payload);
    return response.data;
  } catch (error: any) {
    console.error('Multi-city flight search failed:', error?.response || error);
    throw error;
  }
};

export const getMultiCityFareDetails = async (payload: {
  sessionId: string;
  legIndex: number[];
  flightKey: string;
}) => {
  try {
    const response = await apiClient.post('/fare/multicity', payload);
    return response.data;
  } catch (error: any) {
    console.error('Multi-city fare API failed:', error?.response || error);
    throw error;
  }
};

export const initLocalBooking = async (payload: {
  bookingId: string;
  amount: number;
  email: string;
  phone: string;
  isHold: boolean;
  departureDate?: string;
  travellers: Array<{
    title: string;
    paxType: string;
    firstName: string;
    lastName: string;
    dob: string;
    passportNumber?: string;
    passportNationality?: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
    ssrSeatInfos: Array<{ key: string; code: string }>;
    ssrMealInfos: Array<{ key: string; code: string }>;
    ssrBaggageInfos: Array<{ key: string; code: string }>;
  }>;
  gstInfo?: {
    gstNumber: string;
    registeredName: string;
    email: string;
    mobile: string;
    address: string;
  };
  emergencyContact: {
    name: string;
    email: string;
    phone: string;
  };
}) => {
  try {
    const response = await apiClient.post('/book-local/init', payload);
    return response.data;
  } catch (error: any) {
    console.error('Book Local Init failed:', error?.response || error);
    throw error;
  }
};

export const getMealsAndBaggages = async (sessionId: string) => {
  try {
    const response = await apiClient.get(`/ancillary/${sessionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Ancillary API failed:', error?.response || error);
    throw error;
  }
};

export const initInstantBooking = async (payload: {
  bookingId: string;
  amount: number;
  email: string;
  phone: string;
  isHold: boolean;
  travellers: Array<{
    title: string;
    paxType: string;
    firstName: string;
    lastName: string;
    dob: string;
    passportNumber?: string;
    passportNationality?: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
    ssrSeatInfos: Array<{ key: string; code: string }>;
    ssrMealInfos: Array<{ key: string; code: string }>;
    ssrBaggageInfos: Array<{ key: string; code: string }>;
  }>;
  gstInfo?: {
    gstNumber: string;
    registeredName: string;
    email: string;
    mobile: string;
    address: string;
  };
  emergencyContact: {
    name: string;
    email: string;
    phone: string;
  };
}) => {
  try {
    const response = await apiClient.post('/book/instant', payload);
    return response.data;
  } catch (error: any) {
    console.error('Instant Booking failed:', error?.response || error);
    throw error;
  }
};

export const validateBooking = async (payload: { bookingId: string }) => {
  try {
    const response = await apiClient.post('/book/validate', payload);
    return response.data;
  } catch (error: any) {
    console.error('Booking validation failed:', error?.response || error);
    throw error;
  }
};

export const updateBooking = async (payload: {
  bookingId: string;
  travellers: Array<{
    travellerId: string;
    ssrSeatInfos: Array<{ key: string; code: string }>;
    ssrMealInfos: Array<{ key: string; code: string }>;
    ssrBaggageInfos: Array<{ key: string; code: string }>;
  }>;
  tripjackPrice: number;
  markupPrice: number;
  totalPrice: number;
}) => {
  try {
    const response = await apiClient.put('/book-local/update', payload);
    return response.data;
  } catch (error: any) {
    console.error('Update Booking API failed:', error?.response || error);
    throw error;
  }
};

export const updateAndBook = async (payload: {
  bookingId: string;
  travellers: Array<{
    travellerId: string;
    ssrSeatInfos: Array<{ key: string; code: string }>;
    ssrMealInfos: Array<{ key: string; code: string }>;
    ssrBaggageInfos: Array<{ key: string; code: string }>;
  }>;
  tripjackPrice: number;
  markupPrice: number;
  totalPrice: number;
  isHold?: boolean;
  orderId?: string;
  source?: string;
}) => {
  try {
    const response = await apiClient.put('/book-local/update-and-book', payload);
    return response.data;
  } catch (error: any) {
    console.error('Update Booking API failed:', error?.response || error);
    throw error;
  }
};

export const getFlightBookings = async (source?: string, email?: string) => {
  try {
    const params = new URLSearchParams();
    if (source) params.append('source', source);
    if (email) params.append('email', email);

    const queryString = params.toString();
    const url = queryString ? `/book-local/my-bookings?${queryString}` : '/book-local/my-bookings';

    const response = await apiClient.get(url);
    return response.data;
  } catch (error: any) {
    console.error('Get flight bookings failed:', error?.response || error);
    throw error;
  }
};

export const getFlightBookingsByBookingId = async (bookingId: string) => {

  try {
    const response = await apiClient.get(`/book-local/details/${bookingId}?source=b2c`);
    return response.data;
  } catch (error: any) {
    console.error('Booking validation failed:', error?.response || error);
    throw error;
  }
};

export const getFlightBookingsByBookingIdFromTripjack = async (bookingId: string) => {
  try {
    const response = await apiClient.get(`/book/details/${bookingId}`);
    return response.data;
  } catch (error: any) {
    console.error('Booking validation failed:', error?.response || error);
    throw error;
  }
};

export const cancelCharge = async (payload: {
  bookingId: string;
  remarks: string;
  type: string;
  trips: Array<{
    src: string;
    dest: string;
    departureDate: string;
    travellers: Array<{
      firstName: string;
      lastName: string;
    }>;
  }>;
}) => {
  try {
    const response = await apiClient.post('/cancel/charges', payload);
    return response.data;
  } catch (error: any) {
    console.error('Cancel charge API failed:', error?.response || error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const cancelSubmit = async (payload: {
  bookingId: string;
  remarks: string;
  type: string;
  trips: Array<{
    src: string;
    dest: string;
    departureDate: string;
    travellers: Array<{
      firstName: string;
      lastName: string;
    }>;
  }>;
}) => {
  try {
    const response = await apiClient.post('/cancel/submit', payload);
    return response.data;
  } catch (error: any) {
    console.error('Cancel charge API failed:', error?.response || error);
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const confirmBooking = async (payload: { bookingId: string; amount: number }) => {
  try {
    const response = await apiClient.post('/book/confirm', payload);
    return response.data;
  } catch (error: any) {
    console.error('Booking confirmation failed:', error?.response || error);
    throw error;
  }
};

export const searchOneWayFilterFlights = async (
  payload: any,
  sortBy?: string,
  sortOrder?: string,
) => {
  try {
    let url = '/search/oneway';

    // Add query parameters if sortBy and sortOrder are provided
    if (sortBy && sortOrder) {
      url += `?sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }

    console.log('Making API call to:', url); // Debug log
    console.log('With payload:', payload); // Debug log

    const response = await apiClient.post(url, payload);
    return response.data;
  } catch (error: any) {
    console.error('One-way search failed:', error?.response || error);
    throw error;
  }
};

export const searchReturnFilterFlights = async (
  payload: any,
  sortBy?: string,
  sortOrder?: string,
) => {
  try {
    let url = '/search/return';

    if (sortBy && sortOrder) {
      url += `?sortTarget=both&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }

    console.log('Making API call to:', url);
    console.log('With payload:', payload);

    const response = await apiClient.post(url, payload);
    return response.data;
  } catch (error: any) {
    console.error('Return flight search failed:', error?.response || error);
    throw error;
  }
};

export const searchMultiCityFilterFlights = async (
  payload: any,
  sortBy?: string,
  sortOrder?: string,
) => {
  try {
    let url = '/search/multicity';

    if (sortBy && sortOrder) {
      url += `?sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }

    console.log('Making API call to:', url);
    console.log('With payload:', payload);

    const response = await apiClient.post(url, payload);
    return response.data;
  } catch (error: any) {
    console.error('Multi-city flight search failed:', error?.response || error);
    throw error;
  }
};

export const searchOneWayFlightsPrint = async (
  payload: any,
  sortBy?: string,
  sortOrder?: string,
) => {
  try {
    let url = '/search/oneway?printData=true';

    if (sortBy && sortOrder) {
      url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }

    const response = await apiClient.post(url, payload, {
      responseType: 'blob',
    });
    return response;
  } catch (error: any) {
    console.error('One-way search failed:', error?.response || error);
    throw error;
  }
};

export const searchReturnFlightsPrint = async (
  payload: any,
  sortBy?: string,
  sortOrder?: string,
) => {
  try {
    let url = '/search/return?printData=true';

    if (sortBy && sortOrder) {
      url += `&sortTarget=both&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }

    console.log('With payload:', payload);

    const response = await apiClient.post(url, payload, {
      responseType: 'blob',
    });
    return response;
  } catch (error: any) {
    console.error('Return flight search failed:', error?.response || error);
    throw error;
  }
};

export const searchMultiCityFlightsPrint = async (
  payload: any,
  sortBy?: string,
  sortOrder?: string,
) => {
  try {
    let url = '/search/multicity?printData=true';

    if (sortBy && sortOrder) {
      url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    }

    const response = await apiClient.post(url, payload, {
      responseType: 'blob',
    });
    return response;
  } catch (error: any) {
    console.error('Multi-city flight search failed:', error?.response || error);
    throw error;
  }
};

/**
 * Download flight voucher PDF
 * GET /api/flight/voucher/:bookingId/download
 */
export const downloadFlightVoucher = async (bookingId: string) => {
  try {
    const response = await apiClient.get(`/voucher/${bookingId}/download?source=b2c`, {
      responseType: 'blob', // Important: to handle binary PDF data
    });
    return response;
  } catch (error: any) {
    console.error('Voucher download failed:', error?.response || error);
    throw error;
  }
};

/**
 * Check if email has flight bookings
 * GET /api/flight/book-local/check-email
 */
export const checkFlightEmailBookings = async (email: string) => {
  try {
    const response = await apiClient.get(`/book-local/check-email?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (error: any) {
    console.error('Check flight email bookings failed:', error?.response || error);
    return { success: false, hasBookings: false };
  }
};
