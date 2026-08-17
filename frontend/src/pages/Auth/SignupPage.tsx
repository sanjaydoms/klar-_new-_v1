import React from 'react';
import { useState } from 'react';
import SignupStep1 from '../../features/authentication/components/SignupStep1';
import SignupStep2 from '../../features/authentication/components/SignupStep2';
import VerificationPending from '../../features/authentication/components/Auth/VerificationPending';
import { SignupStep1Data } from '../../features/authentication/types/signup.types';

const SignupPage = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1Data, setStep1Data] = useState<SignupStep1Data | null>(null);

  if (step === 1) {
    return (
      <SignupStep1
        onNext={(data) => {
          setStep1Data(data);
          setStep(2);
        }}
        onNavigateToLogin={() => (window.location.href = '/b2b')}
      />
    );
  }

  if (step === 2) {
    if (!step1Data) {
      setStep(1);
      return null;
    }

    return <SignupStep2 step1Data={step1Data} onSuccess={() => setStep(3)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <VerificationPending onGoToDashboard={() => (window.location.href = '/b2b')} />
    </div>
  );
};

export default SignupPage;
