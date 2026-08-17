import React from 'react';

interface ProcessStep {
  id: number;
  title: string;
  description: string;
  side: 'left' | 'right';
}

const CHARTER_STEPS: ProcessStep[] = [
  {
    id: 1,
    title: 'Request Charter',
    description: 'Share your route, dates, and passenger count.',
    side: 'left',
  },
  {
    id: 2,
    title: 'Travel Advisor Assigned',
    description: 'One named advisor owns your trip end to end.',
    side: 'right',
  },
  {
    id: 3,
    title: 'Aircraft Options',
    description: 'Vetted operators and aircraft matched to your route.',
    side: 'left',
  },
  {
    id: 4,
    title: 'Personalized Quote',
    description: 'Itemised pricing with no hidden charges.',
    side: 'right',
  },
  {
    id: 5,
    title: 'Booking Confirmation',
    description: 'Contract signed, aircraft and crew secured.',
    side: 'left',
  },
  {
    id: 6,
    title: 'Flight Preparation',
    description: 'Permits, slots, catering, and ground transport arranged.',
    side: 'right',
  },
  {
    id: 7,
    title: 'Private Terminal Check-in',
    description: 'Arrive fifteen minutes before departure.',
    side: 'left',
  },
  {
    id: 8,
    title: 'Fly Private',
    description: 'Depart on your schedule, in your own cabin.',
    side: 'right',
  },
  {
    id: 9,
    title: 'Arrival Concierge',
    description: 'Car waiting planeside, baggage handled for you.',
    side: 'left',
  },
];

export const ChartersConciergeServicesSection: React.FC = () => {
  const leftSteps = CHARTER_STEPS.filter((s) => s.side === 'left');
  const rightSteps = CHARTER_STEPS.filter((s) => s.side === 'right');

  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <div className="inline-block border-b-2 border-[#5c1218] pb-1 mb-3">
            <span className="text-[#5c1218] text-xs sm:text-sm font-serif font-semibold uppercase tracking-[0.2em]">
              End to End
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-gray-900 font-normal tracking-tight mb-4">
            The Charter Experience
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Nine considered moments between your first message and the car waiting at your destination.
          </p>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP TIMELINE LAYOUT (md and up)                        */}
        {/* ========================================================= */}
        <div className="hidden md:block relative max-w-5xl mx-auto">
          {/* Central Vertical Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-300 -translate-x-1/2" />

          <div className="grid grid-cols-2 gap-x-12 lg:gap-x-16">
            
            {/* Left Column Items */}
            <div className="space-y-20 lg:space-y-24 text-right pr-6 lg:pr-10">
              {leftSteps.map((step) => (
                <div key={step.id} className="flex flex-col items-end">
                  <h3 className="text-xl lg:text-2xl font-serif text-gray-900 mb-2 font-normal">
                    {step.title}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-500 max-w-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Right Column Items (Offset Vertically for Staggered Timeline Effect) */}
            <div className="space-y-20 lg:space-y-24 text-left pl-6 lg:pl-10 pt-16 lg:pt-20">
              {rightSteps.map((step) => (
                <div key={step.id} className="flex flex-col items-start">
                  <h3 className="text-xl lg:text-2xl font-serif text-gray-900 mb-2 font-normal">
                    {step.title}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-500 max-w-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE STACKED LAYOUT (sm and below)                      */}
        {/* ========================================================= */}
        <div className="block md:hidden space-y-8 max-w-md mx-auto text-left">
          {CHARTER_STEPS.map((step) => (
            <div key={step.id} className="border-b border-gray-100 pb-6 last:border-none">
              <h3 className="text-xl font-serif text-gray-900 mb-1 font-normal">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
          
          <p className="text-xs italic text-gray-400 text-center pt-2">
            ...and more personalized steps until arrival.
          </p>
        </div>

      </div>
    </section>
  );
};

export default ChartersConciergeServicesSection;