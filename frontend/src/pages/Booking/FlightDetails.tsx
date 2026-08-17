import React from 'react';
import { Plane, Clock, Luggage } from 'lucide-react';

interface FlightDetailsProps {
  flight: {
    origin: string;
    destination: string;
    airline: string;
    flightNumber: string;
    cabinClass: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
    stops: number;
    departureDate: string;
    arrivalDate: string;
    duration: string;
  };
  baggage: {
    checkIn: string;
    cabin: string;
  };
}

export default function FlightDetails({ flight, baggage }: FlightDetailsProps) {
  return (
    <div className="bg-white shadow-lg overflow-hidden mt-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-800">Booking Confirmed</h2>
          </div>
        </div>
      </div>

      {/* Flight Info */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {flight.origin} To {flight.destination}
            </h3>
            <p className="text-sm text-gray-600">
              {flight.airline} - {flight.airline} {flight.flightNumber} {flight.cabinClass}
            </p>
          </div>
          <span className="text-sm text-gray-600">{flight.date}</span>
        </div>
      </div>

      {/* Flight Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 border-t">
        {/* Departure */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Departure</p>
            <p className="text-sm font-semibold">{flight.departureTime}</p>
            <p className="text-xs text-gray-500">{flight.departureDate}</p>
          </div>
        </div>

        {/* Stops */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Stops</p>
            <p className="text-sm font-semibold">
              {flight.stops === 0
                ? 'Non-stop'
                : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-gray-500">{flight.duration}</p>
          </div>
        </div>

        {/* Arrival */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Arrival</p>
            <p className="text-sm font-semibold">{flight.arrivalTime}</p>
            <p className="text-xs text-gray-500">{flight.arrivalDate}</p>
          </div>
        </div>

        {/* Baggage */}
        <div className="flex items-center gap-2">
          <Luggage className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Baggage</p>
            <p className="text-sm font-semibold">Adult</p>
            <p className="text-xs text-gray-500">Check in {baggage.checkIn}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
