import React, { useEffect, useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const storeMealCodeMapping = (mealId: string, airlineCode: string) => {
  const mealCodeMapping = JSON.parse(sessionStorage.getItem('mealCodeMapping') || '{}');
  mealCodeMapping[mealId] = airlineCode;
  sessionStorage.setItem('mealCodeMapping', JSON.stringify(mealCodeMapping));
};

const removeMealCodeMapping = (mealId: string) => {
  const mealCodeMapping = JSON.parse(sessionStorage.getItem('mealCodeMapping') || '{}');
  delete mealCodeMapping[mealId];
  sessionStorage.setItem('mealCodeMapping', JSON.stringify(mealCodeMapping));
};

// Helper function to extract meals from segment
const extractMealsFromSegment = (segmentId: string): any[] => {
  try {
    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const trips = priceData?.data?.mappedData?.TripInformation || [];

    for (const trip of trips) {
      const segments = trip.SegmentInformation || [];
      for (const segment of segments) {
        if (segment.SegmentID === segmentId) {
          const meals = segment.ssrInfo?.MEAL || [];
          return meals.map((meal: any) => ({
            ...meal,
            code: meal.AirlineCode,
            description: meal.Description,
            price: meal.amount,
          }));
        }
      }
    }
    return [];
  } catch (error) {
    console.error('Error extracting meals:', error);
    return [];
  }
};

interface MealSelectionComponentProps {
  travelerCount: number;
  availableSegments: string[];
  currentSegmentIdForMeals: string;
  setCurrentSegmentIdForMeals: (segmentId: string) => void;
  selectedTravelerForMeals: number;
  setSelectedTravelerForMeals: (index: number) => void;
  selectedMealsPerTravelerPerSegment: {
    [travelerIndex: number]: { [segmentId: string]: { [mealId: string]: number } };
  };
  setSelectedMealsPerTravelerPerSegment: React.Dispatch<
    React.SetStateAction<{
      [travelerIndex: number]: { [segmentId: string]: { [mealId: string]: number } };
    }>
  >;
  selectedMeals: { [key: string]: number };
  getFlightInfoBySegmentId: (
    segmentId: string,
  ) => { flightNumber: string; departure: string; arrival: string } | null;
  mealsBySegment?: { [segmentId: string]: any[] };
  isRoundTrip?: boolean;
  allFlights?: any[];
}

export default function MealSelectionComponent({
  travelerCount,
  availableSegments,
  currentSegmentIdForMeals,
  setCurrentSegmentIdForMeals,
  selectedTravelerForMeals,
  setSelectedTravelerForMeals,
  selectedMealsPerTravelerPerSegment,
  setSelectedMealsPerTravelerPerSegment,
  selectedMeals,
  getFlightInfoBySegmentId,
  mealsBySegment: mealsBySegmentProp,
  isRoundTrip: isRoundTripProp,
  allFlights: allFlightsProp,
}: MealSelectionComponentProps) {
  const [mealSelectionWarning, setMealSelectionWarning] = useState<string | null>(null);

  useEffect(() => {
    if (travelerCount > 0 && availableSegments.length > 0) {
      setSelectedMealsPerTravelerPerSegment((prev) => {
        const updated = JSON.parse(JSON.stringify(prev));

        for (let i = 0; i < travelerCount; i++) {
          if (!updated[i]) {
            updated[i] = {};
          }

          availableSegments.forEach((segmentId) => {
            if (!updated[i][segmentId]) {
              updated[i][segmentId] = {};
            }
          });
        }

        return updated;
      });
    }
  }, [travelerCount, availableSegments, setSelectedMealsPerTravelerPerSegment]);

  const updateMealCount = (
    mealId: string,
    increment: boolean,
    segmentId: string,
    travelerIndex: number,
    airlineCode?: string,
  ) => {
    setSelectedMealsPerTravelerPerSegment((prev) => {
      const newSelections = JSON.parse(JSON.stringify(prev));

      if (!newSelections[travelerIndex]) newSelections[travelerIndex] = {};
      if (!newSelections[travelerIndex][segmentId]) {
        newSelections[travelerIndex][segmentId] = {};
      }

      const currentCount = newSelections[travelerIndex][segmentId][mealId] || 0;
      const hasAnySelection = Object.values(newSelections[travelerIndex][segmentId] || {}).some(
        (count: any) => count > 0,
      );

      if (increment) {
        if (hasAnySelection && currentCount === 0) {
          setMealSelectionWarning(
            `Traveler ${travelerIndex + 1} can only select one meal per flight segment. Please remove the current selection first.`,
          );
          setTimeout(() => setMealSelectionWarning(null), 3000);
          return prev;
        }

        setMealSelectionWarning(null);
        newSelections[travelerIndex][segmentId][mealId] = 1;
        if (airlineCode) {
          storeMealCodeMapping(mealId, airlineCode);
        }
      } else {
        setMealSelectionWarning(null);
        delete newSelections[travelerIndex][segmentId][mealId];
        removeMealCodeMapping(mealId);

        if (Object.keys(newSelections[travelerIndex][segmentId]).length === 0) {
          delete newSelections[travelerIndex][segmentId];
        }
      }

      return newSelections;
    });
  };

  const allFlights =
    allFlightsProp ||
    JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}')?.data?.flights ||
    [];
  const isRoundTrip =
    isRoundTripProp !== undefined
      ? isRoundTripProp
      : allFlights.length === 2 &&
        allFlights[0]?.departure?.airportCode === allFlights[1]?.arrival?.airportCode &&
        allFlights[0]?.arrival?.airportCode === allFlights[1]?.departure?.airportCode;

  let currentSegmentMealOptions: any[] = [];
  let isMealAvailableFromAPI = false;

  if (mealsBySegmentProp && mealsBySegmentProp[currentSegmentIdForMeals]) {
    currentSegmentMealOptions = mealsBySegmentProp[currentSegmentIdForMeals];
    isMealAvailableFromAPI = currentSegmentMealOptions.length > 0;
  }

  if (!isMealAvailableFromAPI) {
    const mealsBySegment = JSON.parse(sessionStorage.getItem('mealsBySegment') || '{}');
    currentSegmentMealOptions = mealsBySegment[currentSegmentIdForMeals] || [];
    isMealAvailableFromAPI = currentSegmentMealOptions.length > 0;
  }

  if (!isMealAvailableFromAPI) {
    currentSegmentMealOptions = extractMealsFromSegment(currentSegmentIdForMeals);
    isMealAvailableFromAPI = currentSegmentMealOptions.length > 0;
  }

  if (!isMealAvailableFromAPI) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <img src="/logo/fast-food.png" alt="Meal" className="w-8 h-8 object-contain" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Meals Not Available for Pre-booking
        </h3>
        <p className="text-gray-600 mb-4">
          Meal pre-selection is not available for this flight segment. You can purchase meals
          onboard or at the airport.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block mx-auto">
          <p className="text-sm text-amber-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Meal service may be available during the flight</span>
          </p>
        </div>
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
          {/* <span className="font-medium">Tripjack Meal Policy:</span> */}
          {isRoundTrip && (
            <span>You can select different meals for onward and return journeys.</span>
          )}
          {!isRoundTrip && availableSegments.length > 1 && (
            <span>Each flight segment can have independent meal selection.</span>
          )}
          {!isRoundTrip && availableSegments.length === 1 && (
            <span>Select your preferred meal for the flight.</span>
          )}
        </p>
      </div>

      {/* Segment Selector for Meals */}
      {availableSegments.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Flight Segment
            {isRoundTrip && <span className="text-xs text-gray-500 ml-2">(Onward / Return)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSegments.map((segmentId, index) => {
              const flightInfo = getFlightInfoBySegmentId(segmentId);
              const isOnward = index === 0;
              const isReturn = isRoundTrip && index === 1;
              return (
                <button
                  key={segmentId}
                  onClick={() => setCurrentSegmentIdForMeals(segmentId)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    currentSegmentIdForMeals === segmentId
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {flightInfo?.flightNumber || `Segment ${index + 1}`}
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

      {mealSelectionWarning && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {mealSelectionWarning}
        </div>
      )}

      {/* Traveler Tabs */}
      {travelerCount > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {Array.from({ length: travelerCount }, (_, i) => {
            const travelerTotal = Object.values(selectedMealsPerTravelerPerSegment[i] || {}).reduce(
              (sum, segmentSelections) =>
                sum + Object.values(segmentSelections).reduce((s, count) => s + count, 0),
              0,
            );
            return (
              <button
                key={i}
                onClick={() => setSelectedTravelerForMeals(i)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                  selectedTravelerForMeals === i
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Traveler {i + 1}
                {travelerTotal > 0 && (
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                      selectedTravelerForMeals === i
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {travelerTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Flight info for current segment */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Segment</p>
            <p className="font-semibold text-gray-900">
              {getFlightInfoBySegmentId(currentSegmentIdForMeals)?.flightNumber || 'Flight'}
            </p>
            <p className="text-xs text-gray-500">
              {getFlightInfoBySegmentId(currentSegmentIdForMeals)?.departure} →{' '}
              {getFlightInfoBySegmentId(currentSegmentIdForMeals)?.arrival}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Traveler {selectedTravelerForMeals + 1}</p>
            <p className="text-lg font-bold text-blue-600">
              {Object.values(
                selectedMealsPerTravelerPerSegment[selectedTravelerForMeals]?.[
                  currentSegmentIdForMeals
                ] || {},
              ).reduce((sum, count) => sum + count, 0)}
            </p>
            <p className="text-xs text-gray-500">/ 1 item max</p>
          </div>
        </div>
      </div>

      {/* SINGLE CONTAINER FOR ALL MEAL OPTIONS */}
      <div className="bg-blue-50 border border-gray-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-200">
          {currentSegmentMealOptions.map((meal: any, index: number) => {
            const mealId = `meal_${currentSegmentIdForMeals}_${index}`;
            const airlineCode = meal.code || meal.AirlineCode;
            const quantity =
              (currentSegmentIdForMeals &&
                selectedMealsPerTravelerPerSegment[selectedTravelerForMeals]?.[
                  currentSegmentIdForMeals
                ]?.[mealId]) ||
              0;
            const pricePerItem = meal.price !== undefined ? meal.price : meal.amount || 0;
            const isSelected = quantity > 0;
            const isFree = pricePerItem === 0;
            const mealDescription =
              meal.description || meal.desc || meal.name || meal.Description || 'Meal';

            const handleAddMeal = () => {
              if (airlineCode) {
                storeMealCodeMapping(mealId, airlineCode);
              }
              updateMealCount(
                mealId,
                true,
                currentSegmentIdForMeals,
                selectedTravelerForMeals,
                airlineCode,
              );
            };

            const handleRemoveMeal = () => {
              removeMealCodeMapping(mealId);
              updateMealCount(
                mealId,
                false,
                currentSegmentIdForMeals,
                selectedTravelerForMeals,
                airlineCode,
              );
            };

            const hasMealSelected = currentSegmentIdForMeals
              ? Object.values(
                  selectedMealsPerTravelerPerSegment[selectedTravelerForMeals]?.[
                    currentSegmentIdForMeals
                  ] || {},
                ).reduce((sum, count) => sum + count, 0) >= 1
              : false;

            const displayPrice =
              isSelected && quantity > 0 ? pricePerItem * quantity : pricePerItem;

            return (
              <div
                key={mealId}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  isSelected ? 'bg-blue-100' : 'bg-transparent hover:bg-blue-100/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src="/logo/fast-food.png"
                    alt="Meal"
                    className={`w-5 h-5 object-contain ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                  />
                  <div>
                    <span className="font-medium text-gray-900">{mealDescription}</span>
                    <span className="ml-3 text-sm text-gray-600">
                      {isFree ? 'Free' : `INR ${displayPrice.toFixed(2)}`}
                    </span>
                    {airlineCode && (
                      <span className="ml-2 text-xs text-gray-400 font-mono">({airlineCode})</span>
                    )}
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
                      onClick={handleRemoveMeal}
                      className="px-4 py-2 rounded-lg flex items-center gap-1 bg-white text-red-500 hover:bg-red-50 transition-colors text-sm font-medium border border-gray-200 shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAddMeal}
                      disabled={hasMealSelected}
                      className={`px-4 py-2 rounded-lg flex items-center gap-1 transition-colors text-sm font-medium bg-white border border-gray-200 shadow-sm ${
                        hasMealSelected
                          ? 'text-gray-400 cursor-not-allowed opacity-60'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>ADD</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary for multiple travelers across segments */}
      {travelerCount > 1 && availableSegments.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
          <div className="space-y-2">
            {Array.from({ length: travelerCount }, (_, i) => {
              const totalItems = Object.values(selectedMealsPerTravelerPerSegment[i] || {}).reduce(
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
