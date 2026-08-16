import { cancelSubmit } from '@/api/flightService.api';
import React, { useState } from 'react';
import { notifyError, notifySuccess } from '@/utils/notify';

interface CancellationChargesDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cancellationData: any;
  bookingDetails?: any;
  onConfirmCancel?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  remarks?: string;
  bookingId?: string;
  cancellationPayload?: any;
  isBypass?: boolean; // NEW: flag to indicate bypass mode
}

const CancellationChargesDisplayModal: React.FC<CancellationChargesDisplayModalProps> = ({
  isOpen,
  onClose,
  cancellationData,
  bookingDetails,
  onConfirmCancel,
  isLoading: externalLoading = false,
  error: externalError = null,
  remarks: externalRemarks = '',
  bookingId: propBookingId,
  cancellationPayload,
  isBypass = false, // NEW: default to false
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const extractErrorMessage = (data: any): string => {
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const error = data.errors[0];
      return error.details || error.message || 'An error occurred';
    }
    if (data?.status?.success === false && data?.errors?.length > 0) {
      const error = data.errors[0];
      return error.details || error.message || 'An error occurred';
    }
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.errorMessage) return data.errorMessage;
    if (typeof data === 'string') return data;
    return 'Unable to process cancellation request';
  };

  const isErrorResponse =
    cancellationData?.error === true ||
    cancellationData?.success === false ||
    cancellationData?.status?.success === false;

  let errorMessage = null;
  if (isErrorResponse) {
    errorMessage = extractErrorMessage(cancellationData);
  }

  const isCriticalError =
    isErrorResponse &&
    (cancellationData?.status?.httpStatus === 400 ||
      errorMessage?.toLowerCase().includes('autocancellation is not enabled') ||
      errorMessage?.toLowerCase().includes('contact support') ||
      cancellationData?.errors?.[0]?.errCode === '2563' ||
      cancellationData?.status?.errorCode === '2563');

  const allowCancellation = isErrorResponse ? !isCriticalError : true;

  // Handle the final cancellation submission
  const handleConfirmCancellation = async () => {
    if (!confirmed || isCancelling) return;

    setIsCancelling(true);
    setInternalError(null);

    try {
      // If we have cancellationPayload, call cancelSubmit directly
      if (cancellationPayload) {
        console.log('Submitting cancellation with payload:', cancellationPayload);

        // Call the cancelSubmit API with the payload
        const response = await cancelSubmit(cancellationPayload);
        console.log('Cancellation submit response:', response);

        // Check if response indicates success
        if (response?.success === false || response?.status === false) {
          const errorMsg =
            response?.message || response?.errors?.[0]?.details || 'Cancellation failed';
          throw new Error(errorMsg);
        }

        // Call onConfirmCancel if provided (for parent notification/UI update)
        if (onConfirmCancel) {
          await onConfirmCancel();
        }

        notifySuccess('Booking cancelled successfully!');
        onClose();
      }
      // Fallback to old method (if no payload)
      else if (onConfirmCancel) {
        await onConfirmCancel();
      } else {
        throw new Error('No cancellation payload or confirm handler provided');
      }
    } catch (err: any) {
      console.error('Error during cancellation:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to cancel booking. Please try again.';
      setInternalError(errorMsg);
      notifyError(`Cancellation failed: ${errorMsg}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle error response with allowed cancellation (bypass mode)
  if (isErrorResponse && allowCancellation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90] p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancellation Warning</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">
              {isBypass ? 'Cancellation Request' : 'Unable to Fetch Cancellation Charges'}
            </h4>
            <p className="text-gray-600 mb-4 text-center">
              {isBypass 
                ? 'You are about to submit a cancellation request. Our team will review and process it.'
                : errorMessage || 'Request failed with status code 400'
              }
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                {isBypass 
                  ? '⚠️ Cancellation charges could not be calculated automatically. Your request will be reviewed by our support team, and applicable charges will be communicated to you.'
                  : '⚠️ We couldn\'t retrieve the cancellation charges at this moment. You can still proceed with cancellation, but please note that standard cancellation policies will apply.'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Processing...' : 'Submit Cancellation Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle critical error (cancellation not possible)
  if (isErrorResponse && !allowCancellation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90] p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancellation Unavailable</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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

          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to Process Cancellation
            </h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-red-800 font-medium mb-1">Error Details:</p>
              <p className="text-sm text-red-700">
                {errorMessage || 'Unable to raise amendment. Please try again after sometime'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return '₹ 0.00';
    return `₹ ${amount?.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const responseData = cancellationData?.data || cancellationData;

  const bookingId =
    responseData?.bookingId ||
    cancellationData?.bookingId ||
    bookingDetails?.order?.bookingId ||
    bookingDetails?.bookingId ||
    propBookingId;

  const trips = responseData?.trips || [];

  let totalBookingAmount = 0;
  let totalCancellationFee = 0;
  let totalRefundAmount = 0;

  const tripDetails = trips.map((trip: any) => {
    let tripTotalFare = 0;
    let tripCancellationFee = 0;
    let tripRefundAmount = 0;

    if (trip.amendmentInfo) {
      Object.entries(trip.amendmentInfo).forEach(([passengerType, info]: [string, any]) => {
        const totalFare = info.totalFare || 0;
        const amendmentCharges = info.amendmentCharges || 0;
        const refundAmount = info.refundAmount || 0;

        tripTotalFare += totalFare;
        tripCancellationFee += amendmentCharges;
        tripRefundAmount += refundAmount;
      });
    }

    totalBookingAmount += tripTotalFare;
    totalCancellationFee += tripCancellationFee;
    totalRefundAmount += tripRefundAmount;

    return {
      ...trip,
      totalFare: tripTotalFare,
      cancellationFee: tripCancellationFee,
      refundAmount: tripRefundAmount,
      passengerBreakdown: trip.amendmentInfo || {},
    };
  });

  const totalAmount =
    totalBookingAmount || responseData?.totalAmount || cancellationData?.totalAmount || 0;

  const cancellationFee =
    totalCancellationFee || responseData?.cancellationFee || cancellationData?.cancellationFee || 0;

  const refundAmount =
    totalRefundAmount || responseData?.refundAmount || cancellationData?.refundAmount || 0;

  const remarks = externalRemarks || responseData?.remarks || cancellationData?.remarks || '';

  const getPassengerNames = () => {
    if (!bookingDetails) return [];
    const itemInfos = bookingDetails?.itemInfos?.AIR || bookingDetails?.itemInfos;
    const travellerInfos = itemInfos?.travellerInfos || bookingDetails?.travellerInfo || [];
    return travellerInfos.map((t: any) => `${t.ti || ''} ${t.fN || ''} ${t.lN || ''}`.trim());
  };

  const passengerNames = getPassengerNames();
  
  
  const hasValidCharges = !isBypass && !cancellationData?.bypass && cancellationData !== null && !isErrorResponse && (cancellationFee > 0 || totalAmount > 0 || refundAmount > 0);

  const isLoading = externalLoading || isCancelling;
  const displayError = externalError || internalError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${isBypass ? 'bg-amber-100' : 'bg-orange-100'} flex items-center justify-center`}>
              <svg
                className={`w-5 h-5 ${isBypass ? 'text-amber-600' : 'text-orange-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {isBypass ? 'Cancellation Request' : 'Cancellation Charges Preview'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
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

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
            <p className="text-gray-600">
              {isCancelling ? 'Processing cancellation...' : 'Fetching cancellation charges...'}
            </p>
          </div>
        ) : displayError ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Unable to Process</h4>
            <p className="text-gray-600 mb-4">{displayError}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : !hasValidCharges ? (
          // Bypass mode or no charges available - show simplified view without price cards
          <>
            <div className="p-6 space-y-6">
              {/* Bypass Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Cancellation Request Submitted for Review
                </h4>
                <p className="text-gray-600 max-w-md mx-auto">
                  Cancellation charges could not be calculated automatically. Our team will review your request and process it with applicable charges.
                </p>
              </div>

              {/* Booking ID */}
              {bookingId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Booking ID</p>
                  <p className="text-sm font-mono font-semibold text-gray-800">{bookingId}</p>
                </div>
              )}

              {/* Passenger Names */}
              {passengerNames.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Passengers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {passengerNames.map((name: string, idx: React.Key) => (
                      <span
                        key={idx}
                        className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancellation Reason */}
              {remarks && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Cancellation Reason</p>
                  <p className="text-sm text-gray-700">{remarks}</p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-red-600 focus:ring-red-500"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    disabled={isCancelling}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      I confirm that I want to request cancellation
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      This action is irreversible and applicable charges will apply
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                disabled={isCancelling}
              >
                Back to Booking
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={!confirmed || isCancelling}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  !confirmed || isCancelling
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {isCancelling ? 'Processing...' : 'Submit Cancellation Request'}
              </button>
            </div>
          </>
        ) : (
          // Normal mode with charges - show full price details
          <>
            <div className="p-6 space-y-6">
              {/* Amount Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Total Booking Amount</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <p className="text-sm text-red-700 font-medium mb-1">Total Cancellation Fee</p>
                  <p className="text-2xl font-bold text-red-900">
                    - {formatCurrency(cancellationFee)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">Total Refund Amount</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(refundAmount)}
                  </p>
                </div>
              </div>

              {/* Booking ID */}
              {bookingId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Booking ID</p>
                  <p className="text-sm font-mono font-semibold text-gray-800">{bookingId}</p>
                </div>
              )}

              {/* Passenger Names */}
              {passengerNames.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Passengers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {passengerNames.map((name: string, idx: React.Key) => (
                      <span
                        key={idx}
                        className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trip Details */}
              {trips.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                      />
                    </svg>
                    Trip Details
                  </h4>

                  {tripDetails.map((trip: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {trip.src} → {trip.dest}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Departure:{' '}
                              {trip.departureDate
                                ? new Date(trip.departureDate).toLocaleString()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {trip.passengerBreakdown &&
                        Object.keys(trip.passengerBreakdown).length > 0 && (
                          <div className="divide-y divide-gray-100">
                            {Object.entries(trip.passengerBreakdown).map(
                              ([passengerType, details]: [string, any], idx: number) => (
                                <div key={idx} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-800">
                                      {passengerType} Passenger
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div>
                                      <p className="text-xs text-gray-500">Total Fare</p>
                                      <p className="font-semibold text-gray-800">
                                        {formatCurrency(details.totalFare || 0)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Cancellation Fee</p>
                                      <p className="font-semibold text-red-600">
                                        - {formatCurrency(details.amendmentCharges || 0)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Refund Amount</p>
                                      <p className="font-semibold text-green-600">
                                        {formatCurrency(details.refundAmount || 0)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {/* Cancellation Reason */}
              {remarks && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Cancellation Reason</p>
                  <p className="text-sm text-gray-700">{remarks}</p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-red-600 focus:ring-red-500"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    disabled={isCancelling}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      I confirm that I want to cancel this booking
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      This action is irreversible and cancellation charges will apply
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                disabled={isCancelling}
              >
                Back to Booking
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={!confirmed || isCancelling}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  !confirmed || isCancelling
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CancellationChargesDisplayModal;