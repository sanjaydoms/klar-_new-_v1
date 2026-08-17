// src/features/authentication/components/Login.tsx
import React, { useState, useEffect } from "react";
import BoardingPass from './BoardingPass';
import { Mail, Lock, Eye, EyeOff, Phone, Smartphone, CheckCircle, User, ArrowLeft } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { login, clearMessages, clearLoginResult, logout as reduxLogout, b2cLoginVerify, b2cGoogleLogin } from '../authSlice';
import { RootState, persistor } from '../../../app/store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { b2cSignupRequestOTP, b2cRegister, b2cLoginRequestOTP, b2cGoogleAuth } from "@/api/auth.api";
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { forgotPasswordRequestOTP, resetPassword } from "../authService";
import { setItemWithTTL } from '@/utils/localStorageWithTTL';

export type LoginResult =
  | { type: 'REGISTERED'; reason?: string }
  | { type: 'VERIFICATION_PENDING'; email: string; reason?: string }
  | { type: 'VERIFIED'; reason?: string }
  | { type: 'WALLET_SETUP_PENDING'; reason?: string }
  | { type: 'ACTIVE'; user?: any }
  | { type: 'REJECTED'; reason?: string }
  | { type: 'BLOCKED'; reason?: string }
  | { type: 'TOO_MANY_ATTEMPTS'; reason?: string }
  | { type: 'DASHBOARD'; user?: any };

interface LoginProps {
  onNavigateToSignup: () => void;
  onLoginResult: (result: LoginResult) => void;
  disableRedirect?: boolean;
}

type LoginMethod = 'google' | 'mobile' | 'email';
type EmailMode = 'login' | 'signup';

export default function Login({ onNavigateToSignup, onLoginResult, disableRedirect = false }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isLoading, isError, isSuccess, message, user, token } = useAppSelector(
    (state: RootState) => state.auth,
  );

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('google');
  const [emailMode, setEmailMode] = useState<EmailMode>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Email Login/Signup fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumberSignup, setMobileNumberSignup] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Mobile fields
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState('');
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetMobile, setResetMobile] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpLoading, setResetOtpLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetCountdown, setResetCountdown] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [signupOtp, setSignupOtp] = useState('');
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupOtpLoading, setSignupOtpLoading] = useState(false);
  const [signupCountdown, setSignupCountdown] = useState(0);

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  // Function to get redirect path after login (same as B2B)
  const getRedirectPath = (): string => {
    console.log('=== B2C getRedirectPath called ===');

    // Check if it's mobile screen (width < 768px)
    const isMobile = window.innerWidth < 768;
    console.log('Is mobile screen?', isMobile);

    // Check sessionStorage for redirect path
    const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
    console.log('Checking sessionStorage for redirectAfterLogin:', storedRedirect);

    // Check if storedRedirect is valid (not the login page itself)
    if (storedRedirect && storedRedirect !== '/b2c' && storedRedirect !== '/login' && storedRedirect !== '/') {
      console.log('Found valid redirect path in sessionStorage:', storedRedirect);
      return storedRedirect;
    }

    // Check location state
    console.log('Checking location.state:', location.state);
    if (location.state && (location.state as any).from) {
      const from = (location.state as any).from;
      console.log('Found from in location.state:', from);
      if (typeof from === 'string' && from !== '/b2c' && from !== '/login' && from !== '/') {
        console.log('Setting redirectAfterLogin in sessionStorage:', from);
        sessionStorage.setItem('redirectAfterLogin', from);
        return from;
      }
    }

    // Default redirect based on screen size
    console.log('No valid redirect path found');
    if (isMobile) {
      console.log('Mobile screen detected, redirecting to: /');
      return '/';
    } else {
      console.log('Desktop screen detected, redirecting to: /dashboard');
      return '/dashboard';
    }
  };

  // Clear messages when component mounts
  useEffect(() => {
    dispatch(clearMessages());
    dispatch(clearLoginResult());

    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (emailOtpCountdown > 0) {
      const timer = setTimeout(() => setEmailOtpCountdown(emailOtpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailOtpCountdown]);

  useEffect(() => {
    if (signupCountdown > 0) {
      const timer = setTimeout(() => setSignupCountdown(signupCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [signupCountdown]);

  useEffect(() => {
    if (location.state?.defaultTab === 'signup') {
      setLoginMethod('email');
      setEmailMode('signup');
      setError('');
      setSuccessMessage('');
      setFullName('');
      setEmail('');
      setMobileNumberSignup('');
      setPassword('');
      setConfirmPassword('');
      setSignupOtpSent(false);
      setSignupOtp('');
    }
  }, [location]);

  // Handle successful login and redirect to dashboard
  useEffect(() => {
    console.log('🔍 useEffect triggered - Checking login success:', {
      isSuccess,
      hasUser: !!user,
      hasToken: !!token,
      userStatus: user?.status,
      verificationStatus: user?.verificationStatus
    });

    if (isSuccess && user && token) {
      console.log('✅ Login successful - User:', user);
      console.log('✅ Login successful - Token:', token);
      console.log('✅ disableRedirect flag:', disableRedirect);

      // Sync token to localStorage with TTL (like B2B)
      setItemWithTTL('token', token, 24 * 60 * 60 * 1000);
      localStorage.setItem('token', token);

      handleUserStatus(user);

      if (!disableRedirect) {
        console.log('🚀 Preparing to redirect');
        const timer = setTimeout(() => {
          // Get the redirect path (same as B2B logic)
          const redirectPath = getRedirectPath();
          console.log('=== FINAL REDIRECT ===');
          console.log('Redirecting to:', redirectPath);
          console.log('Full redirect URL:', window.location.origin + redirectPath);

          // Clear the stored redirect to prevent unexpected redirects
          sessionStorage.removeItem('redirectAfterLogin');
          console.log('Cleared redirectAfterLogin from sessionStorage');

          // Navigate to the original page or dashboard
          navigate(redirectPath, { replace: true });
        }, 1500);
        setRedirectTimer(timer);
      } else {
        console.log('⏭️ Redirect disabled, skipping navigation');
      }
    } else {
      console.log('❌ Not redirecting - conditions not met:', {
        isSuccess,
        userExists: !!user,
        tokenExists: !!token
      });
    }
  }, [isSuccess, user, token, navigate, disableRedirect]);

  // Handle error from Redux
  useEffect(() => {
    if (isError && message) {
      setError(message);
    }
  }, [isError, message]);

  // Countdown timers
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (resetCountdown > 0) {
      const timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCountdown]);

  const handleUserStatus = (user: any) => {

    if (!user) {
      console.log('❌ No user data provided');
      return;
    }

    switch (user.status) {
      case 'VERIFICATION_PENDING':
        console.log('📧 User is VERIFICATION_PENDING');
        onLoginResult({
          type: 'VERIFICATION_PENDING',
          email: user.email,
          reason: user.pendingReason,
        });
        break;

      case 'BLOCKED':
        console.log('🚫 User is BLOCKED');
        onLoginResult({
          type: 'BLOCKED',
          reason: user.blockReason,
        });
        break;

      case 'TOO_MANY_ATTEMPTS':
        console.log('⚠️ User has TOO_MANY_ATTEMPTS');
        onLoginResult({
          type: 'TOO_MANY_ATTEMPTS',
          reason: user.blockReason,
        });
        break;

      case 'REJECTED':
        console.log('❌ User is REJECTED');
        onLoginResult({
          type: 'REJECTED',
          reason: user.rejectedReason,
        });
        break;

      case 'ACTIVE':
        console.log('✅ User is ACTIVE');
        if (user.verificationStatus === 'APPROVED') {
          console.log('✅ User verification APPROVED, navigating to dashboard');
          onLoginResult({ type: 'DASHBOARD', user });
        } else {
          console.log('📧 User verification pending');
          onLoginResult({ type: 'VERIFICATION_PENDING', email: user.email });
        }
        break;

      default:
        console.log('🏠 Unknown status, defaulting to DASHBOARD');
        onLoginResult({ type: 'DASHBOARD', user });
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setError('');
    setSuccessMessage('');
    setResetEmail('');
    setResetMobile('');
    setResetOtp('');
    setResetOtpSent(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setOtpVerified(false);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setError('');
    setSuccessMessage('');
    setResetOtpSent(false);
    setOtpVerified(false);
  };

  const handleSendResetOTP = async () => {
    // Validate email
    if (!resetEmail.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate mobile number
    if (!resetMobile.trim()) {
      setError('Mobile number is required');
      return;
    }

    if (!/^\d{10}$/.test(resetMobile.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setResetOtpLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Call the actual API
      const response = await forgotPasswordRequestOTP({
        email: resetEmail,
        mobileNumber: resetMobile
      });

      if (response.success) {
        setResetOtpSent(true);
        setResetCountdown(60);
        setSuccessMessage(response.message || `OTP has been sent to your registered email: ${resetEmail}`);

        // In development, log OTP for testing
        if (response.otp) {
          console.log('Development OTP:', response.otp);
        }
      } else {
        setError(response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setResetOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!resetOtp.trim()) {
      setError('OTP is required');
      return;
    }

    if (!/^\d{6}$/.test(resetOtp.trim())) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setError('');
    setResetOtpLoading(true);

    try {
      // Set verified state - OTP will be verified during reset
      setOtpVerified(true);
      setSuccessMessage('OTP verified successfully! You can now reset your password.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid OTP. Please try again.');
    } finally {
      setResetOtpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!otpVerified) {
      setError('Please verify your OTP first');
      return;
    }

    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setResetOtpLoading(true);

    try {
      // Call the reset password API
      const response = await resetPassword({
        email: resetEmail,
        otp: resetOtp,
        newPassword: newPassword
      });

      if (response.success) {
        setSuccessMessage(response.message || 'Password reset successful! Redirecting to login...');

        setTimeout(() => {
          setShowForgotPassword(false);
          setError('');
          setSuccessMessage('');
          setResetEmail('');
          setResetMobile('');
          setResetOtp('');
          setNewPassword('');
          setConfirmNewPassword('');
          setResetOtpSent(false);
          setOtpVerified(false);
          setResetCountdown(0);
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetOtpLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!mobileNumber.trim()) {
      setError('Mobile number is required');
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOtpSent(true);
      setCountdown(60);
      setError('');
      console.log('OTP sent to:', mobileNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('OTP is required');
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (redirectTimer) {
      clearTimeout(redirectTimer);
    }

    dispatch(reduxLogout());
    persistor.purge();
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');

    console.log('Mobile login with OTP:', { mobileNumber, otp });
    dispatch(login({ email: `${mobileNumber}@temp.com`, password: otp }));
  };

  // Function to send OTP during signup
  const handleSendSignupOTP = async () => {
    // Validate all fields first
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!mobileNumberSignup.trim()) {
      setError('Mobile number is required');
      return;
    }

    if (!/^\d{10}$/.test(mobileNumberSignup.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSignupOtpLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Call the actual API to send OTP
      const response = await b2cSignupRequestOTP({ email });

      if (response.data.success) {
        setSignupOtpSent(true);
        setSignupCountdown(60);
        setSuccessMessage(`OTP has been sent to your email: ${email}`);
        console.log('Signup OTP sent to:', { email, mobileNumber: mobileNumberSignup });
      } else {
        setError(response.data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSignupOtpLoading(false);
    }
  };

  // Function to resend OTP during signup
  const handleResendSignupOTP = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setSignupOtpLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await b2cSignupRequestOTP({ email });

      if (response.data.success) {
        setSignupCountdown(60);
        setSuccessMessage(`OTP has been resent to your email: ${email}`);
      } else {
        setError(response.data.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setSignupOtpLoading(false);
    }
  };

  // Function to verify OTP and complete signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signupOtp.trim()) {
      setError('OTP is required');
      return;
    }

    if (!/^\d{6}$/.test(signupOtp.trim())) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (redirectTimer) {
      clearTimeout(redirectTimer);
    }

    dispatch(reduxLogout());
    persistor.purge();
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');

    try {
      const response = await b2cRegister({
        fullName,
        email,
        password,
        mobileNumber: mobileNumberSignup,
        otp: signupOtp
      });

      if (response.data.success) {
        setSuccessMessage('Account created successfully! Redirecting to login...');

        setTimeout(() => {
          setEmailMode('login');
          setError('');
          setSuccessMessage('');
          setFullName('');
          setEmail('');
          setMobileNumberSignup('');
          setPassword('');
          setConfirmPassword('');
          setSignupOtp('');
          setSignupOtpSent(false);
          setSignupCountdown(0);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    }
  };

  const handleSendEmailLoginOTP = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setEmailOtpLoading(true);
    setError('');

    try {
      const response = await b2cLoginRequestOTP({
        email,
        password
      });

      if (response.data.success) {
        setEmailOtpSent(true);
        setEmailOtpCountdown(60);
        setSuccessMessage(`OTP has been sent to your email: ${email}`);
      } else {
        setError(response.data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('🔵 Step 1: handleEmailLogin called', { emailOtpSent, emailOtp, email });

    // Send OTP first if not sent
    if (!emailOtpSent) {
      console.log('📧 Step 2: OTP not sent yet, sending OTP now');
      await handleSendEmailLoginOTP();
      return;
    }

    // Validate OTP
    if (!emailOtp.trim()) {
      console.log('❌ Step 3: OTP is empty');
      setError('OTP is required');
      return;
    }

    if (!/^\d{6}$/.test(emailOtp.trim())) {
      console.log('❌ Step 4: Invalid OTP format');
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    console.log('✅ Step 5: About to call b2cLoginVerify with:', { email, otp: emailOtp });

    try {
      console.log('🔄 Step 6: Dispatching b2cLoginVerify...');

      // Store the result of the dispatch
      const resultAction = await dispatch(
        b2cLoginVerify({
          email,
          password,
          otp: emailOtp,
        })
      );

      if (b2cLoginVerify.fulfilled.match(resultAction)) {

        // Get token from the response (your API returns token in data.token)
        const tokenData = resultAction.payload?.data?.token;

        if (tokenData) {
          // Store token in localStorage with TTL (like B2B)
          setItemWithTTL('token', tokenData, 24 * 60 * 60 * 1000);
          localStorage.setItem('token', tokenData);

          // Since your API doesn't return user data, create a minimal user object
          const userData = {
            token: tokenData,
            email: email,
            status: 'ACTIVE',
            verificationStatus: 'APPROVED'
          };

          // Call handleUserStatus with the user data
          handleUserStatus(userData);

          // Force navigation using the same redirect logic
          if (!disableRedirect) {
            const redirectPath = getRedirectPath();
            console.log('=== FINAL REDIRECT ===');
            console.log('Redirecting to:', redirectPath);
            sessionStorage.removeItem('redirectAfterLogin');
            setTimeout(() => {
              navigate(redirectPath, { replace: true });
            }, 1500);
          }
        } else {
          setError('No token received from server');
        }
      } else {
        setError(typeof resultAction.payload === 'string' ? resultAction.payload : 'OTP verification failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed');
    }
  };

  // Add this function to reset email OTP state
  const handleResetEmailLogin = () => {
    setEmailOtpSent(false);
    setEmailOtp('');
    setEmailOtpCountdown(0);
    setError('');
  };

  // Google Login Success Handler - Uses Redux
  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log('═══════════════════════════════════════');
    console.log('🔵 GOOGLE LOGIN - SUCCESS CALLBACK TRIGGERED');
    console.log('═══════════════════════════════════════');

    setError('');
    setSuccessMessage('');

    if (redirectTimer) {
      console.log('⏰ Clearing existing redirect timer');
      clearTimeout(redirectTimer);
    }

    console.log('🗑️ Clearing existing sessions...');
    dispatch(reduxLogout());
    persistor.purge();
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    console.log('✅ Sessions cleared');

    try {
      console.log('🌐 Dispatching b2cGoogleLogin action...');

      // Dispatch the Redux action instead of calling API directly
      const resultAction = await dispatch(
        b2cGoogleLogin({
          idToken: credentialResponse.credential
        })
      );

      console.log('📥 Dispatch result:', resultAction);

      if (b2cGoogleLogin.fulfilled.match(resultAction)) {
        console.log('✅ Google login successful via Redux');

        const tokenData = resultAction.payload?.data?.token;
        const userData = resultAction.payload?.data?.user;

        console.log('📦 Token from response:', tokenData);
        console.log('👤 User from response:', userData);

        if (tokenData) {
          // Store token in localStorage with TTL (like B2B)
          setItemWithTTL('token', tokenData, 24 * 60 * 60 * 1000);
          localStorage.setItem('token', tokenData);
          setSuccessMessage('Google login successful! Redirecting...');

          // Call handleUserStatus to process the user state
          if (userData) {
            handleUserStatus(userData);
          } else {
            // If no user data, create minimal user object
            handleUserStatus({
              ...userData,
              status: 'ACTIVE',
              verificationStatus: 'APPROVED'
            });
          }

          // The useEffect will handle navigation when isSuccess becomes true
          // No need to navigate here - let Redux state trigger the redirect
        } else {
          setError('No token received from server');
        }
      } else {
        const errorMsg = typeof resultAction.payload === 'string'
          ? resultAction.payload
          : 'Google login failed';
        setError(errorMsg);
      }

    } catch (err: any) {
      console.error('❌ Google login error:', err);
      setError(err.response?.data?.message || 'Failed to authenticate with Google. Please try again.');
    }

    console.log('═══════════════════════════════════════');
  };

  const handleGoogleError = () => {
    console.error('═══════════════════════════════════════');
    console.error('❌ GOOGLE LOGIN - ERROR CALLBACK TRIGGERED');
    console.error('═══════════════════════════════════════');
    console.error('Google login failed - User closed popup or there was an error');
    console.error('Common causes:');
    console.error('1. Popup was closed by user');
    console.error('2. Client ID is incorrect');
    console.error('3. Origin not allowed in Google Cloud Console');
    console.error('4. Internet connection issue');
    console.error('5. Popup blocked by browser');
    console.error('═══════════════════════════════════════');
    setError('Google login failed. Please try again.');
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left side image */}
      <div className="hidden md:block md:w-1/2 relative bg-primary">
        {/* Background Image */}
        <img
          src="/images/login_background.png"
          alt="Travel"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />

        {/* Boarding pass — markup, not the old raster. See BoardingPass.tsx. */}
        <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
          <BoardingPass className="w-full max-w-[420px]" />
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">

          {/* Clickable Logo - Redirects to Dashboard */}
          <div className="flex justify-center mb-6">
            <Link to="/dashboard" className="block hover:opacity-80 transition-opacity">
              <img
                src="/logo/KLARBlue.png"
                alt="KLAR Logo"
                className="h-16 w-auto object-contain cursor-pointer"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            {/* The landing's headline signature: navy serif with the accent
                word in signal red. */}
            <h1 className="font-display mb-2 text-[34px] leading-[1.12] font-medium text-primary">
              Welcome to <span className="text-[var(--color-brand-red)]">KLAR World</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-gray-600">
              Your gateway to seamless travel bookings
            </p>
          </div>

          {/* Forgot Password Form - Inline */}
          {showForgotPassword ? (
            <>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Login</span>
              </button>

              <div className="mb-6">
                <h2 className="font-display mb-2 text-[26px] leading-[1.12] font-medium text-primary">Reset <span className="text-[var(--color-brand-red)]">Password</span></h2>
                <p className="text-sm text-gray-600">
                  Enter your registered email and mobile number to reset your password.
                </p>
              </div>

              {!resetOtpSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Registered Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Registered Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        value={resetMobile}
                        onChange={(e) => setResetMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                        required
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendResetOTP}
                    disabled={resetOtpLoading || !resetEmail || !resetMobile || resetMobile.length !== 10}
                    className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    {resetOtpLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending OTP...
                      </span>
                    ) : (
                      'Send Reset OTP'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-secondary border border-border rounded-lg p-3">
                    <p className="text-sm text-primary">
                      ✓ OTP has been sent to your email: <strong>{resetEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Enter OTP <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
                      <input
                        type="text"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                        required
                        disabled={otpVerified}
                      />
                    </div>
                  </div>

                  {!otpVerified ? (
                    <>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={!resetOtp || resetOtp.length !== 6}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Verify OTP
                      </button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={handleSendResetOTP}
                          disabled={resetCountdown > 0 || resetOtpLoading}
                          className="text-sm text-primary hover:text-primary hover:underline focus:outline-none disabled:opacity-50"
                        >
                          {resetCountdown > 0 ? `Resend OTP in ${resetCountdown}s` : 'Resend OTP'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">✓ OTP verified successfully! You can now reset your password.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Password Reset Form - Only show after OTP verification */}
              {otpVerified && (
                <form onSubmit={handleResetPassword} className="space-y-4 mt-6 border-t pt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 characters)"
                        className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Reset Password
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              {/* Login Method Selector */}
              {(loginMethod !== 'email' || (loginMethod === 'email' && emailMode === 'login')) && (
                <div className="mb-6">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('google');
                        setError('');
                      }}
                      className={`py-2 px-4 rounded-lg font-medium transition-all duration-200 ${loginMethod === 'google'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('mobile');
                        setError('');
                        setOtpSent(false);
                        setOtp('');
                      }}
                      className={`py-2 px-4 rounded-lg font-medium transition-all duration-200 ${loginMethod === 'mobile'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <Smartphone className="w-4 h-4 inline mr-2" />
                      Mobile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('email');
                        setEmailMode('login');
                        setError('');
                        setOtpSent(false);
                        setOtp('');
                      }}
                      className={`py-2 px-4 rounded-lg font-medium transition-all duration-200 ${loginMethod === 'email'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </button>
                  </div>
                </div>
              )}

              {/* Google Login */}
              {loginMethod === 'google' && (
                <div className="space-y-6">
                  <div className="bg-secondary border border-border rounded-lg p-3">
                    <p className="text-sm text-primary flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" />
                      </svg>
                      Sign in with your Google account
                    </p>
                  </div>

                  {/* ✅ USE GoogleLogin COMPONENT (not custom button) */}
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    logo_alignment="center"
                  />

                  <div className="text-center text-sm text-gray-500">
                    <p>Click the button above to see your Google accounts</p>
                    <p className="text-xs mt-2 text-gray-400">
                      Google will show accounts logged into this browser
                    </p>
                  </div>

                  <div className="mt-4 text-center border-t pt-4">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod('email');
                          setEmailMode('signup');
                          setError('');
                          setSuccessMessage('');
                          setFullName('');
                          setEmail('');
                          setMobileNumberSignup('');
                          setPassword('');
                          setConfirmPassword('');
                          setEmailOtpSent(false);
                          setEmailOtp('');
                        }}
                        className="text-primary font-medium hover:text-primary hover:underline focus:outline-none"
                      >
                        Create New Account
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile OTP Login Form */}
              {loginMethod === 'mobile' && (
                <>
                  <form onSubmit={handleMobileLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Enter 10-digit mobile number"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                          required
                          disabled={isLoading || otpSent}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {!otpSent && (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading || !mobileNumber || mobileNumber.length !== 10}
                        className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        {otpLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending OTP...
                          </span>
                        ) : (
                          'Send OTP'
                        )}
                      </button>
                    )}

                    {otpSent && (
                      <>
                        <div className="animate-fadeIn">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Enter OTP <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                            <input
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Enter 6-digit OTP"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading}
                              autoComplete="one-time-code"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">OTP sent to {mobileNumber}</p>
                        </div>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={countdown > 0 || otpLoading}
                            className="text-sm text-primary hover:text-primary hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading || !otp || otp.length !== 6}
                          className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Verifying...
                            </span>
                          ) : (
                            'Verify & Login'
                          )}
                        </button>
                      </>
                    )}
                  </form>

                  {/* 👇 ADD THIS NEW CODE - "Don't have an account?" for Mobile */}
                  <div className="mt-4 text-center border-t pt-4">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod('email');
                          setEmailMode('signup');
                          setError('');
                          setSuccessMessage('');
                          setFullName('');
                          setEmail('');
                          setMobileNumberSignup('');
                          setPassword('');
                          setConfirmPassword('');
                          setOtpSent(false);
                          setOtp('');
                        }}
                        className="text-primary font-medium hover:text-primary hover:underline focus:outline-none"
                      >
                        Create New Account
                      </button>
                    </p>
                  </div>
                </>
              )}

              {loginMethod === 'email' && emailMode === 'login' && (
                <>
                  <form onSubmit={handleEmailLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailOtpSent) handleResetEmailLogin();
                          }}
                          placeholder="Enter your email address"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                          required
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                          required
                          disabled={isLoading || emailOtpSent}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          disabled={isLoading || emailOtpSent}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {!emailOtpSent ? (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                              disabled={isLoading}
                            />
                            <span className="ml-2 text-sm text-gray-700">Remember me</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-sm text-primary hover:text-primary hover:underline focus:outline-none"
                            disabled={isLoading}
                          >
                            Forgot password?
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading || !email || !password}
                          className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {emailOtpLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending OTP...
                            </span>
                          ) : (
                            'Send OTP'
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="bg-secondary border border-border rounded-lg p-3">
                          <p className="text-sm text-primary">
                            ✓ OTP has been sent to your email: <strong>{email}</strong>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Enter OTP <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                            <input
                              type="text"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Enter 6-digit OTP"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading}
                              autoComplete="one-time-code"
                            />
                          </div>
                        </div>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={handleSendEmailLoginOTP}
                            disabled={emailOtpCountdown > 0 || emailOtpLoading}
                            className="text-sm text-primary hover:text-primary hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {emailOtpCountdown > 0 ? `Resend OTP in ${emailOtpCountdown}s` : 'Resend OTP'}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading || !emailOtp || emailOtp.length !== 6}
                          className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Verifying...
                            </span>
                          ) : (
                            'Verify & Login'
                          )}
                        </button>
                      </>
                    )}
                  </form>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('signup');
                          setError('');
                          setSuccessMessage('');
                          setFullName('');
                          setEmail('');
                          setMobileNumberSignup('');
                          setPassword('');
                          setConfirmPassword('');
                          setEmailOtpSent(false);
                          setEmailOtp('');
                        }}
                        className="text-primary font-medium hover:text-primary hover:underline focus:outline-none"
                      >
                        Create New Account
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Email Signup Form */}
              {loginMethod === 'email' && emailMode === 'signup' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('login');
                      setSignupOtpSent(false);
                      setSignupOtp('');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to Login</span>
                  </button>

                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    {/* Show registration fields only if OTP not sent */}
                    {!signupOtpSent ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Enter your full name"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading || signupOtpSent}
                              autoComplete="name"
                            />
                          </div>
                        </div>

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
                              placeholder="Enter your email address"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading || signupOtpSent}
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
                              value={mobileNumberSignup}
                              onChange={(e) => setMobileNumberSignup(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="Enter 10-digit mobile number"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading || signupOtpSent}
                              autoComplete="tel"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Create a password (min. 6 characters)"
                              className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading || signupOtpSent}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                              disabled={isLoading || signupOtpSent}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Confirm Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm your password"
                              className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading || signupOtpSent}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                              disabled={isLoading || signupOtpSent}
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSendSignupOTP}
                          disabled={signupOtpLoading || !fullName || !email || !mobileNumberSignup || mobileNumberSignup.length !== 10 || !password || !confirmPassword}
                          className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {signupOtpLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending OTP...
                            </span>
                          ) : (
                            'Send OTP'
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* OTP Verification Fields */}
                        <div className="bg-secondary border border-border rounded-lg p-3">
                          <p className="text-sm text-primary">
                            ✓ OTP has been sent to your email: <strong>{email}</strong>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Enter OTP <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                            <input
                              type="text"
                              value={signupOtp}
                              onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Enter 6-digit OTP"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition duration-200"
                              required
                              disabled={isLoading}
                              autoComplete="one-time-code"
                            />
                          </div>
                        </div>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={handleResendSignupOTP}
                            disabled={signupCountdown > 0 || signupOtpLoading}
                            className="text-sm text-primary hover:text-primary hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {signupCountdown > 0 ? `Resend OTP in ${signupCountdown}s` : 'Resend OTP'}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading || !signupOtp || signupOtp.length !== 6}
                          className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Verifying & Creating Account...
                            </span>
                          ) : (
                            'Verify OTP & Create Account'
                          )}
                        </button>
                      </>
                    )}
                  </form>
                </>
              )}
            </>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 animate-fadeIn">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {(error || (isError && message)) && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 animate-fadeIn">
              <p className="text-sm text-red-700">{error || message}</p>
            </div>
          )}

          {/* Login Success Message */}
          {isSuccess && user && token && !showForgotPassword && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 animate-fadeIn">
              <p className="text-sm text-green-700">Login successful! Redirecting...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
  }
`;