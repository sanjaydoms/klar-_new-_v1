import React, { useState } from 'react';
import OnewayLogo from '/logo/OnewayLogo.png?url';
import Round from '/logo/RoundLogo.png?url';
import Multi from '/logo/MultiLogo.png?url';
import SearchLogo from '/logo/si_inflight-line.png?url';
import BestPrice from '/logo/BestPrice.png?url';
import Flexible from '/logo/Flexible.png?url';
import Secure from '/logo/Secure.png?url';
import OneWayForm from './SearchForm/OneWayForm';
import RoundTripForm from './SearchForm/RoundTripForm';
import { DateField, TravellerOptions, TravellerField } from './SearchForm/IndividualComp';
import MultiCityForm, { CitySegment } from './SearchForm/MultiCityForm';
import {
  searchOneWayFlights,
  searchReturnFlights,
  searchMultiCityFlights,
} from '@/api/flightService.api';
import { useNavigate } from 'react-router-dom';
import { notifyError } from '@/utils/notify';
import { normalizeTripType } from '@/utils/tripType';

type TripType = 'round' | 'oneway' | 'multi';

interface SearchFormProps {
  tripType: TripType;
  setTripType: (type: TripType) => void;
  onSearch?: (data: any) => void;
  isLoading?: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({
  tripType: propTripType,
  setTripType,
  onSearch,
  isLoading: propIsLoading = false,
}) => {
  const navigate = useNavigate();
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const isLoading = propIsLoading || localIsLoading;

  // Date states
  const [departDate, setDepartDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');

  // Passenger states
  const [passengers, setPassengers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState('Economy');
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);

  // Round trip states
  const [roundFrom, setRoundFrom] = useState('Delhi');
  const [roundFromCode, setRoundFromCode] = useState('DEL');
  const [roundFromAirportName, setRoundFromAirportName] = useState('Indira Gandhi International Airport');
  const [roundTo, setRoundTo] = useState('Mumbai');
  const [roundToCode, setRoundToCode] = useState('BOM');
  const [roundToAirportName, setRoundToAirportName] = useState('Chhatrapati Shivaji International Airport');

  // One way states
  const [from, setFrom] = useState('Delhi');
  const [fromCode, setFromCode] = useState('DEL');
  const [fromAirportName, setFromAirportName] = useState('Indira Gandhi International Airport');
  const [to, setTo] = useState('Mumbai');
  const [toCode, setToCode] = useState('BOM');
  const [toAirportName, setToAirportName] = useState('Chhatrapati Shivaji International Airport');

  // Multi city states
  const [multiCitySegments, setMultiCitySegments] = useState<CitySegment[]>([
    {
      id: 1,
      from: '',
      fromCode: '',
      fromAirportName: '',
      to: '',
      toCode: '',
      toAirportName: '',
      departureDate: '',
    },
    {
      id: 2,
      from: '',
      fromCode: '',
      fromAirportName: '',
      to: '',
      toCode: '',
      toAirportName: '',
      departureDate: '',
    },
  ]);

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const tabs = [
    { id: 'oneway', label: 'One Way', icon: OnewayLogo },
    { id: 'round', label: 'Round Trip', icon: Round },
    { id: 'multi', label: 'Multi City', icon: Multi },
  ];

  const getCabinClass = (travelClass: string): string => {
    const classMap: Record<string, string> = {
      Economy: 'ECONOMY',
      'Premium Economy': 'PREMIUM_ECONOMY',
      Business: 'BUSINESS',
      'First Class': 'FIRST',
    };
    return classMap[travelClass] || 'ECONOMY';
  };

  // One way handlers
  const handleFromChange = (city: string, code: string, airportName: string) => {
    setFrom(city);
    setFromCode(code);
    setFromAirportName(airportName);
  };

  const handleToChange = (city: string, code: string, airportName: string) => {
    setTo(city);
    setToCode(code);
    setToAirportName(airportName);
  };

  // Round trip handlers
  const handleRoundFromChange = (city: string, code: string, airportName: string) => {
    setRoundFrom(city);
    setRoundFromCode(code);
    setRoundFromAirportName(airportName);
  };

  const handleRoundToChange = (city: string, code: string, airportName: string) => {
    setRoundTo(city);
    setRoundToCode(code);
    setRoundToAirportName(airportName);
  };

  // Multi city handlers
  const addCitySegment = () => {
    if (multiCitySegments.length < 4) {
      const newId = Math.max(...multiCitySegments.map((s) => s.id)) + 1;
      setMultiCitySegments([
        ...multiCitySegments,
        {
          id: newId,
          from: '',
          fromCode: '',
          fromAirportName: '',
          to: '',
          toCode: '',
          toAirportName: '',
          departureDate: '',
        },
      ]);
    }
  };

  const removeCitySegment = (id: number) => {
    if (multiCitySegments.length > 2) {
      setMultiCitySegments(multiCitySegments.filter((segment) => segment.id !== id));
    }
  };

  const updateCitySegment = (id: number, field: string, value: string) => {
    setMultiCitySegments((prev) =>
      prev.map((segment) => {
        if (segment.id !== id) return segment;

        const update: any = { [field]: value };

        if (field === 'from') {
          update.fromCode = '';
        } else if (field === 'to') {
          update.toCode = '';
        }

        return { ...segment, ...update };
      }),
    );
  };

  // Swap handler
  const handleSwap = () => {
    if (propTripType === 'oneway') {
      setFrom(to);
      setFromCode(toCode);
      setFromAirportName(toAirportName);
      setTo(from);
      setToCode(fromCode);
      setToAirportName(fromAirportName);
    } else if (propTripType === 'round') {
      setRoundFrom(roundTo);
      setRoundFromCode(roundToCode);
      setRoundFromAirportName(roundToAirportName);
      setRoundTo(roundFrom);
      setRoundToCode(roundFromCode);
      setRoundToAirportName(roundFromAirportName);
    }
  };

  // Search handler
  const handleSearchClick = async () => {
    console.log('🔍 SearchForm - Current tripType from prop:', propTripType);

    if (isLoading) return;

    // Validation based on trip type
    if (propTripType === 'oneway') {
      if (!from || !to || !departDate) {
        notifyError('Please fill in all fields (From, To, and Departure Date)');
        return;
      }
    } else if (propTripType === 'round') {
      if (!roundFrom || !roundTo || !departDate || !returnDate) {
        notifyError('Please fill in all fields (From, To, Departure Date, and Return Date)');
        return;
      }
    } else if (propTripType === 'multi') {
      const hasEmptySegment = multiCitySegments.some(
        (seg) => !seg.from || !seg.to || !seg.departureDate,
      );
      if (hasEmptySegment) {
        notifyError('Please fill in all fields for each segment');
        return;
      }
    }

    setLocalIsLoading(true);

    try {
      let payload: any = {
        cabinClass: getCabinClass(travelClass),
        paxInfo: {
          ADULT: passengers.adults || 1,
          CHILD: passengers.children || 0,
          INFANT: passengers.infants || 0,
        },
        searchModifiers: {
          isDirectFlight: true,
          isConnectingFlight: true,
          pft: 'REGULAR',
        },
      };

      if (propTripType === 'oneway') {
        payload.routeInfos = [
          {
            fromCityOrAirport: { code: fromCode || from },
            toCityOrAirport: { code: toCode || to },
            travelDate: departDate,
          },
        ];
      } else if (propTripType === 'round') {
        payload.routeInfos = [
          {
            fromCityOrAirport: { code: roundFromCode || roundFrom },
            toCityOrAirport: { code: roundToCode || roundTo },
            travelDate: departDate,
          },
          {
            fromCityOrAirport: { code: roundToCode || roundTo },
            toCityOrAirport: { code: roundFromCode || roundFrom },
            travelDate: returnDate,
          },
        ];
      } else if (propTripType === 'multi') {
        payload.routeInfos = multiCitySegments.map((segment: any) => ({
          fromCityOrAirport: { code: segment.fromCode || segment.from },
          toCityOrAirport: { code: segment.toCode || segment.to },
          travelDate: segment.departureDate,
        }));
        delete payload.searchModifiers.pft;
      }

      console.log('📤 Sending payload to API:', payload);
      console.log('🎯 Trip type for API call:', propTripType);

      let response;
      if (propTripType === 'round') {
        console.log('🔵🔵🔵 Calling RETURN flight API');
        response = await searchReturnFlights(payload);
      } else if (propTripType === 'multi') {
        console.log('🟣🟣🟣 Calling MULTI-CITY flight API');
        const multiCityPayload = {
          cabinClass: payload.cabinClass,
          paxInfo: payload.paxInfo,
          routeInfos: payload.routeInfos,
          searchModifiers: {
            isDirectFlight: payload.searchModifiers.isDirectFlight,
            isConnectingFlight: payload.searchModifiers.isConnectingFlight,
          },
        };
        response = await searchMultiCityFlights(multiCityPayload);
      } else {
        console.log('🟢🟢🟢 Calling ONEWAY flight API');
        response = await searchOneWayFlights(payload);
      }

      console.log('📥 API Response:', response);

      if (response.success === true) {
        const totalPassengers = passengers.adults + passengers.children + passengers.infants;

        let params: any = {
          tripType: propTripType,
          from: propTripType === 'oneway' ? from : roundFrom,
          to: propTripType === 'oneway' ? to : roundTo,
          departureDate: departDate,
          returnDate: returnDate || '',
          travelers: `${totalPassengers} Traveler${totalPassengers > 1 ? 's' : ''}`,
          class: travelClass,
          fareType: 'REGULAR',
          travelerDetails: {
            adults: passengers.adults,
            children: passengers.children,
            infants: passengers.infants,
            total: totalPassengers,
          },
        };

        if (propTripType === 'multi') {
          params.segments = multiCitySegments;
        }

        sessionStorage.setItem(
          'flightSearchParams',
          JSON.stringify({ ...params, tripType: normalizeTripType(params.tripType) }),
        );

        // Store session ID based on trip type
        if (response.data?.sessionId) {
          if (propTripType === 'round') {
            sessionStorage.setItem('roundFlightSessionId', response.data.sessionId);
          } else if (propTripType === 'multi') {
            sessionStorage.setItem('multiCityFlightSessionId', response.data.sessionId);
          } else {
            sessionStorage.setItem('flightSessionId', response.data.sessionId);
            sessionStorage.setItem('onewayFlightSessionId', response.data.sessionId);
          }
        }

        // Store flight results based on trip type
        if (response.data) {
          if (propTripType === 'round') {
            sessionStorage.setItem('roundFlightResults', JSON.stringify(response.data));
          } else if (propTripType === 'multi') {
            sessionStorage.setItem('multiCityFlightResults', JSON.stringify(response.data.flights));
          } else {
            sessionStorage.setItem('flightResults', JSON.stringify(response.data.flights));
            sessionStorage.setItem('onewayFlightResults', JSON.stringify(response.data));
          }
        }

        if (onSearch) {
          onSearch(params);
        }

        // Navigate based on trip type
        if (propTripType === 'oneway') {
          console.log('🟢 Navigating to mobile-oneway-card');
          navigate('/mobile-oneway-card');
        } else if (propTripType === 'round') {
          console.log('🔵🔵🔵 Navigating to mobile-return-card');
          navigate('/mobile-return-card');
        } else if (propTripType === 'multi') {
          console.log('🟣 Navigating to mobile-multicity-card');
          navigate('/mobile-multicity-card');
        }
      } else {
        const errorMessage =
          response.message || 'No flights found. Please try different search criteria.';
        notifyError(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Search error:', error);
      if (error?.code === 'NETWORK_ERROR') {
        notifyError('Network error. Please check your internet connection.');
      } else if (error?.response?.status === 500) {
        notifyError('Server error. Please try again later.');
      }
    } finally {
      setLocalIsLoading(false);
    }
  };

  // Render trip form based on type
  const renderTripForm = () => {
    switch (propTripType) {
      case 'oneway':
        return (
          <OneWayForm
            from={from}
            fromCode={fromCode}
            fromAirportName={fromAirportName}
            to={to}
            toCode={toCode}
            toAirportName={toAirportName}
            onFromChange={handleFromChange}
            onFromCodeChange={setFromCode}
            onToChange={handleToChange}
            onToCodeChange={setToCode}
            onSwap={handleSwap}
          />
        );
      case 'round':
        return (
          <RoundTripForm
            from={roundFrom}
            fromCode={roundFromCode}
            fromAirportName={roundFromAirportName}
            to={roundTo}
            toCode={roundToCode}
            toAirportName={roundToAirportName}
            onFromChange={handleRoundFromChange}
            onFromCodeChange={setRoundFromCode}
            onToChange={handleRoundToChange}
            onToCodeChange={setRoundToCode}
            onSwap={handleSwap}
          />
        );
      case 'multi':
        return (
          <MultiCityForm
            segments={multiCitySegments}
            onUpdateSegment={updateCitySegment}
            onAddSegment={addCitySegment}
            onRemoveSegment={removeCitySegment}
          />
        );
      default:
        return null;
    }
  };

  // Render bottom section (dates)
  const renderBottomSection = () => {
    if (propTripType === 'multi') {
      return null;
    }

    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        <DateField
          label="Departure Date"
          value={departDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={setDepartDate}
        />
        <DateField
          label="Return Date"
          value={returnDate}
          min={departDate}
          onChange={setReturnDate}
          disabled={propTripType === 'oneway'}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-100">
      {/* Trip Type Tabs */}
      <div
        className="flex gap-1 bg-white rounded-xl p-1 mb-5 border border-primary/30"
        style={{ borderWidth: '0.6px' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              console.log('🔄 Tab clicked:', tab.id);
              setTripType(tab.id as TripType);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${propTripType === tab.id
                ? 'bg-secondary text-primary border border-primary'
                : 'text-gray-400 hover:bg-gray-100'
              }`}
            style={propTripType === tab.id ? { borderWidth: '0.6px' } : {}}
          >
            <img
              src={tab.icon}
              alt={tab.label}
              className={`w-4 h-4 object-contain ${propTripType === tab.id
                  ? 'filter brightness-0 saturate-100 invert-[20%] sepia-[80%] saturate-[1000%] hue-rotate-[320deg]'
                  : 'filter grayscale opacity-50'
                }`}
            />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trip Form */}
      {renderTripForm()}

      {/* Date Fields */}
      {renderBottomSection()}

      {/* Traveller Field */}
      <TravellerField
        label="Travellers & Class"
        totalPassengers={totalPassengers}
        travelClass={travelClass}
        showDropdown={showTravellerDropdown}
        onToggle={() => setShowTravellerDropdown(!showTravellerDropdown)}
        onClose={() => setShowTravellerDropdown(false)}
      >
        <TravellerOptions
          adults={passengers.adults}
          children={passengers.children}
          infants={passengers.infants}
          travelClass={travelClass}
          onAdultChange={(count) => setPassengers((prev) => ({ ...prev, adults: count }))}
          onChildChange={(count) => setPassengers((prev) => ({ ...prev, children: count }))}
          onInfantChange={(count) => setPassengers((prev) => ({ ...prev, infants: count }))}
          onClassChange={setTravelClass}
        />
      </TravellerField>

      {/* Search Button */}
      <button
        onClick={handleSearchClick}
        disabled={isLoading}
        className={`w-full mt-5 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-100 transition-colors duration-200 flex items-center justify-center gap-3 ${isLoading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90'
          }`}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Searching Flights...</span>
          </>
        ) : (
          <>
            <span>Search Flights</span>
            <img src={SearchLogo} alt="search" className="w-7 h-7 object-contain" />
          </>
        )}
      </button>

      {/* Footer */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-col items-center text-center">
          <img src={BestPrice} alt="Best Price" className="w-6 h-6 object-contain mb-1" />
          <span className="text-xs font-semibold text-gray-700">Best Price</span>
          <span className="text-xs font-semibold text-gray-700">Guarantee</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <img src={Flexible} alt="Flexible" className="w-6 h-6 object-contain mb-1" />
          <span className="text-xs font-semibold text-gray-700">Flexible</span>
          <span className="text-xs font-semibold text-gray-700">Booking</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <img src={Secure} alt="Secure" className="w-6 h-6 object-contain mb-1" />
          <span className="text-xs font-semibold text-gray-700">Secure</span>
          <span className="text-xs font-semibold text-gray-700">Payments</span>
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
