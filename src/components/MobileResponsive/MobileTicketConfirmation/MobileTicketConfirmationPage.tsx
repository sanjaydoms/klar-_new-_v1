import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import TicketHeader from './TicketHeader';
import FlightDetails from './FlightDetails';
import PassengerDetails from './PassengerDetails';
import CheckinInstructions from './CheckinInstructions';
import PaymentSummary from './PaymentSummary';
import BottomNav from '../DashboardPage/BottomNav';
import TicketActions from './TicketActions';
import {
  getFlightBookingsByBookingId,
  getFlightBookingsByBookingIdFromTripjack,
} from '../../../api/flightService.api';

interface MobileTicketConfirmationPageProps {
  onBack?: () => void;
  onHelp?: () => void;
}

const MobileTicketConfirmationPage: React.FC<MobileTicketConfirmationPageProps> = ({
  onBack,
  onHelp,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get bookingId from multiple sources: URL > State > SessionStorage
  const bookingId = searchParams.get('bookingId') ||
    location.state?.bookingId ||
    sessionStorage.getItem('bookingId') ||
    undefined;

  const [bookingData, setBookingData] = useState<any>(null);
  const [tripjackData, setTripjackData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 URL Search Params:', searchParams.toString());
    console.log('🔍 Location State:', location.state);
    console.log('🔍 Booking ID from URL:', searchParams.get('bookingId'));
    console.log('🔍 Booking ID from state:', location.state?.bookingId);
    console.log('🔍 Booking ID from sessionStorage:', sessionStorage.getItem('bookingId'));
    console.log('🔍 Final Booking ID:', bookingId);

    if (!bookingId) {
      console.error('❌ No booking ID found in URL, state, or sessionStorage');
      setError('No booking ID found. Please provide a valid booking ID.');
      setLoading(false);
      return;
    }

    const fetchBookingData = async () => {
      try {
        console.log('🚀 Fetching booking data for ID:', bookingId);

        // Call both APIs in parallel - exactly like BookingConfirmation
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

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Booking</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-400 mt-2">Booking ID: {bookingId || 'Not provided'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Extract data from tripjack response (primary source)
  const tripjackResponse = tripjackData?.data;
  const localResponse = bookingData?.data;

  // Extract trip and traveller information
  const tripInfoArray = tripjackResponse?.itemInfos?.AIR?.TripInformation || [];
  const travellerInfoArray = tripjackResponse?.itemInfos?.AIR?.TravellerInformation || [];
  const totalPriceInfo = tripjackResponse?.itemInfos?.AIR?.totalPriceInfo;
  const fareDetails = totalPriceInfo?.totalFareDetail?.FareComponents;
  const additionalFare = totalPriceInfo?.totalFareDetail?.AdditionalFareComponents?.TotalAdditionalFare || {};
  const localData = localResponse || {};

  // Build flight data for ALL segments with duration
  const allFlightData = tripInfoArray.flatMap((trip: any, tripIndex: number) => {
    const segments = trip?.SegmentInformation || [];
    return segments.map((segment: any, segIndex: number) => ({
      from: segment?.DepartureAirport?.city || segment?.DepartureAirport?.cityCode || 'N/A',
      to: segment?.ArrivalAirport?.city || segment?.ArrivalAirport?.cityCode || 'N/A',
      fromCity: segment?.DepartureAirport?.city || segment?.DepartureAirport?.cityCode || 'N/A',
      toCity: segment?.ArrivalAirport?.city || segment?.ArrivalAirport?.cityCode || 'N/A',
      airline: segment?.FlightDetails?.AirlineInfo?.AirlineName || 'N/A',
      flightNo: `${segment?.FlightDetails?.AirlineInfo?.SSRCode || ''} ${segment?.FlightDetails?.FirstName || ''}`,
      class: segment?.CabinClass || segment?.FareDetails?.CabinClass || 'ECONOMY',
      date: formatDate(segment?.DepartureTime),
      departure: formatTime(segment?.DepartureTime),
      departureDate: formatDate(segment?.DepartureTime),
      arrival: formatTime(segment?.ArrivalTime),
      arrivalDate: formatDate(segment?.ArrivalTime),
      baggage: segment?.BaggageInfo?.CheckInBaggage ||
        travellerInfoArray[0]?.FareDetails?.BaggageInfo?.CheckInBaggage || '',
      adult: `Adult x ${travellerInfoArray.length || 1}`,
      tripNumber: tripIndex + 1,
      segmentNumber: segIndex + 1,
      totalSegments: segments.length,
      airlineCode: segment?.FlightDetails?.AirlineInfo?.SSRCode || '',
      duration: segment?.Duration ? `${segment.Duration}` : 'N/A', // Duration in minutes
    }));
  });

  // Build passenger data for ALL travelers
  const allPassengerData = travellerInfoArray.map((traveller: any, index: number) => ({
    name: localData?.travellers?.[index]?.firstName
      ? `${localData.travellers[index].firstName} ${localData.travellers[index].lastName || ''}`
      : traveller?.FirstName
        ? `${traveller.FirstName} ${traveller.LastName || ''}`
        : 'Guest',
    email: localData?.email ||
      tripjackResponse?.order?.DeliveryInformation?.Emails?.[0] ||
      'guest@email.com',
    phone: localData?.phone ||
      tripjackResponse?.order?.DeliveryInformation?.Contacts?.[0] ||
      'Not provided',
    employeeId: localData?.userInfo?.id || 'Not provided',
    paxType: traveller?.PaxType || 'ADULT',
    title: traveller?.Title || '',
    dob: traveller?.DateOfBirth || '',
  }));

  // Prepare pricing data
  const pricingData = {
    baseFare: fareDetails?.BaseFare || 0,
    taxes: additionalFare?.OtherTaxes || 0,
    commission: localData?.markupPrice || 0,
    commissionTDS: 0,
    total: fareDetails?.TotalFare || localData?.totalPrice || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          onClick={onBack}
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Pass data to child components */}
        <TicketHeader bookingId={bookingId} />
        
        {/* FlightDetails now accepts flights array */}
        {/* <FlightDetails 
          bookingId={bookingId}
          flights={allFlightData}
        /> */}
        
        {/* <PassengerDetails
          passengerName={allPassengerData[0]?.name || 'Guest'}
          agent={allPassengerData[0]?.employeeId || 'Agent'}
        /> */}
        
        <CheckinInstructions />
        
        {/* <PaymentSummary
          baseFare={pricingData.baseFare}
          taxes={pricingData.taxes}
          total={pricingData.total}
          commission={pricingData.commission}
          totalFare={fareDetails?.TotalFare || 0}
          totalAdditionalFare={additionalFare?.TotalAdditionalFare || 0}
        /> */}
        
        <TicketActions bookingId={bookingId} />

        {/* Help Section */}
        <div className="block md:hidden lg:hidden text-center mt-4 mb-4">
          <span className="text-sm text-gray-500">Need help? </span>
          <button onClick={onHelp} className="text-sm text-primary font-medium hover:underline">
            Talk to our travel experts 24/7
          </button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
};

export default MobileTicketConfirmationPage;