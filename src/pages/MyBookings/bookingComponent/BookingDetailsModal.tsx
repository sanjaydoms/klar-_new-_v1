import React, { useState } from 'react';
import CancellationModal from '../CancellationModal';
import CancellationChargesDisplayModal from '../CancellationChargesDisplayModal';
import { getFlightBookingsByBookingIdFromTripjack } from '@/api/flightService.api';
import TripjackBookingDetailsModal from './TripjackBookingDetailsModal';
import { notifyError, notifySuccess } from '@/utils/notify';
import { downloadFlightVoucher } from '../../../api/flightService.api'

const getStatusColor = (status: any) => {
  const statusString = typeof status === 'string' ? status : '';

  const colors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    initiated: 'bg-yellow-100 text-yellow-800',
  };

  return colors[statusString?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

const getTypeIcon = () => {
  return '✈️';
};

const formatDate = (dateString: string | number | Date) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return 'N/A';
  return new Date(dateTimeString).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getContactInfo = (booking: any) => {
  return {
    email: booking?.email || 'N/A',
    phone: booking?.phone || 'N/A',
  };
};

const formatDuration = (minutes: number) => {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const BookingDetailsModal = ({
  booking,
  onClose,
  onCancelSuccess
}: {
  booking: any;
  onClose: () => void;
  onCancelSuccess: (bookingId: string) => void;
}) => {
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showCancellationCharges, setShowCancellationCharges] = useState(false);
  const [cancellationData, setCancellationData] = useState(null);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState(null);
  const [showTripjackModal, setShowTripjackModal] = useState(false);
  const [tripjackBookingData, setTripjackBookingData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleFetchFullDetails = async () => {
    setLoadingDetails(true);
    try {
      const bookingId = booking?.bookingId;
      if (!bookingId) return;

      console.log('Fetching full details for:', bookingId);

      const response = await getFlightBookingsByBookingIdFromTripjack(bookingId);

      setTripjackBookingData(response);
      setShowTripjackModal(true);
    } catch (error) {
      console.error('Error fetching full booking details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const handleProceedToCharges = (data: { charges: any; remarks: string }) => {
    setCancellationData(data.charges);
    setCancellationRemarks(data.remarks);
    setShowRemarkModal(false);
    setShowCancellationCharges(true);
  };

  const handleConfirmCancellation = async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    setCancellationError(null);

    try {
      const bookingId = booking?.bookingId;

      const itemInfos = booking?.itemInfos?.AIR || booking?.itemInfos;
      const tripInfos = itemInfos?.tripInfos || [];
      const travellers = booking?.travellers || [];

      const trips: Array<{
        src: string;
        dest: string;
        departureDate: string;
        travellers: Array<{ fn: string; ln: string }>;
      }> = [];

      if (tripInfos.length > 0) {
        tripInfos.forEach((trip: any) => {
          if (trip.sI && trip.sI.length > 0) {
            const firstSegment = trip.sI[0];
            const lastSegment = trip.sI[trip.sI.length - 1];
            const pureDate = firstSegment.dt ? firstSegment.dt.split('T')[0] : '';

            trips.push({
              src: firstSegment.da.code,
              dest: lastSegment.aa.code,
              departureDate: pureDate,
              travellers: travellers.map((t: any) => ({
                fn: t.firstName || '',
                ln: t.lastName || '',
              })),
            });
          }
        });
      }

      const cancellationRequestData: any = {
        bookingId: bookingId,
        remarks: cancellationRemarks || 'Customer requested cancellation',
      };

      if (trips.length > 0) {
        cancellationRequestData.trips = trips;
      }

      setShowCancellationCharges(false);
      onCancelSuccess(booking?.bookingId);
      notifySuccess('Booking cancelled successfully!');
      onClose();
    } catch (error: any) {
      console.error('=== CANCELLATION ERROR ===');
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.errors?.join(', ') ||
        error.message ||
        'Failed to cancel booking';

      setCancellationError(errorMessage);
      notifyError(`Cancellation failed: ${errorMessage}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const travellers = booking?.travellers || [];
  const contactInfo = getContactInfo(booking);

  let totalAmount = 0;
  if (booking?.totalPrice) {
    totalAmount = booking.totalPrice;
  } else if (booking?.tripjackPrice) {
    totalAmount = booking.tripjackPrice;
  } else if (booking?.amount) {
    totalAmount = booking.amount;
  } else if (booking?.order?.amount) {
    totalAmount = booking.order.amount;
  }

  const markupPrice = booking?.markupPrice || 0;
  const basePrice = booking?.tripjackPrice || 0;

  const bookingStatus = typeof booking?.status === 'string' ? booking.status.toLowerCase() : '';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Flight Booking Details</h2>
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
            <div className="relative h-64 rounded-lg overflow-hidden mb-6">
              <img
                src={'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500'}
                alt="Flight"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold shadow-md flex items-center gap-1">
                <span>{getTypeIcon()}</span>
                <span className="text-gray-800">Flight</span>
              </div>
              <div className="absolute top-3 right-3">
                <span
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(booking?.status)}`}
                >
                  {booking?.status || 'Unknown'}
                </span>
              </div>
            </div>

            {booking?.itemInfos?.AIR?.tripInfos &&
              booking.itemInfos.AIR.tripInfos.length > 0 &&
              booking.itemInfos.AIR.tripInfos.map((trip: any, tripIndex: number) => (
                <div key={tripIndex} className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Flight {tripIndex + 1}</h4>
                  {trip.sI &&
                    trip.sI.map((segment: any, segIndex: number) => (
                      <div key={segIndex} className="bg-blue-50 p-4 rounded-lg mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">
                              {segment.fD?.aI?.code} {segment.fD?.fN}
                            </span>
                            <span className="text-sm text-gray-600">({segment.fD?.aI?.name})</span>
                          </div>
                          <span className="text-sm bg-white px-2 py-1 rounded">
                            Aircraft: {segment.fD?.eT}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Departure</p>
                            <p className="font-semibold">{formatDateTime(segment.dt)}</p>
                            <p className="text-sm">
                              {segment.da?.city} ({segment.da?.code})
                            </p>
                            <p className="text-xs text-gray-600">
                              Terminal: {segment.da?.terminal || 'N/A'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Duration</p>
                            <p className="font-semibold text-blue-600">
                              {formatDuration(segment.duration)}
                            </p>
                            <p className="text-xs text-gray-500">Stops: {segment.stops}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Arrival</p>
                            <p className="font-semibold">{formatDateTime(segment.at)}</p>
                            <p className="text-sm">
                              {segment.aa?.city} ({segment.aa?.code})
                            </p>
                            <p className="text-xs text-gray-600">
                              Terminal: {segment.aa?.terminal || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}

            {(!booking?.itemInfos?.AIR?.tripInfos ||
              booking.itemInfos.AIR.tripInfos.length === 0) &&
              bookingStatus !== 'initiated' && (
                <div className="mb-6 bg-yellow-50 p-4 rounded-lg">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-blue-800">Fetching full booking details...</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-yellow-800">
                        <span
                          onClick={handleFetchFullDetails}
                          className="text-blue-600 underline cursor-pointer font-medium"
                        >
                          Click here
                        </span>{' '}
                        to see full details
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            const bookingId = booking?.bookingId;
                            if (!bookingId) {
                              notifyError('Booking ID not found');
                              return;
                            }

                            const response = await downloadFlightVoucher(bookingId);

                            const blob = new Blob([response.data], { type: 'application/pdf' });
                            const url = window.URL.createObjectURL(blob);

                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `voucher-${bookingId}.pdf`;
                            document.body.appendChild(link);
                            link.click();

                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Failed to download voucher:', error);
                            notifyError('Failed to download voucher. Please try again.');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Voucher
                      </button>
                    </div>
                  )}
                </div>
              )}

            {travellers && travellers.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Passenger Details</h4>
                <div className="space-y-3">
                  {travellers.map((passenger: any, index: React.Key | null | undefined) => {
                    const getValue = (obj: any, path: string) => {
                      return path.split('.').reduce((current, key) => current?.[key], obj);
                    };

                    const hasPassport =
                      getValue(passenger, 'passport.passportNumber') ||
                      getValue(passenger, 'passportNumber') ||
                      getValue(passenger, 'passport.expiryDate') ||
                      getValue(passenger, 'passportExpiryDate');

                    return (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-semibold">
                          {passenger.title} {passenger.firstName} {passenger.lastName}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <p className="text-gray-600">
                            Type: <span className="text-gray-900">{passenger.paxType || 'ADULT'}</span>
                          </p>
                          <p className="text-gray-600">
                            DOB: <span className="text-gray-900">{formatDate(passenger.dob)}</span>
                          </p>

                          {passenger.travellerId && (
                            <p className="text-gray-600 col-span-2">
                              Traveller ID: <span className="text-gray-900">{passenger.travellerId}</span>
                            </p>
                          )}

                          {/* PASSPORT DETAILS */}
                          {hasPassport && (
                            <div className="col-span-2 border-t border-gray-200 pt-2 mt-2">
                              <p className="font-semibold text-gray-700 text-xs mb-1">Passport Details</p>
                              <div className="grid grid-cols-2 gap-2">
                                {getValue(passenger, 'passport.passportNumber') && (
                                  <p className="text-gray-600">
                                    Passport Number: <span className="text-gray-900">{getValue(passenger, 'passport.passportNumber')}</span>
                                  </p>
                                )}
                                {getValue(passenger, 'passportNumber') && !getValue(passenger, 'passport.passportNumber') && (
                                  <p className="text-gray-600">
                                    Passport Number: <span className="text-gray-900">{getValue(passenger, 'passportNumber')}</span>
                                  </p>
                                )}
                                {getValue(passenger, 'passport.expiryDate') && (
                                  <p className="text-gray-600">
                                    Expiry Date: <span className="text-gray-900">{formatDate(getValue(passenger, 'passport.expiryDate'))}</span>
                                  </p>
                                )}
                                {getValue(passenger, 'passportExpiryDate') && !getValue(passenger, 'passport.expiryDate') && (
                                  <p className="text-gray-600">
                                    Expiry Date: <span className="text-gray-900">{formatDate(getValue(passenger, 'passportExpiryDate'))}</span>
                                  </p>
                                )}
                                {getValue(passenger, 'passport.issuingCountry') && (
                                  <p className="text-gray-600">
                                    Issuing Country: <span className="text-gray-900">{getValue(passenger, 'passport.issuingCountry')}</span>
                                  </p>
                                )}
                                {getValue(passenger, 'nationality') && (
                                  <p className="text-gray-600">
                                    Nationality: <span className="text-gray-900">{getValue(passenger, 'nationality')}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* EXISTING FIELDS */}
                          {passenger.ssrBaggageInfos && passenger.ssrBaggageInfos.length > 0 && (
                            <p className="text-gray-600 col-span-2">
                              Baggage: <span className="text-gray-900">
                                {passenger.ssrBaggageInfos.map((b: any) => `${b.quantity} ${b.code}`).join(', ')}
                              </span>
                            </p>
                          )}
                          {passenger.ssrMealInfos && passenger.ssrMealInfos.length > 0 && (
                            <p className="text-gray-600 col-span-2">
                              Meals: <span className="text-gray-900">
                                {passenger.ssrMealInfos.map((m: any) => m.code).join(', ')}
                              </span>
                            </p>
                          )}
                          {passenger.ssrSeatInfos && passenger.ssrSeatInfos.length > 0 && (
                            <p className="text-gray-600 col-span-2">
                              Seats: <span className="text-gray-900">
                                {passenger.ssrSeatInfos.map((s: any) => s.seatNumber).join(', ')}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GST DETAILS - Moved to booking level */}
            {(
              booking?.gstInfo?.gstNumber ||
              booking?.gstInfo?.registeredName ||
              booking?.gstNumber ||
              booking?.gst?.gstNumber
            ) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">GST Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      {/* GST Number */}
                      {(booking?.gstInfo?.gstNumber || booking?.gstNumber || booking?.gst?.gstNumber) && (
                        <div>
                          <p className="text-xs text-gray-500">GST Number</p>
                          <p className="font-semibold">
                            {booking?.gstInfo?.gstNumber || booking?.gstNumber || booking?.gst?.gstNumber}
                          </p>
                        </div>
                      )}

                      {/* Registered Name */}
                      {(booking?.gstInfo?.registeredName || booking?.gst?.registeredName) && (
                        <div>
                          <p className="text-xs text-gray-500">Registered Name</p>
                          <p className="font-semibold">
                            {booking?.gstInfo?.registeredName || booking?.gst?.registeredName}
                          </p>
                        </div>
                      )}

                      {/* Email */}
                      {(booking?.gstInfo?.email || booking?.gst?.email) && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-semibold">
                            {booking?.gstInfo?.email || booking?.gst?.email}
                          </p>
                        </div>
                      )}

                      {/* Mobile */}
                      {(booking?.gstInfo?.mobile || booking?.gst?.mobile) && (
                        <div>
                          <p className="text-xs text-gray-500">Mobile</p>
                          <p className="font-semibold">
                            {booking?.gstInfo?.mobile || booking?.gst?.mobile}
                          </p>
                        </div>
                      )}

                      {/* Address - Full width */}
                      {(booking?.gstInfo?.address || booking?.gst?.address) && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="font-semibold">
                            {booking?.gstInfo?.address || booking?.gst?.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {booking?.emergencyContact && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm">
                    Name: <span className="font-semibold">{booking.emergencyContact.name}</span>
                  </p>
                  <p className="text-sm">
                    Email: <span className="font-semibold">{booking.emergencyContact.email}</span>
                  </p>
                  <p className="text-sm">
                    Phone: <span className="font-semibold">{booking.emergencyContact.phone}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Booking ID</p>
                <p className="font-semibold">{booking?.bookingId}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Status</p>
                <p className={`font-semibold capitalize ${getStatusColor(booking?.status)}`}>
                  {booking?.status || 'Unknown'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Number of Passengers</p>
                <p className="font-semibold">{travellers?.length || 0} Passenger(s)</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Contact Email</p>
                <p className="font-semibold truncate">{contactInfo.email}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Contact Phone</p>
                <p className="font-semibold">{contactInfo.phone}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Base Price</p>
                <p className="font-semibold text-blue-600">
                  ₹{' '}
                  {basePrice.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              {markupPrice > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Markup Price</p>
                  <p className="font-semibold text-orange-600">
                    ₹{' '}
                    {markupPrice.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              )}
              <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">Total Price</p>
                <p className="font-semibold text-lg text-green-600">
                  ₹{' '}
                  {totalAmount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {showRemarkModal && (
          <CancellationModal
            booking={booking}
            isOpen={showRemarkModal}
            onClose={() => setShowRemarkModal(false)}
            onProceed={handleProceedToCharges}
          />
        )}

        {showCancellationCharges && cancellationData && (
          <CancellationChargesDisplayModal
            isOpen={showCancellationCharges}
            onClose={() => setShowCancellationCharges(false)}
            cancellationData={cancellationData}
            bookingDetails={booking}
            onConfirmCancel={handleConfirmCancellation}
            isLoading={isCancelling}
            error={cancellationError}
            remarks={cancellationRemarks}
            bookingId={booking?.bookingId}
          />
        )}
      </div>

      {showTripjackModal && tripjackBookingData && (
        <TripjackBookingDetailsModal
          booking={tripjackBookingData}
          onClose={() => {
            setShowTripjackModal(false);
            setTripjackBookingData(null);
          }}
          onCancelSuccess={onCancelSuccess}
        />
      )}
    </>
  );
};

export default BookingDetailsModal;
