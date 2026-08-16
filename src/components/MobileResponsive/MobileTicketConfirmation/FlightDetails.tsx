// components/FlightDetails.tsx
import React from 'react';

interface FlightDetailsProps {
  bookingId?: string;
  flights?: any[]; // Array of flight segments
}

const FlightDetails: React.FC<FlightDetailsProps> = ({
  bookingId = '',
  flights = [],
}) => {
  // Determine trip type based on number of flights
  const getTripType = () => {
    if (flights.length === 1) return 'One Way';
    if (flights.length === 2) return 'Round Trip';
    if (flights.length > 2) return 'Multi City';
    return 'Flight Details';
  };

  const tripType = getTripType();
  const isRoundTrip = flights.length === 2;

  // Format duration from minutes to hours and minutes
  const formatDuration = (duration: string) => {
    if (!duration || duration === 'N/A') return 'N/A';
    const minutes = parseInt(duration);
    if (isNaN(minutes)) return duration;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // If no flights, show nothing
  if (!flights || flights.length === 0) {
    return null;
  }

  return (
    <div className="block md:hidden lg:hidden bg-white rounded-xl border border-[#E7E2D9] p-5 mb-4">
      {/* Trip Type Title */}
      <div className="rounded-lg py-1.5 px-4 mb-4 inline-block" style={{ background: '#2563EB' }}>
        <h2 className="text-sm font-bold text-white">{tripType}</h2>
      </div>

      {/* Route Header with Booking ID */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
        <div>
          <span className="text-base font-bold text-gray-800">
            {flights[0]?.from || 'N/A'} → {flights[flights.length - 1]?.to || 'N/A'}
          </span>
          <span className="text-xs text-gray-500 ml-2">{flights[0]?.class || 'Economy'}</span>
        </div>
        <div
          className="rounded-lg px-3 py-1.5 flex items-center gap-2"
          style={{ background: '#DBEAFE', border: '1px solid #93C5FD' }}
        >
          <span className="text-[10px] font-medium text-gray-500">BOOKING ID</span>
          <span className="text-xs font-bold text-gray-800">{bookingId}</span>
        </div>
      </div>

      {/* Render each flight segment */}
      {flights.map((flight, index) => {
        const isLastFlight = index === flights.length - 1;
        const isReturnFlight = isRoundTrip && index === 1;
        
        // Determine flight label
        let flightLabel = '';
        if (flights.length === 1) {
          flightLabel = 'FLIGHT DETAILS';
        } else if (isReturnFlight) {
          flightLabel = 'RETURN FLIGHT';
        } else if (index === 0 && isRoundTrip) {
          flightLabel = 'OUTBOUND FLIGHT';
        } else {
          flightLabel = `FLIGHT ${index + 1}`;
        }

        return (
          <div key={index} className={!isLastFlight ? 'mb-4' : ''}>
            {/* Flight Label */}
            <h3 className="text-sm font-bold text-gray-700 mb-3">{flightLabel}</h3>

            {/* Departure & Arrival Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Departure Card */}
              <div className="rounded-lg p-3 border border-blue-100" style={{ background: '#DBEAFE' }}>
                <div className="text-xs text-gray-500 mb-1">Departure</div>
                <div className="text-base font-bold text-gray-800">{flight.departure || 'N/A'}</div>
                <div className="text-xs text-gray-500">{flight.departureDate || 'N/A'}</div>
                <div className="text-xs text-gray-500 truncate">
                  {flight.from || 'N/A'} - {flight.fromCity || flight.from || 'N/A'}
                </div>
              </div>

              {/* Arrival Card */}
              <div className="rounded-lg p-3 border border-blue-100" style={{ background: '#DBEAFE' }}>
                <div className="text-xs text-gray-500 mb-1">Arrival</div>
                <div className="text-base font-bold text-gray-800">{flight.arrival || 'N/A'}</div>
                <div className="text-xs text-gray-500">{flight.arrivalDate || 'N/A'}</div>
                <div className="text-xs text-gray-500 truncate">
                  {flight.to || 'N/A'} - {flight.toCity || flight.to || 'N/A'}
                </div>
              </div>
            </div>

            {/* Flight Details Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">{flight.airline || 'N/A'}</span>
              <span className="text-sm font-medium text-gray-700">{flight.flightNo || 'N/A'}</span>
              <span className="text-sm font-medium text-gray-700">
                {formatDuration(flight.duration || 'N/A')}
              </span>
            </div>

            {/* Divider between flights */}
            {!isLastFlight && <div className="border-t border-gray-200 my-4"></div>}
          </div>
        );
      })}
    </div>
  );
};

export default FlightDetails;