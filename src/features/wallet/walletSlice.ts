import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { walletService, WalletData } from '../../api/wallet.api';

interface Transaction {
  _id: string;
  type: string;
  description: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  status: string;
  createdAt: string;
}

interface WalletState {
  balance: number;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: WalletState = {
  balance: 0,
  transactions: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchWalletData = createAsyncThunk(
  'wallet/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const data = await walletService.getWallet();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallet');
    }
  },
);

export const fetchTransactionHistory = createAsyncThunk(
  'wallet/fetchTransactions',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      const res = await walletService.getWalletActivity(limit);
      return res.data.transactions;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  },
);

export const debitWallet = createAsyncThunk(
  'wallet/debit',
  async (
    data: {
      amount: number;
      type: string;
      description?: string;
      referenceType?: string;
      referenceId?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const res = await walletService.debitWallet(data);
      return res;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process withdrawal');
    }
  },
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setBalance: (state, action: PayloadAction<number>) => {
      state.balance = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    appendTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions = [action.payload, ...state.transactions];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWalletData.fulfilled, (state, action: PayloadAction<WalletData>) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchWalletData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTransactionHistory.fulfilled, (state, action: PayloadAction<Transaction[]>) => {
        state.transactions = action.payload;
      })
      .addCase(debitWallet.fulfilled, (state, action: any) => {
        if (action.payload?.data?.newBalance !== undefined) {
          state.balance = action.payload.data.newBalance;
          state.lastUpdated = new Date().toISOString();
        }
      });
  },
});

export const { setBalance, appendTransaction } = walletSlice.actions;
export default walletSlice.reducer;
