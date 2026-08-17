import React, { useState } from 'react';
import { Users, Route, Compass } from 'lucide-react';

interface JetCategory {
  id: string;
  tabLabel: string;
  title: string;
  description: string;
  capacity: string;
  bestFor: string;
  range: string;
  image: string;
}

const FLEET_DATA: JetCategory[] = [
  {
    id: 'very-light-jet',
    tabLabel: 'Very Light Jet',
    title: 'Very Light Jet',
    description:
      'The most economical way to fly privately — ideal for a single executive or a small family on a same-day return.',
    capacity: '4–5 passengers',
    bestFor: 'Short domestic routes',
    range: 'Up to 1,800 km',
    image: '/images/charter_category_1.jpg',
  },
  {
    id: 'light-jet',
    tabLabel: 'Light Jet',
    title: 'Light Jet',
    description:
      'Provides impressive speed and versatility with comfortable seating, suitable for quick regional flights and business travel.',
    capacity: '6–7 passengers',
    bestFor: 'Regional business trips',
    range: 'Up to 2,800 km',
    image: '/images/charter_category_2.jpg',
  },
  {
    id: 'midsize-jet',
    tabLabel: 'Midsize Jet',
    title: 'Midsize Jet',
    description:
      'Features stand-up cabins, ample luggage space, and non-stop transcontinental performance for medium-range journeys.',
    capacity: '8–9 passengers',
    bestFor: 'Cross-country flights',
    range: 'Up to 4,200 km',
    image: '/images/charter_category_3.jpg',
  },
  {
    id: 'super-midsize',
    tabLabel: 'Super Midsize',
    title: 'Super Midsize Jet',
    description:
      'Combines long-range capability with wide-body cabin amenities, ideal for high-altitude smooth flights across continents.',
    capacity: '9–10 passengers',
    bestFor: 'Transcontinental routes',
    range: 'Up to 6,000 km',
    image: '/images/charter_category_4.jpg',
  },
  {
    id: 'heavy-jet',
    tabLabel: 'Heavy Jet',
    title: 'Heavy Jet',
    description:
      'Offers supreme luxury with dedicated flight attendants, private sleeping quarters, and extended intercontinental range.',
    capacity: '12–16 passengers',
    bestFor: 'Long-haul international',
    range: 'Up to 9,500 km',
    image: '/images/charter_category_1.jpg',
  },
  {
    id: 'helicopters',
    tabLabel: 'Helicopters',
    title: 'Helicopters',
    description:
      'Point-to-point urban transfers and remote access bypassing airport traffic completely for ultimate convenience.',
    capacity: '4–6 passengers',
    bestFor: 'City transfers & remote access',
    range: 'Up to 650 km',
    image:
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=1200',
  },
];

export const ChartersServiceHighlightsSection: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('very-light-jet');

  const activeJet =
    FLEET_DATA.find((jet) => jet.id === activeTabId) || FLEET_DATA[0];

  return (
    <section className="w-full bg-white text-gray-900 pt-10 pb-6 md:pt-16 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
          <span className="text-[#5c1218] font-serif text-sm md:text-base font-semibold uppercase tracking-wider block mb-2">
            Aircraft
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-gray-900 font-normal tracking-tight mb-4">
            A Fleet Matched to the Journey
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            We charter from vetted operators across every class, so the aircraft is
            chosen for your route — never the other way around.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8 md:mb-10 overflow-x-auto scrollbar-none">
          <div className="flex space-x-6 sm:space-x-8 min-w-max md:justify-center px-2">
            {FLEET_DATA.map((jet) => {
              const isActive = jet.id === activeTabId;
              return (
                <button
                  key={jet.id}
                  onClick={() => setActiveTabId(jet.id)}
                  className={`pb-3 text-xs sm:text-sm font-medium transition-colors duration-200 relative whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-[#5c1218] font-semibold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {jet.tabLabel}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#5c1218]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Content Display (Controlled Bottom Spacing) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-6 md:mb-10">
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-sm aspect-[4/3] bg-gray-100">
              <img
                src={activeJet.image}
                alt={activeJet.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center">
            <h3 className="text-2xl sm:text-3xl font-serif text-gray-900 mb-3">
              {activeJet.title}
            </h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
              {activeJet.description}
            </p>

            <hr className="border-gray-200 mb-6" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex sm:flex-col items-center sm:items-start space-x-3 sm:space-x-0">
                <Users className="w-5 h-5 text-[#5c1218] mb-1 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block">
                    Capacity
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {activeJet.capacity}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-start space-x-3 sm:space-x-0">
                <Route className="w-5 h-5 text-[#5c1218] mb-1 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block">
                    Best For
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {activeJet.bestFor}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-start space-x-3 sm:space-x-0">
                <Compass className="w-5 h-5 text-[#5c1218] mb-1 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block">
                    Typical Range
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {activeJet.range}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChartersServiceHighlightsSection;