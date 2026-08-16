import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowLeft } from 'lucide-react';
import FlightHeader from '../OnewayFareCard/FlightHeader';
import FareSummary from './FareSummary';
import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';

interface FareData {
  fareId: string;
  FareIdentifierType: string;
  priceSummary: {
    AdultFare: {
      total: number;
      baseFare: number;
      tax: number;
      netFare: number;
    };
  };
  passengerBreakup: {
    AdultFare: {
      BaggageInfo: {
        CheckInBaggage: string;
        ClassCode: string;
      };
      CabinClass: string;
      ClassCode: string;
      RefundableType: number;
      SeatsRemaining: number;
    };
  };
  baggageDetails: Record<string, any>;
  meta: {
    isCreditCardApplicable: boolean;
    messages: any[];
    msri: any[];
  };
}

interface FlightData {
  flightKey: string;
  segments: any[];
  fares: FareData[];
}

const FareSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [selectedFareData, setSelectedFareData] = useState<FareData | null>(null);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('ECONOMY');
  const [cabinClasses, setCabinClasses] = useState<string[]>([]);
  const [isMultiCity, setIsMultiCity] = useState(false);

  useEffect(() => {
    const loadFareData = () => {
      try {
        const fareDetailsStr = sessionStorage.getItem('fareDetails');
        const selectedFlightStr = sessionStorage.getItem('selectedFlight');

        if (fareDetailsStr) {
          const fareResponse = JSON.parse(fareDetailsStr);
          if (fareResponse.success && fareResponse.data) {
            setFlightData(fareResponse.data);

            const uniqueCabinClasses = Array.from(
              new Set(
                fareResponse.data.fares
                  .map((fare: FareData) => fare.passengerBreakup?.AdultFare?.CabinClass)
                  .filter((cabin: any): cabin is string => Boolean(cabin)),
              ),
            );

            setCabinClasses(uniqueCabinClasses as any);

            if (uniqueCabinClasses.length > 0) {
              setActiveTab(uniqueCabinClasses[0] as any);
            }

            if (fareResponse.data.segments && fareResponse.data.segments.length > 0) {
              const segments = fareResponse.data.segments;
              const firstFare = fareResponse.data.fares[0];
              const baggageInfo = firstFare?.passengerBreakup?.AdultFare?.BaggageInfo;

              const firstSegment = segments[0];
              const lastSegment = segments[segments.length - 1];

              let derivedToCity = lastSegment.ArrivalAirport?.city || '';
              let derivedToCode = lastSegment.ArrivalAirport?.AirlineCode || '';

              if (
                firstSegment.DepartureAirport?.cityCode ===
                  lastSegment.ArrivalAirport?.AirlineCode &&
                segments.length > 1
              ) {
                // Grab the destination of the outbound half-journey
                const midIndex = Math.floor(segments.length / 2) - 1;
                const targetSegment = segments[midIndex >= 0 ? midIndex : 0];

                derivedToCity = targetSegment.ArrivalAirport?.city || '';
                derivedToCode = targetSegment.ArrivalAirport?.AirlineCode || '';
              }

              // const totalDuration = segments.reduce(
              //   (acc: number, seg: any) => acc + (seg.Duration || 0),
              //   0,
              // );
              // const stopCount = segments.length - 1;
              // const stopCities = segments
              //   .slice(0, -1)
              //   .map((seg: any) => seg.ArrivalAirport?.city || '');
              // const stopAirports = segments
              //   .slice(0, -1)
              //   .map((seg: any) => seg.ArrivalAirport?.AirlineName || '');

              const totalDuration = segments.reduce(
  (acc: number, seg: any) => acc + (seg.Duration || 0),
  0,
);
const stopCount = segments.length - 1;

let stopCities: string[] = [];
let stopAirports: string[] = [];

if (firstSegment.DepartureAirport?.cityCode === lastSegment.ArrivalAirport?.AirlineCode && segments.length > 1) {
  // ROUND TRIP: Layovers for the outbound journey only (up to the turning point destination)
  const midIndex = Math.floor(segments.length / 2);
  
  stopCities = segments
    .slice(0, midIndex - 1)
    .map((seg: any) => seg.ArrivalAirport?.city || '');
    
  stopAirports = segments
    .slice(0, midIndex - 1)
    .map((seg: any) => seg.ArrivalAirport?.AirlineName || '');
} else {
  // ONE WAY / MULTI-CITY: Standard behavior
  stopCities = segments
    .slice(0, -1)
    .map((seg: any) => seg.ArrivalAirport?.city || '');
    
  stopAirports = segments
    .slice(0, -1)
    .map((seg: any) => seg.ArrivalAirport?.AirlineName || '');
}

              const newFlightDetails = {
                fromCity: firstSegment.DepartureAirport?.city || '',
                fromCode: firstSegment.DepartureAirport?.AirlineCode || '',


                // toCity: lastSegment.ArrivalAirport?.city || '',
                // toCode: lastSegment.ArrivalAirport?.AirlineCode || '',

                toCity: derivedToCity,
                toCode: derivedToCode,


                departureTime: firstSegment.DepartureTime || '',
                arrivalTime: lastSegment.ArrivalTime || '',
                departureDate: firstSegment.DepartureTime || '',
                arrivalDate: lastSegment.ArrivalTime || '',
                date: firstSegment.DepartureTime || '',
                airline: firstSegment.FlightDetails?.AirlineInfo?.AirlineName || '',
                airlineCode: firstSegment.FlightDetails?.AirlineInfo?.AirlineCode || '',
                flightNumber: firstSegment.FlightDetails?.FlightNumber || '',
                cabin: firstFare?.passengerBreakup?.AdultFare?.CabinClass || 'ECONOMY',
                stops: String(stopCount),
                stopCities: stopCities,
                stopAirports: stopAirports,
                duration: String(totalDuration),
                isRefundable: firstSegment.IsRefundableSegment || false,
                departureTerminal: firstSegment.DepartureAirport?.terminal || '',
                arrivalTerminal: lastSegment.ArrivalAirport?.terminal || '',
                baggage: baggageInfo?.ClassCode || '7 Kg',
                checkIn: baggageInfo?.CheckInBaggage || '15 Kg (01 Piece only)',
                segments: segments,
                departureAirportName: firstSegment.DepartureAirport?.AirlineName || '',
              };

              setFlightDetails(newFlightDetails);
              return;
            }
          }
        }

        if (selectedFlightStr) {
          const flight = JSON.parse(selectedFlightStr);
          setFlightDetails({
            fromCity: flight.origin || '',
            toCity: flight.destination || '',
            fromCode: flight.origin || '',
            toCode: flight.destination || '',
            departureTime: flight.departure || '',
            arrivalTime: flight.arrival || '',
            airline: flight.airline || '',
            airlineCode: flight.airlineCode || '',
            flightNumber: flight.flightNumber || '',
            cabin: flight.cabin || 'Economy',
            stops: '0',
            duration: '',
            isRefundable: flight.refundable || false,
            departureAirportName: flight.airline || '',
            stopCities: [],
            stopAirports: [],
            segments: [],
          });
        }
      } catch (error) {
        console.error('Error loading fare data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFareData();
  }, []);

  useEffect(() => {
    // Check if this is a multi-city flow
    const flowType = sessionStorage.getItem('flowType');
    const isMulti =
      flowType === 'multicity' || sessionStorage.getItem('selectedMultiCityItinerary') !== null;
    setIsMultiCity(isMulti);

    // If multi-city, modify the header title
    if (isMulti) {
      // Optional: Log for debugging
      console.log('Multi-city flow detected');
    }
  }, []);

  const handleFareSelect = (fareId: string, fareData?: FareData) => {
    setSelectedFareId(fareId);
    if (fareData) {
      setSelectedFareData(fareData);
      sessionStorage.setItem('selectedFare', JSON.stringify(fareData));
    }
  };

  const handleContinue = () => {
    if (selectedFareData) {
      navigate('/mobile-oneway-fare-rule');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getFareFeatures = (fare: FareData) => {
    const features = [];
    const baggageInfo = fare.passengerBreakup?.AdultFare?.BaggageInfo;

    if (baggageInfo?.ClassCode) {
      features.push(`${baggageInfo.ClassCode} Cabin Baggage`);
    }
    if (baggageInfo?.CheckInBaggage) {
      features.push(baggageInfo.CheckInBaggage);
    }

    const fareType = fare.FareIdentifierType || '';
    if (fareType.includes('FLEXI')) {
      features.push('Free Date Change');
      features.push('Refundable');
    } else if (fareType.includes('PREMIUM')) {
      features.push('Free Seat Selection');
      features.push('Complimentary Meal');
    } else if (fareType.includes('CORPORATE')) {
      features.push('Corporate Benefits');
    } else if (fareType.includes('SME')) {
      features.push('SME Benefits');
    } else {
      features.push('Standard Seat Selection');
      features.push('No-Date-Change-Flexibility');
    }

    return features;
  };

  const getFareTitle = (fareIdentifierType: string): string => {
    if (fareIdentifierType.includes('FLEXI')) return 'FLEXI';
    if (fareIdentifierType.includes('PREMIUM')) return 'PREMIUM';
    if (fareIdentifierType === 'CORPORATE') return 'CORPORATE';
    if (fareIdentifierType === 'SME') return 'SME';
    return 'VALUE';
  };

  const getFareSubtitle = (fareIdentifierType: string): string => {
    if (fareIdentifierType.includes('FLEXI')) return 'Free Changes';
    if (fareIdentifierType.includes('PREMIUM')) return 'Maximum Perks';
    if (fareIdentifierType === 'CORPORATE') return 'Corporate Benefits';
    if (fareIdentifierType === 'SME') return 'SME Benefits';
    return 'Economy';
  };

  const getTotalFare = (fare: FareData): string => {
    const total = fare.priceSummary?.AdultFare?.total || 0;
    return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getBaseFare = (fare: FareData): string => {
    const base = fare.priceSummary?.AdultFare?.baseFare || 0;
    return `₹${base.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getTaxes = (fare: FareData): string => {
    const tax = fare.priceSummary?.AdultFare?.tax || 0;
    return `₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const isPopular = (fareIdentifierType: string): boolean => {
    return fareIdentifierType.includes('FLEXI');
  };

  const getCabinDisplayName = (cabin: string): string => {
    const cabinMap: Record<string, string> = {
      ECONOMY: 'Economy',
      PREMIUM_ECONOMY: 'Premium Economy',
      BUSINESS: 'Business',
      FIRST: 'First Class',
    };
    return cabinMap[cabin] || cabin;
  };

  const getCabinColor = (cabin: string): string => {
    const colorMap: Record<string, string> = {
      ECONOMY: 'blue',
      PREMIUM_ECONOMY: 'purple',
      BUSINESS: 'amber',
      FIRST: 'emerald',
    };
    return colorMap[cabin] || 'gray';
  };

  const getFaresByCabin = (cabin: string): FareData[] => {
    return (
      flightData?.fares?.filter((fare) => fare.passengerBreakup?.AdultFare?.CabinClass === cabin) ||
      []
    );
  };

  if (loading) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fare details...</p>
        </div>
      </div>
    );
  }

  const currentFares = getFaresByCabin(activeTab);

  return (
    <div className="block md:hidden lg:hidden min-h-screen bg-gray-50 p-3 sm:p-4 pb-24">
      <div className="max-w-5xl mx-auto">
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 mb-3 sm:mb-4 transition-colors"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
          <span className="text-lg sm:text-xl font-medium">
            {isMultiCity ? 'Select Fare (Multi-City)' : 'Select Fare'}
          </span>
        </button>
        {flightDetails && <FlightHeader key={JSON.stringify(flightDetails)} {...flightDetails} />}

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="mb-3 sm:mb-4 text-center">
            <h3 className="text-base sm:text-lg font-bold text-gray-800">Choose Your Fare</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Compare and select the fare that suits you best.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="flex-1 h-[2px] bg-[#D4AF37]"></div>
            <Star size={14} className="text-[#D4AF37] fill-[#D4AF37]" />
            <div className="flex-1 h-[2px] bg-[#D4AF37]"></div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {cabinClasses.map((cabin) => {
              const color = getCabinColor(cabin);
              const isActive = activeTab === cabin;
              return (
                <button
                  key={cabin}
                  onClick={() => {
                    setActiveTab(cabin);
                    setSelectedFareId(null);
                    setSelectedFareData(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? `bg-${color}-600 text-white shadow-md`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getCabinDisplayName(cabin)}
                  {cabinClasses.length > 1 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({getFaresByCabin(cabin).length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {currentFares.length > 0 ? (
              currentFares.map((fare, index) => {
                const title = getFareTitle(fare.FareIdentifierType || '');
                const uniqueId = `${activeTab}_${fare.fareId}`;
                const isSelected = selectedFareId === uniqueId;
                const popular = isPopular(fare.FareIdentifierType || '');

                return (
                  <div
                    key={index}
                    className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${popular ? 'relative' : ''}`}
                    onClick={() => handleFareSelect(uniqueId, fare)}
                  >
                    {popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-lg">{title}</h4>
                        <p className="text-sm text-gray-500">
                          {getFareSubtitle(fare.FareIdentifierType || '')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#EF4444]">{getTotalFare(fare)}</div>
                        <div className="text-xs text-gray-400">per adult</div>
                      </div>
                    </div>

                    <ul className="space-y-1 mb-3">
                      {getFareFeatures(fare).map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <svg
                            className="w-3 h-3 mr-2 text-green-500 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {fare.passengerBreakup?.AdultFare?.SeatsRemaining && (
                      <div className="text-xs text-gray-500 mt-1">
                        {fare.passengerBreakup.AdultFare.SeatsRemaining} seats remaining
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                No fares available for this cabin class
              </div>
            )}
          </div>
        </div>

        {selectedFareData && (
          <FareSummary
            totalFare={getTotalFare(selectedFareData)}
            adultCount={1}
            childCount={0}
            infantCount={0}
            baseFare={getBaseFare(selectedFareData)}
            taxes={getTaxes(selectedFareData)}
            onContinue={handleContinue}
            fareId={selectedFareData.fareId}
            flowType="oneway"
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default FareSelectionPage;
