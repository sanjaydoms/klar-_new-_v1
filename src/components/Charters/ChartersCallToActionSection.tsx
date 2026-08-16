import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ChartersCallToActionSectionProps {
  onRequestQuote?: () => void;
}

export const ChartersCallToActionSection: React.FC<ChartersCallToActionSectionProps> = ({
  onRequestQuote,
}) => {
  const navigate = useNavigate();

  const handleRequestQuote = () => {
    if (onRequestQuote) {
      onRequestQuote();
    }

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      navigate('/mobile-charters-search?charterCategory=Private%20Jets', {
        state: { charterCategory: 'Private Jets' },
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return;
    }

    navigate('/dashboard?charterCategory=Private%20Jets', {
      state: { activeTab: 'charters' },
    });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  return (
    <section className="w-full bg-white text-gray-900 py-8 sm:py-10 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Overline Badge */}
        <div className="inline-flex flex-col items-center mb-3">
          <span className="text-[#5c1218] font-serif text-xs sm:text-sm font-semibold uppercase tracking-[0.2em]">
            Your Next Departure
          </span>
          <div className="w-10 h-[1px] bg-[#5c1218] mt-1.5" />
        </div>

        {/* Main Heading */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-gray-900 font-normal tracking-tight mb-3">
          Ready to Fly on Your Terms?
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-6">
          Let our aviation specialists create a personalized charter experience tailored to your schedule.
        </p>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRequestQuote}
            className="inline-flex items-center justify-center gap-2 bg-[#4a0e13] hover:bg-[#5c1218] text-white text-sm font-medium px-6 py-3 transition-colors duration-200 cursor-pointer shadow-sm"
          >
            <span>Request a Quote</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};

export default ChartersCallToActionSection;