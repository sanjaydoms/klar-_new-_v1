import axios from 'axios';

const getPaymentBaseUrl = () => {
  let url = import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:5014';
  if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost') {
    url = url.replace('localhost', window.location.hostname);
  }
  return url;
};

const razorpayAPI = axios.create({
  baseURL: getPaymentBaseUrl(),
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RazorpayOrderResponse {
  success: boolean;
  message: string;
  data: {
    order: {
      orderId: string;
      razorpayOrderId: string;
      amount: number;
      currency: string;
      status: string;
      paymentGateway: string;
      platform: string;
    };
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
    platform: string;
  };
}

export interface RazorpayVerifyResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    status: string;
    razorpayPaymentId?: string;
    platform?: string;
  };
}

export const createRazorpayOrder = async (orderData: {
  amount: number;
  userId: string;
  userEmail: string;
  mobile: string;
  clientType: string;
  currency?: string;
  platform?: string;
  bookingId: string;
}) => {
  try {
    razorpayAPI.defaults.baseURL = getPaymentBaseUrl();
    console.log('Creating Razorpay order with payload:', orderData);

    const payload = {
      ...orderData,
      platform: orderData.platform || 'B2C',
    };

    const response = await razorpayAPI.post('/api/pay/razorpay/create-order', payload);

    console.log('Create Razorpay order response:', response.data);

    if (response.data?.success && response.data?.data) {
      console.log('Razorpay order created successfully:', {
        orderId: response.data.data.order.orderId,
        razorpayOrderId: response.data.data.razorpayOrderId,
        razorpayKeyId: response.data.data.razorpayKeyId,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        platform: response.data.data.platform,
      });
    }

    return response.data as RazorpayOrderResponse;
  } catch (error: any) {
    console.error('Failed to create Razorpay order:', error);

    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      throw new Error(error.response.data?.message || 'Failed to create Razorpay order');
    } else if (error.request) {
      console.error('No response received from server');
      throw new Error('Network error: Unable to connect to server');
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

export const verifyRazorpayPayment = async (verifyData: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  platform?: string;
}) => {
  try {
    console.log('Verifying Razorpay payment:', verifyData);

    const response = await razorpayAPI.post('/api/pay/razorpay/verify-payment', verifyData);

    console.log('Razorpay payment verification response:', response.data);

    return response.data as RazorpayVerifyResponse;
  } catch (error: any) {
    console.error('Failed to verify Razorpay payment:', error);

    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      throw new Error(error.response.data?.message || 'Failed to verify payment');
    } else if (error.request) {
      console.error('No response received from server');
      throw new Error('Network error: Unable to connect to server');
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

export const getRazorpayOrder = async (orderId: string) => {
  try {
    console.log('Fetching Razorpay order details:', orderId);

    const response = await razorpayAPI.get(`/api/pay/razorpay/order/${orderId}`);

    console.log('Razorpay order details:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch Razorpay order:', error);

    if (error.response) {
      throw new Error(error.response.data?.message || 'Failed to fetch order details');
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

export const syncRazorpayOrderStatus = async (orderId: string) => {
  try {
    console.log('Syncing Razorpay order status:', orderId);

    const response = await razorpayAPI.post(`/api/pay/razorpay/sync-order/${orderId}`);

    console.log('Sync order status response:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('Failed to sync Razorpay order status:', error);

    if (error.response) {
      throw new Error(error.response.data?.message || 'Failed to sync order status');
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

export const getRazorpayPaymentStatus = async (paymentId: string, platform?: string) => {
  try {
    console.log('Fetching Razorpay payment status:', paymentId);

    const params = platform ? `?platform=${platform}` : '';
    const response = await razorpayAPI.get(`/api/pay/razorpay/payment-status/${paymentId}${params}`);

    console.log('Payment status response:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch payment status:', error);

    if (error.response) {
      throw new Error(error.response.data?.message || 'Failed to fetch payment status');
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

export const getRazorpayOrderDetails = async (razorpayOrderId: string, platform?: string) => {
  try {
    console.log('Fetching Razorpay order details:', razorpayOrderId);

    const params = platform ? `?platform=${platform}` : '';
    const response = await razorpayAPI.get(`/api/pay/razorpay/razorpay-order/${razorpayOrderId}${params}`);

    console.log('Razorpay order details response:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch Razorpay order details:', error);

    if (error.response) {
      throw new Error(error.response.data?.message || 'Failed to fetch order details');
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw error;
    }
  }
};

export const initiateRazorpayPayment = async (paymentData: {
  amount: number;
  userId: string;
  userEmail: string;
  mobile: string;
  clientType: string;
  currency?: string;
  platform?: string;
  bookingId?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  /** Razorpay's own order id (order_...) the payment was captured against — this is
   *  what booking services verify with; the internal orderId will NOT match. */
  razorpayOrderId?: string;
  paymentId?: string;
  error?: string;
}> => {
  try {
    const payload = {
      ...paymentData,
      platform: paymentData.platform || 'B2C',
    };

    const orderResponse = await createRazorpayOrder(payload as any);

    if (!orderResponse.success) {
      throw new Error(orderResponse.message || 'Failed to create Razorpay order');
    }

    const { razorpayOrderId, razorpayKeyId, amount, currency, order, platform } = orderResponse.data;

    return new Promise((resolve, reject) => {
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          initializeRazorpayCheckout();
        };
        script.onerror = () => {
          reject(new Error('Failed to load Razorpay SDK'));
        };
        document.body.appendChild(script);
      } else {
        initializeRazorpayCheckout();
      }

      function initializeRazorpayCheckout() {
        const options = {
          key: razorpayKeyId,
          amount: Math.round(amount * 100),
          currency: currency,
          name: 'Your Company Name',
          description: `Payment for order ${order.orderId}`,
          order_id: razorpayOrderId,
          handler: async (response: any) => {
            try {
              const verifyResponse = await verifyRazorpayPayment({
                orderId: order.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                platform: platform || 'B2C',
              });

              if (verifyResponse.success) {
                resolve({
                  success: true,
                  orderId: order.orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                });
              } else {
                resolve({
                  success: false,
                  error: verifyResponse.message || 'Payment verification failed',
                });
              }
            } catch (error: any) {
              resolve({
                success: false,
                error: error.message || 'Payment verification failed',
              });
            }
          },
          prefill: {
            name: paymentData.userId,
            email: paymentData.userEmail,
            contact: paymentData.mobile,
          },
          notes: {
            userId: paymentData.userId,
            clientType: paymentData.clientType,
            platform: platform || 'B2C',
          },
          theme: {
            color: '#F37254',
          },
          modal: {
            ondismiss: () => {
              resolve({
                success: false,
                error: 'Payment cancelled by user',
              });
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      }
    });
  } catch (error: any) {
    console.error('Razorpay payment initiation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate Razorpay payment',
    };
  }
};

export default {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayOrder,
  syncRazorpayOrderStatus,
  getRazorpayPaymentStatus,
  getRazorpayOrderDetails,
  initiateRazorpayPayment,
};