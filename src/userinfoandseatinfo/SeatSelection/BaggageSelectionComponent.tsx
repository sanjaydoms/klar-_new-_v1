import React, { useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface BaggageSelectionComponentProps {
  travelerCount: number;
  availableSegments: string[];
  currentSegmentIdForBaggage: string;
  setCurrentSegmentIdForBaggage: (segmentId: string) => void;
  selectedTravelerForBaggage: number;
  setSelectedTravelerForBaggage: (index: number) => void;
  selectedBaggagePerTravelerPerSegment: {
    [travelerIndex: number]: { [segmentId: string]: { [baggageId: string]: number } };
  };
  setSelectedBaggagePerTravelerPerSegment: React.Dispatch<
    React.SetStateAction<{
      [travelerIndex: number]: { [segmentId: string]: { [baggageId: string]: number } };
    }>
  >;
  showBaggageLimitWarning: boolean;
  setShowBaggageLimitWarning: (show: boolean) => void;
  getFlightInfoBySegmentId: (
    segmentId: string,
  ) => { flightNumber: string; departure: string; arrival: string } | null;
  baggageBySegment?: { [segmentId: string]: any[] };
  isRoundTrip?: boolean;
  isConnectingFlight?: boolean;
  isMultiCity?: boolean;
  segmentsList?: any[];
}

const getIncludedBaggageFromAPI = (segmentId: string): any[] => {
  try {
    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const trips = priceData?.data?.mappedData?.TripInformation || [];

    for (const trip of trips) {
      const segments = trip.SegmentInformation || [];
      const hasSegment = segments.some((s: any) => s.SegmentID === segmentId);

      if (hasSegment) {
        const fareDetails = trip.TotalPriceList?.[0]?.FareDetails?.AdultFare;
        if (fareDetails?.BaggageInfo) {
          const baggageList = [];
          if (fareDetails.BaggageInfo.CheckInBaggage) {
            baggageList.push({
              type: 'Check-in Baggage',
              weight: fareDetails.BaggageInfo.CheckInBaggage,
              isIncluded: true,
            });
          }
          if (fareDetails.BaggageInfo.CabinBaggage) {
            baggageList.push({
              type: 'Cabin Baggage',
              weight: fareDetails.BaggageInfo.CabinBaggage,
              isIncluded: true,
            });
          }
          return baggageList;
        }
        break;
      }
    }
    return [];
  } catch (error) {
    console.error('Error extracting baggage:', error);
    return [];
  }
};

const getAllBaggageOptions = (): { [segmentId: string]: any[] } => {
  try {
    const mealsAndBaggagesResponse = JSON.parse(
      sessionStorage.getItem('mealsAndBaggagesResponse') || '{}',
    );
    const baggageBySegment: { [segmentId: string]: any[] } = {};

    const stored = sessionStorage.getItem('baggageBySegment');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Object.keys(parsed).length > 0) {
        return parsed;
      }
    }

    if (mealsAndBaggagesResponse?.data && Array.isArray(mealsAndBaggagesResponse.data)) {
      mealsAndBaggagesResponse.data.forEach((itinerary: any) => {
        if (itinerary.segments && Array.isArray(itinerary.segments)) {
          itinerary.segments.forEach((segment: any) => {
            const segmentId = segment.segmentId || segment.id;
            if (
              segmentId &&
              segment.baggage &&
              Array.isArray(segment.baggage) &&
              segment.baggage.length > 0
            ) {
              baggageBySegment[segmentId] = segment.baggage.map((baggage: any, idx: number) => ({
                ...baggage,
                id: `baggage_${segmentId}_${idx}`,
                code: baggage.code || baggage.AirlineCode,
                price: baggage.price !== undefined ? baggage.price : baggage.amount || 0,
                description: baggage.description || baggage.desc || baggage.name || 'Extra Baggage',
              }));
            }
          });
        }
      });
    }

    return baggageBySegment;
  } catch (error) {
    console.error('Error getting baggage options:', error);
    return {};
  }
};

export default function BaggageSelectionComponent({
  travelerCount,
  availableSegments,
  currentSegmentIdForBaggage,
  setCurrentSegmentIdForBaggage,
  selectedTravelerForBaggage,
  setSelectedTravelerForBaggage,
  selectedBaggagePerTravelerPerSegment,
  setSelectedBaggagePerTravelerPerSegment,
  showBaggageLimitWarning,
  setShowBaggageLimitWarning,
  getFlightInfoBySegmentId,
  baggageBySegment: baggageBySegmentProp,
  isRoundTrip: isRoundTripProp,
  isConnectingFlight: isConnectingFlightProp,
  isMultiCity: isMultiCityProp,
  segmentsList: segmentsListProp,
}: BaggageSelectionComponentProps) {
  const allBaggageOptions =
    baggageBySegmentProp && Object.keys(baggageBySegmentProp).length > 0
      ? baggageBySegmentProp
      : getAllBaggageOptions();

  const baggageSegments = Object.keys(allBaggageOptions);
  const segmentsToDisplay = availableSegments.length > 0 ? availableSegments : baggageSegments;

  useEffect(() => {
    if (travelerCount > 0 && segmentsToDisplay.length > 0) {
      setSelectedBaggagePerTravelerPerSegment((prev) => {
        const updated = { ...prev };

        for (let i = 0; i < travelerCount; i++) {
          if (!updated[i]) {
            updated[i] = {};
          }

          segmentsToDisplay.forEach((segmentId) => {
            if (!updated[i][segmentId]) {
              updated[i][segmentId] = {};
            }
          });
        }

        return updated;
      });
    }
  }, [travelerCount, segmentsToDisplay, setSelectedBaggagePerTravelerPerSegment]);

  useEffect(() => {
    if (segmentsToDisplay.length > 0 && !currentSegmentIdForBaggage) {
      setCurrentSegmentIdForBaggage(segmentsToDisplay[0]);
    }
  }, [segmentsToDisplay, currentSegmentIdForBaggage, setCurrentSegmentIdForBaggage]);

  const updateBaggageCount = (
    baggageId: string,
    increment: boolean,
    segmentId: string,
    travelerIndex: number,
  ) => {
    setSelectedBaggagePerTravelerPerSegment((prev) => {
      const newSelections = JSON.parse(JSON.stringify(prev));

      if (!newSelections[travelerIndex]) {
        newSelections[travelerIndex] = {};
      }

      if (!newSelections[travelerIndex][segmentId]) {
        newSelections[travelerIndex][segmentId] = {};
      }

      const currentCount = newSelections[travelerIndex][segmentId][baggageId] || 0;

      if (increment) {
        const travelerTotal = Object.values(newSelections[travelerIndex][segmentId]).reduce(
          (sum: number, count: any) => sum + count,
          0,
        );
        if (travelerTotal >= 1) {
          setShowBaggageLimitWarning(true);
          setTimeout(() => setShowBaggageLimitWarning(false), 3000);
          return prev;
        }
        newSelections[travelerIndex][segmentId][baggageId] = currentCount + 1;

        const baggageCodeMapping = JSON.parse(sessionStorage.getItem('baggageCodeMapping') || '{}');
        let baggageOptionsData = allBaggageOptions[segmentId] || [];

        const baggageOption = baggageOptionsData.find(
          (_: any, idx: number) => `baggage_${segmentId}_${idx}` === baggageId,
        );
        if (baggageOption) {
          baggageCodeMapping[baggageId] = baggageOption.code || baggageOption.AirlineCode;
          sessionStorage.setItem('baggageCodeMapping', JSON.stringify(baggageCodeMapping));
        }
      } else {
        if (currentCount <= 1) {
          delete newSelections[travelerIndex][segmentId][baggageId];
          if (Object.keys(newSelections[travelerIndex][segmentId]).length === 0) {
            delete newSelections[travelerIndex][segmentId];
          }
          if (Object.keys(newSelections[travelerIndex]).length === 0) {
            delete newSelections[travelerIndex];
          }
        } else {
          newSelections[travelerIndex][segmentId][baggageId] = currentCount - 1;
        }
      }

      return newSelections;
    });
  };

  const allFlights =
    segmentsListProp ||
    JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}')?.data?.flights ||
    [];

  const isRoundTrip =
    isRoundTripProp !== undefined
      ? isRoundTripProp
      : allFlights.length === 2 &&
        allFlights[0]?.departure?.airportCode === allFlights[1]?.arrival?.airportCode &&
        allFlights[0]?.arrival?.airportCode === allFlights[1]?.departure?.airportCode;

  const isConnectingFlight =
    isConnectingFlightProp !== undefined
      ? isConnectingFlightProp
      : allFlights.length > 1 && !isRoundTrip && allFlights.length <= 2;
  const isMultiCity = isMultiCityProp !== undefined ? isMultiCityProp : allFlights.length > 2;

  const currentSegmentBaggageOptions = allBaggageOptions[currentSegmentIdForBaggage] || [];
  const isBaggageAvailableFromAPI = currentSegmentBaggageOptions.length > 0;

  if (!isBaggageAvailableFromAPI) {
    const includedBaggage = getIncludedBaggageFromAPI(currentSegmentIdForBaggage);

    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo/suitcases.png" alt="Baggage" className="w-8 h-8 object-contain" />
          <h3 className="text-lg font-semibold text-gray-900">Included Baggage Allowance</h3>
        </div>
        <div className="space-y-3">
          {includedBaggage.length > 0 ? (
            includedBaggage.map((baggage, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100"
              >
                <div>
                  <p className="font-bold text-gray-900">{baggage.type}</p>
                  <p className="text-sm text-gray-600">Included in your fare</p>
                </div>
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold">
                  {baggage.weight}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100">
              <div>
                <p className="font-bold text-gray-900">Standard Baggage</p>
                <p className="text-sm text-gray-600">Included in your fare</p>
              </div>
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold">
                As per airline policy
              </span>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-gray-500 text-center border-t pt-3">
          ✈️ Extra baggage can be purchased at the airport check-in counter
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tripjack Info Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {/* <span className="font-medium">Tripjack Baggage Policy:</span> */}
          {isConnectingFlight && (
            <span>
              For connecting flights, baggage selected on first segment applies to all connecting
              segments.
            </span>
          )}
          {isRoundTrip && (
            <span>You can select different baggage for onward and return journeys.</span>
          )}
          {isMultiCity && <span>Each flight segment can have independent baggage selection.</span>}
          {!isConnectingFlight && !isRoundTrip && !isMultiCity && allFlights.length === 1 && (
            <span>Select baggage for your direct flight.</span>
          )}
        </p>
      </div>

      {/* Segment Selector */}
      {segmentsToDisplay.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Flight Segment
          </label>
          <div className="flex flex-wrap gap-2">
            {segmentsToDisplay.map((segmentId, index) => {
              const flightInfo = getFlightInfoBySegmentId(segmentId);
              const isOnward = index === 0;
              const isReturn = isRoundTrip && index === 1;
              const hasBaggage = allBaggageOptions[segmentId]?.length > 0;

              return (
                <button
                  key={segmentId}
                  onClick={() => hasBaggage && setCurrentSegmentIdForBaggage(segmentId)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${!hasBaggage ? 'opacity-50 cursor-not-allowed' : ''} ${
                    currentSegmentIdForBaggage === segmentId
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={!hasBaggage}
                >
                  {flightInfo?.flightNumber || `Flight ${index + 1}`}
                  <span className="text-xs ml-2 opacity-75">
                    {flightInfo?.departure} → {flightInfo?.arrival}
                  </span>
                  {isOnward && isRoundTrip && (
                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-1 rounded">
                      Onward
                    </span>
                  )}
                  {isReturn && isRoundTrip && (
                    <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-1 rounded">
                      Return
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Traveler Tabs */}
      {travelerCount > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {Array.from({ length: travelerCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setSelectedTravelerForBaggage(i)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                selectedTravelerForBaggage === i
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Traveler {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Baggage limit warning */}
      {showBaggageLimitWarning && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-pulse">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Maximum 1 baggage item per traveler per flight segment.
          </p>
        </div>
      )}

      {/* Flight info for current segment */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Segment</p>
            <p className="font-semibold text-gray-900">
              {getFlightInfoBySegmentId(currentSegmentIdForBaggage)?.flightNumber || 'Flight'}
            </p>
            <p className="text-xs text-gray-500">
              {getFlightInfoBySegmentId(currentSegmentIdForBaggage)?.departure} →{' '}
              {getFlightInfoBySegmentId(currentSegmentIdForBaggage)?.arrival}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Traveler {selectedTravelerForBaggage + 1}</p>
            <p className="text-lg font-bold text-blue-600">
              {Object.values(
                selectedBaggagePerTravelerPerSegment[selectedTravelerForBaggage]?.[
                  currentSegmentIdForBaggage
                ] || {},
              ).reduce((sum, count) => sum + count, 0)}
            </p>
            <p className="text-xs text-gray-500">/ 1 item max</p>
          </div>
        </div>
      </div>

      {/* SINGLE CONTAINER FOR ALL BAGGAGE OPTIONS */}
      <div className="bg-blue-50 border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-200">
          {currentSegmentBaggageOptions.map((baggage: any, index: number) => {
            const baggageId = `baggage_${currentSegmentIdForBaggage}_${index}`;
            const airlineCode = baggage.code || baggage.AirlineCode;
            const quantity =
              (currentSegmentIdForBaggage &&
                selectedBaggagePerTravelerPerSegment[selectedTravelerForBaggage]?.[
                  currentSegmentIdForBaggage
                ]?.[baggageId]) ||
              0;
            const pricePerItem = baggage.price || baggage.amount || 0;
            const isSelected = quantity > 0;

            const travelerHasReachedLimit = currentSegmentIdForBaggage
              ? Object.values(
                  selectedBaggagePerTravelerPerSegment[selectedTravelerForBaggage]?.[
                    currentSegmentIdForBaggage
                  ] || {},
                ).reduce((sum, count) => sum + count, 0) >= 1
              : false;

            const handleAddBaggage = () => {
              const baggageCodeMapping = JSON.parse(
                sessionStorage.getItem('baggageCodeMapping') || '{}',
              );
              baggageCodeMapping[baggageId] = airlineCode;
              sessionStorage.setItem('baggageCodeMapping', JSON.stringify(baggageCodeMapping));
              updateBaggageCount(
                baggageId,
                true,
                currentSegmentIdForBaggage,
                selectedTravelerForBaggage,
              );
            };

            const handleRemoveBaggage = () => {
              if (quantity === 1) {
                const baggageCodeMapping = JSON.parse(
                  sessionStorage.getItem('baggageCodeMapping') || '{}',
                );
                delete baggageCodeMapping[baggageId];
                sessionStorage.setItem('baggageCodeMapping', JSON.stringify(baggageCodeMapping));
              }
              updateBaggageCount(
                baggageId,
                false,
                currentSegmentIdForBaggage,
                selectedTravelerForBaggage,
              );
            };

            const displayWeight =
              baggage.weight ||
              baggage.weightKg ||
              baggage.Description ||
              baggage.description ||
              '5KG';
            const displayPrice =
              isSelected && quantity > 0 ? pricePerItem * quantity : pricePerItem;

            return (
              <div
                key={baggageId}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  isSelected ? 'bg-blue-100' : 'bg-transparent hover:bg-blue-100/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src="/logo/suitcases.png"
                    alt="Baggage"
                    className={`w-5 h-5 object-contain ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                  />
                  <div>
                    <span className="font-medium text-gray-900">{displayWeight}</span>
                    <span className="ml-3 text-sm text-gray-600">
                      INR {displayPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected && quantity > 0 && (
                    <span className="text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded-full border border-blue-200">
                      {quantity}
                    </span>
                  )}
                  {isSelected ? (
                    <button
                      onClick={handleRemoveBaggage}
                      className="px-4 py-2 rounded-lg flex items-center gap-1 bg-white text-red-500 hover:bg-red-50 transition-colors text-sm font-medium border border-gray-200 shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAddBaggage}
                      disabled={travelerHasReachedLimit}
                      className={`px-4 py-2 rounded-sm flex items-center gap-1 transition-colors text-sm font-medium bg-white border border-gray-200 shadow-sm ${
                        travelerHasReachedLimit
                          ? 'text-gray-400 cursor-not-allowed opacity-60'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Plus className="w-6 h-4" />
                      <span>ADD</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {travelerCount > 1 && segmentsToDisplay.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
          <div className="space-y-2">
            {Array.from({ length: travelerCount }, (_, i) => {
              const totalItems = Object.values(
                selectedBaggagePerTravelerPerSegment[i] || {},
              ).reduce(
                (sum, segmentSelections) =>
                  sum + Object.values(segmentSelections).reduce((s, count) => s + count, 0),
                0,
              );
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Traveler {i + 1}</span>
                  <span
                    className={`font-medium ${totalItems > 0 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
