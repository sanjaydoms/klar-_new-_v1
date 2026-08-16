import React, { useState } from 'react';
import { cancelInsuranceAmendment } from '@/api/insuranceService.api';
import { notifyError, notifySuccess } from '@/utils/notify';

const InsuranceCancellationChargesModal = ({
  isOpen,
  onClose,
  cancellationData,
  bookingDetails,
  onCancelSuccess,
  remarks: externalRemarks = '',
  bookingId: propBookingId,
  cancellationPayload,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [internalError, setInternalError] = useState(null);

  // --- DATA MAPPING FIXES START ---
  const responseData = cancellationData?.body || cancellationData;
  const amendmentItem = responseData?.amendmentItems?.[0];
  const insuranceCancelDetails = responseData?.insuranceCancellationResponse;

  // 1. Premium Paid: Found in insuranceCancellationResponse.tmr (Total Merchant Refund/Price)
  const totalAmount = insuranceCancelDetails?.tmr || cancellationData?.totalAmount || 0;

  // 2. Refund Amount: TripJack returns this as a negative 'amount' in amendmentItems
  // We use Math.abs to show the positive value to the user
  const refundAmount = amendmentItem?.amount ? Math.abs(amendmentItem.amount) : 0;

  // 3. Cancellation Fee: Calculated as (Premium Paid - Refund Amount)
  // TripJack doesn't always send a specific fee field, so we derive it
  const derivedFee = totalAmount - refundAmount;
  const cancellationFee = totalAmount > refundAmount ? totalAmount - refundAmount : 0;

  const policyItem = insuranceCancelDetails?.iif?.pli?.[0]?.pi?.[0];
  const policyName =
    policyItem?.pn || policyItem?.pid || bookingDetails?.productId || 'Travel Insurance';
  const policyNumber = amendmentItem?.bookingId || propBookingId || bookingDetails?.bookingId;
  // --- DATA MAPPING FIXES END ---

  const extractErrorMessage = (data) => {
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors[0].details || data.errors[0].message || 'An error occurred';
    }
    if (data?.message) return data.message;
    return 'Unable to process cancellation request';
  };

  const isErrorResponse = cancellationData?.status === false || cancellationData?.error === true;
  let errorMessage = isErrorResponse ? extractErrorMessage(cancellationData) : null;

  const handleConfirmCancellation = async () => {
    if (!confirmed || isCancelling) return;

    setIsCancelling(true);
    setInternalError(null);

    try {
      const actualAmendmentId =
        cancellationData?.amendmentId || cancellationData?.body?.amendmentId;

      if (!actualAmendmentId) {
        throw new Error('Amendment ID missing. Please go back and try again.');
      }

      if (!cancellationPayload) {
        throw new Error('Original cancellation data is missing.');
      }

      const finalPayload = {
        ...cancellationPayload,
        amendmentId: actualAmendmentId,
        type: 'INSURANCE_CANCELLATION',
      };

      console.log('Submitting final confirmation to cancel API:', finalPayload);

      // 3. Call the /amendment/cancel API
      const response = await cancelInsuranceAmendment(finalPayload);
      console.log('Final Cancellation response:', response);

      // Handle success based on your backend response structure
      if (response?.status === true || response?.success === true || response?.statusCode === 200) {
        // Notify parent of successful cancellation so the UI updates
        if (onCancelSuccess && propBookingId) {
          onCancelSuccess(propBookingId);
        }

        notifySuccess('Insurance policy cancelled successfully!');
        onClose();
      } else {
        // Handle logic errors returned within a 200 response
        const errorMsg =
          response?.message || response?.body?.status?.description || 'Cancellation failed';
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error during final cancellation execution:', err);

      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to confirm cancellation. Please contact support.';

      setInternalError(errorMsg);
      notifyError(`Cancellation Error: ${errorMsg}`);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount) => {
    return `₹ ${Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
              ₹
            </div>
            <h3 className="text-xl font-bold text-gray-900">Policy Cancellation Preview</h3>
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

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-blue-700 font-medium mb-1">Premium Paid</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-sm text-red-700 font-medium mb-1">Cancellation Fee</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(cancellationFee)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-green-700 font-medium mb-1">Refund Amount</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(refundAmount)}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Policy Name</p>
              <p className="text-sm font-semibold text-gray-800">{policyName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Policy Number</p>
              <p className="text-sm font-mono font-semibold text-gray-800">{policyNumber}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Insured Person(s)</h4>
            <div className="flex flex-wrap gap-2">
              {/* Use iti from insuranceCancellationResponse which is the most accurate source */}
              {(
                insuranceCancelDetails?.iif?.pli?.[0]?.pi?.[0]?.iti ||
                bookingDetails?.travellers ||
                []
              ).map((t, idx) => (
                <span
                  key={idx}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {t.fn} {t.ln}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1 font-bold">Cancellation Reason</p>
            <p className="text-sm text-gray-700">{externalRemarks || 'Not specified'}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-2">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
            </svg>
            <p className="text-xs text-blue-700">
              Refund will be processed within 7-10 business days to your original payment method.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded text-red-600"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  I confirm that I want to cancel this insurance policy
                </span>
                <p className="text-xs text-gray-500 mt-1">This action is irreversible.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium"
          >
            Back to Policy
          </button>
          <button
            onClick={handleConfirmCancellation}
            disabled={!confirmed || isCancelling}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              !confirmed || isCancelling
                ? 'bg-gray-300 text-gray-500'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsuranceCancellationChargesModal;
