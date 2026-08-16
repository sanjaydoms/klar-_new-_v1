import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, ArrowLeft, Plane, Clock } from 'lucide-react';
import BottomNav from '../../DashboardPage/BottomNav';
import { getFareRule } from '@/api/flightService.api';

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

interface RouteInfo {
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

const MultiCityFareSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [selectedFareData, setSelectedFareData] = useState<FareData | null>(null);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ECONOMY');
  const [cabinClasses, setCabinClasses] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeIndex, setRouteIndex] = useState<number>(0);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [isFareLoading, setIsFareLoading] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);

  useEffect(() => {
    const loadFareData = () => {
      try {
        const state = location.state as { routeIndex?: number } | null;
        const routeIndexFromStorage = sessionStorage.getItem('multiCityCurrentRouteIndex');
        const index =
          state?.routeIndex ?? (routeIndexFromStorage ? parseInt(routeIndexFromStorage) : 0);
        setRouteIndex(index);

        const fareDetailsStr = sessionStorage.getItem('multiCityFareDetails');
        const selectedFlightStr = sessionStorage.getItem('selectedMultiCityFlight');

        if (selectedFlightStr) {
          setSelectedFlight(JSON.parse(selectedFlightStr));
        }

        if (fareDetailsStr) {
          const fareResponse = JSON.parse(fareDetailsStr);
          if (fareResponse.success && fareResponse.data) {
            setFlightData(fareResponse.data);

            if (fareResponse.data.segments && fareResponse.data.segments.length > 0) {
              const segments = fareResponse.data.segments;
              const firstSegment = segments[0];
              const lastSegment = segments[segments.length - 1];

              const totalDuration = segments.reduce(
                (acc: number, seg: any) => acc + (seg.Duration || 0),
                0,
              );

              const route: RouteInfo = {
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
            setCabinClasses(uniqueCabinClasses);

            if (uniqueCabinClasses.length > 0) {
              setActiveTab(uniqueCabinClasses[0]);
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
  }, [location]);

  const handleFareSelect = async (fareId: string, fareData: FareData) => {
    setIsFareLoading(true);
    setFareError(null); // Clear any previous error
    try {
      const response = await getFareRule({
        flowType: 'SEARCH',
        id: fareData.fareId,
      });

      if (response?.status?.success) {
        sessionStorage.setItem('multiCityFareRules', JSON.stringify(response));
        sessionStorage.setItem('fareRuleData', JSON.stringify(response));
        sessionStorage.setItem('multiCityFareId', fareData.fareId);

        setSelectedFareId(fareId);
        setSelectedFareData(fareData);
      } else {
        // API call failed or returned unsuccessful
        setFareError('This fare is not available');
        setSelectedFareId(null);
        setSelectedFareData(null);
      }
    } catch (error) {
      console.error('Error fetching fare rules:', error);
      setFareError('This fare is not available');
      setSelectedFareId(null);
      setSelectedFareData(null);
    } finally {
      setIsFareLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedFareData) {
      try {
        const storedStates = sessionStorage.getItem('multiCityRouteStates');
        if (storedStates) {
          const routeStates = JSON.parse(storedStates);
          if (Array.isArray(routeStates) && routeStates[routeIndex]) {
            routeStates[routeIndex] = {
              ...routeStates[routeIndex],
              selectedFareData: selectedFareData,
              fareId: selectedFareData.fareId,
              rulesAccepted: false,
              isComplete: false,
            };
            sessionStorage.setItem('multiCityRouteStates', JSON.stringify(routeStates));
            sessionStorage.setItem('multiCitySelectedFare', JSON.stringify(selectedFareData));
            sessionStorage.setItem('multiCityFareId', selectedFareData.fareId);
          }
        }
        sessionStorage.setItem('selectedFareData', JSON.stringify(selectedFareData));

        navigate('/multi-city-fare-rules', {
          state: { routeIndex, fromFareSelection: true },
        });
      } catch (error) {
        console.error('Error updating route state:', error);
      }
    }
  };

  const handleBack = () => {
    navigate('/mobile-multicity-card');
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
    if (fare.FareIdentifierType) {
      features.push(fare.FareIdentifierType);
    }
    if (fare.passengerBreakup?.AdultFare?.RefundableType !== undefined) {
      features.push(
        fare.passengerBreakup.AdultFare.RefundableType === 1 ? 'Refundable' : 'Non-Refundable',
      );
    }

    return features;
  };

  const getFareTitle = (fareIdentifierType: string): string => {
    return fareIdentifierType || 'Fare';
  };

  const getTotalFare = (fare: FareData): string => {
    const total = fare.priceSummary?.AdultFare?.total || 0;
    return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const isPopular = (fare: FareData): boolean => {
    return false;
  };

  const getCabinDisplayName = (cabin: string): string => {
    return cabin;
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
            Select Fare - Route {routeIndex + 1}
          </span>
        </button>

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
                {routeInfo.stops === 0
                  ? 'Non-stop'
                  : `${routeInfo.stops} Stop${routeInfo.stops > 1 ? 's' : ''}`}
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
            {cabinClasses.map((cabin) => (
              <button
                key={cabin}
                onClick={() => {
                  setActiveTab(cabin);
                  setSelectedFareId(null);
                  setSelectedFareData(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeTab === cabin
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {getCabinDisplayName(cabin)}
                <span className="ml-1 text-xs opacity-75">({getFaresByCabin(cabin).length})</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {currentFares.length > 0 ? (
              currentFares.map((fare, index) => {
                const title = getFareTitle(fare.FareIdentifierType || '');
                const uniqueId = `${activeTab}_${fare.fareId}`;
                const isSelected = selectedFareId === uniqueId;
                const popular = isPopular(fare);
                const seatsRemaining = fare.passengerBreakup?.AdultFare?.SeatsRemaining;
                const classCode = fare.passengerBreakup?.AdultFare?.ClassCode;
                const refundableType = fare.passengerBreakup?.AdultFare?.RefundableType;

                return (
                  <div
                    key={index}
                    className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                      } ${popular ? 'relative' : ''} ${isFareLoading ? 'opacity-50 pointer-events-none' : ''}`}
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

                    <div className="flex flex-wrap gap-2 mt-1">
                      {seatsRemaining !== undefined && seatsRemaining !== null && (
                        <div className="text-xs text-gray-500">
                          {seatsRemaining} seats remaining
                        </div>
                      )}
                      {classCode && <div className="text-xs text-gray-500">Class: {classCode}</div>}
                      {refundableType !== undefined && refundableType !== null && (
                        <div className="text-xs text-gray-500">
                          {refundableType === 1 ? 'Refundable' : 'Non-Refundable'}
                        </div>
                      )}
                      {fare.FareIdentifierType && (
                        <div className="text-xs text-gray-500">Type: {fare.FareIdentifierType}</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                No fares available for this cabin class
              </div>
            )}

            {fareError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {fareError}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleContinue}
            disabled={!selectedFareData}
            className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors text-sm sm:text-base ${selectedFareData
              ? 'bg-primary hover:bg-primary text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            {selectedFareData ? 'Continue to Fare Rules →' : 'Select a fare to continue'}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default MultiCityFareSelectionPage;
