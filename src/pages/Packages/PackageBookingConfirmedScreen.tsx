import React from 'react';
import {
  CheckCircle,
  Download,
  FileText,
  Mail,
  Calendar,
  MapPin,
  User,
  Info,
  ChevronDown,
  Share2,
  PhoneCall,
  MessageSquare,
  Headphones,
  ArrowRight,
} from 'lucide-react';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';
import { Link } from 'react-router-dom';

const PackageBookingConfirmedScreen: React.FC = () => {
  const guests = [
    { name: 'Aditya Panchadarla', type: 'Adult' },
    { name: 'Guest 1', type: 'Child (8 yrs)' },
    { name: 'Guest 2', type: 'Child (6 yrs)' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#111111] pb-16 antialiased">
      <ToursAndPackagesNavbar />

      {/* Main Core View Area Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mt-6 space-y-6">
        {/* Top Status Success Banner Block */}
        <div className="bg-[#EDFBF2] border border-[#D1F2DC] rounded-2xl p-6 text-center space-y-3">
          <div className="flex justify-center text-[#2E7D32]">
            <CheckCircle size={44} className="fill-[#2E7D32] text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-[#144423]">Booking Confirmed!</h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium">
              Your hotel reservation has been successfully completed
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 font-medium pt-1">
            <span>
              Booking ID: <strong className="text-gray-700 font-semibold">BK-2025-1237</strong>
            </span>
            <span className="hidden md:inline text-gray-200">|</span>
            {/* <span>
              Supplier Reference:{' '}
              <strong className="text-gray-700 font-semibold">HB-8976543</strong>
            </span> */}
          </div>
        </div>

        {/* Action Controls Matrix Buttons Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="h-11 bg-[#244584] hover:bg-[#1b3464] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 shadow-sm">
            <Download size={15} />
            <span>Download Voucher</span>
          </button>
          <button className="h-11 bg-[#00B649] hover:bg-[#00963c] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border-0 shadow-sm">
            <FileText size={15} />
            <span>Download GST Invoice</span>
          </button>
          <button className="h-11 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
            <Mail size={15} className="text-gray-400" />
            <span>Email Confirmation</span>
          </button>
        </div>

        {/* Two Column Split Dashboard Workspace Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PRIMARY PANEL: Detailed Parameter Cards, Guests Lists */}
          <div className="lg:col-span-8 space-y-6">
            {/* Core Ticket Metrics Container */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 text-left space-y-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1 bg-[#EEF4FF] text-[#2B4CB6] px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase">
                    <span className="w-1 h-1 rounded-full bg-[#2B4CB6]" /> E-Ticket
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                    Amazing Andaman
                  </h3>
                  <p className="text-xs font-semibold text-[#2B4CB6] tracking-wide">
                    Full Day Admission Pass
                  </p>
                </div>

                <div className="bg-[#F1F3F7] p-2.5 rounded-lg text-center sm:text-right shrink-0 min-w-[100px]">
                  <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">
                    Booking ID
                  </p>
                  <p className="text-xs font-bold text-gray-800 tracking-wide mt-0.5">MMT015432</p>
                </div>
              </div>

              {/* Time Location Checkbox Matrix Block Split slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#F8F9FC] border border-gray-50 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#EBF3FF] text-[#2B4CB6] flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                      Date & Time
                    </p>
                    <p className="text-xs font-bold text-gray-800 mt-0.5">Jan 15, 2026</p>
                    <p className="text-[11px] text-gray-500 font-medium">10:00 AM</p>
                  </div>
                </div>

                <div className="bg-[#F8F9FC] border border-gray-50 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#EDFAF2] text-[#2E7D32] flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                      Location
                    </p>
                    <p className="text-xs font-bold text-gray-800 mt-0.5">Sentosa Gateway</p>
                    <p className="text-[11px] text-gray-500 font-medium truncate">Singapore</p>
                  </div>
                </div>
              </div>

              {/* Guest Identities Elements Row lists */}
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-xs font-bold text-gray-900">Guest Details</h4>
                  <span className="text-[11px] text-gray-400 font-medium">3 Guests</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {guests.map((guest, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-gray-100 rounded-xl bg-white flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#F0F4FF] text-[#2B4CB6] flex items-center justify-center shrink-0">
                        <User size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{guest.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{guest.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisory Instructions Block Alert Banner */}
              <div className="bg-[#FFFCEB] border-l-4 border-l-[#FFC107] p-3.5 rounded-r-xl flex gap-3 text-left">
                <Info size={16} className="text-[#B78103] mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-[#7A5600] uppercase tracking-wide">
                    Entry Instructions
                  </p>
                  <p className="text-[11px] text-[#614502] font-normal leading-relaxed">
                    Present your barcode at the main entrance. Arrive 15 minutes before your
                    scheduled time. Valid ID required for all guests.
                  </p>
                </div>
              </div>

              {/* Dropdown Summary Price Row Card Block */}
              <div className="bg-[#F8F9FC] rounded-xl p-3 flex items-center justify-between cursor-pointer select-none hover:bg-gray-100/70 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#EDFAF2] text-[#2E7D32] flex items-center justify-center">
                    <CheckCircle size={12} className="fill-[#2E7D32] text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">Payment Successful</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-gray-400">
                    Total: <strong className="text-gray-900 font-bold">₹13,295</strong>
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
              </div>
            </div>

            {/* Minor Utility Functional Shortcut Anchors strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button className="bg-white border border-gray-100 hover:bg-gray-50 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-gray-500 shadow-sm">
                <Download size={16} className="text-gray-400" />
                <span className="text-[10px] font-semibold tracking-wide">Download PDF</span>
              </button>
              <button className="bg-white border border-gray-100 hover:bg-gray-50 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-gray-500 shadow-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-[10px] font-semibold tracking-wide">Email Ticket</span>
              </button>
              <button className="bg-white border border-gray-100 hover:bg-gray-50 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-gray-500 shadow-sm">
                <Share2 size={16} className="text-gray-400" />
                <span className="text-[10px] font-semibold tracking-wide">Share</span>
              </button>
              <button className="bg-white border border-gray-100 hover:bg-gray-50 p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-gray-500 shadow-sm">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-[10px] font-semibold tracking-wide">Add to Calendar</span>
              </button>
            </div>

            {/* Upsell Complementary Services Panels block split grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Service item A: Airport Transfer */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between min-h-[120px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      {/* PLACEHOLDER: Replace src with your custom airport transfer image/icon asset */}
                      <img
                        src="/logo/tours_booking_car_icon.png"
                        alt="Airport Transfer"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/40x40?text=Car';
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Airport Transfer</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Comfortable private transport
                      </p>
                    </div>
                  </div>
                  <span className="bg-[#FFF3E5] text-[#B76E00] text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                    Popular
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-50">
                  <span className="text-xs font-bold text-gray-900">₹1,200</span>
                  <button className="h-7 bg-[#2B4CB6] hover:bg-blue-700 text-white font-semibold text-[10px] px-3.5 rounded-md cursor-pointer border-0 shadow-sm">
                    Add Now
                  </button>
                </div>
              </div>

              {/* Service item B: Travel Insurance */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between min-h-[120px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      {/* PLACEHOLDER: Replace src with your custom travel insurance image/icon asset */}
                      <img
                        src="/logo/tours_booking_travel_icon.png"
                        alt="Travel Insurance"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/40x40?text=Ins';
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Travel Insurance</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">Complete trip protection</p>
                    </div>
                  </div>
                  <span className="bg-[#EAF7EE] text-[#2E7D32] text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                    Recommended
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-50">
                  <span className="text-xs font-bold text-gray-900">₹299</span>
                  <button className="h-7 bg-[#2B4CB6] hover:bg-blue-700 text-white font-semibold text-[10px] px-3.5 rounded-md cursor-pointer border-0 shadow-sm">
                    Add Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR COMPONENT: Entry Pass / Barcode Verification Widget */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main Barcode Display Widget Panel */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center space-y-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 bg-[#EEF4FF] text-[#2B4CB6] px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase mx-auto">
                  <span className="w-1 h-1 rounded-full bg-[#2B4CB6]" /> E-Ticket
                </div>
                <h4 className="text-xs font-bold text-gray-800">Your Entry Pass</h4>
                <p className="text-[11px] text-gray-400 font-normal">Scan at the entrance</p>
              </div>

              {/* Barcode Asset Container Block */}
              <div className="bg-[#F8F9FC] border border-gray-100 rounded-lg p-4 flex flex-col items-center justify-center space-y-2">
                <div className="w-full h-14 flex items-center justify-center overflow-hidden">
                  {/* PLACEHOLDER: Replace src with your crisp structural high-res barcode image snippet */}
                  <img
                    src="/images/tours_booking_qr_code.png"
                    alt="Entry Barcode"
                    className="w-full h-full object-contain object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://placehold.co/300x60?text=||||+BARCODE+||||';
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-gray-400 tracking-wide">
                  MMT01020015432
                </span>
                <span className="text-[9px] text-gray-400 border-t border-gray-200/60 pt-2 block w-full">
                  Valid for single entry on January 15, 2026
                </span>
              </div>

              {/* Verified Sub-badge strip layout */}
              <div className="bg-[#EAF7EE] border border-[#D1F2DC] rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-[#2E7D32] font-semibold">
                <CheckCircle size={15} className="fill-[#2E7D32] text-white shrink-0" />
                <span>
                  Confirmed{' '}
                  <span className="text-xs text-[#4CAF50] font-normal ml-0.5">Ready to use</span>
                </span>
              </div>

              {/* Local Helpline Anchor widgets segments */}
              <div className="pt-3 border-t border-gray-50 text-left space-y-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                  Need Help?
                </p>
                <button className="w-full h-9 bg-[#F8F9FC] hover:bg-gray-100 border border-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
                  <PhoneCall size={13} className="text-gray-400" />
                  <span>Call Support</span>
                </button>
                <button className="w-full h-9 bg-[#F8F9FC] hover:bg-gray-100 border border-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
                  <MessageSquare size={13} className="text-gray-400" />
                  <span>Live Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Support Callout Full-Width strip bar element */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#2B4CB6] flex items-center justify-center shrink-0">
              <Headphones size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">24/7 Customer Support</h4>
              <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                We're here to help before, during, and after your trip
              </p>
            </div>
          </div>
          <Link to="/package/booking_cancellation">
            <button className="h-9 bg-[#2B4CB6] hover:bg-blue-700 text-white font-semibold text-xs px-5 rounded-lg flex items-center justify-center gap-1 cursor-pointer border-0 shadow-sm self-start sm:self-center">
              <span>Contact Us</span>
              <ArrowRight size={13} />
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PackageBookingConfirmedScreen;
