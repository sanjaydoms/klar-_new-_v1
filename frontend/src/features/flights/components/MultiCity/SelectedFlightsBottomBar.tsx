import React, { useState, useEffect } from 'react';
import { Plane, CheckCircle, X } from 'lucide-react';
import { FlightOption, FlightSegment } from '../../types/types.multiCityFlight';
import { getReviewDetails } from '@/api/flightService.api';
import { notifyError } from '@/utils/notify';
import { storeReviewData } from '@/utils/reviewSession';

interface SelectedFlightsBottomBarProps {
  segments: FlightSegment[];
  selectedFlights: Map<number, FlightOption>;
  onBookNow: () => void;
  getFlightPrice: (flight: FlightOption) => number;
  currentSegment: number;
  onSegmentClick: (index: number) => void;
}

interface StoredFareData {
  fromLocation: { code: string; city: string };
  toLocation: { code: string; city: string };
  selectedFareId: string;
  fareType: string;
  totalFare: number;
  currency: string;
  flight?: FlightOption;
}

export default function SelectedFlightsBottomBar({
  segments,
  selectedFlights,
  onBookNow,
  getFlightPrice,
  currentSegment,
  onSegmentClick,
}: SelectedFlightsBottomBarProps) {
  const [storedSelections, setStoredSelections] = useState<StoredFareData[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  /**
   * Function to load stored selections from sessionStorage and filter for current segments
   */
  const loadStoredSelections = () => {
    const stored = sessionStorage.getItem('selectedMultiCityFares');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        const filteredSelections = parsed.filter((selection: StoredFareData) => {
          return segments.some((segment) => {
            const fromCode = extractCodeFromLocation(segment.from || '');
            const toCode = extractCodeFromLocation(segment.to || '');
            return (
              selection.fromLocation?.code === fromCode && selection.toLocation?.code === toCode
            );
          });
        });

        setStoredSelections(Array.isArray(filteredSelections) ? filteredSelections : []);
      } catch (error) {
        console.error('Error parsing stored fare data:', error);
        setStoredSelections([]);
      }
    } else {
      setStoredSelections([]);
    }
  };

  useEffect(() => {
    loadStoredSelections();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedMultiCityFares') {
        loadStoredSelections();
      }
    };

    const handleCustomStorage = () => {
      loadStoredSelections();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('selectedFaresUpdated', handleCustomStorage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('selectedFaresUpdated', handleCustomStorage);
    };
  }, [segments]);

  useEffect(() => {
    loadStoredSelections();
  }, [selectedFlights, segments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const extractCodeFromLocation = (locationString: string): string => {
    if (!locationString) return '';
    const match = locationString.match(/\(([^)]+)\)/);
    return match && match[1] ? match[1] : locationString;
  };

  const hasStoredSelection = (segment: FlightSegment, _index: number): boolean => {
    const fromCode = extractCodeFromLocation(segment.from || '');
    const toCode = extractCodeFromLocation(segment.to || '');

    return storedSelections.some(
      (selection) =>
        selection.fromLocation?.code === fromCode && selection.toLocation?.code === toCode,
    );
  };

  const isFullySelected = (segment: FlightSegment, index: number): boolean => {
    const flight = selectedFlights.get(index);
    if (!flight) return false;

    const fromCode = extractCodeFromLocation(segment.from || '');
    const toCode = extractCodeFromLocation(segment.to || '');

    return storedSelections.some(
      (selection) =>
        selection.fromLocation?.code === fromCode &&
        selection.toLocation?.code === toCode &&
        selection.selectedFareId === flight.id,
    );
  };

  const getStoredFareForSegment = (segment: FlightSegment): StoredFareData | undefined => {
    const fromCode = extractCodeFromLocation(segment.from || '');
    const toCode = extractCodeFromLocation(segment.to || '');

    return storedSelections.find(
      (selection) =>
        selection.fromLocation?.code === fromCode && selection.toLocation?.code === toCode,
    );
  };

  const isSegmentSelected = (index: number): boolean => {
    const flight = selectedFlights.get(index);
    if (flight) return true;

    const segment = segments[index];
    if (!segment) return false;

    return hasStoredSelection(segment, index);
  };

  const selectedCount = segments.reduce((count, _segment, index) => {
    return count + (isSegmentSelected(index) ? 1 : 0);
  }, 0);

  const totalSegments = segments.length;
  const allSelected = selectedCount === totalSegments;

  const handleBookNow = async () => {
    if (!allSelected) return;

    setIsBooking(true);
    setErrorBanner(null);

    try {
      // Collect all fare IDs from stored selections that match current segments
      const fareIds: string[] = [];

      // Only get fare IDs for current segments from stored selections
      segments.forEach((segment) => {
        const fromCode = extractCodeFromLocation(segment.from || '');
        const toCode = extractCodeFromLocation(segment.to || '');

        // Find matching stored selection for this segment
        const matchingSelection = storedSelections.find(
          (selection) =>
            selection.fromLocation?.code === fromCode && selection.toLocation?.code === toCode,
        );

        if (matchingSelection?.selectedFareId) {
          fareIds.push(matchingSelection.selectedFareId);
        } else {
          // Also check selectedFlights if no stored selection
          const flightForSegment = Array.from(selectedFlights.entries()).find(
            ([index]) =>
              index ===
              segments.findIndex(
                (s) =>
                  extractCodeFromLocation(s.from || '') === fromCode &&
                  extractCodeFromLocation(s.to || '') === toCode,
              ),
          );
          if (flightForSegment && flightForSegment[1].id) {
            fareIds.push(flightForSegment[1].id);
          }
        }
      });

      console.log('Collected fare IDs for current segments:', fareIds);
      console.log('Expected number of fare IDs:', segments.length);
      console.log('Actual fare IDs count:', fareIds.length);

      if (fareIds.length !== segments.length) {
        console.error(`Mismatch: Got ${fareIds.length} fare IDs but need ${segments.length}`);
        setErrorBanner(`Please ensure all ${segments.length} segments have selected flights.`);
        setIsBooking(false);
        return;
      }

      if (fareIds.length === 0) {
        console.error('No fare IDs found');
        setErrorBanner('No flight selections found to book. Please select flights.');
        setIsBooking(false);
        return;
      }

      console.log('Calling getReviewDetails with fareIds:', fareIds);

      // Call the new Review API
      const reviewResponse = await getReviewDetails({ priceIds: fareIds });
      if (reviewResponse.data.mappedData.status.success === false) {
        console.log('ERROR: Not get review data');
        notifyError('ERROR: Not get review data');
        return;
      }
      const bookingId = reviewResponse.data?.mappedData?.bookingId;
      const keysToCheck = ['bookingId', 'onewayReviewData', 'ancillarySessionId'];
      keysToCheck.forEach((key) => {
        if (sessionStorage.getItem(key)) {
          console.log(`Clearing existing ${key} from session storage`);
          sessionStorage.removeItem(key);
        }
      });
      sessionStorage.setItem('bookingId', bookingId);
      storeReviewData(reviewResponse);
      sessionStorage.setItem('ancillarySessionId', reviewResponse.data.sessionId);

      // Check if response is successful
      if (reviewResponse && reviewResponse.success === true) {
        // Store the response if successful
        sessionStorage.setItem('reviewDetailsResponse', JSON.stringify(reviewResponse));

        // Store selected fare IDs
        sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));

        // Store the selected flights data for the traveller info page
        const bookingData = {
          selectedFlights: Array.from(selectedFlights.entries()).map(([index, flight]) => ({
            segmentIndex: index,
            flight: flight,
            from: segments[index]?.from,
            to: segments[index]?.to,
            date: segments[index]?.date,
            fareId: flight.id,
          })),
          storedSelections: storedSelections,
          fareIds: fareIds,
          totalSegments: segments.length,
          segments: segments,
          totalPrice: calculateTotalPrice(),
          reviewDetails: reviewResponse.data,
        };

        sessionStorage.setItem('multiCityBookingData', JSON.stringify(bookingData));

        // Also store in the format expected by MultiCityFlight
        const selectedFlightData = {
          tripType: 'multicity',
          segments: segments,
          storedSelections: storedSelections,
          fareIds: fareIds,
          totalPrice: calculateTotalPrice(),
          reviewDetails: reviewResponse.data,
        };
        sessionStorage.setItem('selectedFlight', JSON.stringify(selectedFlightData));

        setIsBooking(false);
        onBookNow();
      } else {
        // API returned unsuccessful response - show error message and stay on page
        const errorMessage = reviewResponse?.message || 'Something went wrong, please try again.';
        setErrorBanner(errorMessage);
        setIsBooking(false);
        // Do NOT call onBookNow() - stay on current page
      }
    } catch (error: any) {
      console.error('Failed to get review details:', error);

      // Show error message based on error type
      let errorMessage = 'Something went wrong, please try again.';

      if (error.response?.status === 404) {
        errorMessage = 'Flight review service is temporarily unavailable. Please try again later.';
      } else if (error.response?.status === 400) {
        errorMessage =
          error.response?.data?.message || 'Invalid request. Please check your selections.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      setErrorBanner(errorMessage);
      setIsBooking(false);
      // Do NOT call onBookNow() here - stay on current page on failure
    }
  };

  const calculateTotalPrice = () => {
    let total = 0;

    selectedFlights.forEach((flight) => {
      total += getFlightPrice(flight);
    });

    segments.forEach((segment, index) => {
      if (!selectedFlights.get(index)) {
        const storedFare = getStoredFareForSegment(segment);
        if (storedFare) {
          total += storedFare.totalFare;
        }
      }
    });

    return total;
  };

  const displayTotalPrice = calculateTotalPrice();

  return (
    <div className="bg-white z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border cursor-pointer"
          >
            <CheckCircle
              className={`w-5 h-5 ${allSelected ? 'text-green-500' : 'text-blue-500'}`}
            />
            <span className="font-medium text-sm">
              {selectedCount} of {totalSegments} Selected
            </span>
            <span className="text-sm text-gray-500">
              • Total {formatCurrency(displayTotalPrice)}
            </span>
          </div>

          <button
            onClick={handleBookNow}
            disabled={!allSelected || isBooking}
            className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
              allSelected && !isBooking
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:scale-105 cursor-pointer'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isBooking ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying Prices...
              </>
            ) : (
              'Book Now'
            )}
          </button>
        </div>

        {/* Flight Segments Carousel */}
        <div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-hide">
          {segments.map((segment, index) => {
            const flight = selectedFlights.get(index);
            const storedFareData = getStoredFareForSegment(segment);
            const storedFare = storedFareData?.totalFare;
            const hasStored = !!storedFareData;
            const isCurrent = currentSegment === index;
            const fullySelected = isFullySelected(segment, index);

            return (
              <React.Fragment key={index}>
                <button
                  onClick={() => onSegmentClick?.(index)}
                  className={`flex-shrink-0 w-64 p-3 rounded-lg border transition-all duration-200 ease-in-out
                                        ${isCurrent ? 'border-blue-500 shadow-md bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                                        ${fullySelected ? 'border-green-500 bg-green-50' : ''}
                                        flex items-center justify-between gap-2`}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <span>{segment.from}</span>
                      <Plane className="w-3 h-3 text-gray-400" />
                      <span>{segment.to}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{segment.date}</div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    {flight ? (
                      <>
                        <div>
                          <div className="font-bold text-gray-900">
                            {formatCurrency(getFlightPrice(flight))}
                          </div>
                          <div className="text-xs text-green-600">Selected</div>
                        </div>
                        {fullySelected && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </>
                    ) : storedFare ? (
                      <>
                        <div>
                          <div className="font-bold text-gray-900">
                            {formatCurrency(storedFare)}
                          </div>
                          <div className="text-xs text-purple-600">Stored</div>
                        </div>
                        {hasStored && <CheckCircle className="w-5 h-5 text-purple-500" />}
                      </>
                    ) : isCurrent ? (
                      <div className="text-xs font-medium text-blue-600 animate-pulse">
                        Selecting...
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 whitespace-nowrap">Pending</div>
                    )}
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${(selectedCount / totalSegments) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
