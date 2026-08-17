import React from 'react';

// Covers every backend CabBookingStatus (INITIATED, PENDING, SUPPLIER_PENDING,
// CONFIRMED, FAILED, CANCELLED, REFUNDED, MANUAL_REVIEW) plus legacy supplier
// strings (success, completed, payment_pending) still present on old bookings.
const cabStatusConfig: Record<string, { color: string; label: string }> = {
  confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
  success: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
  completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  initiated: { color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
  payment_pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Payment Pending' },
  supplier_pending: { color: 'bg-orange-100 text-orange-800', label: 'Awaiting Confirmation' },
  manual_review: { color: 'bg-orange-100 text-orange-800', label: 'Under Review' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  refunded: { color: 'bg-red-100 text-red-800', label: 'Refunded' },
  failed: { color: 'bg-gray-100 text-gray-800', label: 'Failed' },
};

const getCabStatus = (status: any) => {
  const key = typeof status === 'string' ? status.toLowerCase() : '';
  return (
    cabStatusConfig[key] || {
      color: 'bg-gray-100 text-gray-800',
      label: typeof status === 'string' && status ? status : 'Unknown',
    }
  );
};

const getTypeIcon = () => '🚕';

const CabBookingCard = ({
  booking,
  onViewDetails,
  onCancel,
}: {
  booking: any;
  onViewDetails: (b: any) => void;
  onCancel?: (b: any) => void;
}) => {
  const status = booking?.status || 'Unknown';
  const bookingStatus = typeof status === 'string' ? status.toLowerCase() : '';

  const canShowCancelButton = ['initiated', 'confirmed', 'pending', 'success', 'payment_pending', 'supplier_pending'].includes(
    bookingStatus,
  );

  const cabDetails = booking?.tripJackResponse?.cabDetails || booking?.tripJackResponse?.body?.cabDetails || {};
  const vehicleName = cabDetails?.name || 'Premium Cab Service';

  const journeyDateStr = cabDetails?.pickupTime || booking?.pickupTime || booking?.createdAt;
  const journeyDate = journeyDateStr
    ? new Date(journeyDateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const totalAmount = booking?.totalPrice || booking?.amount || booking?.netAmount || 0;

  const cabData = booking?.tripJackResponse?.data || booking?.tripJackResponse?.body || booking?.tripJackResponse || {};
  const vehicle = cabData?.bookingVehicle || booking?.vehicle || {};
  const vehicleImage = vehicle?.images || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500";
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100">
      <div className="relative h-40 overflow-hidden bg-gray-50 flex items-center justify-center border-b border-gray-100">
        <img
          src={vehicleImage}
          alt="Cab"
          className="w-full h-full object-contain p-4 hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
          <span>{getTypeIcon()}</span>
          <span className="text-gray-800">Cab</span>
        </div>
        <div className="absolute top-3 right-3">
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getCabStatus(status).color}`}
          >
            {getCabStatus(status).label}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{vehicleName}</h3>
          <p className="text-xs text-gray-500">Booking ID: {booking?.klarBookingId || booking?.bookingId || booking?.confirmationNumber || 'N/A'}</p>
          <p className="text-xs text-gray-500 mt-1">Pickup: {journeyDate}</p>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs font-semibold text-green-600">
              ₹{' '}
              {totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {cabData?.trackingLink && (
              <a 
                href={cabData.trackingLink} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Track Ride 📍
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onViewDetails(booking)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            View Details
          </button>
          {canShowCancelButton && onCancel && (
            <button
              onClick={() => onCancel(booking)}
              className="flex-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CabBookingCard;
