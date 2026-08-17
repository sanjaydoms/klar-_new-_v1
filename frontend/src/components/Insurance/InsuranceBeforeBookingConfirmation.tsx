import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, User, Mail, Phone, Clock, AlertTriangle, CheckCircle2, Calendar, MapPin } from 'lucide-react';
import InsuranceNavbar from './InsuranceNavbar';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { getInsuranceBookingDetails } from '@/api/insuranceService.api';

// Dedicated Insurance Endpoint APIs
import { bookInsurancePlan } from '@/api/insuranceService.api';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/api/razorpay.api';
import { v4 as uuidv4 } from 'uuid';

import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import Loader from '@/userinfoandseatinfo/TravellerInfo/Loader';
countries.registerLocale(enLocale);

export default function InsuranceBeforeBookingConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10 * 60); 

  // ===== DYNAMIC HYBRID STATE LAUNCH WORKSPACE =====
  const [bookingPayload, setBookingPayload] = useState<any>(() => {
    if (location.state?.bookingPayload) return location.state.bookingPayload;
    const cached = sessionStorage.getItem('insurance_payment_bookingPayload');
    return cached ? JSON.parse(cached) : null;
  });

  const [amount, setAmount] = useState<number | null>(() => {
    if (location.state?.amount !== undefined) return location.state.amount;
    const cached = sessionStorage.getItem('insurance_payment_amount');
    return cached ? Number(cached) : null;
  });

  const [selectedPlan, setSelectedPlan] = useState<any>(() => {
    if (location.state?.selectedPlan) return location.state.selectedPlan;
    const cached = sessionStorage.getItem('insurance_selectedPlan');
    return cached ? JSON.parse(cached) : null;
  });

  const [reviewData, setReviewData] = useState<any>(() => {
    if (location.state?.reviewData) return location.state.reviewData;
    const cached = sessionStorage.getItem('insurance_reviewData');
    return cached ? JSON.parse(cached) : null;
  });

  const [rawTravellers, setRawTravellers] = useState<any[]>(() => {
    if (location.state?.rawTravellers) return location.state.rawTravellers;
    const cached = sessionStorage.getItem('insurance_rawTravellers');
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    if (location.state) {
      if (location.state.bookingPayload) {
        sessionStorage.setItem('insurance_payment_bookingPayload', JSON.stringify(location.state.bookingPayload));
        setBookingPayload(location.state.bookingPayload);
      }
      if (location.state.amount !== undefined) {
        sessionStorage.setItem('insurance_payment_amount', String(location.state.amount));
        setAmount(location.state.amount);
      }
      if (location.state.selectedPlan) {
        sessionStorage.setItem('insurance_selectedPlan', JSON.stringify(location.state.selectedPlan));
        setSelectedPlan(location.state.selectedPlan);
      }
      if (location.state.reviewData) {
        sessionStorage.setItem('insurance_reviewData', JSON.stringify(location.state.reviewData));
        setReviewData(location.state.reviewData);
      }
      if (location.state.rawTravellers) {
        sessionStorage.setItem('insurance_rawTravellers', JSON.stringify(location.state.rawTravellers));
        setRawTravellers(location.state.rawTravellers);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bodyContext = reviewData?.body || reviewData;
  const queryContext = bodyContext?.isq;
  const activePlanInfo = bodyContext?.iinfo?.pli?.[0]?.pi?.[0];

  const startDate = queryContext?.sd || 'N/A';
  const endDate = queryContext?.ed || 'N/A';

  const destinationCountryCode = queryContext?.isc?.iri?.[0]?.rkey || '';
  let formattedDestination = location.state?.formattedDestination || 'International';
  if (destinationCountryCode) {
    const fullCountryName = countries.getName(destinationCountryCode, 'en');
    formattedDestination = fullCountryName 
      ? `${fullCountryName} (${destinationCountryCode})` 
      : destinationCountryCode;
  }

  const premiumComponents = activePlanInfo?.tfd?.ifc || activePlanInfo?.iti?.[0]?.fd?.ifc || {};
  const supplierPremium = premiumComponents?.SP || 0;
  const gstPremium = premiumComponents?.SPGST || 0;
  const totalPassengerPremium = premiumComponents?.TF || amount || selectedPlan?.price || 0;
  
  const absoluteTotalAmount = bodyContext?.iinfo?.pli?.[0]?.pi?.[0]?.ptf || (totalPassengerPremium * (rawTravellers.length || 1));
  const backendBenefitsList = activePlanInfo?.pbft || [];

  if (!selectedPlan || !bookingPayload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center p-6 md:p-8 bg-white border rounded-xl shadow-sm max-w-md w-full">
          <AlertTriangle className="mx-auto text-amber-500 mb-4" size={40} />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Review Session Expired</h2>
          <p className="text-sm text-gray-500 mb-6">We could not fetch your premium summary workspace.</p>
          <button onClick={() => navigate('/')} className="w-full sm:w-auto px-6 py-2.5 bg-[#1D2B6B] text-white rounded font-bold text-xs uppercase tracking-wider transition-colors hover:bg-[#152052]">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ===== B2C RAZORPAY & INSURANCE NATIVE GDS BOOKING LIFECYCLE =====
  const handleConfirmAndBook = async () => {
    setIsLoading(true);
    setBookingError(null);


    try {
      const token = localStorage.getItem('token');
      const backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010';
      
      let userId = '';
      let userEmail = rawTravellers[0]?.email || '';
      let mobile = rawTravellers[0]?.mobile || '';
      let clientType = 'B2C';

      // Load Profile contexts safely
      try {
        const userResponse = await fetch(`${backendUrl}/user/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const userDataResponse = await userResponse.json();
        const userData = userDataResponse.data?.user || userDataResponse;
        
        userId = userData.id || userData._id || userData.userId || '';
        if (userData.email) userEmail = userData.email;
        if (userData.mobile || userData.phone) mobile = userData.mobile || userData.phone;
        clientType = userData.clientType || 'B2C';
      } catch (userErr) {
        console.warn('Profile fetch failure fallback active:', userErr);
      }

      if (!userId) userId = uuidv4();
      if (!userEmail) userEmail = `insurance_${userId.substring(0, 8)}@temp.klar.com`;
      if (!mobile) mobile = '9999999999';

      // 2. Initialize localized session markers
      const clientBookingId = bookingPayload.bookingId || `INS-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      sessionStorage.setItem('tempInsuranceBookingData', JSON.stringify({
        bookingId: clientBookingId,
        bookingPayload: bookingPayload,
        totalPrice: absoluteTotalAmount,
        selectedPlan: selectedPlan,
        rawTravellers: rawTravellers
      }));

      // 3. Request Gateway Order Token
      const orderPayload = {
        userId,
        userEmail,
        mobile,
        clientType: clientType.toUpperCase(),
        amount: absoluteTotalAmount,
        currency: 'INR'
      };

      const orderResponse = await createRazorpayOrder(orderPayload);
      if (!orderResponse?.success || !orderResponse?.data) {
        throw new Error(orderResponse?.message || 'Failed to map transaction channels.');
      }

      const { razorpayOrderId, razorpayKeyId, order } = orderResponse.data;
      sessionStorage.setItem('insurance_razorpayOrderId', razorpayOrderId);

      // 4. Inject Razorpay Script onto page DOM dynamically if needed
      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // 5. Build Checkout Options and Launch Modal Mount
      const options = {
        key: razorpayKeyId,
        amount: Math.round(absoluteTotalAmount * 100),
        currency: 'INR',
        name: 'Klar Travels',
        description: `Plan Protection Cover - ${clientBookingId}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            setIsLoading(true);

            // 6. Cryptographic Verification
            const verifyResult = await verifyRazorpayPayment({
              orderId: order.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            if (verifyResult?.success) {
              const paymentData = verifyResult.data;
              const verifiedOrderId = paymentData?.razorpayOrderId || razorpayOrderId;
              const verifiedPaymentId = paymentData?.razorpayPaymentId || response.razorpay_payment_id;

              const cachedSession = JSON.parse(sessionStorage.getItem('tempInsuranceBookingData') || '{}');

              // 7. Core Fix: Inject checkout details directly into insurance API structure
              const finalizedBookingPayload = {
                ...(cachedSession.bookingPayload || bookingPayload),
                paymentDetails: {
                  orderId: verifiedOrderId,
                  paymentId: verifiedPaymentId,
                  signature: response.razorpay_signature,
                  amountPaid: absoluteTotalAmount,
                  gateway: 'RAZORPAY',
                  channel: 'B2C_PORTAL'
                }
              };

              console.log('Sending transaction confirmation into bookInsurancePlan endpoint:', finalizedBookingPayload);
              const bookingResponse = await bookInsurancePlan(finalizedBookingPayload);
              console.log("InsuranceBeforeBookingConfiramtion bookingResponse", bookingResponse)

              // Check logic metrics mirroring your original payment file configurations
              if (bookingResponse.status || bookingResponse.statusCode === 200 || bookingResponse.success) {
                const finalRecordId = bookingResponse.recordId || bookingResponse.bookingId || bookingResponse.data?.bookingId;


            let refreshedDetailsPayload = bookingResponse;        
          try {
            console.log(`Pre-fetching full booking data model from database for ID: ${finalRecordId}`);
            const fetchedDetails = await getInsuranceBookingDetails(finalRecordId);
            
            if (fetchedDetails) {
              refreshedDetailsPayload = fetchedDetails.body || fetchedDetails.data || fetchedDetails;
            }
          } catch (fetchError) {
            console.error('Could not pre-fetch full booking context data during post-payment flow:', fetchError);
            refreshedDetailsPayload = bookingResponse.body || bookingResponse.data || bookingResponse;
          }


                // 8. Clean state workspace caches completely
                sessionStorage.removeItem('tempInsuranceBookingData');
                sessionStorage.removeItem('insurance_razorpayOrderId');
                sessionStorage.removeItem('insurance_payment_bookingPayload');
                sessionStorage.removeItem('insurance_payment_amount');
                sessionStorage.removeItem('insurance_selectedPlan');
                sessionStorage.removeItem('insurance_reviewData');
                sessionStorage.removeItem('insurance_rawTravellers');

                navigate(`/insurance/confirmation?_id=${finalRecordId}`, {
                  state: {
                    bookingDetails: refreshedDetailsPayload,
                    plan: selectedPlan,
                  },
                });
              } else {
                setBookingError(bookingResponse.message || 'Payment validated successfully, but downstream plan provider registration rejected issuance.');
                setIsLoading(false);
              }
            } else {
              throw new Error(verifyResult?.message || 'Cryptographic signature match assertion failed.');
            }
          } catch (verifyErr: any) {
            console.error('Validation failure tracing:', verifyErr);
            setBookingError(verifyErr.message || 'Payment processing verification timed out. Contact system administration.');
            setIsLoading(false);
          }
        },
        prefill: {
          name: userEmail || userId,
          email: userEmail,
          contact: mobile
        },
        theme: {
          color: '#1D2B6B'
        },
        modal: {
          ondismiss: () => {
            setBookingError('Payment checkout execution cancelled.');
            sessionStorage.removeItem('tempInsuranceBookingData');
            sessionStorage.removeItem('insurance_razorpayOrderId');
            setIsLoading(false);
          }
        }
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();

    } catch (err: any) {
      console.error('Critical Payment Stack Error:', err);
      setBookingError(err.message || 'Unable to instantiate standard Razorpay layout frameworks.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-20 font-sans text-[#1A2B3D]">
      {isLoading && <Loader />}
      <InsuranceNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 mt-2 md:mt-4">
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="font-semibold text-xs md:text-sm">Back</span>
          </button>
          <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">
            Review & Confirm Booking
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 space-y-6 order-1">
            
            {/* Traveler & Contact Details Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 md:p-6 space-y-5 md:space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <User size={18} className="text-[#1D2B6B]" />
                <h2 className="text-xs md:text-sm font-extrabold text-gray-800 uppercase tracking-wide">
                  Traveler & Contact Details <span className="text-[11px] text-gray-400 font-normal lowercase">({rawTravellers.length} traveler)</span>
                </h2>
              </div>

              <div className="space-y-5 divide-y divide-gray-100">
                {rawTravellers.map((traveller: any, idx: number) => {
                  const verifiedAge = queryContext?.iti?.[idx]?.age || traveller.age || 'N/A';
                  return (
                    <div key={traveller.id || idx} className={`${idx > 0 ? 'pt-5' : ''} grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6`}>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Passenger Type</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5 uppercase">Passenger {idx + 1} ({verifiedAge} Yrs)</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5 uppercase truncate">
                          {traveller.firstName ? `MR ${traveller.firstName} ${traveller.lastName}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Passport Number / DOB</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5 uppercase">
                          {traveller.passportNumber || 'N/A'} <span className="text-gray-300 font-normal mx-1">|</span> {traveller.dob || 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rawTravellers[0] && (
                <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-lg border border-dashed border-gray-200">
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                    <Mail size={15} className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Primary Email</p>
                      <p className="text-slate-800 font-bold mt-0.5 truncate">{rawTravellers[0].email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                    <Phone size={15} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Primary Phone</p>
                      <p className="text-slate-800 font-bold mt-0.5">{rawTravellers[0].mobile ? `+91 ${rawTravellers[0].mobile}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trip Schedule Details Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Calendar size={18} className="text-[#1D2B6B]" />
                <h2 className="text-xs md:text-sm font-extrabold text-gray-800 uppercase tracking-wide">
                  Trip Schedule Details
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAFBFD] p-4 border border-gray-100 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destination</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 break-words">{formattedDestination}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Policy Start Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{startDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Policy End Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{endDate}</p>
                </div>
              </div>
            </div>

            {/* Benefits Content Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/30 border-b border-gray-200/80 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-[#1D2B6B] rounded-lg flex items-center justify-center text-white shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-[#1D2B6B] italic">Klar Travels Insurance</span>
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider scale-90 origin-left">
                        {activePlanInfo?.pi || selectedPlan?.tier || selectedPlan?.name || 'Gold Plus'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Insurer: <span className="font-bold text-slate-700">{activePlanInfo?.ip || 'ABHI'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Travel Cover Sum Insured</p>
                  <p className="text-sm font-black text-slate-800">
                    {activePlanInfo?.pn || selectedPlan?.travelCoverAmount || '$100,000'}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 md:p-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3.5">Included Core Policy Benefits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {backendBenefitsList.length > 0 ? (
                    backendBenefitsList.map((benefit: any, bIdx: number) => (
                      <div key={bIdx} className="flex items-start gap-2 text-xs text-gray-600 font-medium leading-normal bg-gray-50/60 p-2.5 rounded border border-gray-100">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 block">{benefit.name}</span>
                          {benefit.dsc && <span className="text-[10px] text-gray-400 block mt-0.5 leading-snug">{benefit.dsc}</span>}
                          {benefit.sumins && <span className="text-[10px] text-blue-600 font-bold block mt-0.5">{benefit.sumins}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start gap-2 text-xs text-gray-600 font-medium"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span>24/7 Global Emergency Medical Assistance Cover</span></div>
                      <div className="flex items-start gap-2 text-xs text-gray-600 font-medium"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Baggage Delay / Total Loss Reimbursements</span></div>
                      <div className="flex items-start gap-2 text-xs text-gray-600 font-medium"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Trip Interruption & Flight Delay Compensations</span></div>
                      <div className="flex items-start gap-2 text-xs text-gray-600 font-medium"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Passport Loss Replacement Emergency Assistance</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Payment Sidebar */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 order-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 md:p-6 space-y-5">
              
              <div className="flex justify-between items-center text-xs text-gray-500 font-semibold border-b border-gray-100 pb-3">
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> Session Expiry:</span>
                <span className={`font-mono text-sm ${timeLeft < 120 ? 'text-red-600 animate-pulse font-bold' : 'text-amber-600 font-bold'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide mb-3">Price Information</h3>
                <div className="space-y-2.5 text-xs font-medium text-gray-500">
                  {supplierPremium > 0 && (
                    <div className="flex justify-between">
                      <span>Net Policy Premium</span>
                      <span className="text-slate-800 font-bold">₹{Math.round(supplierPremium).toLocaleString()}</span>
                    </div>
                  )}
                  {gstPremium > 0 && (
                    <div className="flex justify-between">
                      <span>CGST + SGST (18%)</span>
                      <span className="text-slate-800 font-bold">₹{Math.round(gstPremium).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span>Premium per Passenger</span>
                    <span className="text-slate-800 font-bold">₹{Math.round(totalPassengerPremium).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Passenger Multiplier</span>
                    <span className="text-slate-800 font-bold">x {rawTravellers.length || 1}</span>
                  </div>
                </div>
              </div>

              {bookingError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 font-semibold text-[11px] rounded leading-relaxed">
                  {bookingError}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">Total Amount</span>
                <span className="text-lg font-black text-[#1D2B6B]">
                  ₹{Math.round(absoluteTotalAmount).toLocaleString()}
                </span>
              </div>

              <button
                disabled={isLoading || timeLeft === 0}
                onClick={handleConfirmAndBook}
                className="w-full bg-[#1D2B6B] hover:bg-[#152052] text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm & Book'}
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm text-[10px] text-gray-400 font-medium leading-relaxed">
              {reviewData?.body?.iinfo?.pli?.[0]?.pi?.[0]?.mph || 
                "* Insurance booking process is governed by group policy master parameters containing terms, conditions and exclusions."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}