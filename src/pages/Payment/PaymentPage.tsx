import React, { useState, useEffect } from 'react';
import { Plane, Hotel, FileText, Shield, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../userinfoandseatinfo/SeatSelection/Logo.png';

interface PaymentPageProps {
  // Optional props for dynamic data
  flightDetails?: {
    airline: string;
    flightNumber: string;
    className?: string;
    from: string;
    to: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stops: string;
    baggage: {
      checkIn: string;
      cabin: string;
    };
  };
  priceDetails?: {
    basePrice: number;
    seatMealExtra: number;
    insurance: number;
    ticketsNotes: number;
    markup: number;
    commission: number;
  };
  userDetails?: {
    email: string;
    contactNo: string;
  };
  onPaymentSelect?: (method: string) => void;
  onBack?: () => void;
  onContinue?: () => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({
  flightDetails: propFlightDetails,
  priceDetails: propPriceDetails,
  userDetails: propUserDetails,
  onPaymentSelect,
  onBack,
  onContinue,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('flights');
  const [currentStep] = useState(4); // Payment method is step 4
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [hasTimerExpired, setHasTimerExpired] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  // Steps for progress bar
  const steps = [
    { id: 1, name: 'Flights' },
    { id: 2, name: 'Traveller Information' },
    { id: 3, name: 'Seat & Meal' },
    { id: 4, name: 'Payment method' },
    { id: 5, name: 'Booking Confirmed' },
  ];

  // Timer redirect effect
  useEffect(() => {
    // Check if timer has expired
    if (timeLeft <= 0) {
      setHasTimerExpired(true);
      // Clear any session storage related to the current booking
      sessionStorage.removeItem('travelerInfo');
      sessionStorage.removeItem('currentBooking');
      sessionStorage.removeItem('currentTravelers');
      sessionStorage.removeItem('currentContactDetails');
      sessionStorage.removeItem('travellerInfoValidated');
      sessionStorage.removeItem('bookingTimer');
      sessionStorage.removeItem('timerStartTime');

      // Redirect to main page
      navigate('/', { replace: true });
      return;
    }

    // Set up timer interval
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, [timeLeft, navigate]);

  // Store timer in sessionStorage to persist across refreshes
  useEffect(() => {
    // Check if there's a stored timer value
    const storedTimer = sessionStorage.getItem('bookingTimer');
    const timerStartTime = sessionStorage.getItem('timerStartTime');

    if (storedTimer && timerStartTime) {
      const elapsedSeconds = Math.floor((Date.now() - parseInt(timerStartTime)) / 1000);
      const remainingTime = Math.max(0, parseInt(storedTimer) - elapsedSeconds);

      if (remainingTime <= 0) {
        setTimeLeft(0);
        setHasTimerExpired(true);
        sessionStorage.removeItem('bookingTimer');
        sessionStorage.removeItem('timerStartTime');
        navigate('/', { replace: true });
      } else {
        setTimeLeft(remainingTime);
      }
    } else {
      // Initialize timer
      const initialTime = 15 * 60; // 15 minutes
      setTimeLeft(initialTime);
      sessionStorage.setItem('bookingTimer', initialTime.toString());
      sessionStorage.setItem('timerStartTime', Date.now().toString());
    }
  }, [navigate]);

  // Update sessionStorage when timer changes
  useEffect(() => {
    if (timeLeft > 0) {
      sessionStorage.setItem('bookingTimer', timeLeft.toString());
      sessionStorage.setItem('timerStartTime', Date.now().toString());
    }
  }, [timeLeft]);

  // Default flight details based on the image
  const defaultFlightDetails = {
    airline: 'Indigo',
    flightNumber: '6E-6',
    className: '045 Economy',
    from: 'BOM',
    to: 'IXC',
    date: 'Fri, 05-12-2025',
    departureTime: '02:45PM',
    arrivalTime: '02:45PM',
    duration: '2hrs 5 mins',
    stops: '1 Stop',
    baggage: {
      checkIn: '20 Kg',
      cabin: '7 Kg',
    },
  };

  // Default price details from the image
  const defaultPriceDetails = {
    basePrice: 0.0,
    seatMealExtra: 0.0,
    insurance: 0.0,
    ticketsNotes: 0,
    markup: 0,
    commission: 0,
  };

  // Default user details
  const defaultUserDetails = {
    email: 'ahdajjad@gmail.com',
    contactNo: '91 9998880000',
  };

  // Try to get data from sessionStorage
  const getStoredFlightDetails = () => {
    try {
      const currentBooking = sessionStorage.getItem('currentBooking');
      if (currentBooking) {
        const booking = JSON.parse(currentBooking);
        if (booking.flightDetails) {
          return {
            airline: booking.flightDetails.airline || defaultFlightDetails.airline,
            flightNumber: booking.flightDetails.flightNumber || defaultFlightDetails.flightNumber,
            className: booking.flightDetails.className || defaultFlightDetails.className,
            from: booking.flightDetails.from || defaultFlightDetails.from,
            to: booking.flightDetails.to || defaultFlightDetails.to,
            date: booking.flightDetails.departureDate || defaultFlightDetails.date,
            departureTime:
              booking.flightDetails.departureTime || defaultFlightDetails.departureTime,
            arrivalTime: booking.flightDetails.arrivalTime || defaultFlightDetails.arrivalTime,
            duration: booking.flightDetails.duration || defaultFlightDetails.duration,
            stops: booking.flightDetails.stops || defaultFlightDetails.stops,
            baggage: booking.flightDetails.baggage || defaultFlightDetails.baggage,
          };
        }
      }
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
    }
    return defaultFlightDetails;
  };

  const getStoredPriceDetails = () => {
    try {
      const currentBooking = sessionStorage.getItem('currentBooking');
      if (currentBooking) {
        const booking = JSON.parse(currentBooking);
        if (booking.priceDetails) {
          return {
            basePrice: booking.priceDetails.basefare || defaultPriceDetails.basePrice,
            seatMealExtra: booking.priceDetails.seatMealExtra || defaultPriceDetails.seatMealExtra,
            insurance: booking.priceDetails.insurance || defaultPriceDetails.insurance,
            ticketsNotes: booking.priceDetails.ticketsNotes || defaultPriceDetails.ticketsNotes,
            markup: booking.priceDetails.additionalMarkup || defaultPriceDetails.markup,
            commission: defaultPriceDetails.commission,
          };
        }
      }
    } catch (error) {
      console.error('Error reading price details:', error);
    }
    return defaultPriceDetails;
  };

  const getStoredUserDetails = () => {
    try {
      const contactDetails = sessionStorage.getItem('currentContactDetails');
      if (contactDetails) {
        const contact = JSON.parse(contactDetails);
        return {
          email: contact.email || defaultUserDetails.email,
          contactNo: `${contact.countryCode || '91'} ${contact.mobileNumber || '9998880000'}`,
        };
      }
    } catch (error) {
      console.error('Error reading contact details:', error);
    }
    return defaultUserDetails;
  };

  const getStoredTravelersInfo = () => {
    try {
      const travelers = sessionStorage.getItem('currentTravelers');
      if (travelers) {
        return JSON.parse(travelers);
      }
    } catch (error) {
      console.error('Error reading travelers info:', error);
    }
    return null;
  };

  const flight = propFlightDetails || getStoredFlightDetails();
  const prices = propPriceDetails || getStoredPriceDetails();
  const user = propUserDetails || getStoredUserDetails();
  const travelers = getStoredTravelersInfo();

  const totalAmount =
    prices.basePrice +
    prices.seatMealExtra +
    prices.insurance +
    prices.ticketsNotes +
    prices.markup +
    prices.commission;

  const paymentOptions = [
    {
      id: 'credit_card',
      name: 'Credit Card',
      icon: '💳',
      description: 'Pay via Credit Card using PayPal',
    },
    { id: 'upi', name: 'UPI', icon: '📱', description: 'Pay via UPI app using EasyBox' },
    {
      id: 'net_banking',
      name: 'Net Banking',
      icon: '🏦',
      description: 'Pay directly from bank via PayPal',
    },
    {
      id: 'debit_card',
      name: 'Debit Card',
      icon: '💳',
      description: 'Pay with international card via Cashfree',
    },
    {
      id: 'international_card',
      name: 'International Card',
      icon: '🌍',
      description: 'Pay with International card via Cashfree',
    },
    {
      id: 'payment_link',
      name: 'Send Payment Link',
      icon: '🔗',
      description: 'Share via WhatsApp or Email',
    },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePaymentSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    if (methodId === 'payment_link') {
      setShowPaymentLinkModal(true);
    } else {
      setShowPaymentModal(true);
    }
    onPaymentSelect?.(methodId);
  };

  const handleSendPaymentLink = () => {
    console.log('Sending payment link via:', sendMethod);
    console.log('To:', sendMethod === 'whatsapp' ? phoneNumber : emailAddress);
    setShowPaymentLinkModal(false);

    setPaymentSuccess(true);
    setTimeout(() => setPaymentSuccess(false), 3000);
  };

  const handleConfirmPayment = () => {
    // Simulate payment processing
    setTimeout(() => {
      setShowPaymentModal(false);
      setPaymentSuccess(true);

      // Clear timer-related data on successful payment
      sessionStorage.removeItem('bookingTimer');
      sessionStorage.removeItem('timerStartTime');

      // Navigate to booking confirmation after success
      setTimeout(() => {
        setPaymentSuccess(false);
        if (onContinue) {
          onContinue();
        } else {
          navigate('/booking-confirmation');
        }
      }, 2000);
    }, 1500);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Helper function to get traveler type label
  const getTravelerTypeLabel = (
    type: string,
    index: number,
    typeCount: { [key: string]: number },
  ) => {
    if (type === 'adult') return `Adult ${typeCount.adult} (12yrs+)`;
    if (type === 'child') return `Child ${typeCount.child} (2-11yrs)`;
    return `Infant ${typeCount.infant} (0-23 months)`;
  };

  // Group travelers by type for display
  const getGroupedTravelers = () => {
    if (!travelers || !Array.isArray(travelers)) return [];

    const grouped: { [key: string]: any[] } = { adult: [], child: [], infant: [] };
    travelers.forEach((traveler: any) => {
      if (traveler.type === 'adult') grouped.adult.push(traveler);
      else if (traveler.type === 'child') grouped.child.push(traveler);
      else if (traveler.type === 'infant') grouped.infant.push(traveler);
    });

    const result: { type: string; traveler: any; displayIndex: number }[] = [];
    let adultCount = 0,
      childCount = 0,
      infantCount = 0;

    travelers.forEach((traveler: any, idx: number) => {
      if (traveler.type === 'adult') {
        adultCount++;
        result.push({ type: 'adult', traveler, displayIndex: adultCount });
      } else if (traveler.type === 'child') {
        childCount++;
        result.push({ type: 'child', traveler, displayIndex: childCount });
      } else if (traveler.type === 'infant') {
        infantCount++;
        result.push({ type: 'infant', traveler, displayIndex: infantCount });
      }
    });

    return result;
  };

  const groupedTravelers = getGroupedTravelers();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Exactly matching TravellerInfo header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-60">
              {/* Logo - clickable */}
              <div
                onClick={() => navigate('/')}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img src={Logo} alt="Klar Logo" className="h-12 w-auto" />
              </div>

              {/* Capsule Container for Navigation */}
              <div className="bg-gray-100 rounded-full p-1">
                <nav className="flex gap-1">
                  <button
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === 'flights'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Plane className="w-4 h-4" />
                    <span className="text-sm font-medium">Flights</span>
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === 'hotels'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Hotel className="w-4 h-4" />
                    <span className="text-sm font-medium">Hotels</span>
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === 'visa'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Visa</span>
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === 'insurance'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Insurance</span>
                  </button>
                </nav>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps - Matching TravellerInfo */}
      <div className="bg-white border-b border-gray-100 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between sm:justify-start overflow-x-auto pb-2 sm:pb-0">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center min-w-[60px] sm:min-w-0">
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                      step.id < currentStep
                        ? 'bg-orange-500 text-white'
                        : step.id === currentStep
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.id < currentStep ? '✓' : step.id}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs mt-1 sm:mt-2 text-center max-w-[80px] sm:max-w-[100px] ${
                      step.id === currentStep ? 'text-gray-900 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 sm:mx-4 mb-3 sm:mb-5 ${
                      step.id < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Flight Details & User Information */}
          <div className="flex-1 max-w-3xl ml-44">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
              Payment Method
            </h2>
            {paymentError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {paymentError}
              </div>
            )}

            {/* Flight Card - Compact (matching TravellerInfo style) */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                {/* Airline Logo and Info */}
                <div className="flex sm:block items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#234977] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm sm:text-lg">
                      {flight.airline.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="sm:text-center sm:mt-2">
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[100px]">
                      {flight.airline}
                    </div>
                    <div className="text-xs text-gray-500">{flight.flightNumber}</div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {flight.className || 'Economy'}
                    </div>
                  </div>
                </div>

                {/* Flight Route Details */}
                <div className="flex-1 w-full">
                  {/* Departure and Arrival Times */}
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">
                        {flight.departureTime}
                      </div>
                      <div className="text-xs text-gray-600">{flight.from}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{flight.date}</div>
                    </div>

                    {/* Flight Path with Duration and Stops */}
                    <div className="flex-1 mx-2 sm:mx-4">
                      {/* Duration above the line */}
                      <div className="text-center text-[10px] sm:text-xs text-gray-500 mb-1">
                        {flight.duration}
                      </div>
                      {/* The line */}
                      <div className="w-full h-0.5 bg-gray-200 relative">
                        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></div>
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></div>
                        </div>
                      </div>
                      {/* Stops below the line */}
                      <div className="text-center text-[10px] sm:text-xs text-gray-500 mt-1">
                        {flight.stops}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">
                        {flight.arrivalTime}
                      </div>
                      <div className="text-xs text-gray-600">{flight.to}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{flight.date}</div>
                    </div>
                  </div>

                  {/* Baggage Information */}
                  {flight.baggage && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 sm:gap-4 mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] sm:text-xs text-gray-500">Cabin:</span>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                          {flight.baggage.cabin}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] sm:text-xs text-gray-500">Check-in:</span>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                          {flight.baggage.checkIn}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Information Section - Now on Left Side */}
            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <div className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">
                User Information
              </div>
              <div className="p-4 sm:p-6">
                {/* Contact Details */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Email</div>
                        <div className="text-gray-700 font-medium">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Contact No</div>
                        <div className="text-gray-700 font-medium">{user.contactNo}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traveler Details */}
                {travelers && travelers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Traveler Details</h4>
                    <div className="space-y-4">
                      {groupedTravelers.map((item, idx) => (
                        <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                          <div className="text-xs font-medium text-[#234977] mb-2">
                            {getTravelerTypeLabel(item.type, item.displayIndex, {
                              adult: 0,
                              child: 0,
                              infant: 0,
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Name:</span>
                              <span className="ml-1 text-gray-700 font-medium">
                                {item.traveler.title} {item.traveler.firstName}{' '}
                                {item.traveler.lastName}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Gender:</span>
                              <span className="ml-1 text-gray-700 capitalize">
                                {item.traveler.gender}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Date of Birth:</span>
                              <span className="ml-1 text-gray-700">
                                {item.traveler.dateOfBirth}
                              </span>
                            </div>
                            {item.traveler.aadharNumber && (
                              <div>
                                <span className="text-gray-500">Aadhar:</span>
                                <span className="ml-1 text-gray-700">
                                  {item.traveler.aadharNumber}
                                </span>
                              </div>
                            )}
                            {item.traveler.passportNumber && (
                              <div>
                                <span className="text-gray-500">Passport:</span>
                                <span className="ml-1 text-gray-700">
                                  {item.traveler.passportNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Note */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 mb-4">
              <p className="text-xs text-blue-700">
                📍 {flight.airline} is located at the airport.
              </p>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-amber-700 leading-relaxed">
                ⚠️ In case the transaction amount exceeds your budget and funds are deducted from
                your account and / or credit, the actual booking amount will be provided to the
                customer account within 7 working days. However, if you have a higher spending
                pattern than usual, please contact us for further assistance.
              </p>
            </div>
          </div>

          {/* Right Column - Price Information & Payment Options */}
          <div className="w-full lg:w-96">
            {/* Price Information Card - Now above Payment Options */}
            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <div className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">
                Price Information
              </div>
              <div className="p-4 sm:p-5">
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Price</span>
                    <span className="font-semibold text-gray-800">
                      INR {prices.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Seat / Meal / Extra Baggage</span>
                    <span className="font-semibold text-gray-800">
                      INR {prices.seatMealExtra.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Insurance</span>
                    <span className="font-semibold text-gray-800">
                      INR {prices.insurance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Tickets & Notes</span>
                    <span className="font-semibold text-gray-800">
                      INR {prices.ticketsNotes.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Markup</span>
                    <span className="font-semibold text-gray-800">
                      INR {prices.markup.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600 text-sm">Commission</span>
                    <span className="font-semibold text-gray-800">
                      INR {prices.commission.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 mt-1 bg-orange-50 rounded-lg px-2">
                    <span className="font-bold text-gray-800">Total Amount</span>
                    <span className="font-bold text-orange-600">INR {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options Card */}
            <div className="bg-white rounded-lg border border-gray-200 sticky top-24">
              <div className="bg-[#234977] text-white px-4 sm:px-6 py-3 font-medium text-sm">
                Payment Options
              </div>

              <div className="p-4 sm:p-5">
                <div className="space-y-3">
                  {paymentOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handlePaymentSelect(option.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        selectedPaymentMethod === option.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{option.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 text-sm">{option.name}</div>
                          <div className="text-xs text-gray-400">{option.description}</div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPaymentMethod === option.id
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedPaymentMethod === option.id && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">💳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Complete Payment</h3>
                <p className="text-gray-500 text-sm mt-1">
                  You are about to pay INR {totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Payment Method</div>
                  <div className="font-medium text-gray-800 capitalize">
                    {paymentOptions.find((o) => o.id === selectedPaymentMethod)?.name}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Booking Reference</div>
                  <div className="font-mono text-sm text-gray-800">
                    FLY-{Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
                >
                  Pay INR {totalAmount.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {paymentSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right z-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Payment Successful! Booking Confirmed.</span>
        </div>
      )}
      {/* Payment Link Modal */}
      {showPaymentLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Send Payment Link</h3>
                <button
                  onClick={() => setShowPaymentLinkModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Traveller Details Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Traveller Details</h4>

                {/* Adult Section */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-orange-600 mb-2">Adult</div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 text-gray-800 font-medium">
                        {travelers && travelers[0]
                          ? `${travelers[0].title || 'Mr'} ${travelers[0].firstName || 'Dasdskjd'} ${travelers[0].lastName || 'Hasgdjag'}`
                          : 'Mr Dasdskjd Hasgdjag'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone Number:</span>
                      <span className="ml-2 text-gray-800">
                        +91 {(travelers && travelers[0]?.phoneNumber) || '98765 43210'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Other Information */}
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Other Information</div>
                  <div className="text-sm">
                    <span className="text-gray-500">E - mail:</span>
                    <span className="ml-2 text-gray-800">{user.email}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Send Payment Link Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Send Payment Link</h4>
                <p className="text-xs text-gray-500 mb-4">
                  Share the payment link with the client via WhatsApp or Email.
                </p>

                {/* Method Selection Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setSendMethod('whatsapp')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      sendMethod === 'whatsapp'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.032 2.001c-5.514 0-9.997 4.478-9.999 9.992-.001 1.768.467 3.488 1.355 5.004L2 22.001l5.218-1.344c1.465.806 3.113 1.231 4.797 1.231h.004c5.514 0 9.998-4.478 9.999-9.993 0-5.514-4.479-9.994-9.986-9.994zm4.883 12.546c-.269.759-1.368 1.393-2.199 1.556-.583.114-1.346.144-2.021-.055-.31-.092-.637-.207-.944-.351-.389-.184-.783-.406-1.147-.656-.818-.564-1.515-1.324-2.018-2.166-.436-.727-.747-1.519-.891-2.355-.07-.405-.048-.821.062-1.217.056-.202.156-.391.288-.555.269-.334.615-.586.985-.785.258-.139.531-.224.807-.294.32-.081.651-.101.971-.031.221.047.434.125.629.233.444.246.807.592 1.072.996.187.284.317.6.379.933.042.225.022.461-.043.682-.09.303-.264.578-.439.847-.134.206-.286.399-.392.622-.067.141-.089.307-.039.454.094.281.267.533.457.77.282.352.633.636 1.034.847.393.206.821.328 1.262.359.192.014.384.006.575-.018.325-.042.642-.139.93-.301.187-.105.356-.238.51-.389.213-.208.386-.45.515-.719.082-.172.12-.364.107-.553-.007-.107-.034-.213-.066-.316-.086-.276-.207-.541-.347-.797-.079-.146-.176-.283-.28-.41-.098-.12-.199-.237-.289-.364-.129-.182-.214-.393-.218-.619-.004-.196.051-.39.135-.568.091-.194.213-.372.356-.534.144-.162.307-.305.484-.424.178-.12.367-.217.564-.284.205-.069.419-.103.633-.099.211.003.421.034.625.09.209.057.411.138.6.242.188.104.362.231.517.378.311.294.556.643.722 1.035.126.297.193.615.197.938.003.179-.014.357-.05.532z" />
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setSendMethod('email')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                      sendMethod === 'email'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Email</span>
                  </button>
                </div>

                {/* Input Field based on selected method */}
                {sendMethod === 'whatsapp' ? (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSendPaymentLink}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    sendMethod === 'whatsapp'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Send via {sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </button>
              </div>

              {/* Contact No Line */}
              <div className="text-center text-xs text-gray-400 mb-4">Contact No 91 996688009</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
