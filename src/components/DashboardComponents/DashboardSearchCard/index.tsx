import FlightSearchSection from './FlightSearchSection';
import { LANDING_RAIL } from '../landingRail';
import HotelSearchSection from './HotelSearchSection';
import VisaSearchSection from './VisaSearchSection';
import InsuranceSearchSection from './InsuranceSearchSection';
import CabSearchSection from './CabSearchSection';
import ToursAndPackagesSearchSection from './ToursAndPackagesSearchSection';
import CruiseSearchSection from './CruiseSearchSection';
import ChartersSearchSection from './ChartersSearchSection';
import type { SelectedPlanPayload } from '@/components/Passport/PassportPlans';
import PassportServiceSearchSection from './PassportServiceSearchSection';

interface DashboardSearchCardProps {
  activeTab: string;
  /** Kept for callers; the service tabs live in DashboardTopNav now. */
  onTabChange?: (tab: string) => void;
  onFlightSearch: ((params: any) => void) | undefined;
  selectedPassportPlan?: SelectedPlanPayload | undefined;
}

/**
 * The landing search card: one white panel per the new design. It used to
 * carry the service tab strip on its top edge; the tabs are part of the nav
 * bar now, so this renders only the active service's fields.
 */
export default function DashboardSearchCard({
  activeTab,
  onFlightSearch,
  selectedPassportPlan,
}: DashboardSearchCardProps) {
  return (
    <div className={`relative z-20 ${LANDING_RAIL}`}>
      <div className="w-full rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,30,77,0.55)]">
        {activeTab === 'flights' && <FlightSearchSection onFlightSearch={onFlightSearch} />}
        {activeTab === 'hotels' && <HotelSearchSection />}
        {activeTab === 'cabs' && <CabSearchSection />}
        {activeTab === 'tours' && <ToursAndPackagesSearchSection onToursSearch={undefined} />}
        {activeTab === 'visa' && <VisaSearchSection />}
        {activeTab === 'insurance' && <InsuranceSearchSection />}
        {activeTab === 'cruise' && <CruiseSearchSection />}
        {activeTab === 'charters' && <ChartersSearchSection />}
        {activeTab === 'passport' && (
          <PassportServiceSearchSection selectedPlan={selectedPassportPlan} />
        )}
      </div>
    </div>
  );
}
