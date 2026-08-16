import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SearchParams {
  tripType: string;
  from?: string;
  to?: string;
  departureDate?: string;
  returnDate?: string;
  travelers: string;
  class: string;
  fareType: string;
  travelerDetails?: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  segments?: Array<{
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    departureDate: string;
  }>;
}

interface RouteSelectionState {
  routeIndex: number;
  selectedFlight: any | null;
  selectedFareData: any | null;
  fareId: string | null;
  rulesAccepted: boolean;
  isComplete: boolean;
}

interface MultiCityHeaderProps {
  cities: Array<{ from: string; to: string; date: string }>;
  searchParams: SearchParams | null;
  routeStates?: RouteSelectionState[];
  onBack: () => void;
  onContinue?: () => void;
  allRoutesCompleted?: boolean;
  isContinuing?: boolean;
}

const MultiCityHeader: React.FC<MultiCityHeaderProps> = ({
  cities,
  searchParams,
  routeStates = [],
  onBack,
  onContinue,
  allRoutesCompleted = false,
  isContinuing = false,
}) => {
  const getTravellerDisplay = () => {
    if (!searchParams?.travelerDetails) return '1 Adult';
    const { adults, children, infants } = searchParams.travelerDetails;
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
    return parts.join(' • ') || '1 Adult';
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

  const completedCount = routeStates.filter((r) => r.isComplete).length;
  const totalRoutes = routeStates.length || cities.length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
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

          <div className="flex items-center space-x-1">
            <span
              className="font-bold tracking-normal text-xl sm:text-2xl"
              style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 700,
                color: '#060E49',
              }}
            >
              {cities[0]?.from || 'From'}
            </span>
            <span className="font-bold text-xl sm:text-2xl text-primary">→</span>
            <span
              className="font-bold tracking-normal text-xl sm:text-2xl"
              style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 700,
                color: '#060E49',
              }}
            >
              {cities[cities.length - 1]?.to || 'To'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">{searchParams?.class || 'Economy'}</div>
          <div className="text-xs text-gray-500">{getTravellerDisplay()}</div>
        </div>
      </div>

      {routeStates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Route Progress</span>
            <span className="text-xs font-medium text-gray-700">
              {completedCount} of {totalRoutes} complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalRoutes) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {cities.map((city, index) => (
            <React.Fragment key={index}>
              <span className="font-medium text-gray-700">
                {city.from} → {city.to}
              </span>
              <span className="text-gray-400">{formatDate(city.date)}</span>
              {routeStates[index]?.isComplete && <span className="text-green-500">✓</span>}
              {index < cities.length - 1 && <span className="text-gray-300">•</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {allRoutesCompleted && onContinue && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={onContinue}
            disabled={isContinuing}
            className="w-full flex items-center justify-center bg-primary hover:bg-primary/85 disabled:bg-gray-400 text-white py-3 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            {isContinuing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Loading...
              </>
            ) : (
              <>
                <span>Continue</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiCityHeader;
