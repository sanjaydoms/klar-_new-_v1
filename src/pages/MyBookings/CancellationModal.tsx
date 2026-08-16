import React, { useState, useEffect } from 'react';
import { cancelCharge, getFlightBookingsByBookingIdFromTripjack } from '@/api/flightService.api';

interface Traveller {
  ti?: string;
  fN?: string;
  lN?: string;
  pt?: string;
  dob?: string;
  pnrDetails?: Record<string, string>;
}

interface CancellationModalProps {
  booking: any;
  onClose: () => void;
  onProceed: (data: {
    charges: any;
    remarks: string;
    selectedTravellers?: string[];
    bookingDetails?: any;
    cancellationPayload?: any;
    isBypass?: boolean;  // NEW: flag to indicate bypass mode
  }) => void;
  isOpen: boolean;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  booking,
  onClose,
  onProceed,
  isOpen,
}) => {
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTravellers, setSelectedTravellers] = useState<string[]>([]);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [fetchingBooking, setFetchingBooking] = useState(false);
  const [isBypassMode, setIsBypassMode] = useState(false); // NEW: track bypass mode

  useEffect(() => {
    if (isOpen && booking && !bookingDetails) {
      fetchBookingDetailsOnLoad();
    }
    // Reset bypass mode when modal opens
    if (isOpen) {
      setIsBypassMode(false);
    }
  }, [isOpen, booking]);

  const fetchBookingDetailsOnLoad = async () => {
    if (!booking) return;

    setFetchingBooking(true);
    try {
      const bookingId = booking?.order?.bookingId || booking?.bookingId;
      if (!bookingId) {
        throw new Error('Booking ID not found');
      }

      const response = await getFlightBookingsByBookingIdFromTripjack(bookingId);
      const transformedData = transformBookingData(response);
      setBookingDetails(transformedData);
    } catch (err: any) {
      console.error('Error fetching booking details:', err);
    } finally {
      setFetchingBooking(false);
    }
  };

  const transformBookingData = (apiResponse: any) => {
    try {
      const data = apiResponse?.data || apiResponse;
      const airData = data?.itemInfos?.AIR;

      if (!airData) {
        return null;
      }

      const tripInformation = airData?.TripInformation || [];
      const travellerInformation = airData?.TravellerInformation || [];

      let finalTravellers = travellerInformation;
      if (finalTravellers.length === 0 && tripInformation.length > 0) {
        const firstSegment = tripInformation[0]?.SegmentInformation?.[0];
        if (firstSegment?.BaggageInfo?.tI) {
          finalTravellers = firstSegment.BaggageInfo.tI;
        }
      }

      const trips = tripInformation
        .map((trip: any) => {
          const segments = trip?.SegmentInformation || [];
          if (segments.length === 0) return null;

          const firstSegment = segments[0];
          const lastSegment = segments[segments.length - 1];

          const departureDate = firstSegment?.DepartureTime
            ? firstSegment.DepartureTime.split('T')[0]
            : '';

          const travellers = finalTravellers.map((traveller: any) => ({
            firstName: traveller?.FirstName || '',
            lastName: traveller?.LastName || '',
            title: traveller?.Title || 'Mr',
            paxType: traveller?.PaxType || 'ADULT',
            dateOfBirth: traveller?.DateOfBirth || '',
          }));

          return {
            src: firstSegment?.DepartureAirport?.SSRCode || '',
            dest: lastSegment?.ArrivalAirport?.SSRCode || '',
            departureDate: departureDate,
            travellers: travellers,
          };
        })
        .filter((trip: any) => trip !== null);

      const bookingId = data?.order?.BookingId || '';

      return {
        bookingId: bookingId,
        remarks: '',
        type: 'CANCELLATION',
        trips: trips,
      };
    } catch (error) {
      console.error('Error transforming booking data:', error);
      return null;
    }
  };

  if (!isOpen || !booking) return null;

  const extractTravellerInfo = () => {
    if (bookingDetails && bookingDetails.trips && bookingDetails.trips.length > 0) {
      const firstTrip = bookingDetails.trips[0];
      if (firstTrip.travellers && firstTrip.travellers.length > 0) {
        return firstTrip.travellers.map((traveller: any, index: number) => ({
          ti: traveller.title || 'Mr',
          fN: traveller.firstName,
          lN: traveller.lastName,
          pt: 'ADULT',
          dob: '',
          pnrDetails: {},
        }));
      }
    }

    const itemInfos = booking?.itemInfos?.AIR || booking?.itemInfos;
    const travellerInfosFromBooking = itemInfos?.travellerInfos || booking?.travellerInfo || [];

    if (travellerInfosFromBooking.length === 0 && itemInfos?.TripInformation) {
      const tripInfo = itemInfos.TripInformation[0];
      if (tripInfo?.SegmentInformation?.[0]?.BaggageInfo?.tI) {
        return tripInfo.SegmentInformation[0].BaggageInfo.tI.map(
          (traveller: any, index: number) => ({
            ti: traveller.Title || 'Mr',
            fN: traveller.FirstName,
            lN: traveller.LastName,
            pt: traveller.PaxType || 'ADULT',
            dob: traveller.DateOfBirth || '',
            pnrDetails: {},
          }),
        );
      }
    }

    return travellerInfosFromBooking;
  };

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
    setIsBypassMode(false);

    try {
      const bookingId = booking?.order?.bookingId || booking?.bookingId;

      let finalBookingDetails = bookingDetails;
      if (!finalBookingDetails) {
        const response = await getFlightBookingsByBookingIdFromTripjack(bookingId);
        finalBookingDetails = transformBookingData(response);
        setBookingDetails(finalBookingDetails);
      }

      const itemInfos = booking?.itemInfos?.AIR || booking?.itemInfos;
      let travellerInfosFromBooking = itemInfos?.travellerInfos || booking?.travellerInfo || [];

      if (travellerInfosFromBooking.length === 0 && finalBookingDetails?.trips?.[0]?.travellers) {
        travellerInfosFromBooking = finalBookingDetails.trips[0].travellers.map(
          (traveller: any, index: number) => ({
            fN: traveller.firstName,
            lN: traveller.lastName,
            ti: traveller.title,
            pt: traveller.paxType,
            dob: traveller.dateOfBirth,
          }),
        );
      }

      const selectedTravellersDetails = travellerInfosFromBooking.filter(
        (traveller: Traveller, index: number) => {
          const travellerId = `${traveller.fN}_${traveller.lN}_${index}`;
          return selectedTravellers.includes(travellerId);
        },
      );

      const updatedTrips =
        finalBookingDetails?.trips?.map((trip: any) => ({
          src: trip.src,
          dest: trip.dest,
          departureDate: trip.departureDate,
          travellers: selectedTravellersDetails.map((traveller: Traveller) => ({
            firstName: traveller.fN || '',
            lastName: traveller.lN || '',
          })),
        })) || [];

      if (updatedTrips.length === 0 || updatedTrips[0].travellers.length === 0) {
        setError('No valid travellers selected for cancellation.');
        setLoading(false);
        return;
      }

      // Create the complete cancellation payload
      const cancellationPayload = {
        bookingId: bookingId,
        remarks: remarks.trim(),
        type: 'CANCELLATION',
        trips: updatedTrips,
      };

      console.log('Sending cancel charge payload:', cancellationPayload);

      try {
        const response = await cancelCharge(cancellationPayload);
        const responseData = response?.data || response;

        if (
          responseData?.success === false &&
          responseData?.errors &&
          responseData.errors.length > 0
        ) {
          const errorDetails =
            responseData.errors[0].details ||
            responseData.errors[0].message ||
            'Unable to process cancellation request';

          // NEW: Allow bypass even when API returns errors
          const isCriticalError =
            errorDetails.toLowerCase().includes('autocancellation is not enabled') ||
            errorDetails.toLowerCase().includes('contact support') ||
            responseData.errors[0].errCode === '2563';

          if (isCriticalError) {
            // Critical error - show option to bypass
            setError(`Unable to fetch cancellation charges: ${errorDetails}. You can submit a cancellation request.`);
            setIsBypassMode(true);
            setLoading(false);
            return;
          }

          onProceed({
            charges: {
              error: true,
              message: errorDetails,
              errorCode: responseData.errors[0].errCode,
              allowCancellation: true,
            },
            remarks: remarks.trim(),
            selectedTravellers: selectedTravellers,
            bookingDetails: finalBookingDetails,
            cancellationPayload: cancellationPayload,
          });
          setLoading(false);
          return;
        }

        // Success - proceed with charges
        onProceed({
          charges: responseData,
          remarks: remarks.trim(),
          selectedTravellers: selectedTravellers,
          bookingDetails: finalBookingDetails,
          cancellationPayload: cancellationPayload,
        });
      } catch (err: any) {
        console.error('Error in cancelCharge API call:', err);

        let errorMessage = 'Failed to fetch cancellation charges. Please try again.';
        let errorCode = null;

        if (err.response?.data?.errors && err.response.data.errors.length > 0) {
          errorMessage =
            err.response.data.errors[0].details ||
            err.response.data.errors[0].message ||
            errorMessage;
          errorCode = err.response.data.errors[0].errCode;
        } else if (err.response?.data?.data?.errors?.[0]?.details) {
          errorMessage = err.response.data.data.errors[0].details;
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }

        const isCriticalError =
          errorMessage.toLowerCase().includes('autocancellation is not enabled') ||
          errorMessage.toLowerCase().includes('contact support') ||
          errorCode === '2563' ||
          err.response?.status === 500 ||
          err.response?.status === 404;

        if (isCriticalError) {
          // Critical error - show option to bypass
          setError(`Unable to fetch cancellation charges: ${errorMessage}. You can submit a cancellation request.`);
          setIsBypassMode(true);
          setLoading(false);
          return;
        }

        // Non-critical errors - allow cancellation with charges object containing error
        onProceed({
          charges: {
            error: true,
            message: errorMessage,
            errorCode: errorCode,
            allowCancellation: true,
          },
          remarks: remarks.trim(),
          selectedTravellers: selectedTravellers,
          bookingDetails: bookingDetails,
          cancellationPayload: cancellationPayload,
        });
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. You can submit a cancellation request.');
      setIsBypassMode(true);
      setLoading(false);
    }
  };


  const handleBypassCancellation = () => {
    const bookingId = booking?.order?.bookingId || booking?.bookingId;

    const cancellationPayload = {
      bookingId: bookingId,
      remarks: remarks.trim(),
      type: 'CANCELLATION',
      trips: bookingDetails?.trips || [],
    };

    onProceed({
      charges: {
        bypass: true,
        message: 'Cancellation requested without charges calculation',
        data: null,
      },
      remarks: remarks.trim(),
      selectedTravellers: selectedTravellers,
      bookingDetails: bookingDetails,
      cancellationPayload: cancellationPayload,
      isBypass: true,
    });
  };

  const travellerInfos: Traveller[] = extractTravellerInfo();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleTravellerSelection = (travellerId: string) => {
    setSelectedTravellers((prev) => {
      if (prev.includes(travellerId)) {
        return prev.filter((id) => id !== travellerId);
      } else {
        return [...prev, travellerId];
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
            <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
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
              {fetchingBooking ? 'Fetching booking details...' : 'Fetching cancellation charges...'}
            </p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6">
            {error && (
              <div className={`${isBypassMode ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
                <div className="flex items-start gap-2">
                  <svg
                    className={`w-5 h-5 ${isBypassMode ? 'text-amber-500' : 'text-red-500'} mt-0.5`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isBypassMode ? 'text-amber-800' : 'text-red-800'}`}>
                      {isBypassMode ? 'Charges Unavailable' : 'Error'}
                    </p>
                    <p className={`text-sm ${isBypassMode ? 'text-amber-700' : 'text-red-700'} mt-1`}>
                      {error}
                    </p>
                    {isBypassMode && (
                      <button
                        onClick={handleBypassCancellation}
                        className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        Submit Cancellation Request Anyway
                      </button>
                    )}
                    {!isBypassMode && (
                      <button
                        onClick={handleViewCharges}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Traveller Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  Traveller Details
                  <span className="text-red-500 normal-case font-normal text-xs ml-2">
                    * select at least one
                  </span>
                </h4>
              </div>

              {travellerInfos.length === 0 ? (
                <p className="text-sm text-gray-500 italic pl-8">
                  No traveller information available.
                </p>
              ) : (
                <div className="space-y-3 pl-8">
                  {travellerInfos.map((traveller, index) => {
                    const travellerId = `${traveller.fN}_${traveller.lN}_${index}`;
                    const isSelected = selectedTravellers.includes(travellerId);

                    return (
                      <div
                        key={index}
                        className={`bg-gray-50 border rounded-xl p-4 transition-all cursor-pointer hover:bg-gray-100 ${isSelected ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
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
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-gray-900 text-sm">
                                {[traveller.ti, traveller.fN, traveller.lN]
                                  .filter(Boolean)
                                  .join(' ') || `Passenger ${index + 1}`}
                              </p>
                              {traveller.pt && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  {traveller.pt}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {selectedTravellers.length > 0 && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-sm text-blue-800">
                        <strong>{selectedTravellers.length}</strong> traveller(s) selected for
                        cancellation
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Remark Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  Cancellation Remark{' '}
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
                  className={`w-full px-4 py-3 text-sm rounded-xl border ${remarksError ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-gray-200 bg-gray-50 focus:ring-blue-200'} focus:outline-none focus:ring-2 resize-none transition`}
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
                {isBypassMode
                  ? '⚠️ We could not calculate cancellation charges. You can submit a cancellation request and our team will process it.'
                  : 'Proceeding will show you the cancellation charges. The booking will not be cancelled until you confirm on the next step.'
                }
              </p>
            </div>
          </div>
        )}

        {!loading && !isBypassMode && (
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

        {isBypassMode && !loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancellationModal;