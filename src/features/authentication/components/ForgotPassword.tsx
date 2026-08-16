import React, { useState, useEffect } from 'react';
import { Mail, Phone, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import { requestForgotPasswordOTP, verifyForgotPasswordOTP, resetPassword } from '@/api/auth.api';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

type Step = 'request' | 'verify' | 'reset';

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail && step === 'request') {
      setEmail(rememberedEmail);
    }
  }, [step]);

  const validatePhoneNumber = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\s/g, '');

    // Check if phone number has country code (starts with +)
    if (cleaned.startsWith('+')) {
      // International format: + followed by 1-3 digit country code and 7-14 digits
      const internationalRegex = /^\+\d{1,3}\d{7,14}$/;
      return internationalRegex.test(cleaned);
    } else {
      // Indian format: 10 digits, may start with 6, 7, 8, 9
      const indianRegex = /^[6-9][0-9]{9}$/;
      return indianRegex.test(cleaned);
    }
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all spaces
    let cleaned = value.replace(/\s/g, '');

    // If it starts with +, handle international format
    if (cleaned.startsWith('+')) {
      // Remove any extra '+' signs
      const parts = cleaned.split('+');
      if (parts.length > 2) {
        cleaned = '+' + parts.slice(1).join('');
      }

      // Limit total length for international numbers (max 15 chars including +)
      if (cleaned.length > 15) {
        cleaned = cleaned.slice(0, 15);
      }

      // Allow only digits after +
      const match = cleaned.match(/^\+(\d+)$/);
      if (match) {
        cleaned = '+' + match[1];
      }
    } else {
      // For Indian numbers, only allow digits and limit to 10
      cleaned = cleaned.replace(/[^\d]/g, '');
      if (cleaned.length > 10) {
        cleaned = cleaned.slice(0, 10);
      }
    }

    return cleaned;
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email.trim()) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }

    if (!mobile.trim()) {
      setError('Mobile number is required');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (!validatePhoneNumber(mobile.trim())) {
      setError(
        'Please enter a valid phone number (10-digit Indian number or international format with country code like +919876543210)',
      );
      setIsLoading(false);
      return;
    }

    try {
      // Send the phone number exactly as the user entered it
      // The backend should handle matching with or without country code
      const response = await requestForgotPasswordOTP({
        email: email.trim().toLowerCase(),
        mobile: mobile.trim().replace(/\s/g, ''), // Just remove spaces, don't add country code
      });

      console.log('Full API Response:', response);

      if (response.success) {
        setStep('verify');
        setSuccess('OTP sent to your registered email address');

        if (response.otp) {
          console.log('Test OTP:', response.otp);
        }
      } else {
        throw new Error(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('Full error object:', err);

      let errorMessage = 'Failed to send OTP. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      if (err.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!otp.trim()) {
      setError('OTP is required');
      setIsLoading(false);
      return;
    }

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setIsLoading(false);
      return;
    }

    try {
      const response = await verifyForgotPasswordOTP({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      console.log('Verify OTP Response:', response);

      if (response.success && response.resetToken) {
        setResetToken(response.resetToken);
        setStep('reset');
        setSuccess('OTP verified successfully. Please set your new password.');
        setOtp('');
      } else {
        throw new Error(response.message || 'Invalid OTP');
      }
    } catch (err: any) {
      console.error('Verify OTP Error:', err);

      let errorMessage = 'Invalid OTP. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!newPassword) {
      setError('New password is required');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await resetPassword({
        resetToken,
        newPassword,
        confirmPassword,
      });

      console.log('Reset Password Response:', response);

      if (response.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Reset Password Error:', err);

      let errorMessage = 'Failed to reset password. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'request' ? 'bg-blue-900 text-white' : 'bg-green-500 text-white'}`}
          >
            {step === 'request' ? '1' : <CheckCircle className="w-5 h-5" />}
          </div>
          <div
            className={`w-12 h-0.5 ${step !== 'request' ? 'bg-green-500' : 'bg-gray-300'}`}
          ></div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'verify' ? 'bg-blue-900 text-white' : step === 'reset' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}
          >
            {step === 'reset' ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <div className={`w-12 h-0.5 ${step === 'reset' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'reset' ? 'bg-blue-900 text-white' : 'bg-gray-300 text-gray-600'}`}
          >
            3
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            {step === 'request' && 'Enter your registered email and mobile number'}
            {step === 'verify' && 'Enter the verification code sent to your email'}
            {step === 'reset' && 'Create your new password'}
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-fadeIn">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fadeIn">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Request OTP Form */}
        {step === 'request' && (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    const formattedValue = formatPhoneNumber(e.target.value);
                    setMobile(formattedValue);
                  }}
                  placeholder="9876543210 or +919876543210"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                  required
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter your registered mobile number (with or without country code)
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ backgroundColor: '#234977' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                'Send OTP'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline focus:outline-none flex items-center justify-center gap-1"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verify OTP Form */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Verification Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      setOtp(value);
                    }
                  }}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 text-center text-lg tracking-wider"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter the 6-digit verification code sent to {email}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !otp}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setOtp('');
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline focus:outline-none flex items-center gap-1"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleRequestOTP}
                className="text-sm text-blue-700 hover:text-blue-800 hover:underline focus:outline-none"
                disabled={isLoading}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password Form */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Resetting Password...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline focus:outline-none flex items-center justify-center gap-1"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
