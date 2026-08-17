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
  // The height is reserved on this wrapper rather than on the card, so the card
  // still hugs its own form; the slack sits below it, on the hero photograph,
  // where it reads as breathing room instead of an empty white panel.
  //
  // Each service's form is a different height — measured at 1440px: Hotels 187,
  // Insurance 263, Visa 268, Flights 284, Cruise 290, Cabs 365,
  // Charters/Passport 414, Holidays 544. The card top is anchored, so every one
  // of those differences used to push the promise strip and everything below it
  // up or down on each tab click. 544 is the tallest, so nothing moves now.
  return (
    <div className={`relative z-20 flex min-h-[544px] flex-col ${LANDING_RAIL}`}>
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
