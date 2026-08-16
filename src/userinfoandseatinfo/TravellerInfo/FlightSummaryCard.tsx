import React from 'react';

interface FlightDetails {
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  stops: string;
  basefare: number;
  taxes: number;
  insurance: number;
  baggage?: {
    cabin: string;
    checkin: string;
  };
}

interface FlightSummaryCardProps {
  flightDetails: FlightDetails;
}

export default function FlightSummaryCard({ flightDetails }: FlightSummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex sm:block items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#234977] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm sm:text-lg">
              {flightDetails.airline.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="sm:text-center sm:mt-2">
            <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[100px]">
              {flightDetails.airline}
            </div>
            <div className="text-xs text-gray-500">{flightDetails.flightNumber}</div>
            <div className="text-xs text-gray-500 hidden sm:block">Economy</div>
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-gray-900">
                {flightDetails.departureTime}
              </div>
              <div className="text-xs text-gray-600">{flightDetails.from}</div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                {flightDetails.departureDate}
              </div>
            </div>

            <div className="flex-1 mx-2 sm:mx-4">
              <div className="text-center text-[10px] sm:text-xs text-gray-500 mb-1">
                {flightDetails.duration}
              </div>
              <div className="w-full h-0.5 bg-gray-200 relative">
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></div>
                </div>
              </div>
              <div className="text-center text-[10px] sm:text-xs text-gray-500 mt-1">
                {flightDetails.stops}
              </div>
            </div>

            <div className="text-center">
              <div className="text-base sm:text-lg font-bold text-gray-900">
                {flightDetails.arrivalTime}
              </div>
              <div className="text-xs text-gray-600">{flightDetails.to}</div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                {flightDetails.arrivalDate}
              </div>
            </div>
          </div>

          {flightDetails.baggage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 sm:gap-4 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-xs text-gray-500">Cabin:</span>
                <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                  {flightDetails.baggage.cabin}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-xs text-gray-500">Check-in:</span>
                <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                  {flightDetails.baggage.checkin}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
