import { Calendar, Clock, Briefcase, Users } from 'lucide-react';

interface FlightDetailsProps {
  flights: Array<{
    from: string;
    to: string;
    airline: string;
    flightNo: string;
    class: string;
    date: string;
    departure: string;
    departureDate: string;
    arrival: string;
    arrivalDate: string;
    baggage: string;
    adult: string;
    airlineCode?: string;
    segmentNumber?: number;
    totalSegments?: number;
    tripNumber?: number;
  }>;
}

export default function FlightDetails({ flights }: FlightDetailsProps) {
  // Get airline initials for fallback
  const getAirlineInitials = (name: string) => {
    if (!name) return 'NA';
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Group flights by trip
  const groupedFlights = flights.reduce(
    (acc, flight) => {
      const tripKey = flight.tripNumber || 1;
      if (!acc[tripKey]) {
        acc[tripKey] = [];
      }
      acc[tripKey].push(flight);
      return acc;
    },
    {} as Record<number, typeof flights>,
  );

  return (
    <div className="border-b border-gray-200 pb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Booking Confirmed</h2>

      {Object.entries(groupedFlights).map(([tripKey, tripFlights]) => {
        const tripIndex = parseInt(tripKey);
        const isMultiTrip = Object.keys(groupedFlights).length > 1;

        return (
          <div key={tripKey} className="mb-4 last:mb-0">
            {/* Trip Header for Multi-trip */}
            {isMultiTrip && (
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {tripIndex === 1 ? '✈️ Outbound' : '🔄 Return'} Trip
              </div>
            )}

            {tripFlights.map((flight, index) => (
              <div
                key={index}
                className={`bg-purple-50 rounded-xl p-4 ${index < tripFlights.length - 1 ? 'mb-3' : ''}`}
              >
                {/* Segment Label */}
                {tripFlights.length > 1 && (
                  <div className="text-xs font-semibold text-blue-600 mb-2">
                    Segment {flight.segmentNumber || index + 1} of{' '}
                    {flight.totalSegments || tripFlights.length}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  {/* Airline Logo */}
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white rounded-full shadow-sm overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-700">
                        {getAirlineInitials(flight.airline)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {flight.from} To {flight.to}
                    </h3>
                    <p className="text-sm text-gray-500">{flight.airline}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="bg-white px-3 py-1 rounded-full">{flight.airline}</span>
                  <span className="bg-white px-3 py-1 rounded-full">{flight.flightNo}</span>
                  <span className="bg-white px-3 py-1 rounded-full">{flight.class}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-800">{flight.date}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Departure</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">{flight.departure}</p>
                    <p className="text-sm text-gray-500">{flight.departureDate}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Arrival</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">{flight.arrival}</p>
                    <p className="text-sm text-gray-500">{flight.arrivalDate}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Baggage: {flight.baggage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{flight.adult}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
