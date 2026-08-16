import React from 'react';
import BasicInfo from './profile/BasicInfo';
import AgencyLogo from './profile/AgencyLogo';
import KYCInfo from './profile/KYCInfo';
import ContactInfo from './profile/ContactInfo';
import LoginDetails from './profile/LoginDetails';
import TwoFactorAuth from './profile/TwoFactorAuth';
import BankDetails from './profile/BankDetails';

const ProfileSection: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Demo 2325</h2>
          <p className="text-sm text-gray-500">Account Code: 2325</p>
        </div>
      </div>

      <BasicInfo />
      <AgencyLogo />
      <KYCInfo />
      <ContactInfo />
      <LoginDetails />
      <TwoFactorAuth />
      <BankDetails />
    </div>
  );
};

export default ProfileSection;
