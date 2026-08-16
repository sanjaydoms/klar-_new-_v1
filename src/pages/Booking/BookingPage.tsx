import React from 'react';
import TravellerInfo from '../../userinfoandseatinfo/TravellerInfo';
import SeatSelection from '../../userinfoandseatinfo/SeatSelection';
import { useNavigate, useLocation } from 'react-router-dom';
import { flightSearchRoute, storedTripType } from '@/utils/tripType';

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleContinue = () => {
    if (location.pathname.includes('traveller-info')) {
      navigate('/booking/seat-selection');
    } else {
      navigate('/booking/payment');
    }
  };

  const handleBack = () => {
    if (location.pathname.includes('seat-selection')) {
      navigate('/booking/traveller-info');
    } else {
      // Go back to appropriate flight search page
      navigate(flightSearchRoute(storedTripType()));
    }
  };

  if (location.pathname.includes('traveller-info')) {
    return <TravellerInfo onBack={handleBack} onContinue={handleContinue} />;
  } else {
    return <SeatSelection onBack={handleBack} />;
  }
};

export default BookingPage;
