import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Shield, CreditCard, ChevronDown } from 'lucide-react';
import { getInsuranceBookingDetails } from '@/api/insuranceService.api';
import InsuranceNavbar from './InsuranceNavbar';
import { notifyError } from '@/utils/notify';

const InsuranceBookingConfirmationDossier: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Fare');
  const [isLoading, setIsLoading] = useState(false);
  const [localBookingData, setLocalBookingData] = useState<any>(null);
  const location = useLocation();

  const { bookingDetails: stateDetails, plan: statePlan } = location.state || {};

  // ===== FIX: UNIFY INITIAL OBJECT RESOLUTION MATRIX TO CAPTURE DIRECT REDIRECTS EXTENSIONS =====
  const rawResolvedDetails = localBookingData || stateDetails;
  const bookingDetails = rawResolvedDetails?.body || rawResolvedDetails?.data || rawResolvedDetails;
  
  console.log('Resolved bookingDetails normalized structure:', bookingDetails);

  const queryParams = new URLSearchParams(location.search);
  const urlBid = queryParams.get('_id');

  useEffect(() => {
    const recoverData = async () => {
      if (urlBid) {
        setIsLoading(true);
        try {
          const response = await getInsuranceBookingDetails(urlBid);
          console.log('API Response payload:', response);
          if (response) {
            // Store the matching response block safely
            setLocalBookingData(response.body || response.data || response);
          }
        } catch (error) {
          console.error('Failed to recover booking details over network:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    recoverData();
  }, [getInsuranceBookingDetails, urlBid]);

  // Helper function to preview or extract uploaded passport files safely
  const handleViewPassport = (traveller: any) => {
    if (traveller.passportFile instanceof File) {
      const blobUrl = URL.createObjectURL(traveller.passportFile);
      window.open(blobUrl, '_blank');
    } else if (typeof traveller.passportFile === 'string') {
      window.open(traveller.passportFile, '_blank');
    } else {
      notifyError('No passport file stream attached to this traveler record.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-['Inter',_sans-serif]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse">RECOVERING BOOKING DATA...</p>
        </div>
      </div>
    );
  }

  if (!bookingDetails && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-['Inter',_sans-serif]">
        <div className="text-center max-w-md px-6">
          <Shield size={40} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">No Booking Details Found</h2>
          <Link to="/" className="bg-[#2A3982] text-white px-6 py-3 rounded-xl font-bold text-sm">
            BACK TO DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  // --- SAFE OBJECT ACCESS EXTRACTION ---
  const tjDetails = bookingDetails?.tjBookingDetailsResponse || bookingDetails || {};
  const insurance = tjDetails?.itemInfos?.INSURANCE || bookingDetails?.itemInfos?.INSURANCE || {};
  const isq = insurance?.isq || bookingDetails?.isq || bookingDetails?.bookingPayload?.isq || {};
  const iinfo =
    insurance?.iinfo?.pli?.[0]?.pi?.[0] || bookingDetails?.iinfo?.pli?.[0]?.pi?.[0] || {};

  const travellers = bookingDetails?.travellers || isq?.iti || tjDetails?.order?.iti || bookingDetails?.rawTravellers || [];

  const insuranceInfo =
    insurance?.iinfo?.pli?.[0]?.pi?.[0] || bookingDetails?.iinfo?.pli?.[0]?.pi?.[0] || {};
  const fareDataFromTraveller = insuranceInfo?.iti?.[0]?.fd?.ifc;
  const fareDataFromPlan =
    insurance?.iinfo?.pli?.[0]?.tfd?.ifc || bookingDetails?.paymentInfos?.[0];


  const startDate = 
  isq?.sd || 
  bookingDetails?.tjBookPayload?.isq?.sd || 
  bookingDetails?.bookingPayload?.pli?.[0]?.pi?.[0]?.sd || 
  'N/A';

const endDate = 
  isq?.ed || 
  bookingDetails?.tjBookPayload?.isq?.ed || 
  bookingDetails?.bookingPayload?.pli?.[0]?.pi?.[0]?.ed || 
  'N/A';



  // Metadata & Identifiers
  const region = iinfo?.rname || bookingDetails?.selectedPlan?.title || 'International';
  // const totalAmount =
  //   bookingDetails?.amount || bookingDetails?.totalPrice || tjDetails?.order?.amount || fareDataFromPlan?.amount || 0;


  const totalAmount =
  bookingDetails?.tjBookPayload?.paymentDetails?.amountPaid || // 🎯 Resolves to ₹6,360 from Razorpay snapshot
  bookingDetails?.paymentDetails?.amountPaid || 
  bookingDetails?.amount || 
  bookingDetails?.totalPrice || 
  tjDetails?.order?.amount || 
  0;


  // Add this new variable right below totalAmount:
const passengerPremium = 
  bookingDetails?.amount || 
  fareDataFromPlan?.amount || 
  970;


  const fareInfo = fareDataFromTraveller || {};
  const baseFare = fareInfo?.SP || totalAmount;
  const taxes = fareInfo?.SPGST || 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const calculateDays = (s: string, e: string) => {
    if (s === 'N/A' || e === 'N/A') return '--';
    const start = new Date(s);
    const end = new Date(e);
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F6F9] font-['Inter',_sans-serif] text-gray-800 pb-20">
      <div className="w-full bg-white border-b border-gray-100">
        <InsuranceNavbar />
      </div>

      <div className="w-full bg-gradient-to-r from-[#2044A5] to-[#407BFF] text-white overflow-hidden min-h-[220px] flex items-stretch">
        <div className="w-full flex flex-col md:flex-row items-center justify-between">
          <div className="flex-1 text-center md:text-left space-y-3 py-10 px-6 md:pl-16 md:pr-8">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide uppercase">
              CONGRATULATIONS!
            </h1>
            <h2 className="text-lg md:text-xl font-bold opacity-90">
              Your travel is secured with TripSafe.
            </h2>
            <p className="text-xs max-w-2xl opacity-75 leading-relaxed">
              You are now covered by TripSafe, a comprehensive travel assistance package offering
              the best of round-the-clock assistance services along with International travel and
              medical insurance. A detailed pack, including a certificate of insurance, will be
              emailed.
            </p>
            <p className="text-xs font-bold pt-1">
              <span className="underline cursor-pointer hover:text-blue-100">Click here</span> for
              further information on TripSafe.
            </p>
          </div>

          <div className="hidden md:block w-1/3 min-w-[320px] self-stretch relative">
            <img
              src="/images/insurance_booking_conformation_banner_img_1.png"
              alt="Confirmation Banner"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-16 mt-8 space-y-6">
        {/* Card 1: Trip Details Matrix Box */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden relative">
          <div className="bg-[#4361EE] text-white px-5 py-2.5 inline-flex items-center gap-1.5 rounded-br-lg text-[11px] font-bold tracking-wider uppercase absolute top-0 left-0">
            Trip Details :
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-5 px-6 pt-14 pb-6 text-left">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                Region
              </p>
              <p className="font-bold text-gray-800 text-xs truncate">{region}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                Start Date
              </p>
              <p className="font-bold text-gray-800 text-xs">{formatDate(startDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                End Date
              </p>
              <p className="font-bold text-gray-800 text-xs">{formatDate(endDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                No of Days
              </p>
              <p className="font-bold text-gray-800 text-xs">{calculateDays(startDate, endDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                No of Travellers
              </p>
              <p className="font-bold text-gray-800 text-xs">
                {travellers.length.toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Tier Badge & Travelers Inline Accordion */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 p-4 bg-gray-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <Shield size={14} className="text-blue-500" />
              <span className="uppercase text-[#2044A5]">TripSafe</span>
              <span className="text-amber-600 bg-amber-50 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-black uppercase">
                {statePlan?.tier || statePlan?.name || iinfo?.pi || 'GOLD PLUS'}
              </span>
            </div>
            <div className="text-[11px] font-bold text-gray-500">
              24/7 Assistance | {statePlan?.travelCoverAmount || iinfo?.pn || '$100,000'} Travel Cover
            </div>
          </div>

          <div className="p-5 space-y-4">
            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              Passengers Covered
            </h4>
            <div className="space-y-2.5">
              {travellers.length > 0 ? (
                travellers.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F8FAFC] rounded-lg border border-gray-200/60 gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800 uppercase tracking-wide">
                        {t.fn || t.firstName} {t.ln || t.lastName}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase">
                        {t.gen === 'M' || t.gender === 'Male' ? 'M' : 'F'} , {t.age || 'N/A'}{' '}
                        <span className="mx-1">|</span>{' '}
                        {t.pnum || t.passportNumber || 'N/A'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                      {(t.passportFile || bookingDetails?.passportFile) && (
                        <button
                          onClick={() => handleViewPassport(t || bookingDetails)}
                          className="text-blue-600 font-bold text-[10px] uppercase flex items-center gap-1 hover:underline bg-white border border-blue-200 px-2.5 py-1 rounded shadow-sm"
                        >
                          📄 View Passport
                        </button>
                      )}
                      <button className="text-orange-500 font-bold text-[10px] uppercase flex items-center gap-1 hover:underline bg-transparent border-0 cursor-pointer">
                        📂 <span className="underline">TripSafe Document</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-medium text-gray-400 p-2">
                  No traveler context located.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Financial metrics breakdown & disclaimers info section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4">
          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
              <CreditCard size={15} className="text-[#2044A5]" />
              <span className="font-bold text-[11px] text-gray-500 uppercase tracking-wide">
                Fare Summary
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div
                className="flex justify-between items-center bg-gray-50 p-2.5 rounded border border-gray-200/60 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => setActiveTab(activeTab === 'Fare' ? '' : 'Fare')}
              >
                <span className="text-xs font-bold uppercase text-gray-600 flex items-center gap-1">
                  Plan Premium{' '}
                  <ChevronDown
                    size={14}
                    className={`transform transition-transform ${activeTab === 'Fare' ? 'rotate-180' : ''}`}
                  />
                </span>
                <span className="text-xs font-bold text-gray-800">
                  ₹{passengerPremium.toLocaleString()}
                </span>
              </div>

              {activeTab === 'Fare' && (
                <div className="bg-[#FAFBFD] p-3 rounded-lg border border-gray-100 space-y-3 animate-in fade-in duration-200">
                  <div className="flex justify-between text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    <span>Base Premium</span>
                    <span className="font-bold text-gray-600">₹{baseFare.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    <span>Taxes (GST)</span>
                    <span className="font-bold text-gray-600">₹{taxes.toLocaleString()}</span>
                  </div>
                  <div className="pt-2.5 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-700 uppercase block">Total Payable</span>
                    </div>
                    <span className="text-xl font-black text-[#2044A5]">
                      ₹{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <div className="w-5 h-5 bg-blue-50 text-[#2044A5] rounded-full flex items-center justify-center text-xs font-black">
                i
              </div>
              <h4 className="font-bold text-xs uppercase text-gray-700 tracking-wide">
                Important Information
              </h4>
            </div>
            <ul className="space-y-2 text-[10px] text-gray-400 font-medium leading-relaxed pl-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>I agree to the <span className="text-blue-600 underline cursor-pointer font-bold">Terms & Conditions</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>I accept that this policy will not be valid if the origin of my trip is not India.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>I confirm that all travelers have Indian passports or Overseas Citizenship of India (OCI), and the policy holder has an Indian bank account.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Insurance cover is subject to the terms and conditions mentioned in the Policy wordings provided to you with this Certificate.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-start items-center gap-4 pt-6">
          <Link
            to="/"
            className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InsuranceBookingConfirmationDossier;