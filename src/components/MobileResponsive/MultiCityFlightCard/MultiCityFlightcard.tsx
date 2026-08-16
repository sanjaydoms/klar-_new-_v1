import BottomNav from '../DashboardPage/BottomNav';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DomesticMultiCity from './DomesticMultiCity';
import InternationalMultiCity from './InternationalMultiCity';
import { getMultiCityFareDetails, getReviewDetails } from '../../../api/flightService.api';
import MultiCityHeader from './MultiCityHeader';
import { notifyError } from '@/utils/notify';
import { storeReviewData } from '@/utils/reviewSession';

interface SearchParams {
  tripType: string;
  from?: string;
  to?: string;
  departureDate?: string;
  returnDate?: string;
  travelers: string;
  class: string;
  fareType: string;
  travelerDetails?: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  segments?: Array<{
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    departureDate: string;
  }>;
}

interface DomesticFlightSegment {
  flightKey: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  from: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
  };
  to: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
  };
  stops: number;
  duration: string;
  price: number;
}

interface DomesticRouteData {
  legIndex: number;
  flights: DomesticFlightSegment[];
}

interface InternationalCityAirport {
  city: string;
  airportCode: string;
  time: string;
  date: string;
  day: string;
}

interface InternationalFlightLeg {
  legIndex: number;
  flightKey: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  from: InternationalCityAirport;
  to: InternationalCityAirport;
  stops: number;
  duration: string;
  price: number;
}

interface InternationalItinerary {
  itineraryKey: string;
  totalPrice: number;
  legs: InternationalFlightLeg[];
}

interface RouteSelectionState {
  routeIndex: number;
  selectedFlight: DomesticFlightSegment | null;
  selectedFareData: any | null;
  fareId: string | null;
  rulesAccepted: boolean;
  isComplete: boolean;
}

const MultiCityFlightcard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flightType, setFlightType] = useState<'domestic' | 'international'>('domestic');
  const [domesticData, setDomesticData] = useState<DomesticRouteData[]>([]);
  const [internationalData, setInternationalData] = useState<InternationalItinerary[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectingFlight, setSelectingFlight] = useState<string | null>(null);
  const [routeStates, setRouteStates] = useState<RouteSelectionState[]>([]);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    const fromFareRules = location.state?.fromFareRules;
    const routeIndex = location.state?.routeIndex;
    if (fromFareRules && routeIndex !== undefined) {
      loadRouteStates();
    }
  }, [location]);

  const loadRouteStates = () => {
    try {
      const statesStr = sessionStorage.getItem('multiCityRouteStates');
      if (statesStr) {
        const states = JSON.parse(statesStr);
        setRouteStates(states);
      } else {
        const initialStates = domesticData.map((_, index) => ({
          routeIndex: index,
          selectedFlight: null,
          selectedFareData: null,
          fareId: null,
          rulesAccepted: false,
          isComplete: false,
        }));
        setRouteStates(initialStates);
        sessionStorage.setItem('multiCityRouteStates', JSON.stringify(initialStates));
      }
    } catch (error) {
      console.error('Error loading route states:', error);
    }
  };

  useEffect(() => {
    const loadData = () => {
      try {
        const paramsStr = sessionStorage.getItem('flightSearchParams');
        if (paramsStr) {
          const params = JSON.parse(paramsStr);
          setSearchParams(params);
        }

        const resultsStr = sessionStorage.getItem('multiCityFlightResults');
        if (resultsStr) {
          const results = JSON.parse(resultsStr);
          let parsedData: any[] = [];

          if (results.data?.flights) {
            parsedData = results.data.flights;
          } else if (Array.isArray(results)) {
            parsedData = results;
          } else if (results.flights) {
            parsedData = results.flights;
          }

          let isInternational = false;
          if (parsedData.length > 0) {
            const firstItem = parsedData[0];
            if (firstItem?.itineraryKey && firstItem?.legs) {
              isInternational = true;
            }
          }

          setFlightType(isInternational ? 'international' : 'domestic');

          if (isInternational) {
            setInternationalData(parsedData);
          } else {
            setDomesticData(parsedData);
          }
        }

        loadRouteStates();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (domesticData.length > 0 && routeStates.length === 0) {
      loadRouteStates();
    }
  }, [domesticData]);

  const allRoutesCompleted =
    routeStates.length > 0 && routeStates.every((state) => state.isComplete === true);

  const getCities = () => {
    if (searchParams?.segments && searchParams.segments.length > 0) {
      return searchParams.segments.map((seg) => ({
        from: seg.from || seg.fromCode || '',
        to: seg.to || seg.toCode || '',
        date: seg.departureDate || '',
      }));
    }
    return [
      {
        from: searchParams?.from || 'From',
        to: searchParams?.to || 'To',
        date: searchParams?.departureDate || '',
      },
    ];
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleContinue = async () => {
    if (isContinuing) return;

    try {
      setIsContinuing(true);

      const fareIds: string[] = [];

      routeStates.forEach(state => {
        if (state.fareId) {
          fareIds.push(state.fareId);
        }
      });

      if (fareIds.length === 0) {
        notifyError('No fare selected. Please select fares for all routes.');
        setIsContinuing(false);
        return;
      }

      console.log('Fare IDs to review:', fareIds);

      const response = await getReviewDetails({
        priceIds: fareIds,
      });

      console.log('Review API response:', response);

      if (response.success) {
        storeReviewData(response);
        sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));
        navigate('/mobile-ancillary-flight-details');
      } else {
        notifyError(response.message || 'Failed to get review details. Please try again.');
      }
    } catch (error) {
      console.error('Error calling review API:', error);
      notifyError('An error occurred. Please try again.');
    } finally {
      setIsContinuing(false);
    }
  };

  const handleSelectDomesticFlight = async (flight: DomesticFlightSegment, routeIndex: number) => {
    if (selectingFlight) return;

    setSelectingFlight(flight.flightKey);

    try {
      const sessionId = sessionStorage.getItem('multiCityFlightSessionId');

      const updatedStates = [...routeStates];
      if (!updatedStates[routeIndex]) {
        updatedStates[routeIndex] = {
          routeIndex,
          selectedFlight: null,
          selectedFareData: null,
          fareId: null,
          rulesAccepted: false,
          isComplete: false,
        };
      }
      updatedStates[routeIndex].selectedFlight = flight;
      updatedStates[routeIndex].isComplete = false;
      setRouteStates(updatedStates);
      sessionStorage.setItem('multiCityRouteStates', JSON.stringify(updatedStates));

      sessionStorage.setItem('selectedMultiCityFlight', JSON.stringify(flight));
      sessionStorage.setItem('multiCityCurrentRouteIndex', String(routeIndex));

      if (!sessionId) {
        navigate('/multi-city-fare-details', { state: { routeIndex } });
        return;
      }

      const payload = {
        sessionId: sessionId,
        legIndex: [routeIndex],
        flightKey: flight.flightKey,
      };

      const response = await getMultiCityFareDetails(payload);

      if (response.success && response.data) {
        sessionStorage.setItem('selectedMultiCityFlight', JSON.stringify(flight));
        sessionStorage.setItem('multiCityFareDetails', JSON.stringify(response));
        navigate('/multi-city-fare-details', { state: { routeIndex } });
      } else {
        notifyError('Failed to fetch fare details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching fare details:', error);
      notifyError('An error occurred. Please try again.');
    } finally {
      setSelectingFlight(null);
    }
  };

  const handleSelectInternationalItinerary = async (itinerary: InternationalItinerary) => {
    if (selectingFlight) return;

    setSelectingFlight(itinerary.itineraryKey);

    try {
      const sessionId = sessionStorage.getItem('multiCityFlightSessionId');

      const updatedStates = [...routeStates];
      const routeIndex = itinerary.legs[0]?.legIndex || 0;
      if (!updatedStates[routeIndex]) {
        updatedStates[routeIndex] = {
          routeIndex,
          selectedFlight: null,
          selectedFareData: null,
          fareId: null,
          rulesAccepted: false,
          isComplete: false,
        };
      }
      updatedStates[routeIndex].selectedFlight = itinerary as any;
      updatedStates[routeIndex].isComplete = false;
      setRouteStates(updatedStates);
      sessionStorage.setItem('multiCityRouteStates', JSON.stringify(updatedStates));

      sessionStorage.setItem('selectedMultiCityItinerary', JSON.stringify(itinerary));
      sessionStorage.setItem('multiCityCurrentRouteIndex', String(routeIndex));

      if (!sessionId) {
        navigate('/multi-city-fare-details', { state: { routeIndex } });
        return;
      }

      const legIndices = itinerary.legs.map((leg) => leg.legIndex);
      const flightKey = itinerary.legs[0]?.flightKey || itinerary.itineraryKey;

      const payload = {
        sessionId: sessionId,
        legIndex: legIndices,
        flightKey: flightKey,
      };

      const response = await getMultiCityFareDetails(payload);

      if (response.success && response.data) {
        sessionStorage.setItem('selectedMultiCityItinerary', JSON.stringify(itinerary));
        sessionStorage.setItem(
          'fareDetails',
          JSON.stringify({
            success: true,
            data: response.data,
          }),
        );
        sessionStorage.setItem(
          'selectedFlight',
          JSON.stringify({
            flightKey: itinerary.itineraryKey,
            origin: itinerary.legs[0]?.from?.city || '',
            destination: itinerary.legs[itinerary.legs.length - 1]?.to?.city || '',
            airline: itinerary.legs[0]?.airline || '',
            legs: itinerary.legs,
          }),
        );
        sessionStorage.setItem('flowType', 'multicity');
        navigate('/mobile-oneway-fare-card');
      } else {
        notifyError('Failed to fetch fare details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching fare details:', error);
      notifyError('An error occurred. Please try again.');
    } finally {
      setSelectingFlight(null);
    }
  };

  const cities = getCities();

  if (isLoading) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading flights...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData =
    flightType === 'domestic' ? domesticData.length > 0 : internationalData.length > 0;

  if (!hasData) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Flights Found</h3>
            <p className="text-gray-600 mb-6">
              We couldn't find any flights matching your search criteria. Please try different dates
              or routes.
            </p>
            <button
              onClick={() => navigate('/flights')}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/85 transition-colors"
            >
              Modify Search
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        <MultiCityHeader
          cities={cities}
          searchParams={searchParams}
          routeStates={routeStates}
          onBack={handleBack}
          onContinue={handleContinue}
          allRoutesCompleted={allRoutesCompleted}
          isContinuing={isContinuing}
        />

        {flightType === 'domestic' ? (
          <DomesticMultiCity
            flightsData={domesticData}
            searchParams={searchParams}
            cities={cities}
            routeStates={routeStates}
            onBack={handleBack}
            onSelectFlight={handleSelectDomesticFlight}
            isSelecting={selectingFlight}
            onRouteStateUpdate={(updatedStates) => {
              setRouteStates(updatedStates);
              sessionStorage.setItem('multiCityRouteStates', JSON.stringify(updatedStates));
            }}
          />
        ) : (
          <InternationalMultiCity
            itineraries={internationalData}
            searchParams={searchParams}
            cities={cities}
            routeStates={routeStates}
            onBack={handleBack}
            onSelectItinerary={handleSelectInternationalItinerary}
            isSelecting={selectingFlight}
            onRouteStateUpdate={(updatedStates) => {
              setRouteStates(updatedStates);
              sessionStorage.setItem('multiCityRouteStates', JSON.stringify(updatedStates));
            }}
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MultiCityFlightcard;
