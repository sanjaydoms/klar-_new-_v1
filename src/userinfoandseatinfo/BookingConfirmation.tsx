import GuestInformation from '../components/BookingConfirmation/GuestInformation';
import FlightDetails from '../components/BookingConfirmation/FlightDetails';
import PriceInformation from '../components/BookingConfirmation/PriceInformation';
import BookingActions from '../components/BookingConfirmation/BookingActions';
import Success from '/logo/book.png?url';
import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
// import PriceCard from '@/components/BookingConfirmation/PriceCard';
import {
  getFlightBookingsByBookingId,
  getFlightBookingsByBookingIdFromTripjack,
} from '../api/flightService.api';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { resolveBookingId } from './resolveBookingId';

// Skeleton Components
const FlightDetailsSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
    </div>
    <div className="border-t border-gray-200 pt-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="text-center">
          <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="text-right">
          <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    </div>
    <div className="h-px bg-gray-200"></div>
    <div className="flex justify-between text-sm">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
);

const PriceInformationSkeleton = () => (
  <div className="p-6 animate-pulse">
    <div className="space-y-3">
      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

const GuestInformationSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

export default function BookingConfirmation() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const bookingId = resolveBookingId(searchParams, location.state);

  const [bookingData, setBookingData] = useState<any>(null);
  const [tripjackData, setTripjackData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Steps for progress bar
  const steps = [
    { id: 1, name: 'Flights' },
    { id: 2, name: 'Traveller Information' },
    { id: 3, name: 'Seat & Meal' },
    { id: 4, name: 'Payment method' },
    { id: 5, name: 'Booking Confirmed' },
  ];

  const currentStep = 5;

  useEffect(() => {
    console.log('🔍 URL Search Params:', searchParams.toString());
    console.log('🔍 Location State:', location.state);
    console.log('🔍 Booking ID from URL:', searchParams.get('bookingId'));
    console.log('🔍 Booking ID from state:', location.state?.bookingId);
    console.log('🔍 Final Booking ID:', bookingId);

    if (!bookingId) {
      console.error('❌ No booking ID found in URL or state');
      setError('No booking ID found. Please provide a valid booking ID.');
      setLoading(false);
      return;
    }

    const fetchBookingData = async () => {
      try {
        console.log('🚀 Fetching booking data for ID:', bookingId);

        // Call both APIs in parallel
        const [localBooking, tripjackBooking] = await Promise.all([
          getFlightBookingsByBookingId(bookingId),
          getFlightBookingsByBookingIdFromTripjack(bookingId),
        ]);

        console.log('✅ Local Booking Data:', localBooking);
        console.log('✅ Tripjack Booking Data:', tripjackBooking);

        setBookingData(localBooking);
        setTripjackData(tripjackBooking);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error fetching booking data:', err);
        console.error('❌ Error response:', err?.response);
        console.error('❌ Error message:', err?.message);
        setError(err?.message || 'Failed to fetch booking details');
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [bookingId, searchParams, location.state]);

  // Helper functions for formatting
  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string | number | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Only show error state (without loading spinner)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Booking</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-400 mt-2">Booking ID: {bookingId || 'Not provided'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine if data is ready
  const isDataReady = !loading && tripjackData && bookingData;

  // Get data from tripjack response (which has the full structure)
  const tripjackResponse = tripjackData?.data;
  const localResponse = bookingData?.data;

  // Extract trip information from tripjack response
  const tripInfoArray = tripjackResponse?.itemInfos?.AIR?.TripInformation || [];
  const travellerInfoArray = tripjackResponse?.itemInfos?.AIR?.TravellerInformation || [];
  const totalPriceInfo = tripjackResponse?.itemInfos?.AIR?.totalPriceInfo;
  const fareDetails = totalPriceInfo?.totalFareDetail?.FareComponents;
  const additionalFare = fareDetails?.AdditionalFareComponents?.TotalAdditionalFare || {};
  const localData = localResponse || {};

  // Build flight data for ALL segments
  console.log('🔍 tripInfoArray:', tripInfoArray);

  const allFlightData = tripInfoArray.flatMap((trip: any, tripIndex: number) => {
    const segments = trip?.SegmentInformation || [];
    console.log(`✈️ Trip ${tripIndex + 1} segments:`, segments);

    return segments.map((segment: any, segIndex: number) => {
      const flightData = {
        from: segment?.DepartureAirport?.city || segment?.DepartureAirport?.cityCode || 'N/A',
        to: segment?.ArrivalAirport?.city || segment?.ArrivalAirport?.cityCode || 'N/A',
        airline: segment?.FlightDetails?.AirlineInfo?.AirlineName || 'N/A',
        flightNo: `${segment?.FlightDetails?.AirlineInfo?.SSRCode || ''} ${segment?.FlightDetails?.FirstName || ''}`,
        class: segment?.CabinClass || segment?.FareDetails?.CabinClass || 'ECONOMY',
        date: formatDate(segment?.DepartureTime),
        departure: formatTime(segment?.DepartureTime),
        departureDate: formatDate(segment?.DepartureTime),
        arrival: formatTime(segment?.ArrivalTime),
        arrivalDate: formatDate(segment?.ArrivalTime),
        baggage:
          segment?.BaggageInfo?.CheckInBaggage ||
          travellerInfoArray[0]?.FareDetails?.BaggageInfo?.CheckInBaggage ||
          '',
        adult: `Adult x ${travellerInfoArray.length || 1}`,
        tripNumber: tripIndex + 1,
        segmentNumber: segIndex + 1,
        totalSegments: segments.length,
        airlineCode: segment?.FlightDetails?.AirlineInfo?.SSRCode || '',
      };
      console.log(`📊 Flight data for segment ${segIndex + 1}:`, flightData);
      return flightData;
    });
  });

  console.log('✅ All flight data:', allFlightData);

  // Build guest data for ALL travelers
  const allGuestData = travellerInfoArray.map((traveller: any, index: number) => ({
    name: localData?.travellers?.[index]?.firstName
      ? `${localData.travellers[index].firstName} ${localData.travellers[index].lastName || ''}`
      : traveller?.FirstName
        ? `${traveller.FirstName} ${traveller.LastName || ''}`
        : 'Guest',
    email:
      localData?.email ||
      tripjackResponse?.order?.DeliveryInformation?.Emails?.[0] ||
      'guest@email.com',
    phone:
      localData?.phone ||
      tripjackResponse?.order?.DeliveryInformation?.Contacts?.[0] ||
      'Not provided',
    employeeId: localData?.userInfo?.id || 'Not provided',
    paxType: traveller?.PaxType || 'ADULT',
    title: traveller?.Title || '',
    dob: traveller?.DateOfBirth || '',
  }));

  // Use first guest for display
  const guestData = allGuestData[0] || {
    name: 'Guest',
    email: tripjackResponse?.order?.DeliveryInformation?.Emails?.[0] || 'guest@email.com',
    phone: tripjackResponse?.order?.DeliveryInformation?.Contacts?.[0] || 'Not provided',
    employeeId: 'Not provided',
  };

  // Prepare pricing data
  const pricingData = {
    baseFare: fareDetails?.BaseFare || 0,
    taxes: additionalFare?.OtherTaxes || 0,
    commission: localData?.markupPrice || 0,
    commissionTDS: 0,
    total: fareDetails?.TotalFare || localData?.totalPrice || 0,
  };

  // Calculate commission rate (percentage)
  const commissionRate =
    pricingData.total > 0 ? Math.round((pricingData.commission / pricingData.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MainNavbar */}
      <MainNavbar activeService="flights" />

      {/* Progress Steps - Same as SeatSelection */}
      <div className="bg-white border-b border-gray-200 py-6 mt-22">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step.id < currentStep
                        ? 'bg-orange-500 text-white'
                        : step.id === currentStep
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.id < currentStep ? '✓' : step.id}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center ${
                      step.id === currentStep ? 'text-gray-900 font-semibold' : 'text-gray-600'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step.id < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Header - Always shows immediately, even while loading */}
        <div className="mb-8 text-center bg-green-50 rounded-2xl p-8 border border-green-100">
          <div className="flex justify-center mb-4">
            <img src={Success} alt="Success" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 text-lg">
            Thank you for your booking! Your trip is confirmed.
          </p>
          {bookingId && (
            <p className="text-sm text-gray-500 mt-2">
              Booking ID: <span className="font-semibold">{bookingId}</span>
            </p>
          )}
          {/* Show loading indicator inside the success message while data loads */}
          {loading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Loading your booking details...</span>
            </div>
          )}
        </div>

        {/* Booking Actions - Always shows immediately */}
        <div>
          <BookingActions bookingId={bookingId} />
        </div>

        <div className="h-8"></div>

        {/* Main Content Grid - Shows skeletons while loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Main Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 space-y-6">
                {isDataReady ? (
                  <FlightDetails flights={allFlightData} />
                ) : (
                  <FlightDetailsSkeleton />
                )}
              </div>
              <div>
                {isDataReady ? (
                  <PriceInformation pricing={pricingData} />
                ) : (
                  <PriceInformationSkeleton />
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Guest Information and Price Card */}
          <div className="space-y-6">
            {/* Guest Information Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 space-y-6">
                {isDataReady ? (
                  <GuestInformation guest={guestData} />
                ) : (
                  <GuestInformationSkeleton />
                )}
              </div>
            </div>

            {/* Price Card - Separate card below with markup price */}
            {/* Uncomment when PriceCard component is available */}
            {/* <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6">
                <PriceCard
                  price={pricingData.commission}
                  currency="₹"
                  commissionRate={commissionRate}
                />
              </div>
            </div> */}
          </div>
        </div>

        {/* Additional Page Footer Information - Always shows immediately */}
        <div className="mt-8 bg-[#BEDBFF] rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Important Notes</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Please arrive 2 hours before departure</li>
                <li>• Carry valid ID proof</li>
                <li>• Check-in closes 45 minutes before departure</li>
              </ul>
            </div>
          </div>
        </div>

        {/* <div className='pt-4'>
          <BookingActionButtons bookingId={bookingId} />
        </div> */}
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}