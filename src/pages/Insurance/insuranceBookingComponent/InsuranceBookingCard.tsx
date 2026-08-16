// InsuranceBookingCard.tsx
import React, { useState } from 'react';
import InsuranceCancellationModal from './InsuranceCancellationModal';
import InsuranceCancellationChargesModal from './InsuranceCancellationChargesModal';

const getStatusColor = (status) => {
  const statusString = typeof status === 'string' ? status : '';
  const colors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    SUCCESS: 'bg-green-100 text-green-800',
    initiated: 'bg-yellow-100 text-yellow-800',
    INITIATED: 'bg-yellow-100 text-yellow-800',
  };
  return colors[statusString] || colors[statusString?.toUpperCase()] || 'bg-gray-100 text-gray-800';
};

const getTypeIcon = () => '🛡️';

const getPassengerNames = (travellers) => {
  if (!travellers || travellers.length === 0) return 'N/A';
  return travellers
    .map((t) => `${t.fn || t.firstName || ''} ${t.ln || t.lastName || ''}`.trim())
    .join(', ');
};

const InsuranceBookingCard = ({ booking, onViewDetails, onCancelSuccess }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationData, setCancellationData] = useState(null);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [showCancellationCharges, setShowCancellationCharges] = useState(false);
  const [cancellationPayload, setCancellationPayload] = useState(null);

  // Log the booking data for debugging
  console.log('InsuranceBookingCard received:', booking);

  const travellers = booking?.travellers || [];
  const passengerNames = getPassengerNames(travellers);
  const totalAmount = booking?.amount || booking?.totalPrice || 0;
  const status = booking?.status || 'Unknown';
  const bookingStatus = typeof status === 'string' ? status.toLowerCase() : status;
  const bookingId = booking?.bookingId;
  console.log('44 InsuranceBookingCard Booking ID:', bookingId);

  const canShowCancelButton = bookingStatus !== 'cancelled' && bookingStatus !== 'CANCELLED';

  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  const handleProceedToCharges = (data) => {
    setCancellationData(data.charges);
    setCancellationRemarks(data.remarks);
    setCancellationPayload(data.cancellationPayload);
    setShowCancelModal(false);
    setShowCancellationCharges(true);
  };

  const handleViewDetailsClick = () => {
    console.log('View Details clicked for booking:', booking);
    onViewDetails(booking);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100">
        <div className="relative h-40 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500"
            alt="Insurance"
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
            <span>{getTypeIcon()}</span>
            <span className="text-gray-800">Insurance</span>
          </div>
          <div className="absolute top-3 right-3">
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(status)}`}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">Travel Insurance</h3>
            <p className="text-xs text-gray-500">Policy ID: {bookingId}</p>
            <p className="text-xs text-gray-500 mt-1">Insured: {passengerNames}</p>
            <p className="text-lg font-bold text-green-600 mt-2">
              ₹{' '}
              {totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="flex gap-2 mt-auto">
            <button
              onClick={handleViewDetailsClick}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              View Details
            </button>
            {canShowCancelButton && (
              <button
                onClick={handleOpenCancelModal}
                className="flex-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <InsuranceCancellationModal
          booking={booking}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onProceed={handleProceedToCharges}
        />
      )}

      {showCancellationCharges && cancellationData && (
        <InsuranceCancellationChargesModal
          isOpen={showCancellationCharges}
          onClose={() => setShowCancellationCharges(false)}
          cancellationData={cancellationData}
          bookingDetails={booking}
          onCancelSuccess={onCancelSuccess}
          remarks={cancellationRemarks}
          bookingId={bookingId}
          cancellationPayload={cancellationPayload}
        />
      )}
    </>
  );
};

export default InsuranceBookingCard;
