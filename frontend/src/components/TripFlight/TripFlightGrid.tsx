import TripFlight from './TripFlight';

// ✅ Export the Flight interface
export interface Flight {
  id: string | number;
  destination: string;
  from?: string;
  fromCode?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  badge?: string;
}

interface TripFlightGridProps {
  flights: Flight[];
  title: string;
  subtitle?: string;
  onFlightClick?: (flight: Flight) => void;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  showFromSelector?: boolean;
  selectedFrom?: string;
  onFromChange?: (from: string) => void;
  fromOptions?: string[];
  fromType?: 'domestic' | 'international';
}

export default function TripFlightGrid({
  flights,
  title,
  subtitle = "Discover amazing destinations at unbeatable prices",
  onFlightClick,
  className = '',
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  showFromSelector = false,
  selectedFrom = '',
  onFromChange,
  fromOptions = [],
  fromType = 'domestic'
}: TripFlightGridProps) {
  // Generate grid classes based on columns prop
  const getGridClasses = () => {
    const classes = [];

    // Mobile
    if (columns.mobile === 1) classes.push('grid-cols-1');
    else if (columns.mobile === 2) classes.push('grid-cols-2');

    // Tablet (sm)
    if (columns.tablet === 2) classes.push('sm:grid-cols-2');
    else if (columns.tablet === 3) classes.push('sm:grid-cols-3');

    // Desktop (lg)
    if (columns.desktop === 3) classes.push('lg:grid-cols-3');
    else if (columns.desktop === 4) classes.push('lg:grid-cols-4');

    return classes.join(' ');
  };

  // Get emoji/icon based on trip type
  const getFromIcon = () => {
    return fromType === 'international' ? '🌍' : '🇮🇳';
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 ${className}`}>
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-14">
        <div className="flex justify-center mb-4 sm:mb-5">
          <img
            src="/logo/KLARBlue.png"
            alt="Flights Logo"
            className="h-12 sm:h-14 md:h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.location.href = '/'}
          />
        </div>
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-[#6C1717] mb-3 sm:mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* From Selector Dropdown - Only shown when showFromSelector is true */}
      {showFromSelector && fromOptions.length > 0 && (
        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6C1717]/10">
              <span className="text-lg">{getFromIcon()}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Departing From:
            </span>
          </div>
          
          <div className="w-full sm:w-64 md:w-80">
            <select
              value={selectedFrom}
              onChange={(e) => onFromChange?.(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#6C1717] focus:ring-2 focus:ring-[#6C1717]/20 transition-all duration-200 bg-white text-gray-700 font-medium outline-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {fromOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          
          {selectedFrom && selectedFrom !== 'All Airports' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Showing flights from {selectedFrom}
            </div>
          )}
        </div>
      )}

      {/* Flight Cards Grid */}
      <div className={`grid ${getGridClasses()} gap-4 sm:gap-5 md:gap-6`}>
        {flights.map((flight) => (
          <TripFlight
            key={flight.id}
            destination={flight.destination}
            from={flight.from}
            fromCode={flight.fromCode}
            price={flight.price}
            currency={flight.currency}
            imageUrl={flight.imageUrl}
            badge={flight.badge}
            onClick={() => onFlightClick?.(flight)}
          />
        ))}
      </div>

      {/* Empty State */}
      {flights.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✈️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No flights available</h3>
          <p className="text-gray-500">Try selecting a different departure city</p>
        </div>
      )}
    </div>
  );
}