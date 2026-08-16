import React from 'react';

interface CabBookingDetailsModalProps {
  booking: any; // CabBooking
  onClose: () => void;
  onCancel: (bookingId: string) => void;
}

export const CabBookingDetailsModal: React.FC<CabBookingDetailsModalProps> = ({
  booking,
  onClose,
  onCancel,
}) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="text-2xl font-bold">Booking Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-gray-500">Booking ID</h4>
            <p>{booking.bookingId}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-500">Status</h4>
            <p className="capitalize font-medium">{booking.status}</p>
          </div>
          <div className="col-span-2">
            <h4 className="font-semibold text-gray-500">Route</h4>
            <p>{booking.route}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-500">Date</h4>
            <p>{booking.date}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-500">Vehicle</h4>
            <p>{booking.vehicleName}</p>
          </div>
          <div className="col-span-2">
            <h4 className="font-semibold text-gray-500">Passenger</h4>
            <p>{booking.passengerName}</p>
          </div>
        </div>

        <div className="border-t pt-4 mb-6">
          <h4 className="font-bold mb-2">Fare Breakdown</h4>
          <div className="flex justify-between mb-1">
            <span>Total Fare</span>
            <span className="font-bold">₹{booking.fare}</span>
          </div>
        </div>

        <div className="border-t pt-4 mb-6">
          <h4 className="font-bold mb-2">Cancellation Policy</h4>
          <p className="text-sm text-gray-600">
            Free cancellation up to 24 hours before pickup time.
          </p>
        </div>

        <div className="flex justify-end gap-4 mt-6 border-t pt-4">
          <button
            className="border border-gray-300 px-4 py-2 rounded text-gray-700 hover:bg-gray-50"
            onClick={() => {
              /* Implement download voucher */
            }}
          >
            Download Voucher
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={() => onCancel(booking.bookingId)}
          >
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
};
