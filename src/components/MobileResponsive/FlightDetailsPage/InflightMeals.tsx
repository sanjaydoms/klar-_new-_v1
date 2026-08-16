import React from 'react';
import { CheckCircle } from 'lucide-react';

interface SSRItem {
  AirlineCode: string;
  amount: number;
  Description: string;
  iswca: boolean;
  isEmdResynced: boolean;
}

interface SelectedItem {
  segmentId: string;
  code: string;
  price: number;
  description?: string;
}

interface InflightMealsProps {
  mealOptions?: SSRItem[];

  segmentMealOptions?: { [segmentId: string]: SSRItem[] };
  selectedMeals?: { [passengerKey: string]: { [segmentId: string]: SelectedItem | null } };
  onSegmentChange?: (index: number) => void;
  currentSegmentId?: string;
  onSelect?: (
    passengerKey: string,
    mealCode: string,
    segmentId: string,
    price: number,
    description: string,
  ) => void;
  onViewMenu?: () => void;
  passengerKeys?: string[];
  activePassenger?: number;
  setActivePassenger?: (index: number) => void;
  isPassengerComplete?: (index: number) => boolean;
  price?: string;
  segmentIds?: string[];
}

const MobileInflightMeals: React.FC<InflightMealsProps> = ({
  mealOptions = [],
  selectedMeals = {},
  onSelect,
  onViewMenu,
  onSegmentChange,
  passengerKeys = [],
  segmentMealOptions = {},
  activePassenger = 0,
  setActivePassenger,
  isPassengerComplete,
  price = '',
  segmentIds = [],
  currentSegmentId = segmentIds[0] || '',
}) => {
  const currentPassenger = passengerKeys[activePassenger] || 'P1';
  const currentSelection = currentSegmentId
    ? (selectedMeals[currentPassenger]?.[currentSegmentId] || null)
    : null;
  // const currentSegmentId = segmentIds[0] || '';
  const currentMealOptions = segmentMealOptions[currentSegmentId] || mealOptions;

  const handleAddClick = (
    e: React.MouseEvent,
    mealCode: string,
    mealPrice: number,
    description: string,
  ) => {
    e.stopPropagation();
    onSelect?.(currentPassenger, mealCode, currentSegmentId, mealPrice, description);

    const nextIndex = activePassenger + 1;
    if (nextIndex < passengerKeys.length) {
      setActivePassenger?.(nextIndex);
    }
  };

  const handleViewMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewMenu?.();
  };

  const selectedCount = Object.values(selectedMeals).reduce((count, passengerMeals) => {
    return count + Object.values(passengerMeals || {}).filter(v => v !== null).length;
  }, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">In-flight Meals</h3>
        <span className="text-sm text-gray-500">
          {selectedCount}/{passengerKeys.length} selected
        </span>
      </div>

      {/* Segment tabs - Always visible */}
      {segmentIds.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Selecting for segment:</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {segmentIds.map((segId, index) => {
              const isActive = currentSegmentId === segId;
              return (
                <button
                  key={segId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSegmentChange?.(index);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Segment {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Passenger buttons - Always visible */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {passengerKeys.map((key, index) => {
          const isActive = activePassenger === index;
          const isComplete = isPassengerComplete?.(index) || false;

          return (
            <button
              key={key}
              onClick={() => setActivePassenger?.(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${isActive
                ? 'bg-primary text-white shadow-md'
                : isComplete
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {key}
              {isComplete && <CheckCircle className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Passenger selection info - Always visible */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700">
          Selecting for: <span className="text-primary font-bold">{currentPassenger}</span>
        </p>
        {(() => {
          const passengerMeals = selectedMeals[currentPassenger] || {};
          const hasSelection = Object.values(passengerMeals).some(v => v !== null);
          if (!hasSelection) return null;
          const selectedForCurrentSegment = passengerMeals[currentSegmentId];
          if (selectedForCurrentSegment) {
            return (
              <p className="text-xs text-green-600 mt-1">
                ✓ Selected for this segment: {selectedForCurrentSegment.description || selectedForCurrentSegment.code}
              </p>
            );
          }
          return (
            <p className="text-xs text-blue-600 mt-1">
              ✓ Has meal selected for other segment
            </p>
          );
        })()}
      </div>

      {/* Check if meal options exist */}
      {currentMealOptions.length === 0 ? (
        <div>
          {/* <p className="text-sm text-gray-600 mb-4">
            Gourmet meals and snacks prepared by our curated kitchen.
          </p> */}
          <p className="text-sm text-gray-500 text-center py-4">No meal options available</p>
        </div>
      ) : (
        <>
          {/* <p className="text-sm text-gray-600 mb-4">
            Gourmet meals and snacks prepared by our curated kitchen.
          </p> */}

          {onViewMenu && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-[#EF4444]">From {price}</span>
              <button
                onClick={handleViewMenuClick}
                className="bg-primary hover:bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View Menu
              </button>
            </div>
          )}

          <div className="space-y-3">
            {currentMealOptions.map((meal) => {
              const isSelected = currentSelection && currentSelection.code === meal.AirlineCode;
              const hasSelectionForCurrentSegment =
                currentSelection !== null && currentSelection.segmentId === currentSegmentId;
              const isDisabled = hasSelectionForCurrentSegment && !isSelected;

              return (
                <div
                  key={meal.AirlineCode}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isSelected
                    ? 'border-primary bg-blue-50'
                    : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : 'border-[#E7E2D9] bg-white hover:border-primary'
                    }`}
                >
                  <span className="text-base font-semibold text-gray-800">{meal.Description}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold text-gray-800">INR {meal.amount}</span>
                    <button
                      onClick={(e) => {
                        if (isSelected) {
                          e.stopPropagation();
                          onSelect?.(
                            currentPassenger,
                            meal.AirlineCode,
                            currentSegmentId,
                            meal.amount,
                            meal.Description,
                          );
                        } else {
                          handleAddClick(e, meal.AirlineCode, meal.amount, meal.Description);
                        }
                      }}
                      disabled={isDisabled}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isSelected
                        ? 'bg-primary text-white border border-[#ECBDBD]'
                        : isDisabled
                          ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
                          : 'border border-[#ECBDBD] text-primary bg-white hover:bg-[#ECBDBD] hover:text-white'
                        }`}
                    >
                      {isSelected ? 'REMOVE' : '+ ADD'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedMeals && Object.values(selectedMeals).some(passengerMeals =>
            Object.values(passengerMeals || {}).some(v => v !== null)
          ) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-700 mb-2">Selected Meals:</p>
                <div className="space-y-1">
                  {Object.entries(selectedMeals).map(([passengerKey, passengerMeals]) => {
                    const mealEntries = Object.entries(passengerMeals || {})
                      .filter(([_, value]) => value !== null);
                    if (mealEntries.length === 0) return null;
                    return mealEntries.map(([segmentId, meal]) => (
                      <div key={`${passengerKey}-${segmentId}`} className="flex justify-between text-xs">
                        <span className="text-gray-700">{passengerKey} (Seg {parseInt(segmentId.replace('SEG', '')) + 1}):</span>
                        <span className="text-gray-800 font-medium">
                          {meal?.description || meal?.code} (INR {meal?.price})
                        </span>
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default MobileInflightMeals;
