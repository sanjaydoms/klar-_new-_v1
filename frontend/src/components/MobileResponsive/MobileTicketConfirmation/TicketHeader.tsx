// components/TicketHeader.tsx
import React from 'react';

interface TicketHeaderProps {
  bookingId?: string;
  passengerRef?: string;
  passengerName?: string;
}

const TicketHeader: React.FC<TicketHeaderProps> = ({
  bookingId = '84-2936-1237',
  passengerRef = 'HB-8919543',
  passengerName = 'Michael Chen',
}) => {
  return (
    <div className="block md:hidden lg:hidden bg-gradient-to-r from-green-100 via-emerald-50 to-green-100 rounded-xl border border-green-200 p-5 mb-4">
      {/* Ticket Confirmed! */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-green-700 mb-1">Ticket Confirmed!</div>
        <div className="text-sm text-gray-700">
          Booking Confirmed! Your flight reservation has been successfully completed.
        </div>
      </div>

      {/* Booking Details */}
      <div className="bg-white rounded-lg p-4 space-y-2 border border-green-200 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Booking ID:</span>
          <span className="text-gray-800 font-medium">{bookingId}</span>
        </div>
        {/* <div className="flex justify-between text-sm">
          <span className="text-gray-500">Passenger Ref:</span>
          <span className="text-gray-800 font-medium">{passengerRef}</span>
        </div> */}
      </div>
    </div>
  );
};

export default TicketHeader;
