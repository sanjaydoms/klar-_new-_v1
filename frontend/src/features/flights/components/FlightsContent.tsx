import Footer from '@/components/layout/Footer';
import HelpSection from './HelpSection';
import FlyFlight from './FlyFlight';
import PopularDestinations from './PopularDestinations';
import ChooseYourSpace from './ChooseYourSpace';
import TravelPartner from './TravelPartner';
import WhyTravelWithKlar from '../components/WhyTravelWithKlar';

export default function FlightsContent() {

  return (
     <div className="w-full overflow-x-hidden">
      <WhyTravelWithKlar />

      <FlyFlight />
      <PopularDestinations />

      {/* Help Section */}
      <HelpSection />
      <ChooseYourSpace />
      <TravelPartner />

      <Footer />
    </div>
  );
}