import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Landmark, Trophy, UserCheck, Plane } from 'lucide-react';

const CATEGORY_CARDS = [
  {
    title: 'Private Jets',
    image: '/images/charter_category_1.jpg',
    colSpan: 'lg:col-span-6',
  },
  {
    title: 'Helicopter Charter',
    image: '/images/charter_category_2.jpg',
    colSpan: 'lg:col-span-6',
  },
  {
    title: 'Corporate Charter',
    image: '/images/charter_category_3.jpg',
    colSpan: 'lg:col-span-5',
  },
  {
    title: 'Group Charter',
    image: '/images/charter_category_4.jpg',
    colSpan: 'lg:col-span-7',
  },
];

const HIGHLIGHT_CARDS = [
  {
    title: 'Religious & Pilgrimage',
    description: 'Coordinated pilgrimage travel with ground handling at holy sites.',
    icon: Landmark,
  },
  {
    title: 'Event & Sports Team',
    description: 'Squad travel with equipment loading and tight tournament schedules.',
    icon: Trophy,
  },
  {
    title: 'VIP & Celebrity',
    description: 'Discreet movements with private ramp access and closed manifests.',
    icon: UserCheck,
  },
];

export const ChartersCategoriesGridSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCategoryClick = (category: string) => {
    const query = `?charterCategory=${encodeURIComponent(category)}`;
    const targetPath = `/mobile-charters-search${query}`;
    const isMobile = location.pathname === '/mobile-charters-search' || window.innerWidth < 768;

    if (isMobile) {
      navigate(targetPath, { state: { charterCategory: category } });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return;
    }

    navigate(`/dashboard${query}`, { state: { activeTab: 'charters', charterCategory: category } });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  return (
    <section className="w-full py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-[#5c1218]">
            What We Arrange
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-gray-900 font-normal">
            Charter Categories
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
            Whatever the reason for the journey, there is an aircraft and a crew suited to it.
          </p>
        </div>

        {/* 12-Column Grid for Image Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
          {CATEGORY_CARDS.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => handleCategoryClick(card.title)}
              className={`${card.colSpan} group relative overflow-hidden rounded-none text-left cursor-pointer transition-opacity duration-200 hover:opacity-95`}
            >
              {/* Uniform height across all cards guarantees perfect alignment in both rows */}
              <div className="relative w-full h-56 sm:h-72 lg:h-80 overflow-hidden bg-gray-100">
                <img
                  src={card.image}
                  alt={card.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Gradient overlay matching Figma */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

                {/* Top-Right Arrow Icon */}
                <div className="absolute top-4 right-4 text-white/80 group-hover:text-white transition-colors">
                  <ArrowUpRight className="h-5 w-5" />
                </div>

                {/* Bottom Title */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h3 className="text-xl sm:text-2xl font-serif text-white tracking-wide">
                    {card.title}
                  </h3>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 3 Highlight Cards - Equal Heights & Sharp Borders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {HIGHLIGHT_CARDS.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.title}
                className="border border-gray-300 bg-white p-6 rounded-none flex flex-col justify-start"
              >
                {/* Square Maroon Icon Box */}
                <div className="h-8 w-8 bg-[#5c1218] text-white flex items-center justify-center mb-4 rounded-none">
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <h4 className="text-base sm:text-lg font-serif text-gray-900 mb-2 font-medium">
                  {item.title}
                </h4>
                
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom Helper Line */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600 text-center">
          <Plane className="h-3.5 w-3.5 text-[#5c1218] rotate-45 shrink-0" />
          <span>
            Not sure which category fits?{' '}
            <strong className="font-semibold text-gray-900">Describe the trip</strong>{' '}
            and an advisor will recommend the right aircraft.
          </span>
          <Plane className="h-3.5 w-3.5 text-[#5c1218] -rotate-45 shrink-0" />
        </div>

      </div>
    </section>
  );
};

export default ChartersCategoriesGridSection;    