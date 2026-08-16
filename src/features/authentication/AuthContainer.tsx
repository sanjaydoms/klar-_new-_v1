// src/features/authentication/AuthContainer.tsx
import React, { useState } from 'react';
import Login, { LoginResult } from './components/LoginForm';
import Signup from './components/SignupStep1';
import SignupStep2 from './components/SignupStep2';
import VerificationPending from './components/Auth/VerificationPending';
import { SignupStep1Data } from './types/signup.types';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContainer: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    'login' | 'signup' | 'signup-step2' | 'verification-pending'
  >('login');
  const [step1Data, setStep1Data] = useState<SignupStep1Data | null>(null);
  const [loginState, setLoginState] = useState<LoginResult | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginResult = (result: LoginResult) => {
    setLoginState(result);

    // Handle different login states
    switch (result.type) {
      case 'DASHBOARD':
        console.log('Redirecting to dashboard...', result.user);
        // Get the redirect path from state, or default to home
        const from = (location.state as any)?.from?.pathname || '/';
        const search = (location.state as any)?.from?.search || '';
        navigate(from + search, { replace: true });
        break;

      case 'VERIFICATION_PENDING':
        console.log('Verification pending for:', result.email);
        break;

      case 'BLOCKED':
      case 'REJECTED':
      case 'TOO_MANY_ATTEMPTS':
        console.log('Login failed:', result.reason);
        break;

      default:
        console.log('Login state:', result);
    }
  };

  const handleSignupStep1 = (data: SignupStep1Data) => {
    setStep1Data(data);
    setCurrentView('signup-step2');
  };

  const handleSignupStep2Success = () => {
    setCurrentView('verification-pending');
  };

  const handleNavigateToSignup = () => {
    setCurrentView('signup');
    setLoginState(null);
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
    setStep1Data(null);
    setLoginState(null);
  };

  const handleGoToLogin = () => {
    setCurrentView('login');
    setStep1Data(null);
    setLoginState(null);
  };

  return (
    <div>
      {currentView === 'login' && (
        <Login onNavigateToSignup={handleNavigateToSignup} onLoginResult={handleLoginResult} />
      )}

      {currentView === 'signup' && (
        <Signup onNext={handleSignupStep1} onNavigateToLogin={handleNavigateToLogin} />
      )}

      {currentView === 'signup-step2' && step1Data && (
        <SignupStep2 step1Data={step1Data} onSuccess={handleSignupStep2Success} />
      )}

      {currentView === 'verification-pending' && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <VerificationPending onGoToDashboard={handleGoToLogin} />
        </div>
      )}

      {/* Optional: Display login state messages */}
      {loginState && loginState.type !== 'DASHBOARD' && (
        <div className="fixed bottom-4 right-4 max-w-md">
          {loginState.type === 'VERIFICATION_PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Verification pending for {loginState.email}.
                {loginState.reason && ` Reason: ${loginState.reason}`}
              </p>
            </div>
          )}

          {(loginState.type === 'BLOCKED' ||
            loginState.type === 'REJECTED' ||
            loginState.type === 'TOO_MANY_ATTEMPTS') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{loginState.reason || 'Login failed'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthContainer;
