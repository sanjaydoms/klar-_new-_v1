import React from 'react';
import { Headphones, History, MessageCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HelpFeature {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const helpFeatures: HelpFeature[] = [
  { icon: History, title: '24/7 Support', subtitle: 'Always here for you' },
  { icon: MessageCircle, title: 'Expert Guidance', subtitle: 'Personalized assistance' },
  { icon: Shield, title: 'Hassle-Free', subtitle: "We've got you covered" },
];

export const NeedHelpBanner = () => {
  return (
    <section className="w-full pb-14 sm:pb-16 px-4">
      <div className="max-w-6xl bg-[#F8F9FA] rounded-2xl mx-auto p-6 sm:p-8 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8 sm:border sm:border-gray-100 sm:shadow-sm">
        {/* Left Section */}
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="shrink-0 w-12 h-12 sm:w-[72px] sm:h-[72px] rounded-full bg-[#0B1B54] sm:bg-[#E1EBFF] flex items-center justify-center">
            <Headphones className="w-6 h-6 sm:w-8 sm:h-8 text-white sm:text-[#1B2559]" strokeWidth={2} />
          </div>
          
          <div className="flex flex-col gap-6 sm:pt-2">
            <div>
              <h3 className="text-[18px] sm:text-[24px] font-bold text-[#1B2559] mb-1">
                Need help with your booking?
              </h3>
              <p className="text-[13px] sm:text-[15px] text-[#45556C]">
                Our travel experts are here to assist you.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
              {helpFeatures.map(({ icon: Icon, title, subtitle }, index) => (
                <div key={title} className={`flex items-start sm:items-center gap-3 ${index === 2 ? 'hidden sm:flex' : ''}`}>
                  <div className="shrink-0 w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:bg-[#EFF6FF] flex items-center justify-center mt-0.5 sm:mt-0">
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5 text-[#8A6D00] sm:text-[#1B2559]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[14px] sm:text-[13px] font-bold text-[#101828] sm:text-[#1B2559] leading-tight">{title}</p>
                    <p className="text-[13px] sm:text-[12px] text-gray-500 sm:text-gray-400 leading-tight mt-0.5">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
          <Link to="/contact-us">
  <button
    type="button"
    style={{fontFamily:"Inter"}}
    className="cursor-pointer bg-[#7A1315] sm:bg-[#7A1315] sm:text-[16px] hover:bg-[#1f2563] transition-colors duration-200 text-white text-sm font-semibold px-6 py-3.5 sm:py-2.5 rounded-lg w-full lg:w-[160px]"
  >
    Contact Us
  </button>
</Link>
          
        </div>
      </div>
    </section>
  );
};

export default NeedHelpBanner;