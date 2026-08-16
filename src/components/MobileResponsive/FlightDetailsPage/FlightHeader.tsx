// components/MobileFlightHeader.tsx
import React from 'react';

interface FlightHeaderProps {
  fromCity?: string;
  toCity?: string;
  date?: string;
  departureTime?: string;
  departureDate?: string;
  arrivalTime?: string;
  arrivalDate?: string;
  baggage?: string;
  checkIn?: string;
  flightNumber?: string;
  airline?: string;
  cabin?: string;
  isRefundable?: boolean;
}

const MobileFlightHeader: React.FC<FlightHeaderProps> = ({
  fromCity = '',
  toCity = '',
  date = '',
  departureTime = '',
  departureDate = '',
  arrivalTime = '',
  arrivalDate = '',
  baggage = '',
  checkIn = '',
  flightNumber = '',
  airline = '',
  cabin = 'Economy',
  isRefundable = true,
}) => {
  return (
    <div>
      {/* Flight departs from... & Refundable Badge */}
      <div className="flex justify-between items-start mb-3">
        {isRefundable ? (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            REFUNDABLE
          </span>
        ) : (
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            NON-REFUNDABLE
          </span>
        )}
      </div>

      {/* Route & Flight Info */}
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-bold text-gray-800">
          {fromCity} To {toCity}
        </h2>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-800">{airline}</div>
          <div className="flex items-center justify-end space-x-2 text-xs text-gray-500 mt-0.5">
            <span>{flightNumber}</span>
            <span className="text-gray-400">•</span>
            <span>{cabin}</span>
          </div>
        </div>
      </div>

      {/* Date */}
      <p className="text-sm text-gray-500 mb-4">{date}</p>

      {/* Flight Times */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-gray-800">{departureTime}</span>
          </div>
          <div className="text-xs text-gray-400">{departureDate}</div>
        </div>
        <div className="text-gray-400 text-xl">→</div>
        <div className="text-right">
          <div className="flex items-baseline justify-end space-x-1">
            <span className="text-2xl font-bold text-gray-800">{arrivalTime}</span>
          </div>
          <div className="text-xs text-gray-400">{arrivalDate}</div>
        </div>
      </div>

      {/* Baggage & Check-in */}
      <div className="flex items-center space-x-8 pt-3 border-t border-gray-100">
        <div>
          <div className="text-xs text-gray-400 font-medium">BAGGAGE</div>
          <div className="text-sm font-semibold text-gray-700">{baggage}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium">CHECK-IN</div>
          <div className="text-sm font-semibold text-gray-700">{checkIn}</div>
        </div>
      </div>
    </div>
  );
};

export default MobileFlightHeader;
