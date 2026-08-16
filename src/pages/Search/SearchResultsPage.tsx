import { useNavigate, useLocation } from 'react-router-dom';
import ReturnFlight from '../../features/flights/components/ReturnFlight.tsx';
import OneWayFlight from '../../features/flights/components/OneWayFlight';
import MultiCityFlight from '../../features/flights/components/MultiCityFlight';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';

const SearchResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = JSON.parse(sessionStorage.getItem('flightSearchParams') || '{}');

  const handleBookNow = () => {
    navigate('/booking/traveller-info');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Determine which flight component to show based on route
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavbar activeService="flights" />
      {/* <PackagesHeader activeService="flights" /> */}
      <div className="flex-1">
        {location.pathname.includes('oneway') ? (
          <OneWayFlight onBack={handleBack} onBookNow={handleBookNow} />
        ) : location.pathname.includes('multicity') ? (
          <MultiCityFlight onBack={handleBack} onBookNow={handleBookNow} />
        ) : (
          <ReturnFlight searchParams={searchParams} onBack={handleBack} onBookNow={handleBookNow} />
        )}
      </div>
      {/* <Footer /> */}
    </div>
  );
};

export default SearchResultsPage;
