import React, { useEffect, useState } from 'react';
import ProfileEditForm from '../../components/ProfileComponents/settings/ProfileEditForm';
import SecurityForm from '../../components/ProfileComponents/settings/SecurityForm';
import { User, Lock } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile } from '@/api/user.api';
import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';


const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const response = await getMyProfile();

        if (response.data?.success && response.data?.data?.user) {
          const user = response.data.data.user;
          setUserProfile(user);
        } else {
          console.log('No user data found in response');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const allTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    // { id: 'business', label: 'Business Details', icon: Briefcase },
    // { id: 'kyc', label: 'KYC Documents', icon: FileText },
    // { id: 'rm', label: 'RM Management', icon: Users },
    // { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    // { id: 'company', label: 'Company Management', icon: Building2 },
  ];

  const tabs = allTabs.filter((tab) => {
    // Check if user has a createdBy field (indicating they are a sub-user)
    const hasCreatedBy = userProfile?.createdBy && Object.keys(userProfile.createdBy).length > 0;

    // If user has createdBy data, hide RM Management and Company Management
    if (hasCreatedBy) {
      return !['rm', 'company'].includes(tab.id);
    }

    // For B2B_ADMIN users without createdBy, show all tabs
    if (userProfile?.roles === 'B2B_ADMIN') {
      return true;
    }

    // For other users (non-B2B_ADMIN), hide business, kyc, rm
    return !['business', 'kyc', 'rm', 'company'].includes(tab.id);
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileEditForm />;
      // case 'business':
      //   return <BusinessDetailsForm />;
      // case 'kyc':
      //   return <KYCSection />;
      // case 'company':
      //   return <CompanyList />;
      // case 'rm':
      //   return <RMPage />;
      // case 'notifications':
      //   return <NotificationsForm />;
      case 'security':
        return <SecurityForm />;
      default:
        return <ProfileEditForm />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24 lg:pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header Section - Responsive */}
        <div
          className="mb-6 sm:mb-8 lg:mb-12 flex flex-col justify-center gap-2 sm:gap-3 lg:gap-[5.39px]"
          style={{ minHeight: 'auto', width: '100%' }}
        >
          <div className="mb-3 sm:mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-black transition"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">Back</span>
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Account, business, security & team management
          </p>
        </div>

        {/* Main Layout - Responsive */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
          {/* Tabs - Horizontal Scroll on Mobile */}
          <div className="w-full lg:w-64 flex-shrink-0 lg:pt-5">
            <div className="flex lg:flex-col gap-1.5 sm:gap-2 lg:gap-[5.39px] overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap lg:whitespace-normal flex-shrink-0 lg:flex-shrink ${
                    activeTab === tab.id
                      ? 'bg-black text-white shadow-lg'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  style={{
                    height: 'auto',
                    minHeight: '44px',
                    borderRadius: '12px',
                  }}
                >
                  <tab.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area - Responsive */}
          <div className="flex-1 w-full max-w-full">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Add scrollbar hide styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <BottomNav/>
    </div>
  );
};

export default SettingsPage;