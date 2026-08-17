import React, { useState } from 'react';
import { updateAndBook, confirmBooking } from '@/api/flightService.api';
import { notifyError, notifySuccess } from '@/utils/notify';

interface HoldConfirmationDetailsModalProps {
  data: {
    booking: any;
    validationResponse: any;
    price: any;
    bookingId: string;
    flightDetails: any;
    passengers: any[];
  };
  onClose: () => void;
  onConfirm: (data: any) => void;
}

const HoldConfirmationDetailsModal: React.FC<HoldConfirmationDetailsModalProps> = ({
  data,
  onClose,
  onConfirm,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmAndPay = async () => {
    setIsProcessing(true);

    try {
      // Get the correct amount from data.booking
      const tripjackAmount =
        data.booking?.tripjackPrice || data.booking?.tripjackPrice || data.price || 0;

      console.log('Tripjack Amount (totalPrice):', tripjackAmount);

      if (!tripjackAmount || tripjackAmount === 0) {
        notifyError('Unable to find booking amount. Please contact support.');
        setIsProcessing(false);
        return;
      }

      const confirmPayload = {
        bookingId: data.bookingId,
        amount: tripjackAmount,
      };

      console.log('Confirm Booking Payload:', confirmPayload);
      const confirmResponse = await confirmBooking(confirmPayload);
      console.log('Confirm Booking Response:', confirmResponse);

      // Check if confirm was successful - handle different response structures
      const isConfirmSuccess =
        confirmResponse?.status?.success === true ||
        confirmResponse?.success === true ||
        confirmResponse?.data?.status?.success === true;

      if (isConfirmSuccess) {
        // Create updated booking data with new status
        const updatedBookingData = {
          ...data,
          booking: {
            ...data.booking,
            status: 'CONFIRMED',
            isHold: false,
          },
          status: 'CONFIRMED',
        };

        // Call the parent onConfirm callback with updated data
        await onConfirm(updatedBookingData);
        notifySuccess('Booking confirmed successfully!');
        onClose();
      } else {
        const errorMsg =
          confirmResponse?.message ||
          confirmResponse?.errors?.[0]?.message ||
          'Failed to confirm booking';
        notifyError(errorMsg);
      }
    } catch (error: any) {
      console.error('Error confirming booking:', error);

      // Check if the API call was actually successful but response structure is different
      if (error?.response?.data?.status?.success === true) {
        // This might be a successful response that threw an error due to response structure
        console.log('API call succeeded despite error object');

        const updatedBookingData = {
          ...data,
          booking: {
            ...data.booking,
            status: 'CONFIRMED',
            isHold: false,
          },
          status: 'CONFIRMED',
        };
        await onConfirm(updatedBookingData);
        notifySuccess('Booking confirmed successfully!');
        onClose();
      } else {
        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.message ||
          error?.message ||
          'Failed to confirm booking. Please try again.';
        notifyError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Booking Confirmation</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={isProcessing}
            >
              ✕
            </button>
          </div>

          {/* Flight Details - Uncomment and update as needed */}
          {/* <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Flight Details</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            {data.flightDetails ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 text-center">
                                            <p className="text-sm text-gray-600">From</p>
                                            <p className="text-xl font-bold">{data.flightDetails.from || 'N/A'}</p>
                                        </div>
                                        <div className="text-2xl mx-4">→</div>
                                        <div className="flex-1 text-center">
                                            <p className="text-sm text-gray-600">To</p>
                                            <p className="text-xl font-bold">{data.flightDetails.to || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Date</p>
                                            <p className="font-semibold">
                                                {data.flightDetails.departureDate 
                                                    ? new Date(data.flightDetails.departureDate).toLocaleDateString() 
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Time</p>
                                            <p className="font-semibold">{data.flightDetails.departureTime || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600">Flight Number</p>
                                        <p className="font-semibold">{data.flightDetails.flightNumber || 'N/A'}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 text-center">Flight details will be available after confirmation</p>
                            )}
                        </div>
                    </div> */}

          {/* Passenger Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Passenger Details</h3>
            <div className="space-y-2">
              {data.passengers && data.passengers.length > 0 ? (
                data.passengers.map((passenger: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium">
                      {passenger.title || passenger.ti} {passenger.firstName || passenger.fN}{' '}
                      {passenger.lastName || passenger.lN}
                    </p>
                    {passenger.age && <p className="text-sm text-gray-600">Age: {passenger.age}</p>}
                    {passenger.paxType && (
                      <p className="text-sm text-gray-600">Type: {passenger.paxType}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p>No passenger details available</p>
                </div>
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Price Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span>
                  ₹{' '}
                  {typeof data.price === 'object'
                    ? data.price?.baseFare || data.price?.amount || 0
                    : data.price}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Surcharges</span>
                <span>
                  ₹ {typeof data.price === 'object' ? data.price?.taxes || data.price?.tax || 0 : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Convenience Fee</span>
                <span>
                  ₹ {typeof data.price === 'object' ? data.price?.convenienceFee || 0 : 0}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total Amount</span>
                <span className="text-green-600 text-xl">
                  ₹{' '}
                  {typeof data.price === 'object'
                    ? data.price?.totalAmount || data.price?.total || data.price?.baseFare
                    : data.price}
                </span>
              </div>
            </div>
          </div>

          {/* Booking ID */}
          <div className="mb-6 bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Booking ID</p>
            <p className="font-mono font-semibold">{data.bookingId}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAndPay}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                'Confirm & Pay'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldConfirmationDetailsModal;
