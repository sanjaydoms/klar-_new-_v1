import { raiseInsuranceAmendment } from '@/api/insuranceService.api';
import React, { useState, useEffect } from 'react';

const InsuranceCancellationModal = ({ booking, onClose, onProceed, isOpen }) => {
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTravellers, setSelectedTravellers] = useState([]);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [fetchingBooking, setFetchingBooking] = useState(false);

  useEffect(() => {
    if (isOpen && booking && !bookingDetails) {
      fetchBookingDetails();
    }
  }, [isOpen, booking]);

  const fetchBookingDetails = async () => {
    setFetchingBooking(true);
    try {
      const travellers = booking?.travellers || [];
      const transformedData = {
        bookingId: booking?.bookingId || booking?._id,
        remarks: '',
        type: 'CANCELLATION',
        travellers: travellers.map((t) => ({
          firstName: t.fn || t.firstName || '',
          lastName: t.ln || t.lastName || '',
          title: t.ti || 'Mr',
          paxType: 'ADULT',
          dateOfBirth: t.dob || '',
        })),
      };
      setBookingDetails(transformedData);

      // Auto-select all travellers
      setSelectedTravellers(travellers.map((_, idx) => `traveller_${idx}`));
    } catch (err) {
      console.error('Error fetching booking details:', err);
    } finally {
      setFetchingBooking(false);
    }
  };

  if (!isOpen || !booking) return null;

  const travellers = booking?.travellers || [];

  const handleViewCharges = async () => {
    if (!remarks.trim()) {
      setRemarksError('Remark is required before proceeding.');
      return;
    }

    if (selectedTravellers.length === 0) {
      setRemarksError('Please select at least one traveller to cancel.');
      return;
    }

    setRemarksError('');
    setLoading(true);
    setError('');

    try {
      const bookingId = booking?.bookingId || booking?._id;

      // FUNCTIONALITY FIX: Construct the correct TripJack nested payload
      const planId =
        booking?.planId ||
        booking?.tjBookingDetailsResponse?.itemInfos?.INSURANCE?.iinfo?.pli?.[0]?.plid;
      const productId =
        booking?.productId ||
        booking?.tjBookingDetailsResponse?.itemInfos?.INSURANCE?.iinfo?.pli?.[0]?.pi?.[0]?.pid;

      const selectedIndices = selectedTravellers.map((id) => parseInt(id.split('_')[1]));
      const selectedTravellersData = travellers.filter((_, index) =>
        selectedIndices.includes(index),
      );

      const travellerKeys = {
        [planId]: {
          [productId]: selectedTravellersData.map((t) => ({
            id: t.id,
          })),
        },
      };

      const cancellationPayload = {
        bookingId: bookingId,
        remarks: remarks.trim(),
        type: 'CANCELLATION',
        amendmentId: '',
        travellerKeys: travellerKeys,
      };

      console.log('Sending amendment raise request:', cancellationPayload);

      const response = await raiseInsuranceAmendment(cancellationPayload);
      const responseData = response?.data || response;

      onProceed({
        charges: responseData,
        remarks: remarks.trim(),
        selectedTravellers: selectedTravellers,
        bookingDetails: bookingDetails,
        cancellationPayload: cancellationPayload,
      });
    } catch (err) {
      console.error('Error raising amendment:', err);

      let errorMessage = 'Failed to fetch cancellation charges. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      const isCriticalError =
        errorMessage.toLowerCase().includes('cancellation not allowed') ||
        errorMessage.toLowerCase().includes('contact support') ||
        errorMessage.toLowerCase().includes('cannot cancel');

      onProceed({
        charges: {
          error: true,
          message: errorMessage,
          allowCancellation: !isCriticalError,
        },
        remarks: remarks.trim(),
        selectedTravellers: selectedTravellers,
        bookingDetails: bookingDetails,
        cancellationPayload: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTravellerSelection = (travellerId) => {
    setSelectedTravellers((prev) => {
      if (prev.includes(travellerId)) {
        return prev.filter((id) => id !== travellerId);
      } else {
        return [...prev, travellerId];
      }
    });
    if (remarksError === 'Please select at least one traveller to cancel.') {
      setRemarksError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
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
            <h3 className="text-lg font-bold text-gray-900">Cancel Insurance Policy</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
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

        {loading || fetchingBooking ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mb-4"></div>
            <p className="text-gray-600">
              {fetchingBooking
                ? 'Fetching policy details...'
                : 'Calculating cancellation charges...'}
            </p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-red-500 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <button
                      onClick={handleViewCharges}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Traveller Selection (UI FROM FIRST CODE) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  Insured Person(s)
                  <span className="text-red-500 normal-case font-normal text-xs ml-2">
                    * select at least one
                  </span>
                </h4>
              </div>

              {travellers.length === 0 ? (
                <p className="text-sm text-gray-500 italic pl-8">
                  No traveller information available.
                </p>
              ) : (
                <div className="space-y-3 pl-8">
                  {travellers.map((traveller, index) => {
                    const travellerId = `traveller_${index}`;
                    const isSelected = selectedTravellers.includes(travellerId);

                    return (
                      <div
                        key={index}
                        className={`bg-gray-50 border rounded-xl p-4 transition-all cursor-pointer hover:bg-gray-100 ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleTravellerSelection(travellerId)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTravellerSelection(travellerId)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {traveller.fn || traveller.firstName}{' '}
                              {traveller.ln || traveller.lastName}
                            </p>
                            {traveller.age && (
                              <p className="text-xs text-gray-500 mt-1">
                                Age: {traveller.age} years
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {selectedTravellers.length > 0 && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-sm text-blue-800">
                        <strong>{selectedTravellers.length}</strong> insured person(s) selected for
                        cancellation
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Remark Section (UI FROM FIRST CODE) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  Cancellation Reason{' '}
                  <span className="text-red-500 normal-case font-normal text-xs">* required</span>
                </h4>
              </div>

              <div className="pl-8">
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    if (e.target.value.trim()) setRemarksError('');
                  }}
                  placeholder="Please provide a reason for cancellation..."
                  className={`w-full px-4 py-3 text-sm rounded-xl border ${
                    remarksError
                      ? 'border-red-400 bg-red-50 focus:ring-red-300'
                      : 'border-gray-200 bg-gray-50 focus:ring-blue-200'
                  } focus:outline-none focus:ring-2 resize-none transition`}
                />
                {remarksError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {remarksError}
                  </p>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="pl-0 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <svg
                className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-amber-700">
                Cancelling this policy will be effective immediately. Any refund will be processed
                based on the policy terms.
              </p>
            </div>
          </div>
        )}

        {!loading && !fetchingBooking && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Go Back
            </button>
            <button
              onClick={handleViewCharges}
              disabled={(!remarks.trim() || selectedTravellers.length === 0) && !error}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Cancellation Charges →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsuranceCancellationModal;
