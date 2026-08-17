import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Plane, Clock, Calendar } from 'lucide-react';
import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';
import FareSummary from '../FlightSearchSection/Oneway/OnewayFareCard/FareSummary';
import {
  cabinBaggageOf,
  refundableLabelFromType,
} from '@/features/flights/utils/flightDisplay';

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
        /** cB under bI: cabin baggage. ClassCode is its legacy alias. */
        CabinBaggage?: string;
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

interface FlightRouteInfo {
  fromCity: string;
  fromCode: string;
  toCity: string;
  toCode: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  duration: number;
  stops: number;
}

interface FareIdEntry {
  segment: 'ONWARD' | 'RETURN';
  fareId: string;
}

const DomesticFareSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [selectedFareData, setSelectedFareData] = useState<FareData | null>(null);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ECONOMY');
  const [cabinClasses, setCabinClasses] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState<FlightRouteInfo | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>('');

  // Helper function to update fare IDs in session storage
  const updateFareIdsInStorage = (segment: string, fareId: string) => {
    try {
      // Get existing fare IDs array from session storage
      const existingData = sessionStorage.getItem('returnDomesticFareIds');
      let fareIds: FareIdEntry[] = [];

      if (existingData) {
        try {
          fareIds = JSON.parse(existingData);
          // Ensure it's an array
          if (!Array.isArray(fareIds)) {
            fareIds = [];
          }
        } catch (e) {
          fareIds = [];
        }
      }

      // Check if this segment already exists
      const existingIndex = fareIds.findIndex((item) => item.segment === segment);

      if (existingIndex !== -1) {
        // Update existing entry
        (fareIds[existingIndex] as any).fareId = fareId;
      } else {
        // Add new entry
        fareIds.push({ segment: segment as 'ONWARD' | 'RETURN', fareId });
      }

      // Save back to session storage
      sessionStorage.setItem('returnDomesticFareIds', JSON.stringify(fareIds));
      console.log('Updated fare IDs:', fareIds);
    } catch (error) {
      console.error('Error updating fare IDs in storage:', error);
    }
  };

  useEffect(() => {
    const loadFareData = () => {
      try {
        const fareDetailsStr = sessionStorage.getItem('fareDetails');
        const selectedFlightStr = sessionStorage.getItem('selectedFlight');
        const segment = sessionStorage.getItem('selectedSegment') || '';

        setSelectedSegment(segment);

        if (fareDetailsStr) {
          const fareResponse = JSON.parse(fareDetailsStr);
          if (fareResponse.success && fareResponse.data) {
            setFlightData(fareResponse.data);

            // Extract route information from segments
            if (fareResponse.data.segments && fareResponse.data.segments.length > 0) {
              const segments = fareResponse.data.segments;
              const firstSegment = segments[0];
              const lastSegment = segments[segments.length - 1];

              // Calculate total duration
              const totalDuration = segments.reduce(
                (acc: number, seg: any) => acc + (seg.Duration || 0),
                0,
              );

              // Format duration
              const hours = Math.floor(totalDuration / 60);
              const minutes = totalDuration % 60;
              const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

              const route: FlightRouteInfo = {
                fromCity: firstSegment.DepartureAirport?.city || '',
                fromCode: firstSegment.DepartureAirport?.AirlineCode || '',
                toCity: lastSegment.ArrivalAirport?.city || '',
                toCode: lastSegment.ArrivalAirport?.AirlineCode || '',
                departureTime: firstSegment.DepartureTime
                  ? new Date(firstSegment.DepartureTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '',
                arrivalTime: lastSegment.ArrivalTime
                  ? new Date(lastSegment.ArrivalTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '',
                departureDate: firstSegment.DepartureTime || '',
                arrivalDate: lastSegment.ArrivalTime || '',
                airline: firstSegment.FlightDetails?.AirlineInfo?.AirlineName || '',
                airlineCode: firstSegment.FlightDetails?.AirlineInfo?.AirlineCode || '',
                flightNumber: firstSegment.FlightDetails?.FlightNumber || '',
                duration: totalDuration,
                stops: segments.length - 1,
              };

              setRouteInfo(route);
            }

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
          }
        }
      } catch (error) {
        console.error('Error loading fare data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFareData();
  }, []);

  const handleFareSelect = (fareId: string, fareData?: FareData) => {
    setSelectedFareId(fareId);
    if (fareData) {
      setSelectedFareData(fareData);
      sessionStorage.setItem('selectedFare', JSON.stringify(fareData));

      // Store fare data based on segment
      const segment = sessionStorage.getItem('selectedSegment') || '';
      if (segment === 'ONWARD') {
        sessionStorage.setItem('selectedDepartureFare', JSON.stringify(fareData));
        sessionStorage.setItem('selectedDepartureFareId', fareData.fareId);
        // Update the consolidated fare IDs array
        updateFareIdsInStorage('ONWARD', fareData.fareId);
      } else if (segment === 'RETURN') {
        sessionStorage.setItem('selectedReturnFare', JSON.stringify(fareData));
        sessionStorage.setItem('selectedReturnFareId', fareData.fareId);
        // Update the consolidated fare IDs array
        updateFareIdsInStorage('RETURN', fareData.fareId);
      } else {
        // Default fallback
        sessionStorage.setItem('selectedFareData', JSON.stringify(fareData));
      }
    }
  };

  const handleContinue = () => {
    if (selectedFareData) {
      // Store the final selected fare data before navigating
      const segment = sessionStorage.getItem('selectedSegment') || '';
      if (segment === 'ONWARD') {
        sessionStorage.setItem('selectedDepartureFare', JSON.stringify(selectedFareData));
        sessionStorage.setItem('selectedDepartureFareId', selectedFareData.fareId);
        // Update the consolidated fare IDs array
        updateFareIdsInStorage('ONWARD', selectedFareData.fareId);
      } else if (segment === 'RETURN') {
        sessionStorage.setItem('selectedReturnFare', JSON.stringify(selectedFareData));
        sessionStorage.setItem('selectedReturnFareId', selectedFareData.fareId);
        // Update the consolidated fare IDs array
        updateFareIdsInStorage('RETURN', selectedFareData.fareId);
      } else {
        sessionStorage.setItem('selectedFareData', JSON.stringify(selectedFareData));
      }

      navigate('/mobile_return_fare_rule_card');
    }
  };

  const handleBack = () => {
    navigate('/mobile-return-card');
  };

  const getFareFeatures = (fare: FareData) => {
    const features = [];
    const baggageInfo = fare.passengerBreakup?.AdultFare?.BaggageInfo;

    const cabin = cabinBaggageOf(baggageInfo);
    if (cabin) {
      features.push(`${cabin} Cabin Baggage`);
    }
    if (baggageInfo?.CheckInBaggage) {
      features.push(`${baggageInfo.CheckInBaggage} Check-in`);
    }

    // Refundability comes from RefundableType, the field that states it.
    const refundable = refundableLabelFromType(fare.passengerBreakup?.AdultFare?.RefundableType);
    if (refundable) {
      features.push(refundable);
    }

    // The fare NAME still hints at perks, but it no longer decides
    // refundability — "FLEXI" used to be the only way this said Refundable,
    // so every refundable PUBLISHED fare read "No-Date-Change-Flexibility".
    const fareType = fare.FareIdentifierType || '';
    if (fareType.includes('FLEXI')) {
      features.push('Free Date Change');
    } else if (fareType.includes('PREMIUM')) {
      features.push('Free Seat Selection');
      features.push('Complimentary Meal');
    } else if (fareType.includes('CORPORATE')) {
      features.push('Corporate Benefits');
    } else if (fareType.includes('SME')) {
      features.push('SME Benefits');
    }
    // The old else-branch asserted 'Standard Seat Selection' and
    // 'No-Date-Change-Flexibility' for every unnamed fare — restrictions
    // invented from the absence of a keyword. The fare rules are a separate
    // call; until something reads them, say nothing.

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStopDisplay = (stops: number) => {
    if (stops === 0) return 'Non-stop';
    if (stops === 1) return '1 Stop';
    return `${stops} Stops`;
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
            {selectedSegment === 'ONWARD'
              ? 'Select Departure Fare'
              : selectedSegment === 'RETURN'
                ? 'Select Return Fare'
                : 'Select Fare'}
          </span>
        </button>

        {/* Flight Route Header */}
        {routeInfo && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-700 text-sm">{routeInfo.airline}</span>
                <span className="text-xs text-gray-500">({routeInfo.airlineCode})</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">Flight {routeInfo.flightNumber}</span>
              </div>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                {getStopDisplay(routeInfo.stops)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800">{routeInfo.fromCode}</div>
                <div className="text-xs text-gray-500">{routeInfo.fromCity}</div>
                <div className="text-xs text-gray-400 mt-1">{routeInfo.departureTime}</div>
                <div className="text-xs text-gray-400">{formatDate(routeInfo.departureDate)}</div>
              </div>

              <div className="flex-1 flex flex-col items-center px-2">
                <div className="relative w-full flex items-center justify-center">
                  <div className="h-[2px] w-full bg-gray-300"></div>
                  <Plane className="absolute w-4 h-4 text-blue-600 bg-white" />
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(routeInfo.duration / 60)}h {routeInfo.duration % 60}m
                </div>
              </div>

              <div className="flex-1 text-right">
                <div className="text-lg font-bold text-gray-800">{routeInfo.toCode}</div>
                <div className="text-xs text-gray-500">{routeInfo.toCity}</div>
                <div className="text-xs text-gray-400 mt-1">{routeInfo.arrivalTime}</div>
                <div className="text-xs text-gray-400">{formatDate(routeInfo.arrivalDate)}</div>
              </div>
            </div>

            {/* Segment indicator */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  selectedSegment === 'ONWARD'
                    ? 'bg-green-100 text-green-700'
                    : selectedSegment === 'RETURN'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {selectedSegment === 'ONWARD'
                  ? '✈️ Departure Segment'
                  : selectedSegment === 'RETURN'
                    ? '🔄 Return Segment'
                    : 'Select Fare'}
              </span>
            </div>
          </div>
        )}

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

export default DomesticFareSelectionPage;
