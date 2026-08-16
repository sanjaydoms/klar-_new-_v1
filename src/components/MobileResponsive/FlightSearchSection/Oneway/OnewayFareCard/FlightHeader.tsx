import React from 'react';

interface FlightHeaderProps {
  fromCity?: string;
  fromCode?: string;
  toCity?: string;
  toCode?: string;
  date?: string;
  departureTime?: string;
  departureDate?: string;
  arrivalTime?: string;
  arrivalDate?: string;
  baggage?: string;
  checkIn?: string;
  flightNumber?: string;
  airline?: string;
  airlineCode?: string;
  cabin?: string;
  stops?: string;
  stopCities?: string[];
  stopAirports?: string[];
  duration?: string;
  isRefundable?: boolean;
  departureTerminal?: string;
  arrivalTerminal?: string;
  segments?: any[];
  departureAirportName?: string;
  isMultiCity?: boolean;
  legCount?: number;
}

const FlightHeader: React.FC<FlightHeaderProps> = ({
  fromCity = '',
  fromCode = '',
  toCity = '',
  toCode = '',
  date = '',
  departureTime = '',
  departureDate = '',
  arrivalTime = '',
  arrivalDate = '',
  baggage = '',
  checkIn = '',
  flightNumber = '',
  airline = '',
  cabin = '',
  stops = '',
  stopCities = [],
  stopAirports = [],
  duration = '',
  isRefundable = false,
  departureTerminal = '',
  arrivalTerminal = '',
  segments = [],
  departureAirportName = '',
}) => {
  const [showSegments, setShowSegments] = React.useState(false);

  console.log('FlightHeader Raw Props Check:', { fromCity, toCity, fromCode, toCode });
  const formatTime = (time: string) => {
    if (!time) return { time: '', period: '' };
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return { time: '', period: '' };
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return { time: `${displayHours}:${minutes}`, period };
    } catch {
      return { time: '', period: '' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const suffix = getDaySuffix(day);
      return `${day}${suffix} ${month} ${year}`;
    } catch {
      return '';
    }
  };

  const getDaySuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const formatDuration = (durationStr: string) => {
    if (!durationStr) return '';
    const minutes = parseInt(durationStr);
    if (isNaN(minutes)) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const departureFormatted = formatTime(departureTime);
  const arrivalFormatted = formatTime(arrivalTime);
  const formattedDepartureDate = formatDate(departureDate);
  const formattedArrivalDate = formatDate(arrivalDate);
  const displayDate = formatDateDisplay(date);
  const formattedDuration = formatDuration(duration);

  const getCabinDisplay = (cabin: string) => {
    const cabinMap: Record<string, string> = {
      ECONOMY: 'Economy',
      PREMIUM_ECONOMY: 'Premium Economy',
      BUSINESS: 'Business',
      FIRST: 'First Class',
    };
    return cabinMap[cabin] || cabin || 'Economy';
  };

  // const getStopsDisplay = (stops: string) => {
  //   if (!stops || stops === '0') return 'Non-stop';
  //   const count = parseInt(stops);
  //   if (count === 1) {
  //     const stopInfo = stopAirports && stopAirports.length > 0 ? ` (${stopAirports[0]})` : '';
  //     return `1 Stop${stopInfo}`;
  //   }
  //   const stopInfo = stopAirports && stopAirports.length > 0 ? ` (${stopAirports.join(', ')})` : '';
  //   return `${count} Stops${stopInfo}`;
  // };


  // const getStopsDisplay = (stops: string) => {
  //   if (!stops || stops === '0') return 'Non-stop';
  //   const count = parseInt(stops);
    
  //   // 🟢 Dynamic adjustment based on showSegments state
  //   if (count === 1) {
  //     const stopInfo = stopAirports && stopAirports.length > 0 && showSegments ? ` (${stopAirports[0]})` : '';
  //     return `1 Stop${stopInfo}`;
  //   }
    
  //   const stopInfo = stopAirports && stopAirports.length > 0 && showSegments ? ` (${stopAirports.join(', ')})` : '';
  //   return `${count} Stops${stopInfo}`;
  // };



  // const getStopsDisplay = (stops: string) => {
  //   if (!stops || stops === '0') return 'Non-stop';
  //   const count = parseInt(stops);

  //   // Case A: If stops are 2 or fewer, ALWAYS display the full city names inline in red
  //   if (count <= 2) {
  //     const stopInfo = stopAirports && stopAirports.length > 0 ? ` (${stopAirports.join(', ')})` : '';
  //     return `${count} ${count === 1 ? 'Stop' : 'Stops'}${stopInfo}`;
  //   }
    
  //   // Case B: If stops are greater than 2, follow the toggle behavior (hide city names by default)
  //   const stopInfo = stopAirports && stopAirports.length > 0 && showSegments ? ` (${stopAirports.join(', ')})` : '';
  //   return `${count} Stops${stopInfo}`;
  // };











// const getStopsDisplay = (stopsStr: string) => {
//     if (!stopsStr || stopsStr === '0') return 'Non-stop';
//     const totalStopsCount = parseInt(stopsStr);

//     // 🟢 Fix: Check the actual total number of stops for the entire flight record
//     // If the entire trip has more than 2 stops overall, NEVER print the layout names in red
//     if (totalStopsCount > 2) {
//       return `${totalStopsCount} Stops`;
//     }
    
//     // Standard Behavior for 1 or 2 stops total: print them inline neatly
//     const stopInfo = stopAirports && stopAirports.length > 0 ? ` (${stopAirports.join(', ')})` : '';
//     return `${totalStopsCount} ${totalStopsCount === 1 ? 'Stop' : 'Stops'}${stopInfo}`;
//   };




const getStopsDisplay = (stopsStr: string) => {
    if (!stopsStr || stopsStr === '0') return 'Non-stop';
    const totalStopsCount = parseInt(stopsStr);

    // If the entire trip has more than 2 stops overall, display plain summary
    if (totalStopsCount > 2) {
      return `${totalStopsCount} Stops`;
    }
    
    // 🟢 Fix: Use stopCities instead of stopAirports for clean city names (e.g., "1 Stop (Mumbai)")
    const stopInfo = stopCities && stopCities.length > 0 ? ` (${stopCities.join(', ')})` : '';
    return `${totalStopsCount} ${totalStopsCount === 1 ? 'Stop' : 'Stops'}${stopInfo}`;
  };






  return (
    <div
      className="block md:hidden lg:hidden bg-white rounded-lg p-3 sm:p-5 mb-3 sm:mb-4"
      style={{ border: '1px solid #1D1B16' }}
    >
      <div
        className="flex justify-between items-start p-2 sm:p-3 rounded-t-lg -mx-3 sm:-mx-5 -mt-3 sm:-mt-5 mb-2 sm:mb-3"
        style={{
          background:
            'linear-gradient(90deg, rgba(219, 122, 123, 0.5) 0%, rgba(213, 127, 129, 0.5) 100%)',
          borderBottom: '1px solid #1D1B16',
        }}
      >
        <div className="text-xs sm:text-sm font-semibold text-gray-800">
          Flights depart from {departureAirportName}{' '}
          {departureTerminal ? `(${departureTerminal})` : ''}
        </div>
        {isRefundable ? (
          <span className="text-[10px] sm:text-xs font-bold bg-green-100 text-green-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
            REFUNDABLE
          </span>
        ) : (
          <span className="text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
            NON-REFUNDABLE
          </span>
        )}
      </div>

      <div className="flex justify-between items-start mb-1 sm:mb-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {fromCity} → {toCity}
          </h2>
          <p className="text-xs font-medium text-gray-600 mt-0.5">
            {fromCode} to {toCode}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-bold text-gray-800">{airline}</div>
          <div className="flex items-center justify-end space-x-1 sm:space-x-2 text-[10px] sm:text-xs font-medium text-gray-600 mt-0.5">
            <span>{flightNumber}</span>
            <span className="text-gray-400">•</span>
            <span>{getCabinDisplay(cabin)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 mb-3 sm:mb-4">
        {displayDate}
      </p>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline space-x-0.5 sm:space-x-1">
            <span className="text-xl sm:text-2xl font-bold text-gray-800">
              {departureFormatted.time}
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-700">
              {departureFormatted.period}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs font-medium text-gray-500">
            {formattedDepartureDate}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-gray-600">{fromCode}</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-[10px] sm:text-xs font-bold text-gray-700 mb-1">
            {formattedDuration}
          </div>
          <div className="relative w-20 sm:w-32">
            <div className="border-t border-gray-300 absolute top-1/2 left-0 right-0 -translate-y-1/2"></div>
            <div className="relative flex justify-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
            </div>
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-red-600 mt-1">
            {getStopsDisplay(stops)}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end space-x-0.5 sm:space-x-1">
            <span className="text-xl sm:text-2xl font-bold text-gray-800">
              {arrivalFormatted.time}
            </span>
            <span className="text-xs sm:text-sm font-bold text-gray-700">
              {arrivalFormatted.period}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs font-medium text-gray-500">
            {formattedArrivalDate}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-gray-600">{toCode}</div>
        </div>
      </div>

      {/* {segments && segments.length > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] sm:text-xs font-medium text-gray-600">
            {segments.map((seg: any, index: number) => {
              console.log(`Segment [${index}] Details:`, seg);
              return(
              <div key={index} className="flex justify-between items-center py-1">
                <span className="font-medium text-gray-700">
                  {seg.DepartureAirport?.city} → {seg.ArrivalAirport?.city}
                </span>
                <span className="font-medium text-gray-500">
                  {formatDuration(String(seg.Duration))}
                </span>
              </div>
              )
})}
          </div>
        </div>
      )} */}


        {/* {segments && segments.length > 1 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Flight Route Details
            </span>
            <button
              onClick={() => setShowSegments(!showSegments)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
            >
              {showSegments ? 'Show Less ↑' : 'Show More ↓'}
            </button>
          </div>

          {showSegments && (
            <div className="text-[10px] sm:text-xs font-medium text-gray-600 space-y-1 transition-all duration-300">
              {segments.map((seg: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-1 border-b border-gray-50/50 last:border-0">
                  <span className="font-medium text-gray-700">
                    {seg.DepartureAirport?.city || 'N/A'} → {seg.ArrivalAirport?.city || 'N/A'}
                  </span>
                  <span className="font-medium text-gray-500 font-mono">
                    {formatDuration(String(seg.Duration))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )} */}




      {/* Only show the collapsible bottom breakdown drawer if there are MORE than 2 stops */}
      {segments && segments.length > 3 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Flight Route Details
            </span>
            <button
              onClick={() => setShowSegments(!showSegments)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
            >
              {showSegments ? 'Show Less ↑' : 'Show More ↓'}
            </button>
          </div>

          {showSegments && (
            <div className="text-[10px] sm:text-xs font-medium text-gray-600 space-y-1 transition-all duration-300">
              {segments.map((seg: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-1 border-b border-gray-50/50 last:border-0">
                  <span className="font-medium text-gray-700">
                    {seg.DepartureAirport?.city || 'N/A'} → {seg.ArrivalAirport?.city || 'N/A'}
                  </span>
                  <span className="font-medium text-gray-500 font-mono">
                    {formatDuration(String(seg.Duration))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      <div className="flex justify-between items-center mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
        <div>
          <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
            BAGGAGE
          </div>
          <div className="text-xs sm:text-sm font-bold text-gray-700">{baggage || '7 Kg'}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
            CHECK-IN
          </div>
          <div className="text-xs sm:text-sm font-bold text-gray-700">
            {checkIn || '15 Kg (01 Piece only)'}
          </div>
        </div>
      </div>

      {arrivalTerminal && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] sm:text-xs font-medium text-gray-600">
          Arrival Terminal: {arrivalTerminal}
        </div>
      )}
    </div>
  );
};

export default FlightHeader;
