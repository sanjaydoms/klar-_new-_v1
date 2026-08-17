import CancellationModal from '../CancellationModal';
import CancellationChargesDisplayModal from '../CancellationChargesDisplayModal';
import { useState } from 'react';
import { notifyError, notifySuccess } from '@/utils/notify';

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

const getTypeIcon = () => '✈️';

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

const formatDuration = (minutes: number) => {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const formatCurrency = (amount: number) => {
  return `₹ ${amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TripjackBookingDetailsModal = ({
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
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

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

  const order = booking?.data?.order || booking?.order;
  const itemInfos = booking?.data?.itemInfos || booking?.itemInfos;
  const airInfo = itemInfos?.AIR;
  const tripInfos = airInfo?.TripInformation || airInfo?.tripInfos || [];
  const travellerInfos = airInfo?.TravellerInformation || airInfo?.travellerInfos || [];
  const totalPriceInfo = airInfo?.totalPriceInfo;
  const gstInfo = booking?.data?.gstInfo || booking?.gstInfo;
  const isSotoBooking = booking?.data?.isSotoBooking || booking?.isSotoBooking || false;

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
      const bookingId = order?.BookingId || order?.bookingId;

      setShowCancellationCharges(false);
      onCancelSuccess(bookingId);
      notifySuccess('Booking cancelled successfully!');
      onClose();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to cancel booking';
      setCancellationError(errorMessage);
      notifyError(`Cancellation failed: ${errorMessage}`);
    } finally {
      setIsCancelling(false);
    }
  };


  const getPassengerNames = () => {
    if (!travellerInfos.length) return 'N/A';
    return travellerInfos
      .map((t: any) => `${t.Title || ''} ${t.FirstName || ''} ${t.LastName || ''}`.trim())
      .join(', ');
  };

  // Calculate total amount
  const getTotalAmount = () => {
    return (
      order?.Amount ||
      order?.amount ||
      totalPriceInfo?.totalFareDetail?.FareComponents?.TotalFare ||
      0
    );
  };

  const getBaseFare = () => {
    return totalPriceInfo?.totalFareDetail?.FareComponents?.BaseFare || 0;
  };

  const getTaxAmount = () => {
    return totalPriceInfo?.totalFareDetail?.FareComponents?.TotalAdditionalFare || 0;
  };

  const passengerNames = getPassengerNames();
  const totalAmount = getTotalAmount();
  const baseFare = getBaseFare();
  const taxAmount = getTaxAmount();
  const bookingStatus = order?.status || booking?.status || '';

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
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
          {/* Hero Image */}
          <div className="relative h-64 rounded-lg overflow-hidden mb-6">
            <img
              src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500"
              alt="Flight"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold shadow-md flex items-center gap-1">
              <span>{getTypeIcon()}</span>
              <span className="text-gray-800">Flight</span>
            </div>
            <div className="absolute top-3 right-3">
              <span
                className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(bookingStatus)}`}
              >
                {bookingStatus || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Booking Info */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Flight Booking</h3>
            <p className="text-gray-600 mb-1">Passenger: {passengerNames}</p>
            <p className="text-sm text-gray-500">
              Booking ID: {order?.BookingId || order?.bookingId}
            </p>
            <p className="text-sm text-gray-500">
              PNR: {
                travellerInfos.length > 0 && travellerInfos[0]?.pnrDetails
                  ? Object.values(travellerInfos[0].pnrDetails).join(', ')
                  : order?.PNR || order?.pnr || 'N/A'
              }
            </p>
            <p className="text-sm text-gray-500">Booked on: {formatDateTime(order?.createdOn)}</p>
            {isSotoBooking && <p className="text-sm text-orange-600 mt-1">⚠️ Soto Booking</p>}
          </div>

          {/* Passenger Details */}
          {travellerInfos.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Passenger Details</h4>
              <div className="space-y-3">
                {travellerInfos.map((passenger: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-semibold">
                      {passenger.Title} {passenger.FirstName} {passenger.LastName}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <p className="text-gray-600">
                        Type:{' '}
                        <span className="text-gray-900">{passenger.PaxType || passenger.pt}</span>
                      </p>
                      <p className="text-gray-600">
                        DOB:{' '}
                        <span className="text-gray-900">
                          {formatDate(passenger.DateOfBirth || passenger.dob)}
                        </span>
                      </p>

                      {/* PNR Details */}
                      {passenger.pnrDetails && Object.keys(passenger.pnrDetails).length > 0 && (
                        <p className="text-gray-600 col-span-2">
                          PNR:{' '}
                          <span className="text-gray-900">
                            {Object.values(passenger.pnrDetails).join(', ')}
                          </span>
                        </p>
                      )}

                      {/* Ticket Numbers */}
                      {passenger.ticketNumberDetails &&
                        Object.keys(passenger.ticketNumberDetails).length > 0 && (
                          <p className="text-gray-600 col-span-2">
                            Ticket:{' '}
                            <span className="text-gray-900">
                              {Object.values(passenger.ticketNumberDetails).join(', ')}
                            </span>
                          </p>
                        )}

                      {/* Check-in Status */}
                      {passenger.checkinStatusMap &&
                        Object.keys(passenger.checkinStatusMap).length > 0 && (
                          <p className="text-gray-600 col-span-2">
                            Check-in:{' '}
                            <span className="text-gray-900">
                              {Object.entries(passenger.checkinStatusMap)
                                .map(
                                  ([route, status]) =>
                                    `${route}: ${status ? 'Checked-in' : 'Not Checked-in'}`,
                                )
                                .join(', ')}
                            </span>
                          </p>
                        )}

                      {/* Fare Details for passenger */}
                      {passenger.FareDetails && (
                        <>
                          <p className="text-gray-600">
                            Cabin Class:{' '}
                            <span className="text-gray-900">
                              {passenger.FareDetails.CabinClass}
                            </span>
                          </p>
                          <p className="text-gray-600">
                            Class Code:{' '}
                            <span className="text-gray-900">{passenger.FareDetails.ClassCode}</span>
                          </p>
                          <p className="text-gray-600 col-span-2">
                            Baggage:{' '}
                            <span className="text-gray-900">
                              {passenger.FareDetails.BaggageInfo?.CheckInBaggage} (Check-in) /{' '}
                              {passenger.FareDetails.BaggageInfo?.ClassCode} (Cabin)
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passport Details */}
          {travellerInfos.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Passport Details</h4>
              <div className="space-y-3">
                {travellerInfos.map((passenger: any, index: number) => {
                  const hasPassport = passenger.PassportNumber || passenger.passportNumber;
                  if (!hasPassport) return null;

                  return (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-semibold">
                        {passenger.Title} {passenger.FirstName} {passenger.LastName}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-gray-600">
                          Passport Number: <span className="text-gray-900 font-medium">
                            {passenger.PassportNumber || passenger.passportNumber}
                          </span>
                        </p>
                        <p className="text-gray-600">
                          Nationality: <span className="text-gray-900 font-medium">
                            {passenger.PassportNationality || passenger.passportNationality || 'N/A'}
                          </span>
                        </p>
                        <p className="text-gray-600">
                          Issue Date: <span className="text-gray-900 font-medium">
                            {formatDate(passenger.PassportIssueDate || passenger.passportIssueDate)}
                          </span>
                        </p>
                        <p className="text-gray-600">
                          Expiry Date: <span className="text-gray-900 font-medium">
                            {formatDate(passenger.PassportExpiryDate || passenger.passportExpiryDate)}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GST Information */}
          {gstInfo && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">GST Information</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">GST Number:</span> {gstInfo.GSTNumber || gstInfo.gstNumber || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Registered Name:</span> {gstInfo.RegisteredName || gstInfo.registeredName || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Email:</span> {gstInfo.email || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Mobile:</span> {gstInfo.mobile || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Address:</span> {gstInfo.address || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">SEZ:</span> {gstInfo.isez ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          )}

          {/* Flight Segments */}
          {tripInfos.map((trip: any, tripIndex: number) => (
            <div key={tripIndex} className="mb-8">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                Flight {tripIndex + 1}
                {trip.isFullRefundViaCancellation && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Full Refund Available
                  </span>
                )}
              </h4>

              {trip.SegmentInformation?.map((segment: any, segIndex: number) => {
                const flightDetails = segment.FlightDetails;
                const airlineInfo = flightDetails?.AirlineInfo;
                const departureAirport = segment.DepartureAirport;
                const arrivalAirport = segment.ArrivalAirport;
                const baggageInfo = segment.BaggageInfo;
                const isExpanded = expandedSegment === `${tripIndex}-${segIndex}`;

                return (
                  <div key={segIndex} className="bg-blue-50 p-4 rounded-lg mb-3">
                    {/* Flight Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          {airlineInfo?.SSRCode || airlineInfo?.code}{' '}
                          {flightDetails?.FirstName || flightDetails?.fN}
                        </span>
                        <span className="text-sm text-gray-600">
                          ({airlineInfo?.AirlineName || airlineInfo?.name})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-sm bg-white px-2 py-1 rounded">
                          Aircraft: {flightDetails?.EquipmentType || flightDetails?.eT}
                        </span>
                        <button
                          onClick={() =>
                            setExpandedSegment(isExpanded ? null : `${tripIndex}-${segIndex}`)
                          }
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isExpanded ? '▼ Less' : '▶ More'}
                        </button>
                      </div>
                    </div>

                    {/* Flight Route */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Departure</p>
                        <p className="font-semibold">{formatDateTime(segment.DepartureTime)}</p>
                        <p className="text-sm">
                          {departureAirport?.city} (
                          {departureAirport?.SSRCode || departureAirport?.code})
                        </p>
                        <p className="text-xs text-gray-600">
                          Terminal: {departureAirport?.terminal || 'N/A'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-semibold text-blue-600">
                          {formatDuration(segment.Duration)}
                        </p>
                        <p className="text-xs text-gray-500">Stops: {segment.NumberOfStops || 0}</p>
                        <p className="text-xs text-gray-500">
                          Refundable: {segment.IsRefundableSegment ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Arrival</p>
                        <p className="font-semibold">{formatDateTime(segment.ArrivalTime)}</p>
                        <p className="text-sm">
                          {arrivalAirport?.city} ({arrivalAirport?.SSRCode || arrivalAirport?.code})
                        </p>
                        <p className="text-xs text-gray-600">
                          Terminal: {arrivalAirport?.terminal || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                        {/* Baggage Info */}
                        {baggageInfo?.tI && baggageInfo.tI.length > 0 && (
                          <div className="bg-white/50 p-3 rounded">
                            <p className="font-semibold text-sm mb-2">Baggage Information</p>
                            {baggageInfo.tI.map((item: any, idx: number) => (
                              <div key={idx} className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-gray-600">Check-in Baggage:</p>
                                  <p className="font-semibold">
                                    {item.FareDetails?.BaggageInfo?.CheckInBaggage || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Cabin Baggage:</p>
                                  <p className="font-semibold">
                                    {item.FareDetails?.BaggageInfo?.ClassCode || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Cabin Class:</p>
                                  <p className="font-semibold">{item.FareDetails?.CabinClass}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Fare Basis:</p>
                                  <p className="font-semibold">{item.FareDetails?.FareBasis}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fare Components */}
                        {segment.BaggageInfo?.tI?.[0]?.FareDetails && (
                          <div className="bg-white/50 p-3 rounded">
                            <p className="font-semibold text-sm mb-2">Fare Breakdown</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              {Object.entries(
                                segment.BaggageInfo.tI[0].FareDetails.FareComponents || {},
                              ).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600">{key}:</span>
                                  <span className="font-semibold">
                                    {formatCurrency(Number(value))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Price Summary */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Price Summary</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Base Fare</p>
                  <p className="font-semibold text-lg">{formatCurrency(baseFare)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Taxes & Fees</p>
                  <p className="font-semibold text-lg">{formatCurrency(taxAmount)}</p>
                </div>
                {order?.markup > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Markup</p>
                    <p className="font-semibold text-lg text-orange-600">
                      {formatCurrency(order.markup)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-2xl text-green-600">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>

              {/* Tax Breakdown */}
              {totalPriceInfo?.totalFareDetail?.AdditionalFareComponents?.TotalAdditionalFare && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="font-semibold text-sm mb-2">Tax Breakdown</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {Object.entries(
                      totalPriceInfo.totalFareDetail.AdditionalFareComponents.TotalAdditionalFare,
                    ).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-semibold">{formatCurrency(Number(value))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
          bookingId={order?.BookingId || order?.bookingId}
        />
      )}
    </div>
  );
};

export default TripjackBookingDetailsModal;
