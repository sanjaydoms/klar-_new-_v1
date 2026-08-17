import React from 'react';
import {
  Flight,
  InternationalFlightPair,
  TripDetails,
  FlightType,
  SelectedFlight,
} from '@/types/returnMobileFlight.type';

interface TripHeaderProps {
  /** First onward flight — the header only reads its route. */
  firstOnwardFlight: Flight | null;
  internationalPairs: InternationalFlightPair[];
  flightType: FlightType;
  isEditing: boolean;
  tripDetails: TripDetails;
  selectedDeparture: SelectedFlight | null;
  selectedReturn: SelectedFlight | null;
  selectedInternational: InternationalFlightPair | null;
  isDomesticBothSelected: boolean;
  isInternationalSelected: boolean;
  isSubmitting?: boolean;
  onEditToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReturnDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTravellerChange: (type: 'adult' | 'child' | 'infant', value: number) => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const TripHeader: React.FC<TripHeaderProps> = ({
  firstOnwardFlight,
  internationalPairs,
  flightType,
  isEditing,
  tripDetails,
  selectedDeparture,
  selectedReturn,
  isDomesticBothSelected,
  isInternationalSelected,
  isSubmitting = false,
  onEditToggle,
  onCancel,
  onSave,
  onDateChange,
  onReturnDateChange,
  onTravellerChange,
  onClassChange,
  onBack,
  onContinue,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getTravellerDisplay = () => {
    const parts: string[] = [];
    tripDetails.travellers.forEach((t) => {
      if (t.count > 0) {
        parts.push(`${t.count} ${t.type}${t.count > 1 ? 's' : ''}`);
      }
    });
    return parts.join(' • ') || 'No travellers';
  };

  const getFirstFlight = () => {
    if (flightType === 'domestic') {
      return firstOnwardFlight;
    } else if (flightType === 'international' && internationalPairs.length > 0) {
      return internationalPairs[0]?.onward;
    }
    return null;
  };

  const firstFlight = getFirstFlight();
  const totalPrice =
    selectedDeparture && selectedReturn ? selectedDeparture.price + selectedReturn.price : 0;

  const showContinueButton =
    (flightType === 'domestic' && isDomesticBothSelected) ||
    (flightType === 'international' && isInternationalSelected);

  if (!firstFlight) {
    return (
      <div className="p-4 sm:p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-md"
              onClick={onBack}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <span className="text-gray-500 text-sm">No flights available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-md"
            onClick={onBack}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {firstFlight && firstFlight.from && firstFlight.to && (
            <>
              <span
                className="font-bold tracking-normal text-xl sm:text-3xl"
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 700,
                  color: '#060E49',
                  verticalAlign: 'middle',
                }}
              >
                {firstFlight.from.airportCode || 'N/A'}
              </span>
              <span
                className="font-bold text-xl sm:text-3xl"
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 700,
                  color: '#060E49',
                  verticalAlign: 'middle',
                }}
              >
                ←
              </span>
              <span
                className="font-bold tracking-normal text-xl sm:text-3xl"
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 700,
                  color: '#060E49',
                  verticalAlign: 'middle',
                }}
              >
                {firstFlight.to.airportCode || 'N/A'}
              </span>
            </>
          )}
        </div>

        {/* {isEditing ? (
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 font-medium text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={onEditToggle}
            className="text-gray-700 hover:text-gray-900 transition-colors"
            title="Edit trip details"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        )} */}
      </div>

      <div className="text-xs sm:text-sm text-gray-500 mt-2">
        {isEditing ? (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2 flex-wrap">
              <label className="text-[10px] sm:text-xs text-gray-600">Depart:</label>
              <input
                type="date"
                value={tripDetails.date}
                onChange={onDateChange}
                className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 w-28 sm:w-40 focus:outline-none focus:border-blue-500"
              />
              <label className="text-[10px] sm:text-xs text-gray-600 ml-1 sm:ml-2">Return:</label>
              <input
                type="date"
                value={tripDetails.returnDate}
                onChange={onReturnDateChange}
                className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 w-28 sm:w-40 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
              {tripDetails.travellers.map((traveller) => (
                <div key={traveller.type} className="flex items-center space-x-1">
                  <label className="text-[10px] sm:text-xs text-gray-600 capitalize">
                    {traveller.type}s:
                  </label>
                  <select
                    value={traveller.count}
                    onChange={(e) => onTravellerChange(traveller.type, Number(e.target.value))}
                    className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1 sm:px-2 py-0.5 sm:py-1 w-12 sm:w-16 focus:outline-none focus:border-blue-500"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <span className="text-gray-400">•</span>
              <select
                value={tripDetails.class}
                onChange={onClassChange}
                className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1 sm:px-2 py-0.5 sm:py-1 w-24 sm:w-32 focus:outline-none focus:border-blue-500"
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First Class">First Class</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs sm:text-sm">
              {formatDate(tripDetails.date)} → {formatDate(tripDetails.returnDate)} •{' '}
              {getTravellerDisplay()} • {tripDetails.class}
              {flightType === 'international' && (
                <span className="ml-2 text-[#EF4444] font-medium">• International</span>
              )}
              {flightType === 'domestic' && (
                <span className="ml-2 text-blue-600 font-medium">
                  {selectedDeparture && selectedReturn
                    ? '✓ Both segments selected'
                    : selectedDeparture || selectedReturn
                      ? '• 1/2 segments selected'
                      : '• Select flights'}
                </span>
              )}
            </span>

            {showContinueButton && (
              <div className="flex items-center gap-3">
                {flightType === 'domestic' && (
                  <div className="text-sm font-bold text-[#EF4444]">
                    Total: ₹{totalPrice.toLocaleString('en-IN')}
                  </div>
                )}
                <button
                  onClick={onContinue}
                  disabled={isSubmitting}
                  className={`bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
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
                      Processing...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripHeader;
