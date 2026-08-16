import React from 'react';
import BaggageLogo from '/logo/Baggage.png?url';
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

interface ExtraBaggageProps {
  baggageOptions?: SSRItem[];
  selectedBaggage?: {
    [passengerKey: string]: {
      [segmentId: string]: SelectedItem | null
    }
  };
  segmentBaggageOptions?: { [segmentId: string]: SSRItem[] };
  onSegmentChange?: (index: number) => void;
  currentSegmentId?: string;
  onSelect?: (
    passengerKey: string,
    baggageCode: string,
    segmentId: string,
    price: number,
    description: string,
  ) => void;
  passengerKeys?: string[];
  activePassenger?: number;
  setActivePassenger?: (index: number) => void;
  isPassengerComplete?: (index: number) => boolean;
  segmentIds?: string[];
  journeySegments?: { [journeyId: string]: string[] };
}

const MobileExtraBaggage: React.FC<ExtraBaggageProps> = ({
  baggageOptions = [],
  selectedBaggage = {},
  segmentBaggageOptions = {},
  onSegmentChange,
  onSelect,
  passengerKeys = [],
  activePassenger = 0,
  setActivePassenger,
  isPassengerComplete,
  segmentIds = [],
  currentSegmentId = segmentIds[0] || '',
  journeySegments = {},
}) => {
  // FIX: Don't fallback to generic baggageOptions
  const currentBaggageOptions = segmentBaggageOptions[currentSegmentId] || [];
  const currentPassenger = passengerKeys[activePassenger] || 'P1';

  // Get the current passenger's baggage for ALL segments
  const passengerBaggage = selectedBaggage[currentPassenger] || {};

  // Get the selection for the CURRENT segment only
  const currentSelection = passengerBaggage[currentSegmentId] || null;

  // --- HELPER FUNCTIONS FOR CONNECTING FLIGHTS ---
  const getJourneyForSegment = (segmentId: string): string | null => {
    for (const [journeyId, segments] of Object.entries(journeySegments)) {
      if (segments.includes(segmentId)) {
        return journeyId;
      }
    }
    return null;
  };

  const isFirstSegmentOfJourney = (segmentId: string): boolean => {
    const journeyId = getJourneyForSegment(segmentId);
    if (!journeyId) return true;
    const segments = journeySegments[journeyId] || [];
    return segments.length > 0 && segments[0] === segmentId;
  };

  const isConnectingSegment = (segmentId: string): boolean => {
    const journeyId = getJourneyForSegment(segmentId);
    if (!journeyId) return false;
    const segments = journeySegments[journeyId] || [];
    return segments.length > 1;
  };

  const getFirstSegmentOfJourney = (segmentId: string): string | null => {
    const journeyId = getJourneyForSegment(segmentId);
    if (!journeyId) return null;
    const segments = journeySegments[journeyId] || [];
    return segments.length > 0 ? segments[0] : null;
  };

  // Get only the segments that actually need baggage selection
  const getRequiredSegments = (): string[] => {
    const required: string[] = [];
    const processedJourneys = new Set<string>();
    
    for (const segId of segmentIds) {
      const journeyId = getJourneyForSegment(segId);
      
      if (journeyId) {
        // For connecting flights, only add the first segment
        if (!processedJourneys.has(journeyId)) {
          const segments = journeySegments[journeyId] || [];
          const firstSeg = segments[0];
          // Only count if first segment has baggage options
          const firstSegOptions = segmentBaggageOptions[firstSeg] || [];
          if (firstSegOptions.some(opt => opt.amount > 0)) {
            required.push(firstSeg);
          }
          processedJourneys.add(journeyId);
        }
      } else {
        // For standalone segments, check if they have baggage
        const segOptions = segmentBaggageOptions[segId] || [];
        if (segOptions.some(opt => opt.amount > 0)) {
          required.push(segId);
        }
      }
    }
    return required;
  };
  // --- END HELPER FUNCTIONS ---

  const handleAddClick = (
    e: React.MouseEvent,
    baggageCode: string,
    price: number,
    description: string,
  ) => {
    e.stopPropagation();
    onSelect?.(currentPassenger, baggageCode, currentSegmentId, price, description);

    const nextIndex = activePassenger + 1;
    if (nextIndex < passengerKeys.length) {
      setActivePassenger?.(nextIndex);
    }
  };

  // FIX: Calculate only required segments
  const requiredSegments = getRequiredSegments();
  const totalRequired = passengerKeys.length * requiredSegments.length;
  
  // FIX: Count only required selections
  const totalSelections = Object.values(selectedBaggage).reduce((count, passengerBaggage) => {
    return count + Object.entries(passengerBaggage)
      .filter(([segId, value]) => value !== null && requiredSegments.includes(segId))
      .length;
  }, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">Extra Baggage</h3>
        <span className="text-sm text-gray-500">
          {totalSelections}/{totalRequired} selected
        </span>
      </div>

      {/* Segment tabs - Always visible */}
      {segmentIds.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Selecting for segment:</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {segmentIds.map((segId, index) => {
              const isActive = currentSegmentId === segId;
              const isFirst = isFirstSegmentOfJourney(segId);
              const isConnecting = isConnectingSegment(segId);
              
              // FIX: Only disable if it's a connecting segment that's NOT the first
              // Always allow clicking on segments to view them, even if no baggage
              const isDisabled = isConnecting && !isFirst;
              
              let label = `Segment ${index + 1}`;
              if (isConnecting && !isFirst) {
                const firstSegIndex = segmentIds.indexOf(getFirstSegmentOfJourney(segId) || '');
                label = `Segment ${index + 1} (via ${firstSegIndex + 1})`;
              }

              return (
                <button
                  key={segId}
                  onClick={(e) => {
                    e.stopPropagation();
                    // FIX: Always allow tab change unless it's a connecting segment (non-first)
                    if (!isDisabled) {
                      onSegmentChange?.(index);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white'
                      : isDisabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  disabled={isDisabled}
                >
                  {label}
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

          // Check if this passenger has selected for the CURRENT segment
          const passengerBaggageForCheck = selectedBaggage[key] || {};
          const isCompleteForCurrentSegment = passengerBaggageForCheck[currentSegmentId] !== null;

          // FIX: Check if this passenger has selected for ALL REQUIRED segments
          let isFullyComplete = true;
          for (const segId of requiredSegments) {
            if (!passengerBaggageForCheck[segId]) {
              isFullyComplete = false;
              break;
            }
          }

          const isCurrentSegmentRequired = requiredSegments.includes(currentSegmentId);

          return (
            <button
              key={key}
              onClick={() => setActivePassenger?.(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : isFullyComplete
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : isCompleteForCurrentSegment && isCurrentSegmentRequired
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {key}
              {isFullyComplete && <CheckCircle className="w-3 h-3" />}
              {isCompleteForCurrentSegment && !isFullyComplete && isCurrentSegmentRequired && (
                <span className="text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Passenger selection info - Always visible */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700">
          Selecting for: <span className="text-primary font-bold">{currentPassenger}</span>
        </p>
        {currentSelection && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Selected: {currentSelection.description || currentSelection.code}
          </p>
        )}
      </div>

      {/* FIX: Check if this is a connecting segment (not first) */}
      {isConnectingSegment(currentSegmentId) && !isFirstSegmentOfJourney(currentSegmentId) ? (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <p className="text-sm font-medium text-blue-700">
            Baggage carried over from Segment {segmentIds.indexOf(getFirstSegmentOfJourney(currentSegmentId) || '') + 1}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Your baggage selection from the first segment applies to all segments in this journey
          </p>
        </div>
      ) : (!currentBaggageOptions || currentBaggageOptions.length === 0 ||
        currentBaggageOptions.every((opt) => opt.amount === 0)) ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-700">
            No excess baggage available for this segment
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Standard baggage allowance included in fare
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentBaggageOptions
            .filter(option => option.amount > 0)
            .map((option) => {
              const isSelected = currentSelection && currentSelection.code === option.AirlineCode;
              const hasSelectionForCurrentSegment =
                currentSelection !== null && currentSelection.segmentId === currentSegmentId;
              const isDisabled = hasSelectionForCurrentSegment && !isSelected;

              return (
                <div
                  key={option.AirlineCode}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-blue-50'
                      : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-[#E7E2D9] bg-white hover:border-primary'
                  }`}
                >
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-lg flex-shrink-0"
                    style={{ background: '#ECBDBD' }}
                  >
                    <img src={BaggageLogo} alt="Baggage" className="w-7 h-7 object-contain" />
                  </div>

                  <div className="flex-1 px-4">
                    <span className="text-base font-semibold text-gray-800">
                      {option.Description}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold text-gray-800">INR {option.amount}</span>
                    <button
                      onClick={(e) => {
                        if (isSelected) {
                          e.stopPropagation();
                          onSelect?.(
                            currentPassenger,
                            option.AirlineCode,
                            currentSegmentId,
                            option.amount,
                            option.Description,
                          );
                        } else {
                          handleAddClick(e, option.AirlineCode, option.amount, option.Description);
                        }
                      }}
                      disabled={isDisabled}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        isSelected
                          ? 'border-[#ECBDBD] text-primary bg-white'
                          : isDisabled
                            ? 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                            : 'border-[#ECBDBD] text-primary bg-white hover:bg-[#ECBDBD] hover:text-white'
                      }`}
                    >
                      {isSelected ? 'REMOVE' : '+ ADD'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* FIX: Only show required selections in summary */}
      {selectedBaggage && Object.keys(selectedBaggage).length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-700 mb-2">Selected Baggage Summary:</p>
          {Object.entries(selectedBaggage).map(([passengerKey, passengerBaggage]) => {
            const selections = Object.entries(passengerBaggage)
              .filter(([segId, value]) => value !== null && requiredSegments.includes(segId));
            if (selections.length === 0) return null;

            return (
              <div key={passengerKey} className="mb-2">
                <div className="text-xs font-medium text-gray-700">{passengerKey}:</div>
                {selections.map(([segId, selection]) => {
                  const segIndex = segmentIds.indexOf(segId);
                  return (
                    <div key={segId} className="flex justify-between text-xs ml-2">
                      <span className="text-gray-600">Segment {segIndex + 1}:</span>
                      <span className="text-gray-800 font-medium">
                        {selection.description || selection.code} (INR {selection.price})
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileExtraBaggage;