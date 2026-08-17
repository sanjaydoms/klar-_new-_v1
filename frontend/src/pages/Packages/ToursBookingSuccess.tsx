import React from 'react';
import { Check, PhoneCall, Mail, Luggage, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';

export default function ToursBookingSuccess() {
  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A] flex flex-col justify-between pb-28 sm:pb-12">
      {/* Navbar Container */}
      <header className="w-full bg-white border-b border-gray-100 shadow-xs px-4 sm:px-8 py-3">
        <div className="w-full max-w-[1400px] mx-auto">
          <ToursAndPackagesNavbar />
        </div>
      </header>

      {/* Main Success Section */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-center flex-grow flex flex-col justify-center items-center">
        {/* Main Content Card Wrapper */}
        <div className="w-full bg-white rounded-[24px] sm:rounded-[32px] shadow-xl border border-gray-100 p-6 sm:p-10 md:p-12">
          
          {/* Green Checkmark Badge */}
          <div className="w-16 h-16 sm:w-22 sm:h-22 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xs">
            <div className="w-10 h-10 sm:w-13 sm:h-13 bg-[#10B981] rounded-full flex items-center justify-center text-white">
              <Check className="w-6 h-6 sm:w-8 sm:h-8 stroke-[3]" />
            </div>
          </div>

          {/* Heading & Subtext */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] tracking-tight mb-2 sm:mb-3">
            We will Reach Out to You Soon
          </h1>
          <p className="text-xs sm:text-base text-gray-500 font-normal max-w-lg mx-auto mb-8 sm:mb-12 leading-relaxed">
            Thank you for your enquiry. Our travel expert will contact you shortly to begin curating your perfect escape.
          </p>

          {/* What's Next Section */}
          <div className="w-full max-w-3xl mx-auto border-t border-gray-100 pt-6 sm:pt-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] mb-6 sm:mb-8">
              What's Next?
            </h2>

            {/* Steps Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 text-left sm:text-center">
              
              {/* Step 1 */}
              <div className="bg-[#FAF8F6] sm:bg-transparent border border-[#E5D2B3]/40 sm:border-0 rounded-2xl p-4 sm:p-0 flex sm:flex-col items-center gap-4 sm:gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A] mb-0.5 sm:mb-1">
                    Expert Assistance
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-snug">
                    Our travel expert will contact you within 24 hours.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#FAF8F6] sm:bg-transparent border border-[#E5D2B3]/40 sm:border-0 rounded-2xl p-4 sm:p-0 flex sm:flex-col items-center gap-4 sm:gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A] mb-0.5 sm:mb-1">
                    Check Your Email
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-snug">
                    We've sent a confirmation email with your request details.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#FAF8F6] sm:bg-transparent border border-[#E5D2B3]/40 sm:border-0 rounded-2xl p-4 sm:p-0 flex sm:flex-col items-center gap-4 sm:gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFF7ED] flex items-center justify-center shrink-0">
                  <Luggage className="w-5 h-5 text-[#F97316]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A] mb-0.5 sm:mb-1">
                    Get Ready to Travel
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-snug">
                    Sit back and relax, we'll handle the rest for you!
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Go to Dashboard Action */}
          <div className="mt-8 sm:mt-10 flex justify-center">
            <Link
              to="/dashboard"
              className="bg-[#1A2342] hover:bg-[#12182E] text-white text-sm sm:text-base font-bold px-7 sm:px-8 h-11 sm:h-12 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}