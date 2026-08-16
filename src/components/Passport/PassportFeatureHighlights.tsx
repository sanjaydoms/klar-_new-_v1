import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Home, Ticket, Star, ArrowRight } from 'lucide-react';

export const PassportFeatureHighlights: React.FC = () => {
  const navigate = useNavigate();

  const handleApplyNow = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      navigate('/mobile-passport-search');
      return;
    }

    // Redirect or update route to active passport tab
    navigate('/', { state: { activeTab: 'passport' } });

    // Smooth scroll back up to top search card
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const popularTags = [
    'Renew my passport',
    'Passport for a child',
    'Documents required',
    'Tatkaal eligibility',
  ];

  const highlightCards = [
    {
      id: 'tatkaal',
      badge: 'Tatkaal',
      title: 'Passport in 3–5 days',
      description: 'Priority appointment slots at your nearest Passport Seva Kendra.',
      icon: <Zap className="w-5 h-5 text-white" />,
    },
    {
      id: 'doorstep',
      badge: 'Doorstep',
      title: 'Free document pickup',
      description: 'An executive collects and verifies your documents at home.',
      icon: <Home className="w-5 h-5 text-white" />,
    },
    {
      id: 'combo',
      badge: 'Combo',
      title: 'Passport + Visa together',
      description: 'Bundle both applications and save on service charges.',
      icon: <Ticket className="w-5 h-5 text-white" />,
    },
  ];

  const stats = [
    { number: '45+', label: 'Years of experience' },
    { number: '150+', label: 'Branches in India' },
    { number: '180+', label: 'Countries served' },
  ];

  return (
    <section className="w-full bg-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Popular Tags Header */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-8">
          <span className="text-[#580B14] font-bold text-sm sm:text-base mr-1">
            Popular
          </span>
          {popularTags.map((tag, index) => (
            <button
              key={index}
              className="px-4 py-1.5 rounded-full border border-slate-200 text-slate-600 text-xs sm:text-sm font-medium hover:border-[#580B14] hover:text-[#580B14] transition-all bg-white shadow-2xs"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 2. Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {highlightCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex items-start gap-4 transition-transform hover:-translate-y-0.5"
            >
              {/* Maroon Icon Box */}
              <div className="w-11 h-11 rounded-xl bg-[#580B14] flex-shrink-0 flex items-center justify-center shadow-xs">
                {card.icon}
              </div>

              {/* Text Content */}
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#580B14] uppercase tracking-wider mb-0.5">
                  {card.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 leading-snug">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Bottom Stats & CTA Bar */}
        {/* <div className="border-y border-slate-100 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">
            
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 lg:gap-12 w-full lg:w-auto justify-center lg:justify-start">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="font-serif text-3xl sm:text-4xl text-[#580B14] font-normal leading-none">
                    {stat.number}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium max-w-[110px] leading-tight text-left">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto justify-center lg:justify-end">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-700">
                  4.8 · 12,000+ applicants
                </span>
              </div>

              <button
                type="button"
                onClick={handleApplyNow}
                className="w-full sm:w-auto bg-[#580B14] hover:bg-[#40080E] text-white px-6 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                Apply Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div> */}

      </div>
    </section>
  );
};

export default PassportFeatureHighlights;