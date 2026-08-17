import React, { useState } from 'react';
import HeroSection from './HeroSection';
import SearchForm from './SearchForm';
import QuickLinks from './QuickLinks';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../DashboardPage/BottomNav';
// import PopularDestinations from './PopularDestinations';
import { searchOneWayFlights } from '@/api/flightService.api';
import PopularDestinations from '../HotelSearchSection/PopularDestinations';
import { notifyError } from '@/utils/notify';
import { normalizeTripType } from '@/utils/tripType';

interface FlightSearchPageProps {
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

const FlightSearchPage: React.FC<FlightSearchPageProps> = ({ onFlightSearch }) => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<'round' | 'oneway' | 'multi'>('oneway');
  const [isSearching, setIsSearching] = useState(false);

  const getCabinClass = (travelClass: string): string => {
    const classMap: Record<string, string> = {
      Economy: 'ECONOMY',
      'Premium Economy': 'PREMIUM_ECONOMY',
      Business: 'BUSINESS',
      'First Class': 'FIRST',
    };
    return classMap[travelClass] || 'ECONOMY';
  };

  const handleSearch = async (formData: any) => {
    if (formData.tripType === 'oneway') {
      if (!formData.fromCode && !formData.from) {
        notifyError('Please select departure city');
        return;
      }
      if (!formData.toCode && !formData.to) {
        notifyError('Please select destination city');
        return;
      }
      if (!formData.departureDate) {
        notifyError('Please select departure date');
        return;
      }
    } else if (formData.tripType === 'round') {
      console.log('################# THe Formdata for ROUND\n', formData);
      if (!formData.fromCode && !formData.from) {
        notifyError('Please select departure city');
        return;
      }
      if (!formData.toCode && !formData.to) {
        notifyError('Please select destination city');
        return;
      }
      if (!formData.departureDate) {
        notifyError('Please select departure date');
        return;
      }
      if (!formData.returnDate) {
        notifyError('Please select return date');
        return;
      }
    } else if (formData.tripType === 'multi') {
      const hasEmptySegment = formData.segments.some(
        (seg: any) => !seg.from || !seg.to || !seg.departureDate,
      );
      if (hasEmptySegment) {
        notifyError('Please fill in all fields for each segment');
        return;
      }
    }

    setIsSearching(true);

    try {
      let payload: any = {
        cabinClass: getCabinClass(formData.travelClass),
        paxInfo: {
          ADULT: formData.passengers.adults || 1,
          CHILD: formData.passengers.children || 0,
          INFANT: formData.passengers.infants || 0,
        },
        searchModifiers: {
          isDirectFlight: true,
          isConnectingFlight: true,
          pft: 'REGULAR',
        },
      };

      if (formData.tripType === 'oneway') {
        payload.routeInfos = [
          {
            fromCityOrAirport: { code: formData.fromCode || formData.from },
            toCityOrAirport: { code: formData.toCode || formData.to },
            travelDate: formData.departDate,
          },
        ];
      } else if (formData.tripType === 'round') {
        payload.routeInfos = [
          {
            fromCityOrAirport: { code: formData.fromCode || formData.from },
            toCityOrAirport: { code: formData.toCode || formData.to },
            travelDate: formData.departDate,
          },
          {
            fromCityOrAirport: { code: formData.toCode || formData.to },
            toCityOrAirport: { code: formData.fromCode || formData.from },
            travelDate: formData.returnDate,
          },
        ];
      } else if (formData.tripType === 'multi') {
        payload.routeInfos = formData.segments.map((segment: any) => ({
          fromCityOrAirport: { code: segment.fromCode || segment.from },
          toCityOrAirport: { code: segment.toCode || segment.to },
          travelDate: segment.departureDate,
        }));
        delete payload.searchModifiers.pft;
      }

      const response = await searchOneWayFlights(payload);

      if (response.success === true) {
        const totalPassengers =
          formData.passengers.adults + formData.passengers.children + formData.passengers.infants;

        const params = {
          tripType: formData.tripType,
          from: formData.from || formData.segments?.[0]?.from || '',
          to: formData.to || formData.segments?.[0]?.to || '',
          departureDate: formData.departDate || formData.segments?.[0]?.departureDate || '',
          returnDate: formData.returnDate || '',
          travelers: `${totalPassengers} Traveler${totalPassengers > 1 ? 's' : ''}`,
          class: formData.travelClass,
          fareType: 'REGULAR',
          travelerDetails: {
            adults: formData.passengers.adults,
            children: formData.passengers.children,
            infants: formData.passengers.infants,
            total: totalPassengers,
          },
        };

        sessionStorage.setItem(
          'flightSearchParams',
          JSON.stringify({ ...params, tripType: normalizeTripType(params.tripType) }),
        );

        if (response.data?.sessionId) {
          sessionStorage.setItem('onewayFlightSessionId', response.data.sessionId);
        }

        if (response.data?.flights) {
          sessionStorage.setItem('onewayFlightResults', JSON.stringify(response.data.flights));
        }

        if (onFlightSearch) {
          onFlightSearch(params);
        }

        navigate('/mobile-oneway-card');
      } else {
        const errorMessage =
          response.message || 'No flights found. Please try different search criteria.';
        notifyError(errorMessage);
      }
    } catch (error: any) {
      if (error?.code === 'NETWORK_ERROR') {
        notifyError('Network error. Please check your internet connection.');
      } else if (error?.response?.status === 500) {
        notifyError('Server error. Please try again later.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-transparent min-h-screen relative overflow-y-auto">
      <div className="px-4 pb-20">
        <HeroSection />
        <div id="search-section">
          <SearchForm
            tripType={tripType}
            setTripType={setTripType}
            onSearch={handleSearch}
            isLoading={isSearching}
          />
        </div>
        {/* <QuickLinks /> */}
        <PopularDestinations />
      </div>
      <BottomNav />
    </div>
  );
};

export default FlightSearchPage;
