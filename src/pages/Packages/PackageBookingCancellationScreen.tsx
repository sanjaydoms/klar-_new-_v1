import React from 'react';
import { XCircle, RefreshCw, Home, CreditCard, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';

const PackageBookingCancellationScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B] pb-16 antialiased">
      <ToursAndPackagesNavbar />

      {/* Main Core View Area Container Workspace */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 mt-10 space-y-6">
        {/* Top Status Card Panel Module */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden pt-12 pb-10 px-6 md:px-12 text-center space-y-6">
          {/* Accent Red Border Header Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#EF4444]" />

          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#EF4444] flex items-center justify-center text-white shadow-md shadow-red-100">
              <XCircle size={36} className="stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight">
              Payment Failed
            </h2>
            <p className="text-sm text-[#64748B] font-normal leading-relaxed">
              We couldn't process your payment. Don't worry, your card wasn't charged. Please check
              your payment details and try again.
            </p>
          </div>

          {/* Core Navigation Control Anchors */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/package/payment')}
              className="w-full sm:w-auto h-11 bg-[#1D58F6] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-6 flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-sm active:scale-95"
            >
              <RefreshCw size={15} className="stroke-[2.5]" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto h-11 bg-white hover:bg-gray-50 text-[#0F172A] border border-gray-200 text-sm font-semibold rounded-xl px-6 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Home size={15} className="text-[#64748B]" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>

        {/* Informative Two Column Matrix Helper Block Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Block A: What Happened */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#EF4444] flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard size={18} />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-bold text-[#0F172A]">What Happened?</h3>
              <ul className="space-y-2 text-sm text-[#64748B] font-normal lists-none p-0 m-0">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
                  <span>Payment was declined by your bank</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
                  <span>No charges were made to your account</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
                  <span>Your booking has not been confirmed</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Block B: What To Do Next */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#1D58F6] flex items-center justify-center shrink-0 mt-0.5">
              <Info size={18} />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-bold text-[#0F172A]">What To Do Next?</h3>
              <ul className="space-y-2 text-sm text-[#64748B] font-normal lists-none p-0 m-0">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D58F6] shrink-0" />
                  <span>Verify your card details are correct</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D58F6] shrink-0" />
                  <span>Ensure sufficient funds are available</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D58F6] shrink-0" />
                  <span>Try using a different payment method</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Centered Helpline Anchor Connect Widgets Frame Wrapper */}
        <div className="bg-[#F8FAFF] border border-[#E2EBF2] rounded-2xl p-6 md:p-8 space-y-6 text-center">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#0F172A]">Need Help?</h3>
            <p className="text-xs md:text-sm text-[#64748B] font-medium">
              Our support team is available 24/7 to assist you
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Helpline Module: Call */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
              <div className="w-10 h-10 shrink-0 overflow-hidden flex items-center justify-center">
                {/* PLACEHOLDER: Replace src with your custom call option image asset */}
                <img
                  src="/logo/tours_contact_icon.png"
                  alt="Call Us"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=Call';
                  }}
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Call Us</h4>
                <p className="text-[11px] text-[#64748B] font-medium mt-0.5">+1 (800) 123-4567</p>
              </div>
            </div>

            {/* Helpline Module: Live Chat */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
              <div className="w-10 h-10 shrink-0 overflow-hidden flex items-center justify-center">
                {/* PLACEHOLDER: Replace src with your custom live chat option image asset */}
                <img
                  src="/logo/tours_chat_icon.png"
                  alt="Live Chat"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=Chat';
                  }}
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Live Chat</h4>
                <p className="text-[11px] text-[#10B981] font-semibold mt-0.5">Available now</p>
              </div>
            </div>

            {/* Helpline Module: Email */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-sm">
              <div className="w-10 h-10 shrink-0 overflow-hidden flex items-center justify-center">
                {/* PLACEHOLDER: Replace src with your custom email option image asset */}
                <img
                  src="/logo/tours_email_icon.png"
                  alt="Email Us"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=Email';
                  }}
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Email Us</h4>
                <p className="text-[11px] text-[#64748B] font-medium mt-0.5">support@travel.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata Reference Logs Strip Bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left text-[11px] md:text-xs">
          <div className="space-y-0.5 text-[#64748B]">
            <p className="font-normal">
              Error Reference:{' '}
              <strong className="text-[#0F172A] font-semibold uppercase">
                ERR-PMT-2024-0107-8472
              </strong>
            </p>
            <p className="text-gray-400 font-normal">Timestamp: January 7, 2026 at 2:34 PM EST</p>
          </div>
          <button className="inline-flex items-center gap-1 font-bold text-[#0F172A] hover:text-[#1D58F6] transition-colors cursor-pointer bg-transparent border-0 p-0 self-start sm:self-center">
            <span>View Full Details</span>
            <ChevronRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default PackageBookingCancellationScreen;
