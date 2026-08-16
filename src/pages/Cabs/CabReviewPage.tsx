import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import {
  ChevronDown,
  Car,
  User,
  Mail,
  Phone,
  FileText,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
  Shield,
  Info,
  ChevronRight,
  MapPin,
  ArrowRight,
  Search,
  X,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { createCabBooking } from '@/api/cabs.api';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { walletService } from '@/api/wallet.api';
import { initiateRazorpayPayment } from '@/api/razorpay.api';
import { getMyMarkups } from '@/api/markup.api';

export default function CabReviewPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [selectedCab, setSelectedCab] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['waiting_30']);
  const [travellerForm, setTravellerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    pan: '',
    phone: '',
    specialRequest: '',
  });
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState('razorpay'); // default to razorpay
  const [markups, setMarkups] = useState<any[]>([]);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [refundFailed, setRefundFailed] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedCab = sessionStorage.getItem('selectedCab');
    const storedParams = sessionStorage.getItem('cabSearchParams');

    if (storedCab && storedParams) {
      try {
        setSelectedCab(JSON.parse(storedCab));
        setSearchParams(JSON.parse(storedParams));
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to parse session storage', err);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }

    // Auth check removed to allow guest checkout

    fetchWalletInfo();
    fetchMarkups();
  }, [navigate, token]);

  const getMarkupForService = (serviceType: string) => {
    const services = Array.isArray(markups) ? markups : (markups as any)?.services || [];
    // Check for both singular and plural (e.g. CAB vs CABS)
    const mapping: Record<string, string[]> = {
      CABS: ['CABS', 'CAB'],
      HOTELS: ['HOTELS', 'HOTEL'],
      FLIGHTS: ['FLIGHTS', 'FLIGHT'],
    };
    const searchTerms = mapping[serviceType] || [serviceType];
    const markup = services.find((m: any) => searchTerms.includes(m?.serviceType));
    if (!markup) return { percentage: 0, fixed: 0 };
    return {
      percentage: markup.percentageMarkup || 0,
      fixed: markup.fixedMarkup || 0,
    };
  };

  const baseFare = Number(
    selectedCab?.price ||
      selectedCab?.rawQuote?.pricing?.totalAmount ||
      selectedCab?.rawQuote?.fareBreakup?.totalFare ||
      0,
  );
  const cabTax = Number(
    selectedCab?.tax ||
      selectedCab?.rawQuote?.pricing?.totalTax ||
      selectedCab?.rawQuote?.fareBreakup?.totalTax ||
      0,
  );
  const cabPrice = baseFare + cabTax;
  const cabMarkupDetails = getMarkupForService('CABS');
  const cabMarkupDisplay =
    cabMarkupDetails.percentage > 0
      ? `${cabMarkupDetails.percentage}%`
      : `₹${cabMarkupDetails.fixed}`;
  const cabMarkupAmount = (cabPrice * cabMarkupDetails.percentage) / 100 + cabMarkupDetails.fixed;
  const finalCabPrice = cabPrice + cabMarkupAmount;

  const fetchMarkups = async () => {
    try {
      const response = await getMyMarkups('CABS');
      if (response.data.success) {
        setMarkups(response.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch markups:', error);
    }
  };

  const fetchWalletInfo = async () => {
    try {
      const response = await walletService.getWallet();
      if (response && typeof response.balance !== 'undefined') {
        setWalletBalance(response.balance);
      }
    } catch (error) {
      logger.error('Failed to fetch wallet info:', error);
    }
  };

  // Removed hardcoded travellersList for strictly dynamic behavior
  const travellersList: any[] = [];

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleTravellerSelect = (traveller: any) => {
    const [first, ...last] = traveller.name.split(' ');
    setTravellerForm((prev) => ({
      ...prev,
      firstName: first,
      lastName: last.join(' '),
      email: traveller.email,
      phone: traveller.phone,
    }));
    setShowTravellerDropdown(false);
  };

  const handleBooking = async () => {
    if (!confirmed || !selectedCab || !searchParams) return;

    // Bug 1.52 fix: validate required traveller fields before proceeding
    const errors: Record<string, string> = {};
    if (!travellerForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(travellerForm.firstName.trim())) {
      errors.firstName = 'First name must contain only letters';
    }
    
    if (!travellerForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(travellerForm.lastName.trim())) {
      errors.lastName = 'Last name must contain only letters';
    }
    
    if (!travellerForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(travellerForm.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!travellerForm.phone.trim()) errors.phone = 'Phone number is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fill in all required traveller details');
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);
    setBookingError(null);
    setRefundFailed(false);
    try {
      const totalAmount = finalCabPrice;

      let razorpayPaymentIdStr = '';
      let razorpayOrderIdStr = '';

      if (selectedPayment === 'razorpay') {
        const paymentData = {
          // Round UP: the backend rejects a capture below the gross it verifies
          // against, so never charge less than the payload's grossAmount.
          amount: Math.ceil(totalAmount),
          userId: user?.userId || user?.id || user?._id || localStorage.getItem('userId') || 'guest',
          userEmail: user?.email || travellerForm.email || 'guest@klar.com',
          mobile: user?.phoneNumber || user?.phone || travellerForm.phone || '9999999999',
          clientType: 'B2C',
        };

        const paymentResult = await initiateRazorpayPayment(paymentData);
        if (!paymentResult.success) {
          setIsSubmitting(false);
          return;
        }
        razorpayPaymentIdStr = paymentResult.paymentId || '';
        // Must be Razorpay's order_... id (what the payment was captured against),
        // NOT the internal orderId — the backend verifies payment.order_id === this.
        razorpayOrderIdStr = paymentResult.razorpayOrderId || '';
      }

      const q = selectedCab.rawQuote;
      const taxAmount = Number(
        q.fareBreakup?.totalTax || q.pricing?.totalTax || selectedCab?.tax || 0,
      );
      const netAmount = Number(
        q.fareBreakup?.totalFare || q.pricing?.totalAmount || selectedCab?.price || 0,
      );
      const grossAmount = netAmount + taxAmount;

      // Bug 1.33 fix: use explicit ISO regex instead of fragile length check
      let formattedPickupDate = searchParams.pickupDate;
      const isAlreadyISO = /^\d{4}-\d{2}-\d{2}/.test(formattedPickupDate);
      if (!isAlreadyISO && formattedPickupDate.includes('-')) {
        const [day, month, yearAndTime] = formattedPickupDate.split('-');
        const [year, time] = yearAndTime.split(' ');
        formattedPickupDate = `${year}-${month}-${day} ${time}`;
      }

      let formattedReturnDate = searchParams?.returnDate;
      if (formattedReturnDate) {
        const isReturnISO = /^\d{4}-\d{2}-\d{2}/.test(formattedReturnDate);
        if (!isReturnISO && formattedReturnDate.includes('-')) {
          const [day, month, yearAndTime] = formattedReturnDate.split('-');
          const [year, time] = yearAndTime.split(' ');
          formattedReturnDate = `${year}-${month}-${day} ${time}`;
        }
      }

      const bookingPayload = {
        journeyInfo: {
          pickupDateTime: formattedPickupDate.replace(' ', 'T') + ':00',
          ...(formattedReturnDate
            ? { returnDateTime: formattedReturnDate.replace(' ', 'T') + ':00' }
            : {}),
          journeyType: (searchParams.journeyType || 'airport_transfer').toUpperCase(),
          tripType: (searchParams.tripType || 'oneway').toUpperCase(),
          passengers: Number(searchParams.passengers || 1),
          distance: searchParams?.distance || '10 Km',
          duration: searchParams?.duration || 30,
        },
        addons: [],
        routeDetail: {
          isDomestic: true,
          origin: {
            displayAddress: searchParams?.from || 'Origin',
            lat: searchParams.origin?.lat,
            long: searchParams.origin?.long,
          },
          destination: {
            displayAddress: searchParams?.to || 'Destination',
            lat: searchParams.destination?.lat,
            long: searchParams.destination?.long,
          },
        },
        quotationInfo: {
          vehicleType: q.vehicleType,
          vehicleCategory: q.vehicleCategory,
          quoteId: q.quotationId,
          childQuoteId: q.quoteChildId || q.quotationId,
          paxCount: q.paxCount || searchParams.passengers || 1,
          luggageCount: q.luggageCount || searchParams.bags || 2,
          vendorId: q.vendorId,
        },
        pricingInfo: {
          netAmount: netAmount.toFixed(2),
          addonsPrice: '0.00',
          tjTaxAmount: taxAmount.toFixed(2),
          tjManagementFee: '0.00',
          agentMarkup: cabMarkupAmount, // Bug 1.34 fix: use actual markup, not hardcoded 0
          agentMarkupSplitup: {
            onwardJourneyMarkup: cabMarkupAmount,
            returnJourneyMarkup: 0,
          },
          grossAmount: (grossAmount + cabMarkupAmount).toFixed(2),
        },
        passengerDetail: {
          firstName: travellerForm.firstName,
          lastName: travellerForm.lastName,
          email: travellerForm.email,
          phone: travellerForm.phone,
        },
        agentEmail: user?.email || travellerForm.email || 'agent@klar.com',
        agentPhone: user?.phoneNumber || user?.phone || travellerForm.phone || '+919876543210',
        userId: user?.userId || user?.id || user?._id || localStorage.getItem('userId'),
        consent: 'yes',
        razorpayPaymentId: razorpayPaymentIdStr,
        razorpayOrderId: razorpayOrderIdStr,
      };

      logger.info('Sending booking request:', bookingPayload);
      const response = await createCabBooking(bookingPayload);
      logger.info('Booking API response:', response);

      const resStatus = response?.data?.status || response?.data?.data?.status;
      if (resStatus === 'FAILED') {
        throw new Error(
          'Booking was rejected by the cab vendor/supplier. Razorpay payment will be refunded within 3-5 working days.',
        );
      }

      // Extract booking ID from various possible response shapes
      const bookingId =
        response?.data?.id ||
        response?.data?.bookingId ||
        response?.id ||
        response?.bookingId ||
        response?.data?.data?.id ||
        response?.data?.data?.bookingId ||
        `BK-${Date.now()}`;

      // Store for success screen
      setBookingSuccess({
        bookingId,
        from:
          typeof searchParams?.from === 'string'
            ? searchParams.from.split(',')[0]
            : searchParams?.from?.address?.city || 'Origin',
        to:
          typeof searchParams?.to === 'string'
            ? searchParams.to.split(',')[0]
            : searchParams?.to?.address?.city || 'Destination',
        vehicleName: selectedCab?.vehicleName || 'Your Vehicle',
        amount: Math.round(finalCabPrice),
        passenger: `${travellerForm.firstName} ${travellerForm.lastName}`.trim(),
        pickupDate: searchParams.pickupDate,
        policies: response?.data?.additionalInfo?.policies || q.policies,
      });
    } catch (error: any) {
      logger.error('Booking failed:', error);
      const errMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to process booking. Please try again.';
      setBookingError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-16 font-outfit">
        <MainNavbar activeService="cabs" />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
            {/* Status Banner */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-12 text-center text-white relative">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <Search className="w-64 h-64 absolute -top-20 -left-20 rotate-12" />
                <Car className="w-64 h-64 absolute -bottom-20 -right-20 -rotate-12" />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/30 animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">Booking Confirmed!</h1>
                <p className="text-white/80 font-medium">
                  Your ride is reserved and ready for departure.
                </p>

                <div className="mt-8 flex items-center gap-2 bg-black/10 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                    Booking ID:
                  </span>
                  <span className="text-sm font-black">{bookingSuccess.bookingId}</span>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Side: Route & Details */}
                <div className="space-y-10">
                  <section>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
                      Route Information
                    </h3>
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-gray-100">
                        <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
                        <div className="absolute bottom-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                      </div>
                      <div className="space-y-8">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                            Pickup From
                          </p>
                          <p className="font-bold text-gray-900 leading-tight">
                            {bookingSuccess.from}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                            Drop To
                          </p>
                          <p className="font-bold text-gray-900 leading-tight">
                            {bookingSuccess.to}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                      Vehicle Details
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm">
                        <Car className="w-8 h-8 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{bookingSuccess.vehicleName}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase">
                          {searchParams?.journeyType?.replace('_', ' ') || 'CITY TRANSFER'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="font-bold">Date & Time:</span>
                      <span className="font-medium">{bookingSuccess.pickupDate}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="font-bold">Passenger:</span>
                      <span className="font-medium">{bookingSuccess.passenger}</span>
                    </div>
                  </section>

                  {bookingSuccess.policies?.cancellationPolicy && (
                    <section className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        Cancellation Policy
                      </h3>
                      <div className="space-y-2">
                        {bookingSuccess.policies.cancellationPolicy.map((rule: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">{rule.description}</span>
                            <span
                              className={`font-bold ${rule.refundPercentage > 0 ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                              {rule.refundPercentage}% Refund
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Right Side: Fare Summary & Actions */}
                <div className="space-y-8">
                  <div className="bg-orange-50 rounded-[2rem] p-8 border border-orange-100">
                    <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-6">
                      Payment Summary
                    </h3>
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-orange-900/60 uppercase">
                          Total Fare Paid
                        </span>
                        <span className="font-black text-orange-900 text-xl">
                          ₹{(bookingSuccess?.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold text-orange-400 uppercase">Payment Mode</span>
                        <span className="font-bold text-orange-600 uppercase">
                          {selectedPayment === 'razorpay' ? 'Razorpay' : 'Wallet'}
                        </span>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-orange-200 flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[11px] font-bold text-orange-800 leading-tight">
                        Payment processed successfully. No further action required.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100">
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <Info className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-black text-blue-900 text-sm mb-1 uppercase tracking-wider">
                          Next Steps
                        </h4>
                        <p className="text-[11px] text-blue-700/70 font-medium leading-relaxed">
                          Your driver details and vehicle number will be shared 24 hours prior to
                          your pickup via SMS and Email.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Return to Home
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate('/my-bookings')}
                      className="w-full bg-gray-50 text-gray-500 font-bold py-5 rounded-2xl border border-gray-100 hover:bg-white hover:border-gray-200 transition-all"
                    >
                      View My Bookings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (bookingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-16 font-outfit">
        <MainNavbar activeService="cabs" />

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden text-center">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-12 text-white flex flex-col items-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/30">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Booking Failed</h1>
              <p className="text-white/80 font-medium">
                We encountered an issue while processing your request.
              </p>
            </div>

            <div className="p-10 space-y-8">
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">
                  Error Details
                </p>
                <p className="text-sm font-bold text-red-900 leading-relaxed">
                  {String(bookingError)}
                </p>
              </div>

              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Don't worry, if any amount was deducted from your wallet, it will be refunded
                automatically within 24 hours.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setBookingError(null)}
                  className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Try Again
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-50 text-gray-500 font-bold py-5 rounded-2xl border border-gray-100 hover:bg-white hover:border-gray-200 transition-all"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16 font-outfit">
      <MainNavbar activeService="cabs" />

      {/* Top Navigation / Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-3 px-8">
        <div className="max-w-7xl mx-auto flex items-center text-xs font-medium text-gray-500 gap-2">
          <span
            className="hover:text-blue-500 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            Home
          </span>
          <ChevronRight className="w-3 h-3" />
          <span
            className="hover:text-blue-500 cursor-pointer"
            onClick={() => navigate('/cabs/search')}
          >
            Cabs in Delhi
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900">Cab Review</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Bug 1.35 fix: Refund failure banner */}
        {refundFailed && (
          <div
            role="alert"
            className="mb-6 bg-red-100 border border-red-400 text-red-800 p-4 rounded-xl flex items-start gap-3"
          >
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">Wallet deducted but refund failed</p>
              <p className="text-sm mt-1">
                Your wallet was debited but the automatic refund could not be processed. Please
                contact support at <strong>support@klar.com</strong> with your reference ID.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Details & Forms */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {searchParams?.journeyType
                      ? String(searchParams.journeyType).toUpperCase()
                      : ''}
                    <span className="text-gray-300 mx-2">|</span>
                    <span className="text-gray-500 text-lg font-semibold">
                      {searchParams?.tripType === 'roundtrip' ||
                      searchParams?.tripType === 'round_trip' ||
                      searchParams?.returnDate
                        ? 'Round Trip'
                        : 'One Way'}
                    </span>
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-blue-500 font-medium">
                    <Info className="w-4 h-4" />
                    <span>Full details of your route and vehicle are shown below.</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 relative">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex flex-col items-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-500 bg-white" />
                    <div className="w-0.5 h-16 border-l-2 border-dashed border-gray-200" />
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 bg-white" />
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                        Pickup
                      </p>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {searchParams?.from || ''}
                      </h3>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                        Drop
                      </p>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {searchParams?.to || ''}
                      </h3>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-lg inline-flex">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span>Pickup: {searchParams.pickupDate}</span>
                  </div>
                  {searchParams?.returnDate && (
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-lg inline-flex">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Return: {searchParams.returnDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-8">
              <div className="w-full sm:w-48 h-32 bg-gray-50 rounded-xl flex items-center justify-center p-4 relative group overflow-hidden shrink-0">
                <span className="absolute top-2 left-2 bg-gray-100 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest text-gray-500 uppercase">
                  {selectedCab?.vehicleType || ''}
                </span>
                <img
                  src={selectedCab?.image || ''}
                  alt={selectedCab?.vehicleName || 'Vehicle'}
                  className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedCab?.vehicleName || ''}
                    </h2>
                    {selectedCab?.rating && (
                      <div className="flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        {Number(selectedCab.rating).toFixed(1)}{' '}
                        <span className="text-white/60">★</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-gray-400" />
                      {selectedCab?.seats && <span>{selectedCab.seats} Seats</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-gray-400" />
                      {selectedCab?.bags && <span>{selectedCab.bags} Bags</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                      {Array.isArray(selectedCab?.features) && selectedCab.features.length > 0 && (
                        <span>{selectedCab.features[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 pt-4 sm:pt-0 sm:text-right">
                  <div className="text-2xl font-black text-gray-900">
                    ₹{(finalCabPrice || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Inc. GST
                  </div>
                </div>
              </div>
            </div>

            {/* Fare Rules & Policies */}
            {selectedCab?.rawQuote?.policies && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="w-full px-8 py-5 border-b border-gray-50 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-gray-900 font-outfit">
                    Fare Rules & Policies
                  </h2>
                </div>
                <div className="px-8 py-6 space-y-8">
                  {/* Inclusions & Exclusions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedCab.rawQuote.policies.inclusions?.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-3">
                          Inclusions
                        </h3>
                        <ul className="space-y-2">
                          {selectedCab.rawQuote.policies.inclusions.map(
                            (item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                    {selectedCab.rawQuote.policies.exclusions?.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-black text-red-600 uppercase tracking-widest mb-3">
                          Exclusions
                        </h3>
                        <ul className="space-y-2">
                          {selectedCab.rawQuote.policies.exclusions.map(
                            (item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Cancellation Policy */}
                  {selectedCab.rawQuote.policies.cancellationPolicy?.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Cancellation Policy
                      </h3>
                      <div className="space-y-3">
                        {selectedCab.rawQuote.policies.cancellationPolicy.map(
                          (rule: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">{rule.description}</span>
                              <span
                                className={`font-bold ${rule.refundPercentage > 0 ? 'text-emerald-600' : 'text-red-500'}`}
                              >
                                {rule.refundPercentage}% Refund
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Rules */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-900 mb-2">Important Information</h3>

                    {selectedCab.rawQuote.policies.meetAndGreet?.type === 'Included' && (
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-700">Meet & Greet Included</p>
                          <p className="text-xs text-gray-500">
                            {selectedCab.rawQuote.policies.meetAndGreet.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedCab.rawQuote.policies.waitingTime && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-700">Waiting Time</p>
                          <p className="text-xs text-gray-500">
                            {selectedCab.rawQuote.policies.waitingTime}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedCab.rawQuote.policies.baggagePolicy?.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-700">Baggage Policy</p>
                          <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                            {selectedCab.rawQuote.policies.baggagePolicy.map(
                              (bp: string, i: number) => (
                                <li key={i}>{bp}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedCab.rawQuote.policies.driverAssignment?.domestic && (
                      <div className="flex items-start gap-3">
                        <Car className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-700">Driver Assignment</p>
                          <p className="text-xs text-gray-500">
                            {selectedCab.rawQuote.policies.driverAssignment.domestic}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedCab.rawQuote.policies.termsAndPolicies?.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-700">Terms & Conditions</p>
                          <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                            {selectedCab.rawQuote.policies.termsAndPolicies.map(
                              (tp: string, i: number) => (
                                <li key={i}>{tp}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Traveller Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="w-full px-8 py-5 flex items-center justify-between border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900 font-outfit">
                  Primary traveller details
                </h2>
              </div>
              <div className="px-8 py-8 space-y-6">
                <div className="bg-blue-50/50 rounded-xl p-4 flex items-start gap-4 border border-blue-100">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-blue-700 leading-relaxed">
                    We will use your email and contact number to share cab and driver details 24
                    hours before trip start.
                  </p>
                </div>

                <div className="relative">
                  {showTravellerDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTravellerDropdown(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto">
                        {travellersList.map((t, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleTravellerSelect(t)}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                              {t.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {t.name}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {t.gender}, {t.age} Years
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      First name
                    </label>
                    <input
                      type="text"
                      value={travellerForm.firstName}
                      onChange={(e) => {
                        setTravellerForm((prev) => ({ ...prev, firstName: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, firstName: '' }));
                      }}
                      placeholder="Enter first name"
                      className={`w-full bg-gray-50 border rounded-xl px-5 py-3 text-sm font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-outfit ${formErrors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}
                    />
                    {formErrors.firstName && (
                      <p className="text-xs text-red-500 ml-1">{formErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={travellerForm.lastName}
                      onChange={(e) => {
                        setTravellerForm((prev) => ({ ...prev, lastName: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, lastName: '' }));
                      }}
                      placeholder="Enter last name"
                      className={`w-full bg-gray-50 border rounded-xl px-5 py-3 text-sm font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-outfit ${formErrors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}
                    />
                    {formErrors.lastName && (
                      <p className="text-xs text-red-500 ml-1">{formErrors.lastName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={travellerForm.email}
                      onChange={(e) => {
                        setTravellerForm((prev) => ({ ...prev, email: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="Enter email address"
                      className={`w-full bg-gray-50 border rounded-xl px-5 py-3 text-sm font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-outfit font-normal ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-500 ml-1">{formErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Phone number
                    </label>
                    <div className="flex gap-2">
                      <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-sm font-bold w-20 flex items-center justify-center">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={travellerForm.phone}
                        onChange={(e) => {
                          setTravellerForm((prev) => ({ ...prev, phone: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        placeholder="9876543210"
                        className={`flex-1 bg-gray-50 border rounded-xl px-5 py-3 text-sm font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all ${formErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-xs text-red-500 ml-1">{formErrors.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="w-full px-8 py-5 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900 font-outfit">Payment Method</h2>
              </div>
              <div className="p-8 space-y-4">
                {[
                  {
                    id: 'razorpay',
                    label: 'Razorpay',
                    desc: 'Pay securely via Credit/Debit Card, UPI, or Netbanking',
                  },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${
                      selectedPayment === option.id
                        ? 'bg-blue-50 border-blue-400 shadow-sm'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={option.id}
                      checked={selectedPayment === option.id}
                      onChange={() => setSelectedPayment(option.id)}
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{option.label}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Process Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: 1,
                  title: 'Booking Confirmed',
                  desc: 'Instant voucher generation.',
                  icon: CheckCircle2,
                  color: 'bg-blue-50',
                  iconColor: 'text-blue-500',
                },
                {
                  step: 2,
                  title: 'Driver Details',
                  desc: 'Shared 24 hours before.',
                  icon: Car,
                  color: 'bg-orange-50',
                  iconColor: 'text-orange-500',
                },
                {
                  step: 3,
                  title: 'Safe Pickup',
                  desc: 'On-time guarantee.',
                  icon: MapPin,
                  color: 'bg-green-50',
                  iconColor: 'text-green-500',
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`${s.color} rounded-2xl p-6 border border-white/50 group`}
                >
                  <div
                    className={`${s.iconColor} mb-4 transform group-hover:scale-110 transition-transform duration-500`}
                  >
                    <s.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-[11px] text-gray-500 font-bold">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-4 p-5 bg-orange-50/50 rounded-2xl border border-orange-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-6 h-6 rounded-lg border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-gray-500 leading-relaxed">
                I confirm that the booking details are accurate, the traveller has consented to this
                reservation and agrees to the
                <span className="text-blue-500 hover:underline mx-1">Terms & Conditions</span>.
              </span>
            </label>

            {/* Booking Error Banner */}
            {bookingError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700 text-sm">Booking Failed</p>
                  <p className="text-red-600 text-xs mt-0.5">{bookingError}</p>
                </div>
                <button
                  onClick={() => setBookingError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              disabled={!confirmed || isSubmitting}
              onClick={handleBooking}
              className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                confirmed && !isSubmitting
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  Pay ₹{Math.round(finalCabPrice || 0).toLocaleString()} Now
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Right Column: Pricing Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
                  <h2 className="text-lg font-bold text-gray-900 font-outfit">Fare Summary</h2>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                      Admin Markup ({cabMarkupDisplay})
                    </span>
                    <span className="text-sm font-black text-gray-900">
                      ₹
                      {cabMarkupAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                      Base Fare
                    </span>
                    <span className="text-sm font-black text-gray-900">
                      ₹
                      {(baseFare || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                      Taxes & Fees
                    </span>
                    <span className="text-sm font-black text-gray-900">
                      ₹{(cabTax || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                      Service Fee
                    </span>
                    <span className="text-sm font-black text-green-600 font-bold uppercase tracking-widest">
                      Free
                    </span>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-lg font-black text-gray-900">Grand Total</span>
                    <div className="text-right">
                      <div className="text-3xl font-black text-orange-500">
                        ₹{Math.round(finalCabPrice).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {selectedCab?.cancellationPolicy?.includes('Free')
                          ? 'Partially Refundable'
                          : 'Non-Refundable'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Insufficient Balance Modal */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-red-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Insufficient Balance</h2>
            <p className="text-gray-500 font-medium mb-6">
              Your wallet balance is not enough to complete this booking. Please top up your wallet
              to continue.
            </p>

            <div className="w-full bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-2 border border-gray-100">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-400 uppercase tracking-widest">Required</span>
                <span className="font-black text-gray-900 text-lg">
                  ₹{Math.round(finalCabPrice).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-400 uppercase tracking-widest">Available</span>
                <span className="font-black text-red-500 text-lg">
                  ₹{Math.round(walletBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  // Normally navigate to topup page
                  // navigate('/profile/wallet');
                }}
                className="px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                Top Up Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
