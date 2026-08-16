import API from './api';

export interface WalletData {
  balance: number;
  currency: string;
  status: string;
}

export interface DebitResponse {
  success: boolean;
  message: string;
  data: {
    transaction: {
      id: string;
      type: string;
      direction: string;
      amount: number;
      status: string;
    };
    newBalance: number;
  };
}

export const walletService = {
  getWallet: async (): Promise<WalletData> => {
    const response = await API.get('/user/wallet/');
    return response.data?.data || response.data;
  },

  getWalletActivity: async (limit = 5) => {
    const response = await API.get(`/user/wallet/transactions?limit=${limit}`);
    return response.data;
  },

  creditWallet: async (data: {
    amount: number;
    type: string;
    paymentMethod: string;
    referenceType?: string;
    referenceId?: string;
    description?: string;
  }) => {
    const response = await API.post('/user/wallet/credit', data);
    return response.data;
  },

  debitWallet: async (data: {
    amount: number;
    type: string;
    description?: string;
    referenceType?: string;
    referenceId?: string;
  }) => {
    const response = await API.post('/user/wallet/debit', data);
    return response.data;
  },

  deductWalletBalance: async (payload: {
    amount: number;
    referenceType: string;
    referenceId: string;
    description: string;
  }) => {
    // Map referenceId to bookingId for the backend's bookingPayment wrapper
    return API.post<DebitResponse>('/user/book/pay', {
      ...payload,
      bookingId: payload.referenceId,
    });
  },
};
