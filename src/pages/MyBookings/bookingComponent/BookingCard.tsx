import React, { useState } from 'react';
import CancellationModal from '../CancellationModal';
import CancellationChargesDisplayModal from '../CancellationChargesDisplayModal';
import { validateBooking } from '@/api/flightService.api';
import { AnyAction } from 'redux';
import { notifyError } from '@/utils/notify';

// Add a direct import check
console.log('validateBooking import:', validateBooking);

const getStatusColor = (status: any) => {
  const statusString = typeof status === 'string' ? status : '';
  const colors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    initiated: 'bg-yellow-100 text-yellow-800',
    on_hold: 'bg-orange-100 text-orange-800',
  };
  return colors[statusString?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

const getTypeIcon = () => '✈️';

const getPassengerNames = (travellerInfo: any[]) => {
  if (!travellerInfo || travellerInfo.length === 0) return 'N/A';
  return travellerInfo
    .map((t: any) => `${t.ti || ''} ${t.fN || ''} ${t.lN || ''}`.trim())
    .join(', ');
};

const BookingCard = ({ booking, onViewDetails, onCancelSuccess, onConfirmBooking }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationData, setCancellationData] = useState(null);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [showCancellationCharges, setShowCancellationCharges] = useState(false);
  const [cancellationPayload, setCancellationPayload] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const travellerInfos =
    booking?.travellers ||
    booking?.travellerInfo ||
    booking?.passengers ||
    booking?.userInfo?.passengers ||
    [];

  const passengerNames = getPassengerNames(travellerInfos);

  let totalAmount = 0;
  if (booking?.amount) {
    totalAmount = booking.amount;
  } else if (booking?.order?.amount) {
    totalAmount = booking.order.amount;
  } else if (booking?.totalPrice) {
    totalAmount = booking.totalPrice;
  } else {
    totalAmount =
      booking?.paymentInfos?.reduce((sum: any, p: { amount: any }) => sum + (p.amount || 0), 0) ||
      0;
  }

  const status =
    typeof (booking?.status || booking?.order?.status) === 'string'
      ? booking?.status || booking?.order?.status
      : 'Unknown';

  const bookingStatus = typeof status === 'string' ? status.toLowerCase() : '';

  const canShowCancelButton = ['initiated', 'confirmed', 'pending', 'success'].includes(
    bookingStatus,
  );
  const canShowConfirmButton = bookingStatus === 'on_hold';

  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  const handleProceedToCharges = (data: any) => {
    setCancellationData(data.charges);
    setCancellationRemarks(data.remarks);
    setCancellationPayload(data.cancellationPayload);
    setShowCancelModal(false);
    setShowCancellationCharges(true);
  };

  const handleConfirmBooking = async () => {
    if (!onConfirmBooking || isConfirming) return;

    setIsConfirming(true);

    try {
      const bookingId = booking?.bookingId || booking?.order?.bookingId;
      if (!bookingId) {
        console.error('Booking ID not found', { booking });
        notifyError('Booking ID not found');
        return;
      }

      // Call parent's handleConfirmBooking with the booking object
      await onConfirmBooking(booking);
    } catch (error: any) {
      console.error('Failed to validate booking:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to validate booking. Please try again.';
      notifyError(errorMessage);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-gray-100">
        <div className="relative h-40 overflow-hidden">
          <img
            src={'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500'}
            alt="Flight"
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
            <span>{getTypeIcon()}</span>
            <span className="text-gray-800">Flight</span>
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
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">Flight Booking</h3>
            <p className="text-xs text-gray-500">
              Booking ID: {booking?.bookingId || booking?.order?.bookingId}
            </p>
            <p className="text-xs text-gray-500 mt-1">Passengers: {travellerInfos?.length || 0}</p>
            <p className="text-xs font-semibold text-green-600 mt-1">
              ₹{' '}
              {totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => onViewDetails(booking)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              View Details
            </button>
            {canShowConfirmButton && (
              <button
                onClick={handleConfirmBooking}
                disabled={isConfirming}
                className={`flex-1 px-3 py-2 text-white rounded-lg transition-colors text-xs font-medium ${isConfirming
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {isConfirming ? 'Confirming...' : 'Confirm Booking'}
              </button>
            )}
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
        <CancellationModal
          booking={booking}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onProceed={handleProceedToCharges}
        />
      )}

      {showCancellationCharges && cancellationData && (
        <CancellationChargesDisplayModal
          isOpen={showCancellationCharges}
          onClose={() => setShowCancellationCharges(false)}
          cancellationData={cancellationData}
          bookingDetails={booking}
          onConfirmCancel={onCancelSuccess}  // ← Changed from onCancelSuccess to onConfirmCancel
          remarks={cancellationRemarks}
          bookingId={booking?.bookingId || booking?.order?.bookingId}
          cancellationPayload={cancellationPayload}
          isBypass={cancellationData?.bypass === true}  // ← Add this
        />
      )}
    </>
  );
};

export default BookingCard;
