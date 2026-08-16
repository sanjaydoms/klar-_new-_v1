import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Info,
  CheckSquare,
  Square,
} from 'lucide-react';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/authentication/hooks/useAuth';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

// ✅ The exact key name specified by the team for login redirect
const REDIRECT_KEY = 'redirectAfterLogin';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  type: string;
  name: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const PackageBookingScreen: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const [timeLeft, setTimeLeft] = useState<number>(14 * 60 + 46); // 14:46 initial state
  const [isCancellationOpen, setIsCancellationOpen] = useState<boolean>(true);
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [savePan, setSavePan] = useState<boolean>(true);
  const [haveGst, setHaveGst] = useState<boolean>(false);

  const [countryCode, setCountryCode] = useState<string>('91');
  const [mobileNumber, setMobileNumber] = useState<string>('7702380646');
  const [emailAddress, setEmailAddress] = useState<string>('john.anderson@gmail.com');
  const [panNumber, setPanNumber] = useState<string>('HUMP31420');

  const [guests, setGuests] = useState<Guest[]>([
    { id: '1', type: 'Primary Guest', name: 'John Anderson' },
    { id: '2', type: 'Guest 2', name: 'Sarah Anderson, FEMALE, 28 Years' },
    { id: '3', type: 'Guest 3', name: '' },
  ]);

  const [couponCode, setCouponCode] = useState<string>('');
  const [activeCoupon, setActiveCoupon] = useState<string>('LADSSPECIAL');

  // ─── RESTORE DATA AFTER LOGIN ────────────────────────────────────────────────

  useEffect(() => {
    // Check if user just logged in and has saved booking data
    const savedData = sessionStorage.getItem('packageBookingData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        console.log('🔄 Restoring booking data after login:', data);
        
        // Restore all the data
        if (data.guests) setGuests(data.guests);
        if (data.countryCode) setCountryCode(data.countryCode);
        if (data.mobileNumber) setMobileNumber(data.mobileNumber);
        if (data.emailAddress) setEmailAddress(data.emailAddress);
        if (data.panNumber) setPanNumber(data.panNumber);
        if (data.activeCoupon) setActiveCoupon(data.activeCoupon);
        if (data.agreeToTerms !== undefined) setAgreeToTerms(data.agreeToTerms);
        if (data.savePan !== undefined) setSavePan(data.savePan);
        if (data.haveGst !== undefined) setHaveGst(data.haveGst);
        
        // Clear the saved data after restoring
        sessionStorage.removeItem('packageBookingData');
        sessionStorage.removeItem(REDIRECT_KEY);
        localStorage.removeItem(REDIRECT_KEY);
        
        console.log('✅ Booking data restored successfully!');
      } catch (error) {
        console.error('Error restoring booking data:', error);
      }
    }
  }, []);

  // ─── TIMER EFFECT ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // ─── FORMAT TIMER ────────────────────────────────────────────────────────────

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── GUEST HANDLERS ──────────────────────────────────────────────────────────

  const handleGuestNameChange = (id: string, updatedName: string) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, name: updatedName } : g)));
  };

  const handleAddNewGuest = () => {
    const newId = (guests.length + 1).toString();
    setGuests((prev) => [...prev, { id: newId, type: `Guest ${newId}`, name: '' }]);
  };

  // ─── PAYMENT HANDLER WITH AUTH CHECK ────────────────────────────────────────

  const handlePaymentClick = (e: React.MouseEvent) => {
   
    console.log('✅  Proceeding to payment');
    // The Link will handle navigation
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#111111] pb-16 antialiased">
      <ToursAndPackagesNavbar />

      {/* 1. Global Synchronized Countdown Header Bar */}
      <header className="w-full bg-[#2B4CB6] text-white px-4 md:px-12 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button className="text-white hover:opacity-80 bg-transparent border-0 cursor-pointer transition-transform active:scale-95 flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-sm md:text-base font-semibold tracking-wide">Review Booking</h1>
        </div>
        <div className="flex items-center gap-1.5 text-white font-medium text-xs md:text-sm">
          <Clock size={16} className="text-white" />
          <span className="opacity-90">Time Left :</span>
          <span className="text-[#FF4D4D] font-bold min-w-[45px] text-right">
            {formatTimer(timeLeft)}
          </span>
        </div>
      </header>

      {/* 2. Responsive Core Double Column Split Grid Workspace */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN PANEL: Booking Parameters, Profiles Form, Legal Disclaimers */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card Module A: Package Parameter Matrix Grid */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-left">
            <div className="p-5 md:p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="space-y-4 flex-1 w-full">
                <div className="space-y-2">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                    Amazing Andaman
                  </h2>
                  <span className="bg-[#EAF7EE] text-[#2E7D32] text-[11px] font-semibold px-2.5 py-1 rounded inline-block tracking-wide">
                    3 Days / 2 Nights
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 pt-2 text-xs text-gray-500">
                  <div className="space-y-1">
                    <p className="text-gray-400 text-[10px] uppercase font-medium tracking-wider">
                      Departure
                    </p>
                    <p className="font-semibold text-gray-900 text-sm">10:00 AM</p>
                    <p className="text-gray-500 text-[11px]">Fri, 08-12-2026</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-[10px] uppercase font-medium tracking-wider">
                      Arrival
                    </p>
                    <p className="font-semibold text-gray-900 text-sm">08:00 PM</p>
                    <p className="text-gray-500 text-[11px]">Sun, 10-12-2026</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-[10px] uppercase font-medium tracking-wider">
                      Baggage
                    </p>
                    <p className="font-semibold text-gray-900 text-sm">Adult</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-[10px] uppercase font-medium tracking-wider">
                      Breakfast
                    </p>
                    <p className="font-semibold text-[#2E7D32] text-sm">Included</p>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[130px] aspect-[4/3] md:aspect-square lg:w-[140px] rounded-lg overflow-hidden bg-slate-100 shrink-0 self-center md:self-start">
                <img
                  src="/images/tours_booking_screen_img.jpg"
                  alt="Andaman Cove"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="bg-[#F1F9F4] px-5 md:px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-medium text-[#1E4620] border-t border-gray-50">
              <span>• Handpicked Island Journey</span>
              <span>• Slow Travel</span>
              <span>• Tropical Luxury</span>
            </div>
          </div>

          {/* Card Module B: Toggleable Cancellation Policy Accordion */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-left overflow-hidden">
            <button
              onClick={() => setIsCancellationOpen(!isCancellationOpen)}
              className="w-full p-4 md:p-5 flex items-center justify-between font-medium text-sm md:text-base text-gray-800 bg-transparent border-0 cursor-pointer outline-none"
            >
              <span className="font-semibold text-gray-900">Cancellation Policy</span>
              {isCancellationOpen ? (
                <ChevronUp size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
            </button>
            {isCancellationOpen && (
              <div className="px-5 md:px-6 pb-5 pt-1 text-xs text-gray-500 leading-relaxed font-normal border-t border-gray-50">
                Cancellation requests received 7 days prior to departure qualify for a full
                milestone refund. Packages cancelled within the standard 7-day window forfeit core
                logistics retention percentages outlined in the extended terms handbook.
              </div>
            )}
          </div>

          {/* Card Module C: Guest Profiles Identification Form Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-5">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Add Guest Details</h3>
              <p className="text-xs text-gray-400 mt-1">
                Please make sure you add the details as per your ID Proof
              </p>
            </div>

            <div className="space-y-3">
              {guests.map((guest) => (
                <div
                  key={guest.id}
                  className="p-3.5 border border-gray-100 rounded-lg bg-[#F8F9FC] flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="text-[10px] font-semibold text-[#3B82F6] uppercase tracking-wide block">
                      {guest.type}
                    </span>
                    <input
                      type="text"
                      value={guest.name}
                      placeholder={guest.name ? '' : 'Enter full name'}
                      onChange={(e) => handleGuestNameChange(guest.id, e.target.value)}
                      className="w-full bg-transparent font-medium text-gray-800 text-xs md:text-sm outline-none border-b border-transparent focus:border-gray-200 py-0.5"
                    />
                  </div>
                  <button className="text-gray-400 hover:text-blue-600 transition-colors bg-transparent border-0 cursor-pointer p-1">
                    <Edit2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddNewGuest}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B82F6] uppercase tracking-wider hover:text-blue-700 bg-transparent border-0 cursor-pointer pt-1"
            >
              <Plus size={14} /> Add New Guest
            </button>
          </div>

          {/* Card Module D: Contact Data Transmission Hook */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-5">
            <h3 className="text-base md:text-lg font-bold text-gray-900">
              Booking details will be sent to
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Country Code
                </label>
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div className="md:col-span-4 flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-4 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div className="md:col-span-5 flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-4 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div
              className="flex items-center gap-2 text-xs pt-1 cursor-pointer select-none"
              onClick={() => setHaveGst(!haveGst)}
            >
              {haveGst ? (
                <CheckSquare size={15} className="text-blue-600" />
              ) : (
                <Square size={15} className="text-gray-300" />
              )}
              <span className="font-medium text-gray-500">
                I have a GST Number <span className="text-gray-300 font-normal">(Optional)</span>
              </span>
            </div>
          </div>

          {/* Card Module E: Compliance Tax Data Field Blocks */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base md:text-lg font-bold text-gray-900">PAN Details</h3>
              <Info size={13} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-400">
              As per RBI, PAN Details are mandatory for this booking
            </p>

            <div className="flex flex-col gap-1.5 max-w-xs pt-1">
              <div className="relative">
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 uppercase text-xs md:text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400">
                  PAN=H*****A...
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer select-none"
                  onClick={() => setSavePan(!savePan)}
                >
                  {savePan ? (
                    <CheckSquare size={15} className="text-blue-600" />
                  ) : (
                    <Square size={15} className="text-gray-300" />
                  )}
                  <span>Save PAN for future bookings</span>
                </div>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">
                  PAN Verified
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-normal leading-relaxed">
                If you have exhausted ₹ 10 Lacs limit available under PAN in current financial year,
                then you are liable to pay 20% TCS. Please confirm adding TCS to your total price.{' '}
                <a href="#" className="text-blue-600 underline font-medium">
                  Yes, Add 20% TCS
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN PANEL: Financial Calculations Box & Marketing Coupons */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card Module F: Main Financial Summary Checkouts Statement Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-left">
            <div className="p-5 md:p-6 space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">₹75,500</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Inclusive of taxes</p>
                <p className="text-[11px] text-gray-400">Total price for 2 Adults, 1 Child</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-100 text-xs">
                <p className="font-semibold text-gray-800 uppercase tracking-wide text-[10px]">
                  Trip Summary
                </p>
                <div className="flex justify-between font-normal text-gray-500">
                  <span>( 3 days & 2 nights )</span>
                  <span className="font-semibold text-gray-800">₹15,444</span>
                </div>
                <div className="flex justify-between font-normal text-[#2E7D32]">
                  <span>Coupon Discount</span>
                  <span className="font-semibold">- ₹2,144</span>
                </div>
              </div>

              <div className="pt-2 flex items-start gap-2 text-[11px] text-gray-400 font-normal leading-relaxed">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-0.5 accent-blue-600 rounded cursor-pointer shrink-0"
                  id="terms"
                />
                <label htmlFor="terms" className="cursor-pointer select-none text-gray-400">
                  By proceeding, I agree to Klar's{' '}
                  <a href="#" className="text-blue-600 underline font-medium">
                    User Agreement
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 underline font-medium">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* ✅ Payment Button with Auth Check */}
              <Link to="/package/payment" onClick={handlePaymentClick}>
                <button className="w-full h-11 bg-[#FF1A1A] hover:bg-red-700 text-white font-bold uppercase text-xs tracking-wider rounded-lg transition-transform active:scale-95 border-0 cursor-pointer shadow-sm">
                  PAY NOW
                </button>
              </Link>
            </div>
          </div>

          {/* Card Module G: Marketing Promos & Coupon Activation Block */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Coupons & Offers
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ENTER COUPON CODE"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-grow h-9 border border-gray-200 rounded-lg px-3 text-xs font-semibold uppercase tracking-wide placeholder:text-gray-300 outline-none focus:border-blue-500 bg-white"
              />
              <button className="h-9 bg-transparent hover:text-blue-700 text-[#3B82F6] font-semibold text-xs uppercase px-1 border-0 cursor-pointer transition-colors">
                Enter Code
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* Promo Item A */}
              <div
                className={`p-3.5 border rounded-lg flex items-start justify-between gap-4 transition-colors ${activeCoupon === 'LADSSPECIAL' ? 'border-blue-100 bg-[#F4F8FF]' : 'border-gray-100 bg-white'}`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] shrink-0" />
                    <span className="font-semibold text-xs text-gray-900 tracking-wide truncate uppercase">
                      LADSSPECIAL
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-normal">
                    Exclusive discount applied automatically
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-gray-900">₹2,149</p>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mt-0.5">
                    Applied
                  </span>
                </div>
              </div>

              {/* Promo Item B */}
              <div
                className={`p-3.5 border rounded-lg flex items-start justify-between gap-4 transition-colors ${activeCoupon === 'MMTIS(B2C)' ? 'border-blue-100 bg-[#F4F8FF]' : 'border-gray-100 bg-white'}`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] shrink-0" />
                    <span className="font-semibold text-xs text-gray-900 tracking-wide truncate uppercase">
                      MMTHIS(B2CM)
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-normal">
                    Standard seasonal holiday package credit
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-gray-500">₹2,000</p>
                  <button
                    onClick={() =>
                      setActiveCoupon(activeCoupon === 'MMTIS(B2C)' ? '' : 'MMTIS(B2C)')
                    }
                    className="text-[9px] font-bold text-[#3B82F6] uppercase tracking-wider block bg-transparent border-0 cursor-pointer p-0 mt-1 hover:underline"
                  >
                    {activeCoupon === 'MMTIS(B2C)' ? 'Remove' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PackageBookingScreen;