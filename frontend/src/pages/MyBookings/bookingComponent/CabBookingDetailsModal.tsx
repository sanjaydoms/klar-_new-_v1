import React from 'react';

const getStatusColor = (status: any) => {
  const statusString = typeof status === 'string' ? status : '';
  const colors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    initiated: 'bg-yellow-100 text-yellow-800',
    payment_pending: 'bg-yellow-100 text-yellow-800',
    supplier_pending: 'bg-orange-100 text-orange-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[statusString?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

const getTypeIcon = () => '🚕';

const CabBookingDetailsModal = ({ booking, onClose }: { booking: any; onClose: () => void }) => {
  if (!booking) return null;

  const cabDetails = booking?.tripJackResponse?.data || booking?.tripJackResponse?.body || booking?.tripJackResponse || {};
  const journey = cabDetails?.journey || booking?.journey || {};
  const vehicle = cabDetails?.bookingVehicle || booking?.vehicle || {};
  const passenger = booking?.passenger || cabDetails?.passenger || {};
  const policies = cabDetails?.additionalInfo?.policies || {};

  const pickupDate = journey?.pickupDate || booking?.pickupDate || booking?.createdAt;
  const formattedPickupDate = pickupDate
    ? new Date(pickupDate).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const status = booking?.status || cabDetails?.status || 'Unknown';
  const vehicleImage = vehicle?.images || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Cab Booking Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Hero Image */}
          <div className="relative h-64 rounded-lg overflow-hidden mb-6 bg-gray-100 flex items-center justify-center">
            {vehicleImage ? (
              <img
                src={vehicleImage}
                alt="Cab"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-8xl opacity-20">{getTypeIcon()}</div>
            )}
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold shadow-md flex items-center gap-1">
              <span>{getTypeIcon()}</span>
              <span className="text-gray-800">Cab</span>
            </div>
            <div className="absolute top-3 right-3">
              <span
                className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(status)}`}
              >
                {status}
              </span>
            </div>
          </div>

          {/* Booking Info */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {vehicle?.clazz || booking?.vehicleType || 'Standard Vehicle'}
            </h3>
            <p className="text-gray-600 mb-1">
              Passenger: {passenger?.fullName || `${passenger?.firstName || ''} ${passenger?.lastName || ''}`.trim() || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">
              Booking ID: {booking?.klarBookingId || booking?.bookingId || booking?.confirmationNumber || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">Booked on: {formattedPickupDate}</p>
            {cabDetails?.rideStatus && (
              <p className="text-sm text-gray-500 mt-1">
                Ride Status: <span className="font-semibold text-gray-800">{cabDetails.rideStatus.replace('_', ' ')}</span>
              </p>
            )}
            {cabDetails?.trackingLink && (
              <a href={cabDetails.trackingLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                Track your ride 📍
              </a>
            )}
          </div>

          {/* Journey Details */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Journey Details</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Pickup Time</p>
                  <p className="font-medium text-gray-900">{formattedPickupDate}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Vehicle Type</p>
                  <p className="font-medium text-gray-900">{vehicle?.similarTypes || booking?.vehicleCategory || 'N/A'}</p>
                </div>
                {(journey?.duration || cabDetails?.duration) && (
                  <div>
                    <p className="text-gray-500 mb-1">Duration</p>
                    <p className="font-medium text-gray-900">{journey?.duration || cabDetails?.duration} mins</p>
                  </div>
                )}
                {(journey?.distance || cabDetails?.distance) && (
                  <div>
                    <p className="text-gray-500 mb-1">Distance</p>
                    <p className="font-medium text-gray-900">{journey?.distance || cabDetails?.distance}</p>
                  </div>
                )}
                {(journey?.journeyType || cabDetails?.tripType) && (
                  <div>
                    <p className="text-gray-500 mb-1">Journey Type</p>
                    <p className="font-medium text-gray-900 capitalize">{String(journey?.journeyType || cabDetails?.tripType).replace('_', ' ').toLowerCase()}</p>
                  </div>
                )}
                <div className="md:col-span-2 mt-2">
                  <div className="flex items-start gap-3 relative">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                      <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-white"></div>
                    </div>
                    <div className="flex flex-col gap-4 w-full">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Pickup</p>
                        <p className="text-gray-900 mt-0.5">{journey?.source || booking?.origin?.displayAddress || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Drop</p>
                        <p className="text-gray-900 mt-0.5">{journey?.destination || booking?.destination?.displayAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passenger Details */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Passenger Information</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">
                {passenger?.fullName || `${passenger?.firstName || ''} ${passenger?.lastName || ''}`.trim() || 'N/A'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600">
                  Email: <span className="text-gray-900">{passenger?.email || 'N/A'}</span>
                </p>
                <p className="text-gray-600">
                  Phone: <span className="text-gray-900">{passenger?.phone || 'N/A'}</span>
                </p>
              </div>
              {cabDetails?.serviceRequest && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
                  <p className="text-gray-600">
                    Service Request: <span className="text-gray-900 font-medium">{cabDetails.serviceRequest}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Policies */}
          {policies && Object.keys(policies).length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Policies</h4>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="space-y-4">
                  {policies.amendmentPolicy && (
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Amendment Policy</p>
                      <p className="text-sm text-blue-800">{policies.amendmentPolicy}</p>
                    </div>
                  )}
                  {policies.cancellationPolicy && Array.isArray(policies.cancellationPolicy) && (
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Cancellation Policy</p>
                      <ul className="list-disc pl-5 text-sm text-blue-800 space-y-1">
                        {policies.cancellationPolicy.map((p: any, i: number) => (
                          <li key={i}>{p.description} ({p.refundPercentage}% refund)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {policies.inclusions && Array.isArray(policies.inclusions) && (
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Inclusions</p>
                      <ul className="list-disc pl-5 text-sm text-blue-800 space-y-1">
                        {policies.inclusions.map((inc: string, i: number) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cabDetails?.amendmentAllowed !== undefined && (
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">Amendments</p>
                      <p className="text-sm text-blue-800">
                        {cabDetails.amendmentAllowed ? "Modifications are allowed for this booking." : "Modifications are not allowed for this booking."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Failure Information */}
          {status === 'FAILED' && booking?.failureReason && (
            <div className="mb-6">
              <h4 className="font-semibold text-red-700 mb-3">Failure Information</h4>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-800">
                {booking.failureReason}
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Price Breakdown</h4>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md ml-auto">
              <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3 mt-1">
                <span>Total Amount</span>
                <span>{formatCurrency(booking?.totalAmount || booking?.netAmount || cabDetails?.totalPrice, booking?.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CabBookingDetailsModal;
