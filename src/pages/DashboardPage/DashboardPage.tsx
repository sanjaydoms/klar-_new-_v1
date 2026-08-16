import { useState, useRef, useEffect } from 'react';
import FlightsContent from '../../features/flights/components/FlightsContent';
import HotelsContent from '../../features/hotels/components/HotelsContent';
import VisaContent from '../../features/visa/components/VisaContent';
import CabsContent from '../../features/cabs/components/CabsContent';
import DashboardSearchCard from '../../components/DashboardComponents/DashboardSearchCard/index';
import DashboardTopNav from '../../components/DashboardComponents/DashboardTopNav';
import {
  DashboardHeroCopy,
  DashboardHeroPromises,
} from '../../components/DashboardComponents/DashboardHero';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
// NEW IMPORTS FOR MOBILE RESPONSIVENESS
import HomePage from '../../components/MobileResponsive/DashboardPage/HomePage';
import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';
import InsuranceConnect from '../Insurance/InsuranceConnect';
import { ToursContent } from '../Packages/ToursContent';
import { CruiseContent } from '@/features/cruise/CruiseContent';
import ChartersContent from '@/components/Charters/ChartersContent';
import type { SelectedPlanPayload } from '@/components/Passport/PassportPlans';
import PassportConternt from '@/components/Passport/PassportContent';

// import LuxuryFeatures from './LuxuryFeatures';
// import ToursAndPackagesContent from '@/features/flights/components/ToursAndPackage/ToursAndPackagesContent';

interface DashboardProps {
  onLogout: () => void;
  onFlightSearch?: (params: {
    tripType: string;
    from?: string;
    to?: string;
    departureDate?: string;
    returnDate?: string;
    travelers: string;
    class: string;
    fareType: string;
    travelerDetails?: any;
    segments?: any[];
  }) => void;
}

// onLogout is part of the page contract; the nav owns sign-out now.
export default function Dashboard({ onFlightSearch }: DashboardProps) {
  const location = useLocation();
  const { user } = useAuth();
  // const [activeTab, setActiveTab] = useState((location.state as any)?.activeTab || 'flights');
  // const [activeTab, setActiveTab] = useState('flights');
  const [activeTab, setActiveTab] = useState<string>(() => {
    const locationStateTab = (location.state as { activeTab?: string })?.activeTab;
    const savedTab = localStorage.getItem('activeDashboardTab');
    return locationStateTab || savedTab || 'flights';
  });
  const [selectedPassportPlan, setSelectedPassportPlan] = useState<SelectedPlanPayload | undefined>();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const pendingSearch = sessionStorage.getItem('pendingFlightSearch');
      if (pendingSearch) {
        try {
          const { params } = JSON.parse(pendingSearch);
          onFlightSearch?.(params);
          sessionStorage.removeItem('pendingFlightSearch');
        } catch (error) {
          console.error('Error recovering pending search:', error);
          sessionStorage.removeItem('pendingFlightSearch');
        }
      }
    }
  }, [user, onFlightSearch]);

  // Automatically redirect to mobile route if we are on the cruise tab and resize to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && activeTab === 'cruise') {
        navigate('/mobile-cruise-search');
      }
    };
    window.addEventListener('resize', handleResize);
    // Also check on mount/update
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  useEffect(() => {
    const navStateTab = (location.state as { activeTab?: string })?.activeTab;
    if (navStateTab) {
      setActiveTab(navStateTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeTab !== 'passport' && location.hash) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [activeTab, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeTab !== 'charters' && params.has('charterCategory')) {
      params.delete('charterCategory');
      const nextSearch = params.toString();
      const nextPath = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash}`;
      navigate(nextPath, { replace: true });
    }
  }, [activeTab, location.search, location.pathname, location.hash, navigate]);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('activeDashboardTab', activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========== MOBILE VIEW ========== */}
      <div className="md:hidden">
        <HomePage />
      </div>

      {/* ========== DESKTOP VIEW ========== */}
      <div className="hidden md:block">
        {/* Main Content */}
        <div>
          {/* Header Section with Airplane Wing Background */}
          <div className="relative">
            {/* Background Image - Airplane Wing Sunset */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: 'url(/images/B2CLandingPage.png)',
              }}
            />
            {/* Gradient overlay for better text readability */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-[#8E8B88]/40 via-[#8E8B88]/28 to-[#8E8B88]/40" /> */}

            <div className="relative z-10">
              {/* --- DESKTOP VIEW (Untouched) --- */}
              <div className="hidden md:block">
                <DashboardTopNav activeTab={activeTab} onTabChange={setActiveTab} user={user} />

                <DashboardHeroCopy />

                <div className="max-w-full mx-auto px-0 pt-8 pb-0">
                  <DashboardSearchCard
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onFlightSearch={onFlightSearch}
                    selectedPassportPlan={selectedPassportPlan}
                  />
                  <DashboardHeroPromises />

                  <div className="relative z-10">
                    <div
                      className="h-20 w-full"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #F9FAFB 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* --- MOBILE VIEW (REMOVED - Now handled at top level) --- */}
            </div>
          </div>

          {/* Body Section - Results/Content */}
          <div
            className=""
            style={{
              background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)',
              marginTop: '-40px',
              paddingTop: '40px',
            }}
          >
            {activeTab === 'flights' && <FlightsContent />}
            {activeTab === 'hotels' && <HotelsContent />}
            {activeTab === 'visa' && <VisaContent />}
            {activeTab === 'cabs' && <CabsContent />}
            {activeTab === 'tours' && <ToursContent />}
            {activeTab === 'insurance' && <InsuranceConnect />}
            {activeTab === 'cruise' && <CruiseContent/>}
            {activeTab === 'charters' && <ChartersContent />}
            {activeTab === 'passport' && (
              <PassportConternt onSelectPlan={setSelectedPassportPlan} />
            )}
          </div>
        </div>
      </div>

      {/* ========== BOTTOM NAVIGATION (Mobile) ========== */}
      <BottomNav />
    </div>
  );
}