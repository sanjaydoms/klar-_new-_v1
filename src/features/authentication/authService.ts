// src/features/authentication/authService.ts
import axios from 'axios';
import { b2bLogin, B2BLoginPayload, B2BAuthResponse, b2cRegister } from '../../api/auth.api';

const AUTH_API_URL = `${import.meta.env.VITE_BACKEND_AUTH_URL}`;

export const loginUser = async (data: { email: string; password: string }) => {
  const response = await axios.post(AUTH_API_URL + 'login', data);
  return response.data;
};

// New B2B login service
export const b2bLoginUser = async (data: B2BLoginPayload): Promise<B2BAuthResponse> => {
  try {
    const response = await b2bLogin(data);

    // Don't store in localStorage here - Redux persist will handle it
    // Just return the response
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// B2C Register service
export const b2cRegisterUser = async (data: {
  fullName: string;
  email: string;
  password: string;
  mobileNumber: string;
  otp: string;
}): Promise<any> => {
  try {
    const response = await b2cRegister(data);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// B2C Login Verify OTP service
export const b2cLoginVerifyOTP = async (data: any) => {
  try {
    const response = await axios.post(`${AUTH_API_URL}/user/auth/b2c/login/verify-otp`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Request OTP for forgot password
 * POST /user/auth/b2c/forgot-password/request-otp
 */
export const forgotPasswordRequestOTP = async (data: {
  email: string;
  mobileNumber: string;
}): Promise<any> => {
  const response = await axios.post(
    `${AUTH_API_URL}/user/auth/b2c/forgot-password/request-otp`,
    data
  );
  return response.data;
};

/**
 * Reset password using OTP
 * POST /user/auth/b2c/forgot-password/reset
 */
export const resetPassword = async (data: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<any> => {
  const response = await axios.post(
    `${AUTH_API_URL}/user/auth/b2c/forgot-password/reset`,
    data
  );
  return response.data;
};