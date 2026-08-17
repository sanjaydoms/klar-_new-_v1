import axios from 'axios';

const paymentAPI = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    // apikey: '312879d86166f2-27d9-4b96-ae2b-292a8d0108f8',
  },
});

/**
 * Create an order for payment
 * @param orderData - Object containing amount, userId, and customerPhone
 * @returns Promise with order details including orderId, cfOrderId, paymentSessionId
 */
export const createOrder = async (orderData: {
  amount: number;
  userId: string;
  mobile: string;
}) => {
  try {
    console.log('Creating order with payload:', orderData);

    const response = await paymentAPI.post('/api/order/create-order', orderData);

    console.log('Create order response:', response.data);

    if (response.data?.success && response.data?.data) {
      console.log('Order created successfully:', {
        orderId: response.data.data.orderId,
        cfOrderId: response.data.data.cfOrderId,
        paymentSessionId: response.data.data.paymentSessionId,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        status: response.data.data.status,
      });
    }

    return response.data;
  } catch (error: any) {
    console.error('Failed to create order:', error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      throw new Error(error.response.data?.message || 'Failed to create order');
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      throw new Error('Network error: Unable to connect to server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

/**
 * Verify payment status for an order
 * @param orderId - The order ID to verify
 * @returns Promise with payment status
 */
export const verifyPaymentStatus = async (orderId: string) => {
  try {
    console.log('Verifying payment status for order:', orderId);

    const response = await paymentAPI.post(`/api/order/sync-order/${orderId}`);

    console.log('Payment status response:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('Failed to verify payment status:', error);

    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      throw new Error(error.response.data?.message || 'Failed to verify payment status');
    } else if (error.request) {
      console.error('No response received from server');
      throw new Error('Network error: Unable to connect to server');
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

export default {
  createOrder,
};
