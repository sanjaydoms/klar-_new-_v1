import React from 'react';

interface HotelBookingSummaryProps {
  hotel: any;
  room: any;
  searchParams: any;
  markup: any;
  finalPrice: number;
}

export const HotelBookingSummary: React.FC<HotelBookingSummaryProps> = ({
  hotel,
  room,
  searchParams,
  markup,
  finalPrice,
}) => {
  return (
    <div className="hotel-booking-summary bg-white border rounded shadow-sm p-4 sticky top-4">
      <h3 className="text-xl font-bold border-b pb-2 mb-4">Booking Summary</h3>

      <div className="flex flex-col gap-2 mb-4">
        <h4 className="font-semibold text-lg">{hotel?.name || 'Hotel Name'}</h4>
        <p className="text-sm text-gray-600">{room?.name || 'Room Name'}</p>
      </div>

      <div className="flex justify-between text-sm mb-4">
        <div>
          <p className="text-gray-500">Check-in</p>
          <p className="font-medium">{searchParams?.checkIn || 'YYYY-MM-DD'}</p>
        </div>
        <div>
          <p className="text-gray-500">Check-out</p>
          <p className="font-medium">{searchParams?.checkOut || 'YYYY-MM-DD'}</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between mb-2 text-gray-700">
          <span>Base Price</span>
          <span>₹{/* Calculate base price */}</span>
        </div>
        <div className="flex justify-between mb-2 text-gray-700">
          <span>Taxes & Fees</span>
          <span>₹{/* Calculate taxes */}</span>
        </div>
        {markup && (
          <div className="flex justify-between mb-2 text-green-600">
            <span>Markup applied</span>
            <span>+₹{/* Show markup */}</span>
          </div>
        )}
        <div className="flex justify-between mt-4 font-bold text-xl">
          <span>Total Price</span>
          <span>₹{finalPrice}</span>
        </div>
      </div>
    </div>
  );
};
