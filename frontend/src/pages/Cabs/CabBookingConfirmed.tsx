import React from 'react';

export const CabBookingConfirmed: React.FC = () => {
  return (
    <div className="cab-booking-confirmed container mx-auto p-4">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
        <h2 className="font-bold text-xl">Booking Confirmed!</h2>
        <p>Your cab booking has been successfully confirmed.</p>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
        {/* TODO: Display booking ID banner, route info (pickup -> drop), vehicle card, passenger details, fare summary */}
        <p>Booking ID: CAB_BOOKING_SUCCESS</p>

        <div className="flex gap-4 mt-8">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            View My Bookings
          </button>
          <button className="border border-gray-300 px-4 py-2 rounded text-gray-700 hover:bg-gray-50">
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CabBookingConfirmed;
