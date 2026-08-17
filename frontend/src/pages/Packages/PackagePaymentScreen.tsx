import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Clock,
  ChevronRight,
  CreditCard,
  Building2,
  Wallet,
  Calendar,
  Percent,
  Heart,
  ShieldCheck,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';

interface SavedCard {
  id: string;
  type: 'VISA' | 'MC';
  last4: string;
  isVerified: boolean;
}

const PackagePaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<number>(14 * 60 + 46);
  const [activeTab, setActiveTab] = useState<string>('card');
  const [cardSubTab, setCardSubTab] = useState<'credit' | 'debit'>('credit');
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>('card-1');

  // New Card Form States
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const savedCards: SavedCard[] = [
    { id: 'card-1', type: 'VISA', last4: '4532', isVerified: true },
    { id: 'card-2', type: 'MC', last4: '8976', isVerified: true },
  ];

  const paymentTabs = [
    {
      id: 'card',
      label: 'Credit/Debit Card',
      subtitle: 'Save 3% on SBI Cards',
      icon: <CreditCard size={16} />,
    },
    {
      id: 'upi',
      label: 'UPI',
      tag: 'Popular',
      icon: <span className="text-[10px] font-bold border border-current px-0.5 rounded">UPI</span>,
    },
    { id: 'netbanking', label: 'Net Banking', icon: <Building2 size={16} /> },
    { id: 'wallets', label: 'Wallets', icon: <Wallet size={16} /> },
    { id: 'emi', label: 'EMI', subtitle: 'No Cost EMI Available', icon: <Percent size={16} /> },
    { id: 'paylater', label: 'Pay Later', icon: <Calendar size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#111111] pb-16 antialiased relative">
      <ToursAndPackagesNavbar />

      {/* Header Bar */}
      <header className="w-full bg-[#2B4CB6] text-white px-4 md:px-12 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            className="text-white hover:opacity-80 bg-transparent border-0 cursor-pointer flex items-center justify-center"
            onClick={() => navigate(-1)}
          >
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

      {/* Main Core Layout Layout Split Grid */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COMPONENT: Primary Payment Selector Panel Workspace */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-left">
          <div className="p-5 md:p-6 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Select Payment Mode</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
            {/* Left Hand Navigation Menu Tabs */}
            <div className="md:col-span-4 bg-[#F8F9FC] border-r border-gray-100 flex flex-col">
              {paymentTabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full p-4 text-left border-b border-gray-100 transition-all flex items-start gap-3 relative bg-transparent cursor-pointer outline-none ${isSelected
                        ? 'bg-white border-l-4 border-l-[#2B4CB6] md:-mr-[1px]'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className={`mt-0.5 ${isSelected ? 'text-[#2B4CB6]' : 'text-gray-400'}`}>
                      {tab.icon}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${isSelected ? 'text-[#2B4CB6]' : 'text-gray-700'}`}
                        >
                          {tab.label}
                        </span>
                        {tab.tag && (
                          <span className="bg-[#EBF7EE] text-[#2E7D32] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                            {tab.tag}
                          </span>
                        )}
                      </div>
                      {tab.subtitle && (
                        <p
                          className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-[#2E7D32]' : 'text-gray-400 font-normal'}`}
                        >
                          {tab.subtitle}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={12} className="text-gray-300 mt-1 shrink-0 ml-auto" />
                  </button>
                );
              })}
            </div>

            {/* Right Hand Dynamic Body Workspace View */}
            <div className="md:col-span-8 p-5 md:p-6 space-y-6">
              {activeTab === 'card' && (
                <>
                  {/* Top Promotional Header Strip Banner */}
                  <div className="bg-[#89CFA0] text-[#144423] p-3 rounded-lg flex items-center gap-2 text-xs md:text-sm font-semibold shadow-sm">
                    <ShieldCheck size={18} className="shrink-0" />
                    <span>Save 3% on SBI Credit Cards</span>
                  </div>

                  {/* Inner Form Segment Sub-Toggles */}
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden p-0.5 bg-white">
                    <button
                      onClick={() => setCardSubTab('credit')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer border-0 ${cardSubTab === 'credit'
                          ? 'bg-[#F0F4FF] text-[#2B4CB6]'
                          : 'bg-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                      Credit Card
                    </button>
                    <button
                      onClick={() => setCardSubTab('debit')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer border-0 ${cardSubTab === 'debit'
                          ? 'bg-[#F0F4FF] text-[#2B4CB6]'
                          : 'bg-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                      Debit Card
                    </button>
                  </div>

                  {/* Saved Identity Matrices Checkbox Lists */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                      Saved Cards
                    </p>

                    {savedCards.map((card) => {
                      const isCardSelected = selectedSavedCard === card.id;
                      return (
                        <label
                          key={card.id}
                          className={`w-full p-3 border rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${isCardSelected
                              ? 'border-gray-200 bg-white'
                              : 'border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="saved-card"
                              checked={isCardSelected}
                              onChange={() => setSelectedSavedCard(card.id)}
                              className="accent-[#2B4CB6] h-3.5 w-3.5 cursor-pointer"
                            />
                            <div
                              className={`px-2 py-1 rounded text-[10px] font-bold text-white tracking-wide ${card.type === 'VISA' ? 'bg-[#1A1F71]' : 'bg-[#FF5F00]'
                                }`}
                            >
                              {card.type}
                            </div>
                            <span className="text-xs font-semibold text-gray-800 tracking-wider">
                              •••• •••• •••• {card.last4}
                            </span>
                            {card.isVerified && (
                              <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Verified
                              </span>
                            )}
                          </div>
                          <button className="text-gray-300 hover:text-red-500 bg-transparent border-0 cursor-pointer p-1">
                            <Heart size={14} />
                          </button>
                        </label>
                      );
                    })}

                    {/* Form Add Trigger Node Option Selector */}
                    <label className="w-full p-3 border border-gray-100 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="saved-card"
                        checked={selectedSavedCard === 'new'}
                        onChange={() => setSelectedSavedCard('new')}
                        className="accent-[#2B4CB6] h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#2B4CB6]">
                        <CreditCard size={14} />
                        <span>Add New Card</span>
                      </div>
                    </label>
                  </div>

                  {/* Standardized Card Input Interactive Fields Wrapper Block */}
                  <div className="pt-2 border-t border-gray-100 space-y-4">
                    <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                      New Card Details
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full h-10 border border-gray-200 rounded-lg px-3 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Name as on card"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full h-10 border border-gray-200 rounded-lg px-3 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="w-full h-10 border border-gray-200 rounded-lg px-3 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                          CVV
                        </label>
                        <input
                          type="password"
                          maxLength={3}
                          placeholder="•••"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="w-full h-10 border border-gray-200 rounded-lg px-3 text-xs md:text-sm font-medium text-gray-800 outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 text-center font-normal pt-1">
                      Securely save this card for faster checkout next time
                    </p>

                    <Link to="/package/booking_confirmed">
                      <button className="w-full h-11 bg-[#FF4D5A] hover:bg-red-600 text-white font-bold uppercase text-xs md:text-sm tracking-wider rounded-lg transition-transform active:scale-95 border-0 cursor-pointer shadow-sm mt-2">
                        Pay ₹75,295
                      </button>
                    </Link>
                  </div>
                </>
              )}

              {activeTab !== 'card' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="p-3 rounded-full bg-blue-50 text-[#2B4CB6]">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 capitalize">
                      {activeTab} Integration Template
                    </h4>
                    <p className="text-xs text-gray-400 max-w-xs mt-1">
                      This interface segment safely handles localized transaction streams parsing
                      via selected payment token handlers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN SIDEBAR PANEL: Financial Summaries & Parameter Overviews */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section Matrix 1: Detailed Package Checklist Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Booking Summary</h3>

            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                <img
                  src="/images/tours_payment_img.jpg"
                  alt="Summary thumb"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-gray-900 truncate">Amazing Andaman</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Fri, Jan 15 2026 to Sun, Jan 17 2026
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex justify-between font-normal">
                <span>1 Adult, 2 Children</span>
                <span className="font-semibold text-gray-800">₹77,444</span>
              </div>
              <div className="flex justify-between font-normal text-[#2E7D32]">
                <span>Coupon Discount</span>
                <span className="font-semibold">-₹2,149</span>
              </div>
              <div className="flex justify-between font-normal">
                <span>Taxes & Fees</span>
                <span className="text-gray-400 text-[11px]">Included</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-800">Total Amount</span>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900 block">₹75,295</span>
                <span className="text-[9px] text-gray-400 block -mt-0.5">
                  Inclusive of all taxes
                </span>
              </div>
            </div>
          </div>

          {/* Section Matrix 2: Compliance Badge Certifications Array Container */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Safe & Secure Payment</h3>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#EAF7EE] text-[#2E7D32] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">SSL Encrypted</h4>
                  <p className="text-[10px] text-gray-400 font-normal leading-normal mt-0.5">
                    Your data is protected with 256-bit encryption
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#2B4CB6] flex items-center justify-center shrink-0 mt-0.5">
                  <Lock size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">PCI DSS Compliant</h4>
                  <p className="text-[10px] text-gray-400 font-normal leading-normal mt-0.5">
                    Industry standard security measures
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#FFF4E5] text-[#B76E00] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">Instant Confirmation</h4>
                  <p className="text-[10px] text-gray-400 font-normal leading-normal mt-0.5">
                    Get booking voucher in minutes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section Matrix 3: Trusted Financial Settlement Platforms */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trusted Payment Partners
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F8F9FC] border border-gray-100 text-[10px] font-semibold text-gray-400 py-2.5 rounded text-center uppercase tracking-wider">
                Razorpay
              </div>
              <div className="bg-[#F8F9FC] border border-gray-100 text-[10px] font-semibold text-gray-400 py-2.5 rounded text-center uppercase tracking-wider">
                PayU
              </div>
              <div className="bg-[#F8F9FC] border border-gray-100 text-[10px] font-semibold text-gray-400 py-2.5 rounded text-center uppercase tracking-wider">
                CCAvenue
              </div>
            </div>
          </div>

          {/* Section Matrix 4: Help Desk Hook Layout */}
          <div className="bg-[#F0F4FF] border border-blue-50/50 rounded-xl p-5 text-left space-y-2">
            <h4 className="text-xs font-semibold text-gray-800">Need Help?</h4>
            <p className="text-[11px] text-gray-400 font-normal leading-relaxed">
              Our customer support team is available 24/7
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B4CB6] hover:underline pt-1"
            >
              <span>Contact Support</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </main>

      {/* Timeout Alert Backdrop Popup Overlay */}
      {timeLeft === 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-[440px] w-full text-center shadow-2xl border border-gray-100 transform transition-all space-y-6">
            {/* Hourglass Icon Graphic */}
            <div className="flex flex-col items-center justify-center mx-auto">
              <div className="w-12 h-5 bg-[#0091FF] rounded-t-md relative">
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[20px] border-t-[#FFA000]" />
              </div>
              <div className="w-12 h-5 bg-[#0091FF] rounded-b-md relative mt-6">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-[#FFE082]" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                Payments timed out
              </h3>
              <p className="text-sm text-gray-500 font-normal">
                Current payment session got expired
              </p>
            </div>

            <button
              onClick={() => navigate('/package/booking')}
              className="w-full max-w-[140px] h-10 bg-[#FF4D4D] hover:bg-red-600 text-white font-medium text-sm rounded-lg transition-colors border-0 cursor-pointer shadow-md mx-auto block"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagePaymentScreen;
