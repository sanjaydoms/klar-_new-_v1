import API from './api';

// B2B Signup Payload Interface
export interface B2BSignupPayload {
  businessName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  businessMobile: string;
  password: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  country: string;
  confirmPassword?: string;
}

// B2B Login Payload Interface
export interface B2BLoginPayload {
  email: string;
  password: string;
}

// API Response Interfaces
export interface B2BAuthResponse {
  user: any;
  token: string | null;
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      businessName: string;
      businessType: string;
      contactPerson: string;
      businessMobile: string;
      status: 'VERIFICATION_PENDING' | 'ACTIVE' | 'BLOCKED' | 'REJECTED' | 'TOO_MANY_ATTEMPTS';
      verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
      pendingReason?: string;
      blockReason?: string;
      rejectedReason?: string;
      createdAt: string;
    };
  };
}

// B2C Signup Request OTP Payload
export interface B2CSignupRequestOTPPayload {
  email: string;
}

// B2C Register Payload
export interface B2CRegisterPayload {
  fullName: string;
  email: string;
  password: string;
  mobileNumber: string;
  otp: string;
}

// B2C Login Request OTP Payload
export interface B2CLoginRequestOTPPayload {
  email: string;
  password: string;
}

// B2C Login Verify OTP Payload
export interface B2CLoginVerifyOTPPayload {
  email: string;
  password: string;
  otp: string;
}

// B2C API Response Interfaces
export interface B2CAuthResponse {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: {
      id: string;
      email: string;
      fullName: string;
      mobileNumber: string;
      createdAt: string;
    };
  };
}

export interface B2CGoogleAuthPayload {
  idToken: string;
}

// B2B Signup API
export const b2bSignup = (payload: B2BSignupPayload) => {
  return API.post<B2BAuthResponse>('/user/auth/signup', payload);
};

// B2B Login API
export const b2bLogin = (payload: B2BLoginPayload) => {
  return API.post<B2BAuthResponse>('/user/auth/login', {
    ...payload,
    clientType: 'B2B',
  });
};

// B2C Signup Request OTP API
export const b2cSignupRequestOTP = (payload: B2CSignupRequestOTPPayload) => {
  return API.post<B2CAuthResponse>('/user/auth/b2c/signup/request-otp', payload);
};

// B2C Register API
export const b2cRegister = (payload: B2CRegisterPayload) => {
  return API.post<B2CAuthResponse>('/user/auth/b2c/signup/verify-otp', payload);
};

// B2C Login Request OTP API
export const b2cLoginRequestOTP = (payload: B2CLoginRequestOTPPayload) => {
  return API.post<B2CAuthResponse>('/user/auth/b2c/login/request-otp', payload);
};

// B2C Login Verify OTP API
export const b2cLoginVerifyOTP = (payload: B2CLoginVerifyOTPPayload) => {
  return API.post<B2CAuthResponse>('/user/auth/b2c/login/verify-otp', payload);
};

export const b2cGoogleAuth = (payload: B2CGoogleAuthPayload) => {
  return API.post<B2CAuthResponse>('/user/auth/b2c/google', payload);
};

/**
 * Change Password API
 * Allows authenticated users to change their password
 */
export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  const response = await API.post<{ success: boolean; message: string }>(
    '/user/auth/change-password',
    payload,
  );
  return response.data;
};
