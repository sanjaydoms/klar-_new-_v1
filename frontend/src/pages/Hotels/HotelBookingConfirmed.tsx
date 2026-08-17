import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaStar,
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaInfoCircle,
  FaBed,
  FaWifi,
  FaCoffee,
  FaParking,
  FaUtensils,
  FaPhoneAlt,
  FaMap,
  FaCalendarPlus,
  FaShareAlt,
  FaCar,
  FaUser,
  FaCheck,
  FaExclamationCircle,
  FaComments,
} from 'react-icons/fa';
import MainNavbar from '../../components/layout/Navbar/MainNavbar';
import { formatHotelImageUrl } from '@/utils/hotelUtils';
import { getHotelBookingDetails, downloadBookingPdf } from '@/features/hotels/services/hotelBookingService';
import { notifyError } from '@/utils/notify';

/**
 * Statuses the backend will not move a booking out of. Anything else — PENDING,
 * SUPPLIER_PENDING, MANUAL_REVIEW, PRECHECK_VALIDATED, PAYMENT_RESERVED — means
 * TripJack/RateGain is still deciding, so we keep polling booking details.
 */
const TERMINAL_STATUSES = [
  'CONFIRMED',
  'SUCCESS',
  'HELD',
  'ON_HOLD',
  'FAILED',
  'ABORTED',
  'CANCELLED',
];

const isTerminalStatus = (status?: string) => !!status && TERMINAL_STATUSES.includes(status);

/** Matches the backend poll window: 36 attempts × 5s = 180s. */
const MAX_POLL_ATTEMPTS = 36;
const POLL_INTERVAL_MS = 5000;

const calculateNights = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return 1;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
};

const HotelBookingConfirmed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParamsUrl] = useSearchParams();
  const state = (location.state as any) || {};
  const [bookingData, setBookingData] = useState<any>(state);
  const [isLoading, setIsLoading] = useState(
    !state.bookingDetails && !!searchParamsUrl.get('bookingId'),
  );
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>(state.status || 'PENDING');
  const [retryCount, setRetryCount] = useState(0);

  const {
    name,
    address,
    starRating,
    rating,
    images,
    city,
    selectedRoom,
    selectedRooms,
    searchParams,
    bookingDetails,
    traveler,
    pricingBreakdown,
    totalAmount,
    phone,
    rateComments: stateRateComments = '',
  } = bookingData || {};

  const [isDownloading, setIsDownloading] = useState(false);

  const roomsToBook: any[] =
    selectedRooms && selectedRooms.length > 0 ? selectedRooms : selectedRoom ? [selectedRoom] : [];

  const effectiveRateComments =
    roomsToBook.find((r: any) => r?.rateComments)?.rateComments ||
    selectedRoom?.rateComments ||
    stateRateComments ||
    '';

  const bookingIdFromUrl = searchParamsUrl.get('bookingId');
  useEffect(() => {
    const refreshData = async () => {
      const needsData = !bookingData?.bookingDetails || !isTerminalStatus(bookingStatus);


      if (needsData && bookingIdFromUrl && bookingIdFromUrl !== 'undefined') {
        if (!bookingData?.bookingDetails) setIsLoading(true);
        try {
          const data = await getHotelBookingDetails(bookingIdFromUrl);
          if (data) {
            setBookingData({
              name: data.hotelName || data.body?.booking?.hotel?.hotelName || state.name || '',
              address:
                data.hotelAddress ||
                data.body?.booking?.hotel?.address ||
                data.tripJackResponse?.hotelAddress ||
                data.rateGainResponse?.HotelReservation?.HotelAddress ||
                state.address ||
                '',
              city:
                data.city ||
                data.body?.booking?.hotel?.city ||
                data.tripJackResponse?.city ||
                data.rateGainResponse?.HotelReservation?.City ||
                state.city ||
                '',
              phone:
                data.hotelPhone ||
                data.phone ||
                data.body?.booking?.hotel?.phone ||
                data.tripJackResponse?.phone ||
                data.rateGainResponse?.HotelReservation?.Phone ||
                data.rateGainResponse?.body?.booking?.hotel?.phone ||
                data.hotelDetails?.phone ||
                state.phone ||
                '',
              images:
                data.images?.length > 0
                  ? data.images
                  : data.hotelImage
                    ? [data.hotelImage]
                    : state.images || [],
              starRating: data.starRating,
              rating: data.starRating,
              checkIn: data.checkIn || data.body?.booking?.hotel?.checkIn,
              checkOut: data.checkOut || data.body?.booking?.hotel?.checkOut,
              totalAmount: data.totalAmount || data.body?.booking?.totalNet,
              status: data.status || data.body?.booking?.status,
              bookingDetails: {
                ConfirmationNumber:
                  data.klarBookingId || data.confirmationNumber || data.body?.booking?.confirmationNumber,
                ReservationId:
                  data.reservationId ||
                  data.body?.booking?.reservationId ||
                  data.body?.booking?.echotoken,
                status: data.status || data.body?.booking?.status,
              },
              searchParams: {
                checkIn:
                  (data.checkIn || data.body?.booking?.hotel?.checkIn)?.toString()?.split('T')[0] ||
                  '',
                checkOut:
                  (data.checkOut || data.body?.booking?.hotel?.checkOut)
                    ?.toString()
                    ?.split('T')[0] || '',
                rooms: data.searchParams?.rooms || [{ Adults: 2, Children: 0 }],
              },
              selectedRoom: data.rooms?.[0] || data.body?.booking?.hotel?.rooms?.[0] || {},
              selectedRooms: data.rooms || data.body?.booking?.hotel?.rooms || [],
              rateComments:
                data.rateComments ||
                data.body?.booking?.hotel?.rooms?.[0]?.rates?.[0]?.rateComments ||
                data.rooms?.[0]?.rateComments ||
                data.rateGainResponse?.HotelReservation?.RateComments ||
                data.rateGainResponse?.body?.booking?.hotel?.rooms?.[0]?.rates?.[0]?.rateComments ||
                '',
              traveler: {
                title:
                  data.tripJackRequest?.roomTravellerInfo?.[0]?.travellerInfo?.[0]?.ti ||
                  state.traveler?.title ||
                  '',
                firstName:
                  data.tripJackRequest?.roomTravellerInfo?.[0]?.travellerInfo?.[0]?.fN ||
                  data.body?.booking?.holder?.name ||
                  data.guestName?.split(' ')[0] ||
                  state.traveler?.firstName ||
                  'Guest',
                lastName:
                  data.tripJackRequest?.roomTravellerInfo?.[0]?.travellerInfo?.[0]?.lN ||
                  data.body?.booking?.holder?.surname ||
                  data.guestName?.split(' ').slice(1).join(' ') ||
                  state.traveler?.lastName ||
                  '',
                email:
                  data.tripJackRequest?.deliveryInfo?.emails?.[0] ||
                  data.body?.booking?.holder?.email ||
                  state.traveler?.email ||
                  '',
                mobile:
                  data.tripJackRequest?.deliveryInfo?.contacts?.[0] ||
                  data.body?.booking?.holder?.phone ||
                  state.traveler?.mobile ||
                  '',
              },
              pricingBreakdown: {
                baseFare: data.totalAmount || 0,
                taxesFees: 0,
                totalAmount: data.totalAmount || 0,
                netAmount: data.netAmount || 0,
                markupAmount: data.markupAmount || 0,
              },
            });
            if (data.status && data.status !== bookingStatus) setBookingStatus(data.status);
          }
        } catch (err: any) {
          if (!bookingData?.bookingDetails) setError('Failed to load booking details');
        } finally {
          setIsLoading(false);
        }
      }
    };
    refreshData();
  }, [bookingIdFromUrl, retryCount]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | undefined;
    if (!isTerminalStatus(bookingStatus) && !error && retryCount < MAX_POLL_ATTEMPTS) {
      pollInterval = setInterval(() => setRetryCount((prev) => prev + 1), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [bookingStatus, error, bookingIdFromUrl, retryCount]);

  // The poll gave up but the backend cron keeps working the booking. Tell the
  // guest that rather than spinning at them forever.
  const pollExhausted = !isTerminalStatus(bookingStatus) && retryCount >= MAX_POLL_ATTEMPTS;

  useEffect(() => {
    const handlePopState = () => navigate('/dashboard', { replace: true });
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  const bookingId =
    bookingDetails?.klarBookingId || bookingDetails?.ConfirmationNumber ||
    bookingDetails?.booking?.confirmationNumber ||
    bookingDetails?.body?.booking?.confirmationNumber ||
    bookingDetails?.bookingId ||
    bookingData?.klarBookingId || bookingData?.confirmationNumber ||
    bookingData?.bookingId ||
    bookingData?.rateGainResponse?.confirmationNumber ||
    'Processing...';
  const supplierRef =
    bookingDetails?.ReservationId ||
    bookingDetails?.booking?.reservationId ||
    bookingDetails?.body?.booking?.reservationId ||
    bookingDetails?.body?.booking?.echotoken ||
    bookingDetails?.supplierReference ||
    bookingData?.reservationId ||
    bookingData?.rateGainResponse?.echotoken ||
    'Processing...';

  const pricingData = pricingBreakdown || selectedRoom?.pricing || {};
  const baseFare = pricingData.basePrice ?? pricingData.baseFare ?? selectedRoom?.price ?? 0;
  const taxesFees = pricingData.taxesIncluded
    ? 0
    : (pricingData.taxes ?? pricingData.taxesFees ?? selectedRoom?.taxes ?? 0);
  const totalPaid =
    pricingData.finalTotalPrice ?? pricingData.totalAmount ?? totalAmount ?? baseFare;

  const pType =
    bookingDetails?.paymentType ||
    bookingDetails?.booking?.hotel?.rooms?.[0]?.rates?.[0]?.paymentType ||
    bookingData?.paymentType ||
    '';
  const vRemark =
    bookingDetails?.voucherRemark ||
    bookingDetails?.booking?.voucherRemark ||
    bookingData?.voucherRemark ||
    '';
  const rComments =
    bookingDetails?.booking?.hotel?.rooms?.[0]?.rates?.[0]?.rateComments ||
    bookingDetails?.rateComments ||
    bookingData?.rateComments ||
    effectiveRateComments ||
    '';

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatCancellationDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const handleDownload = async (type: 'Voucher' | 'GST_Invoice') => {
    try {
      setIsDownloading(true);
      const blob = await downloadBookingPdf(bookingIdFromUrl as string, type);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Klar_${type}_${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      notifyError(`Failed to download ${type}. Please try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddCalendar = () => {
    const text = encodeURIComponent(`Hotel Booking: ${name}`);
    const details = encodeURIComponent(`Booking ID: ${bookingId}\nSupplier Ref: ${supplierRef}`);
    const loc = encodeURIComponent(address || city || '');

    const formatCalDate = (dateStr: string) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0].replace(/-/g, '');
    };

    const start = formatCalDate(searchParams?.checkIn);
    const end = formatCalDate(searchParams?.checkOut);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${loc}`;
    window.open(url, '_blank');
  };

  const handleShareBooking = async () => {
    try {
      const text = `I've booked a stay at ${name} from ${formatDate(searchParams?.checkIn)} to ${formatDate(searchParams?.checkOut)}!`;

      if (navigator.share) {
        await navigator.share({
          title: `Hotel Booking - ${name}`,
          text: text,
        });
      } else {
        notifyError(
          'Direct sharing is not supported on this device. Please use the download button to get the PDF.',
        );
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MainNavbar activeService="hotels" />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#2c3e91] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );

  if (error || (!location.state && !bookingData?.bookingDetails))
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MainNavbar activeService="hotels" />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center max-w-sm w-full bg-white p-8 rounded-2xl shadow-sm">
            <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || "We couldn't find the booking information."}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#1e1e6e] text-white px-6 py-3 rounded-xl font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );

  const isSuccess = bookingStatus === 'CONFIRMED' || bookingStatus === 'SUCCESS';
  const nights = calculateNights(searchParams?.checkIn, searchParams?.checkOut);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 md:pb-12">
      <MainNavbar activeService="hotels" />

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* TOP BANNER */}
        <div
          className={`rounded-2xl p-10 mb-6 text-center border shadow-sm ${isSuccess
            ? 'bg-[#F0FDF4] border-green-100'
            : bookingStatus === 'HELD' || bookingStatus === 'ON_HOLD' || bookingStatus === 'MANUAL_REVIEW' || bookingStatus === 'PENDING' || pollExhausted
              ? 'bg-yellow-50 border-yellow-100'
              : bookingStatus === 'FAILED' || bookingStatus === 'ABORTED'
                ? 'bg-red-50 border-red-100'
                : 'bg-blue-50 border-blue-100'
            }`}
        >
          {isSuccess ? (
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <FaCheckCircle className="text-[#00B14F] text-5xl" />
            </div>
          ) : bookingStatus === 'FAILED' || bookingStatus === 'ABORTED' ? (
            <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
          ) : pollExhausted ? (
            <FaInfoCircle className="text-yellow-500 text-5xl mx-auto mb-4" />
          ) : (
            <div className="flex flex-col items-center justify-center mb-4">
              <div className={`w-12 h-12 border-4 ${bookingStatus === 'MANUAL_REVIEW' || bookingStatus === 'PENDING' ? 'border-yellow-500' : 'border-blue-600'} border-t-transparent rounded-full animate-spin shadow-sm`}></div>
            </div>
          )}

          <h1 className="text-3xl font-medium text-gray-900 mb-2">
            {isSuccess
              ? 'Booking Confirmed!'
              : bookingStatus === 'HELD' || bookingStatus === 'ON_HOLD'
                ? 'Booking Held (Awaiting Payment)'
                : bookingStatus === 'FAILED' || bookingStatus === 'ABORTED'
                  ? 'Booking Failed'
                  : pollExhausted
                    ? 'Confirmation is Taking Longer Than Usual'
                    : bookingStatus === 'MANUAL_REVIEW'
                      ? 'Booking Under Manual Review'
                      : bookingStatus === 'PENDING'
                        ? 'Booking Pending Confirmation'
                        : 'Booking in Progress...'}
          </h1>
          <p className="text-gray-600 mb-6">
            {isSuccess
              ? 'Your hotel reservation has been successfully completed'
              : bookingStatus === 'HELD' || bookingStatus === 'ON_HOLD'
                ? 'Your room is reserved. Please complete payment.'
                : bookingStatus === 'FAILED' || bookingStatus === 'ABORTED'
                  ? 'We were unable to complete your booking. Please contact support.'
                  : pollExhausted
                    ? 'Your payment is safe and we are still confirming with the hotel. You will receive an email as soon as it is confirmed — you can also check My Bookings later.'
                    : bookingStatus === 'MANUAL_REVIEW'
                      ? 'The supplier has flagged this booking for manual review. We are continually checking for updates.'
                      : bookingStatus === 'PENDING'
                        ? 'We are waiting for final confirmation from the hotel. This may take a little longer.'
                        : 'We are finalising your booking with the hotel. This may take a few moments.'}
          </p>

          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 font-medium">
            <span>
              Booking ID: <span className="font-bold text-gray-900">{bookingId}</span>
            </span>

            <span>
              Supplier Reference: <span className="font-bold text-gray-900">{supplierRef}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* E-Voucher Hero Card */}
            <div className="bg-[#485390] rounded-2xl p-6 text-white shadow-sm">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-4 border border-white/10">
                <FaDownload /> E-Voucher
              </div>
              <h2 className="text-3xl font-bold mb-2">{name}</h2>
              <div className="flex items-center gap-2 text-xs mb-1">
                <div className="flex text-[#FFC107]">
                  {[...Array(Math.min(starRating || rating || 3, 5))].map((_, i) => (
                    <FaStar key={i} />
                  ))}
                </div>
                <span className="text-blue-100">{starRating || rating || 3} Star Hotel</span>
              </div>
              <p className="text-sm text-blue-200 mb-8">
                {roomsToBook[0]?.title || roomsToBook[0]?.roomName || 'Deluxe Room'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/5">
                  <div className="flex items-center gap-2 text-blue-200 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <FaCalendarAlt /> Check-in
                  </div>
                  <p className="font-bold text-lg">{formatDate(searchParams?.checkIn)}</p>
                  <p className="text-xs text-blue-300">
                    After {selectedRoom?.checkInTime || '3:00 PM'}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/5">
                  <div className="flex items-center gap-2 text-blue-200 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <FaCalendarAlt /> Check-out
                  </div>
                  <p className="font-bold text-lg">{formatDate(searchParams?.checkOut)}</p>
                  <p className="text-xs text-blue-300">
                    Before {selectedRoom?.checkOutTime || '11:00 AM'}
                  </p>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 flex justify-between items-center text-sm backdrop-blur-sm border border-white/5">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                  <FaCalendarAlt /> Total Stay Duration
                </div>
                <div className="font-bold">
                  {nights} Night{nights > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Main Content Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
              {/* Hotel Location */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-4 uppercase">
                  Hotel Location
                </h3>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F0F4FF] flex items-center justify-center shrink-0">
                    <FaMapMarkerAlt className="text-[#3B5284]" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">{name}</p>
                    <p className="text-sm text-gray-500">
                      {address}, {city}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Room Details */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-4 uppercase">
                  Room Details
                </h3>
                <div className="bg-[#F8F9FA] rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <FaBed className="text-gray-400 text-lg" />
                    <span className="font-bold text-gray-900">
                      {roomsToBook[0]?.title || roomsToBook[0]?.roomName || 'Deluxe Room'}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 text-xs text-gray-600 ml-8 font-medium">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-gray-400" /> {searchParams?.rooms?.[0]?.Adults || 2}{' '}
                      Adults
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCheck className="text-gray-400" /> {roomsToBook.length} Room
                      {roomsToBook.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Amenities */}
              {((roomsToBook[0]?.amenities && roomsToBook[0].amenities.length > 0) ||
                (roomsToBook[0]?.features && roomsToBook[0].features.length > 0)) && (
                  <>
                    <div>
                      <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-4 uppercase">
                        Amenities Included
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-700">
                        {(roomsToBook[0]?.amenities || roomsToBook[0]?.features || [])
                          .slice(0, 6)
                          .map((amenity: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <FaCheck />
                              </div>
                              <span className="font-medium capitalize">
                                {amenity.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <hr className="border-gray-100" />
                  </>
                )}

              {/* Guest Details */}
              {traveler?.firstName && (
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-4 uppercase">
                    Guest Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-[#F8F9FA] p-3 rounded-xl border border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-[#E8EEFF] flex items-center justify-center text-[#3B5284] font-bold">
                        <FaUser />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {traveler?.title} {traveler?.firstName} {traveler?.lastName}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">
                          Primary Guest {traveler?.email ? `• ${traveler.email}` : ''}{' '}
                          {traveler?.mobile ? `• ${traveler.mobile}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Important Information */}
              <div className="bg-[#FFF8E6] border border-[#FFE082] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#F57C00] font-bold text-sm mb-3">
                  <FaExclamationCircle /> Important Information
                </div>
                <ul className="space-y-2 text-xs text-[#E65100] list-disc list-inside">
                  {vRemark && <li className="font-bold leading-relaxed">{vRemark}</li>}
                  <li>Valid government-issued photo ID required at check-in</li>
                  <li>Credit card required for incidental charges</li>
                  <li>Early check-in subject to availability</li>
                  <li>Late check-out may incur additional charges</li>
                  {rComments && <li className="leading-relaxed">{rComments}</li>}
                </ul>
              </div>

              <hr className="border-gray-100" />

              {/* Payment Summary */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-4 uppercase">
                  Payment Summary
                </h3>
                <div className="bg-[#F8F9FA] rounded-xl p-5 border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Base Price (Net Provider Rate)</span>
                    <span className="font-bold text-gray-900">
                      ₹{Math.round(pricingData.netAmount || baseFare).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <hr className="border-gray-200 my-2" />
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Amount Paid</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{Math.round(totalAmount || totalPaid).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-200 mt-2">
                        <FaCheckCircle /> {pType === 'AT_WEB' ? 'Paid Online' : pType || 'Paid'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Cancellation Policy */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-4 uppercase">
                  Cancellation Policy
                </h3>
                <div className="space-y-3">
                  {roomsToBook[0]?.cancellationPolicies &&
                    roomsToBook[0].cancellationPolicies.length > 0 ? (
                    roomsToBook[0].cancellationPolicies.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-[#F0F4FF] border border-[#D6E0FF] rounded-xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm ${parseFloat(p.amount) === 0 ? 'text-green-600' : 'text-red-500'}`}
                          >
                            {parseFloat(p.amount) === 0 ? <FaCheck /> : <FaExclamationCircle />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCancellationDate(p.from)} onwards
                            </p>
                            <p className="text-xs text-gray-500">
                              Penalty: {p.amount}
                              {!p.amount.toString().includes('%')
                                ? ' ' + (p.currency || 'INR')
                                : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (() => {
                    const room = roomsToBook[0] || {};
                    const isFreeCancel = room.isRefundable || room.cancellationPolicy?.toUpperCase().includes('FREE') || room.refundable;
                    // No supplier exemption — see HotelDetailPage. This is the
                    // post-payment page: a RateGain customer could complete a
                    // non-refundable booking and never once be told.
                    const isNonRef = !isFreeCancel;

                    if (isFreeCancel) {
                      return (
                        <div className="flex items-center justify-between bg-[#F0FDF4] border border-green-100 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                              <FaCheck />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">Free Cancellation</p>
                              <p className="text-xs text-gray-500">
                                This booking is refundable as per hotel policies.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (isNonRef) {
                      return (
                        <div className="flex items-center justify-between bg-[#FFF4F6] border border-[#FFE4EB] rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-600 shadow-sm">
                              <FaExclamationCircle />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">Non-Refundable</p>
                              <p className="text-xs text-gray-500">
                                This booking is non-refundable as per hotel policies.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleDownload('Voucher')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    <FaDownload className="text-gray-400" /> Download Voucher
                  </div>
                  <FaCheck className="text-gray-300 text-xs" />
                </button>
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    <FaEnvelope className="text-gray-400" /> Email Voucher
                  </div>
                  <FaCheck className="text-gray-300 text-xs" />
                </button>
                <button
                  onClick={handleAddCalendar}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    <FaCalendarPlus className="text-gray-400" /> Add to Calendar
                  </div>
                  <FaCheck className="text-gray-300 text-xs" />
                </button>
                <button
                  onClick={handleShareBooking}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    <FaShareAlt className="text-gray-400" /> Share Booking
                  </div>
                  <FaCheck className="text-gray-300 text-xs" />
                </button>
              </div>
            </div>
            {/* Status Card */}
            {isSuccess && (
              <div className="bg-[#00B14F] rounded-2xl shadow-sm p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <FaCalendarAlt className="text-xl opacity-80" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                      Status
                    </p>
                    <p className="font-bold text-lg">Confirmed</p>
                  </div>
                </div>
                <p className="text-sm text-green-50 mt-4 leading-relaxed">
                  Your hotel reservation is confirmed.
                  <br />
                  Check-in on {formatDate(searchParams?.checkIn)} after{' '}
                  {selectedRoom?.checkInTime || '3:00 PM'}.
                </p>
              </div>
            )}
            {/* Hotel Contact */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Hotel Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-[#F8F9FA] p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <FaPhoneAlt className="text-xs" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Call Hotel</p>
                    <p className="text-[10px] text-gray-500">
                      {phone || 'Check voucher for details'}
                    </p>
                  </div>
                </div>
                {effectiveRateComments && (
                  <div className="bg-[#FFF8E6] border border-[#FFE082] rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 text-[#F57C00] font-bold text-sm mb-2">
                      <FaInfoCircle /> Note from Hotel
                    </div>
                    <p className="text-xs text-[#E65100] leading-relaxed whitespace-pre-wrap">
                      {effectiveRateComments}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Need Help? */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-[#FFF4F6] p-3 rounded-xl border border-[#FFE4EB] cursor-pointer hover:bg-[#FFEDF1] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                    <FaPhoneAlt className="text-xs" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Call Support</p>
                    <p className="text-[10px] text-pink-600/70">24/7 Available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#F0FDF4] p-3 rounded-xl border border-green-100 cursor-pointer hover:bg-green-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <FaComments className="text-xs" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Live Chat</p>
                    <p className="text-[10px] text-green-600/70">Instant Response</p>
                  </div>
                </div>
              </div>
            </div>{' '}
          </div>
        </div>
      </div>

    </div>
  );
};

export default HotelBookingConfirmed;
