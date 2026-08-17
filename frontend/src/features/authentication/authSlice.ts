import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { b2bLoginUser, b2cRegisterUser, b2cLoginVerifyOTP } from './authService';
import { b2cGoogleAuth } from "@/api/auth.api";

interface AuthState {
  user: any;
  token: string | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  message: string;
  loginResult: any;
  _persist?: any;
}

// Add these interfaces
interface B2CRegisterData {
  fullName: string;
  email: string;
  password: string;
  mobileNumber: string;
  otp: string;
}

interface B2CLoginVerifyData {
  email: string;
  password: string;
  otp: string;
}

interface B2CGoogleAuthData {
  idToken: string;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: '',
  loginResult: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (data: { email: string; password: string }, thunkAPI) => {
    try {
      const response = await b2bLoginUser(data);

      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add B2C Register async thunk
export const b2cRegister = createAsyncThunk(
  "auth/b2cRegister",
  async (data: B2CRegisterData, thunkAPI) => {
    try {
      const response = await b2cRegisterUser(data);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const b2cLoginVerify = createAsyncThunk(
  "auth/b2cLoginVerify",
  async (data: B2CLoginVerifyData, thunkAPI) => {
    // ADD THESE CONSOLE LOGS
    console.log('🟣 Step 10: b2cLoginVerify THUNK called');
    console.log('🟣 Step 10a: Data received:', { email: data.email, otp: data.otp });

    try {
      console.log('🟣 Step 11: Calling API b2cLoginVerifyOTP...');
      const response = await b2cLoginVerifyOTP(data);
      console.log('🟣 Step 12: API Response:', response);
      return response;
    } catch (error: any) {
      console.log('🔴 Step 13: API Error:', error);
      console.log('🔴 Step 13a: Error response:', error.response);
      const message = error.response?.data?.message || "OTP verification failed";
      console.log('🔴 Step 13b: Error message:', message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// B2C Google Login async thunk
export const b2cGoogleLogin = createAsyncThunk(
  "auth/b2cGoogleLogin",
  async (data: B2CGoogleAuthData, thunkAPI) => {
    console.log('🟣 Step 1: b2cGoogleLogin THUNK called');
    
    try {
      console.log('🟣 Step 2: Calling API b2cGoogleAuth...');
      const response = await b2cGoogleAuth(data);
      console.log('🟣 Step 3: API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('🔴 Step 4: API Error:', error);
      const message = error.response?.data?.message || "Google login failed";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {

      state.user = null;
      state.token = null;
      state.loginResult = null;
      state.isSuccess = false;
      state.isError = false;
    },
    clearLoginResult: (state) => {
      state.loginResult = null;
    },
    clearMessages: (state) => {
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Existing B2B login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        const responseData = action.payload;

        const userData = responseData?.user;
        const tokenData = responseData?.user?.token;

        if (tokenData) {
          state.token = tokenData;
        }
        state.user = userData || null;
        state.loginResult = responseData;
        state.message = "Login successful";
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload as string;
        state.loginResult = null;
        state.user = null;
        state.token = null;
      })
      // B2C Register cases
      .addCase(b2cRegister.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(b2cRegister.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Registration successful";
        state.loginResult = action.payload;
      })
      .addCase(b2cRegister.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload as string;
      })
      // B2C Login Verify OTP cases
      .addCase(b2cLoginVerify.pending, (state) => {
        // ADD THIS CONSOLE LOG
        console.log('⏳ Step 14: Redux - PENDING state');
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(b2cLoginVerify.fulfilled, (state, action) => {
        console.log('✅ Step 15: Redux - FULFILLED state');
        console.log('✅ Step 15a: Full action payload:', action.payload);

        state.isLoading = false;
        state.isSuccess = true;

        // Extract token from your API response structure
        const token = action.payload?.data?.token;

        console.log('✅ Extracted token:', token);

        if (token) {
          state.token = token;

          // Create a minimal user object since your API doesn't return user data
          state.user = {
            token: token,
            email: action.meta?.arg?.email, // Get email from the login request
            status: 'ACTIVE', // Assume active for redirect
            verificationStatus: 'APPROVED' // Assume approved for redirect
          };

          console.log('✅ Created user object for redirect:', state.user);
        } else {
          console.log('❌ No token found in response');
        }

        state.loginResult = action.payload;
        state.message = action.payload?.message || "Login successful";
      })
      .addCase(b2cLoginVerify.rejected, (state, action) => {
        // ADD THESE CONSOLE LOGS
        console.log('❌ Step 16: Redux - REJECTED state');
        console.log('❌ Step 16a: Error payload:', action.payload);

        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload as string;
        state.loginResult = null;
        state.user = null;
        state.token = null;
      })
      // B2C Google Login cases
      .addCase(b2cGoogleLogin.pending, (state) => {
        console.log('⏳ Google login PENDING');
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(b2cGoogleLogin.fulfilled, (state, action) => {
        console.log('✅ Google login FULFILLED');
        console.log('✅ Full action payload:', action.payload);
        
        state.isLoading = false;
        state.isSuccess = true;
        
        // Extract token and user from your API response structure
        const token = action.payload?.data?.token;
        const user = action.payload?.data?.user;
        
        console.log('✅ Extracted token:', token);
        console.log('✅ Extracted user:', user);
        
        if (token) {
          state.token = token;
          state.user = user || {
            token: token,
            email: user?.email,
            fullName: user?.fullName,
            mobileNumber: user?.mobileNumber,
            status: user?.status || 'ACTIVE',
            verificationStatus: user?.verificationStatus || 'APPROVED'
          };
          
          console.log('✅ State updated with user:', state.user);
        } else {
          console.log('❌ No token found in response');
        }
        
        state.loginResult = action.payload;
        state.message = action.payload?.message || "Google login successful";
      })
      .addCase(b2cGoogleLogin.rejected, (state, action) => {
        console.log('❌ Google login REJECTED');
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload as string;
        state.loginResult = null;
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout, clearLoginResult, clearMessages } = authSlice.actions;
export default authSlice.reducer;