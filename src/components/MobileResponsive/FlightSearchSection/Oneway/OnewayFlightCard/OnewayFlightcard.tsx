import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FlightCard, { Flight } from './FlightCard';
import OnewayFlightHeader from './OnewayFlightHeader';
import { getOnewayFareDetails } from '@/api/flightService.api';
import { groupAndMap } from '@/features/flights/utils/groupFareVariants';
import { formatAircraft, formatTerminal } from '@/features/flights/utils/flightDisplay';
import { formatBaggage } from '@/features/flights/components/FlightCardFooter';


interface ApiFlight {
  flightKey: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  from: {
    airportCode: string;
    city: string;
    date: string;
    day: string;
    time: string;
    terminal?: string;
  };
  to: {
    airportCode: string;
    city: string;
    date: string;
    day: string;
    time: string;
    terminal?: string;
  };
  duration: string;
  stops: number;
  stopDetails?: {
    count: number;
    stopNames: string[];
    stopCodes: string[];
    stopCities: string[];
    displayString: string;
  };
  price: number;
  refundable?: string;
  fareIdentifier?: string;
  checkInBaggage?: string;
  cabinBaggage?: string;
  aircraftTypes?: string[];
}

const OnewayFlightcard: React.FC = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [from, setFrom] = useState('DEL');
  const [to, setTo] = useState('DXB');
  const [selectingFlight, setSelectingFlight] = useState<string | null>(null);

  const [tripDetails, setTripDetails] = useState({
    date: '',
    travellers: [
      { type: 'adult' as const, count: 1 },
      { type: 'child' as const, count: 0 },
      { type: 'infant' as const, count: 0 },
    ],
    class: 'Economy',
  });

  useEffect(() => {
    const loadFlights = () => {
      try {
        const paramsString = sessionStorage.getItem('flightSearchParams');
        if (paramsString) {
          const params = JSON.parse(paramsString);
          setSearchParams(params);

          if (params.from) setFrom(params.from);
          if (params.to) setTo(params.to);

          if (params.travelerDetails) {
            setTripDetails({
              date: params.departureDate || new Date().toISOString().split('T')[0],
              travellers: [
                { type: 'adult', count: params.travelerDetails.adults || 1 },
                { type: 'child', count: params.travelerDetails.children || 0 },
                { type: 'infant', count: params.travelerDetails.infants || 0 },
              ],
              class: params.class || 'Economy',
            });
          }
        }

        const resultsString = sessionStorage.getItem('onewayFlightResults');

        if (resultsString) {
          const response = JSON.parse(resultsString);
          let flightData: ApiFlight[] = [];
          if (response && response.flights && Array.isArray(response.flights)) {
            flightData = response.flights;
          } else if (
            response &&
            response.data &&
            response.data.flights &&
            Array.isArray(response.data.flights)
          ) {
            flightData = response.data.flights;
          } else if (Array.isArray(response)) {
            flightData = response;
          } else if (response && typeof response === 'object') {
            const possibleFlights = Object.values(response).find((val) => Array.isArray(val));
            if (possibleFlights) {
              flightData = possibleFlights;
            }
          }

          if (!flightData || flightData.length === 0) {
            console.warn('No flight data found in response');
            setFlights([]);
            setLoading(false);
            return;
          }

          const transformedFlights: Flight[] = groupAndMap(flightData, (flight: ApiFlight): Flight => {
            const getStopsDisplay = (stops: number, stopDetails?: any): string => {
              if (stops === 0) return 'Non-stop';
              if (stopDetails?.displayString) return stopDetails.displayString;
              return `${stops} Stop${stops > 1 ? 's' : ''}`;
            };

            const formattedPrice = flight.price
              ? `₹ ${flight.price.toLocaleString('en-IN')}`
              : '₹ N/A';

            return {
              airline: flight.airline || 'Unknown',
              airlineCode: flight.airlineCode || '',
              flightNumber: flight.flightNumber || 'N/A',
              cabin: flight.cabinClass || 'Economy',
              departure: flight.from?.time || 'N/A',
              origin: flight.from?.airportCode || flight.from?.city || 'N/A',
              duration: flight.duration || 'N/A',
              stops: getStopsDisplay(flight.stops, flight.stopDetails),
              arrival: flight.to?.time || 'N/A',
              destination: flight.to?.airportCode || flight.to?.city || 'N/A',
              originTerminal: formatTerminal(flight.from?.terminal),
              destinationTerminal: formatTerminal(flight.to?.terminal),
              aircraft: formatAircraft(flight.aircraftTypes),
              baggage: formatBaggage(flight.checkInBaggage, flight.cabinBaggage),
              price: formattedPrice,
              priceValue: flight.price,
              fareIdentifier: flight.fareIdentifier,
              perAdult: 'PER ADULT',
              refundable: flight.refundable ?? '',
              flightKey: flight.flightKey,
            };
          });

          setFlights(transformedFlights);
        }
      } catch (error) {
        console.error('Error loading flight data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFlights();
  }, []);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);

    const paramsString = sessionStorage.getItem('flightSearchParams');
    if (paramsString) {
      const params = JSON.parse(paramsString);
      params.travelerDetails = {
        adults: tripDetails.travellers.find((t) => t.type === 'adult')?.count || 0,
        children: tripDetails.travellers.find((t) => t.type === 'child')?.count || 0,
        infants: tripDetails.travellers.find((t) => t.type === 'infant')?.count || 0,
      };
      params.class = tripDetails.class;
      params.departureDate = tripDetails.date;
      params.from = from;
      params.to = to;
      sessionStorage.setItem('flightSearchParams', JSON.stringify(params));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripDetails((prev) => ({
      ...prev,
      date: e.target.value,
    }));
  };

  const handleTravellerChange = (type: 'adult' | 'child' | 'infant', value: number) => {
    setTripDetails((prev) => ({
      ...prev,
      travellers: prev.travellers.map((t) => (t.type === type ? { ...t, count: value } : t)),
    }));
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTripDetails((prev) => ({
      ...prev,
      class: e.target.value,
    }));
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFrom(e.target.value.toUpperCase());
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTo(e.target.value.toUpperCase());
  };

  const getTravellerDisplay = () => {
    const parts: string[] = [];
    tripDetails.travellers.forEach((t) => {
      if (t.count > 0) {
        parts.push(`${t.count} ${t.type}${t.count > 1 ? 's' : ''}`);
      }
    });
    return parts.join(' • ');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSelectFlight = async (flight: Flight) => {
    try {
      setSelectingFlight(flight.flightKey || null);

      const sessionId = sessionStorage.getItem('onewayFlightSessionId');

      if (!sessionId) {
        console.error('No session ID found');
        sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
        navigate('/mobile-oneway-fare-card');
        return;
      }

      if (!flight.flightKey) {
        console.error('No flight key found');
        sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
        navigate('/mobile-oneway-fare-card');
        return;
      }

      const fareResponse = await getOnewayFareDetails({
        sessionId: sessionId,
        flightKey: flight.flightKey,
      });

      sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
      sessionStorage.setItem('fareDetails', JSON.stringify(fareResponse));

      navigate('/mobile-oneway-fare-card');
    } catch (error) {
      console.error('Error fetching fare details:', error);
      sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
      navigate('/mobile-oneway-fare-card');
    } finally {
      setSelectingFlight(null);
    }
  };

  const renderAirlineLogo = (airlineCode: string, airline: string) => {
    const airlineLogo = airlineCode ? `/airline-logos/${airlineCode}.png` : null;

    if (airlineLogo) {
      return (
        <img
          src={airlineLogo}
          alt={airline}
          className="w-8 h-8 object-contain rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('span');
              fallback.className = 'text-sm font-bold text-blue-600';
              fallback.textContent = airlineCode || airline?.substring(0, 2) || 'NA';
              parent.appendChild(fallback);
            }
          }}
        />
      );
    }

    return (
      <span className="text-sm font-bold text-blue-600">
        {airlineCode || airline?.substring(0, 2) || 'NA'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="block md:hidden min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading flights...</p>
        </div>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="block md:hidden min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-3xl mx-auto text-center pt-10">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Flights Found</h2>
            <p className="text-gray-600 mb-4">Try changing your search criteria</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back to Search
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="block md:hidden lg:hidden h-screen bg-gray-100 flex flex-col">
      <div className="flex-shrink-0">
        <OnewayFlightHeader
          from={from}
          to={to}
          isEditing={isEditing}
          onEditToggle={handleEditToggle}
          onCancel={handleCancel}
          onSave={handleSave}
          tripDetails={tripDetails}
          onDateChange={handleDateChange}
          onTravellerChange={handleTravellerChange}
          onClassChange={handleClassChange}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          formatDate={formatDate}
          getTravellerDisplay={getTravellerDisplay}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {flights.map((flight, index) => (
            <FlightCard
              key={index}
              flight={flight}
              onSelect={handleSelectFlight}
              renderAirlineLogo={renderAirlineLogo}
              isSelecting={selectingFlight === flight.flightKey}
            />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0">
        <BottomNav />
      </div>
    </div>
  );
};

export default OnewayFlightcard;
