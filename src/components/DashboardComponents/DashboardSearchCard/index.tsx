import FlightSearchSection from './FlightSearchSection';
import HotelSearchSection from './HotelSearchSection';
import VisaSearchSection from './VisaSearchSection';
import InsuranceSearchSection from './InsuranceSearchSection';
import CabSearchSection from './CabSearchSection';
import ToursAndPackagesSearchSection from './ToursAndPackagesSearchSection';
import CruiseSearchSection from './CruiseSearchSection';
import ChartersSearchSection from './ChartersSearchSection';
import type { SelectedPlanPayload } from '@/components/Passport/PassportPlans';
import PassportServiceSearchSection from './PassportServiceSearchSection';

// Default Logos
import flight from '/logo/landing_flight_logo.png';
import hotel from '/logo/landing_hotel_logo.png';
import tours from '/logo/landing_tours_logo.png';
import cab from '/logo/landing_cab_logo.png';
import visa from '/logo/landing_visa_logo.png';
import insurance from '/logo/landing_insurance_logo.png';
import cruise from '/logo/landing_cruise_logo.png';
import passport from '/logo/landing_pssport_logo.png';
import charter from '/logo/landing_charter_logo.png'; 

// Red Active Logos
import redFlight from '/logo/landing_red_flight_logo.png';
import redHotel from '/logo/landing_red_hotel_logo.png';
import redTours from '/logo/landing_red_tours_logo.png';
import redCab from '/logo/landing_red_cab_logo.png';
import redVisa from '/logo/landing_red_visa_logo.png';
import redInsurance from '/logo/landing_red_insurance_logo.png';
import redCruise from '/logo/landing_red_cruise_logo.png';
import redPassport from '/logo/landing_red_passport_logo.png';
import redCharter from '/logo/landing_red_charters_logo.png';

interface DashboardSearchCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFlightSearch: ((params: any) => void) | undefined;
  selectedPassportPlan?: SelectedPlanPayload | undefined;
}

const TABS = [
  { key: 'flights', label: 'Flights', icon: flight, activeIcon: redFlight },
  { key: 'hotels', label: 'Hotels', icon: hotel, activeIcon: redHotel },
  { key: 'tours', label: 'Holidays', icon: tours, activeIcon: redTours },
  { key: 'cabs', label: 'Cabs', icon: cab, activeIcon: redCab },
  { key: 'visa', label: 'Visa', icon: visa, activeIcon: redVisa },
  { key: 'insurance', label: 'Insurance', icon: insurance, activeIcon: redInsurance },
  { key: 'cruise', label: 'Cruise', icon: cruise, activeIcon: redCruise },
  { key: 'charters', label: 'Charters', icon: charter, activeIcon: redCharter },
  { key: 'passport', label: 'Passport', icon: passport, activeIcon: redPassport },
];

export default function DashboardSearchCard({
  activeTab,
  onTabChange,
  onFlightSearch,
  selectedPassportPlan,
}: DashboardSearchCardProps) {
  return (
    <div className="relative z-20 mx-auto w-full max-w-[1100px] flex flex-col">
      {/* Floating Tab Bar - Centered 50/50 on top edge */}
      <div className="relative z-30 mx-auto w-[94%] max-w-[1040px] -mb-10">
        <div
          className="flex flex-wrap items-center justify-between  bg-[#f8f1f1] rounded-2xl py-2.5 px-4 gap-2 md:gap-4"
          style={{
            boxShadow: '0 8px 20px -3px rgba(0, 0, 0, 0.12)',
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const currentIcon = isActive ? tab.activeIcon : tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 600,
                }}
                className="relative flex-1 min-w-[70px] flex flex-col items-center justify-center pb-2.5 pt-1 px-2 transition-all duration-300 group"
              >
                <img
                  src={currentIcon}
                  alt={tab.label}
                  className="w-7 h-7 md:w-8 md:h-8 mb-1 object-contain transition-all duration-300"
                />
                <span
                  className="text-[15px] md:text-[17px] leading-[20px] text-center whitespace-nowrap transition-colors"
                  style={{ color: isActive ? '#7F0909' : '#262626' }}
                >
                  {tab.label}
                </span>

                {/* Active Indicator Underline */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[4px] rounded-full transition-all duration-300"
                    style={{
                      background: 'linear-gradient(90deg, #7F0909 0%, #A31212 100%)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Search Section Container */}
      <div
        className="relative z-10 w-full backdrop-blur-md pt-14 pb-6 px-4 md:px-6 flex flex-col gap-4"
        style={{
          minHeight: '150px',
          borderRadius: '19.18px',
          borderWidth: '0.8px',
          background: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.2)',
          boxShadow: '0px 15.99px 47.96px 0px #0000004D',
        }}
      >
        <div className="flex-1 flex flex-col">
          {activeTab === 'flights' && <FlightSearchSection onFlightSearch={onFlightSearch} />}
          {activeTab === 'hotels' && <HotelSearchSection />}
          {activeTab === 'cabs' && <CabSearchSection />}
          {activeTab === 'tours' && <ToursAndPackagesSearchSection onToursSearch={undefined} />}
          {activeTab === 'visa' && <VisaSearchSection />}
          {activeTab === 'insurance' && <InsuranceSearchSection />}
          {activeTab === 'cruise' && <CruiseSearchSection />}
          {activeTab === 'charters' && <ChartersSearchSection />}
          {activeTab === 'passport' && <PassportServiceSearchSection selectedPlan={selectedPassportPlan} />}
        </div>
      </div>
    </div>
  );
}