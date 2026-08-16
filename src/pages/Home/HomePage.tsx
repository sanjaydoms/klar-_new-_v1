import Dashboard from '../DashboardPage/DashboardPage';
import { useNavigate } from 'react-router-dom';
import { flightSearchRoute } from '@/utils/tripType';

const HomePage = () => {
  const navigate = useNavigate();

  const handleFlightSearch = (params: any) => {
    sessionStorage.setItem('flightSearchParams', JSON.stringify(params));

    navigate(flightSearchRoute(params.tripType));
  };

  return <Dashboard onLogout={() => navigate('/b2b')} onFlightSearch={handleFlightSearch} />;
};

export default HomePage;
