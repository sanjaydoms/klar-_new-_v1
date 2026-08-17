import React from 'react';
import { Check } from 'lucide-react';

interface SafetyFeature {
  title: string;
  description: string;
}

const SAFETY_FEATURES: SafetyFeature[] = [
  {
    title: 'Licensed charter operators',
    description:
      'Every operator on our panel holds a valid air operator certificate and is audited before we fly with them.',
  },
  {
    title: 'Experienced flight crews',
    description:
      'Captains are selected on type-hours and route familiarity, not availability alone.',
  },
  {
    title: 'Regulatory maintenance standards',
    description:
      'Aircraft are maintained to the standards set by the operator’s regulator, with records verified on request.',
  },
  {
    title: '24/7 operations support',
    description:
      'A live operations desk monitors your flight from block-out to block-in, every day of the year.',
  },
  {
    title: 'Flight planning and permits',
    description:
      'Slots, overflight clearances, and customs arrangements are handled before you reach the terminal.',
  },
  {
    title: 'Passenger confidentiality',
    description:
      'Manifests, itineraries, and identities are never shared beyond the crew and authorities who require them.',
  },
];

export const ChartersDarkBannerSection: React.FC = () => {
  return (
    <section className="w-full bg-[#3d0c11] text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div className="border-b border-[#6e252c] pb-1.5 mb-4 inline-block">
            <span className="text-[#c8a282] text-xs font-semibold uppercase tracking-[0.25em]">
              Trust
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-white mb-4 tracking-tight">
            Safety &amp; Compliance
          </h2>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            Chartering well means knowing exactly who is flying you, in what aircraft, and under whose oversight. We answer all three before you board.
          </p>
        </div>

        {/* Features Grid: 3 columns on Desktop, 1 column on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-x-10 md:gap-y-12">
          {SAFETY_FEATURES.map((feature, index) => (
            <div
              key={index}
              className="pt-6 border-t border-[#5a181e] flex flex-col justify-start"
            >
              <div className="flex items-start gap-3 mb-2.5">
                <Check className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <h3 className="text-base sm:text-lg font-serif md:font-sans font-medium text-white leading-snug">
                  {feature.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed pl-8">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ChartersDarkBannerSection;