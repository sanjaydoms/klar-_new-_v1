import React from 'react';
import { Clock, MapPin, Plane, Zap, Headphones, Globe } from 'lucide-react';

const chartersWhyChooseItems = [
  {
    title: 'Travel on Your Schedule',
    description: 'No fixed departure times. The aircraft waits for you, not the other way around.',
    icon: Clock,
  },
  {
    title: 'Private Terminals',
    description: 'Skip crowded airports. Arrive minutes before departure and walk straight to the aircraft.',
    icon: MapPin,
  },
  {
    title: 'Luxury Cabins',
    description: 'Business-class comfort with complete privacy — work, rest, or meet in the air.',
    icon: Plane,
  },
  {
    title: 'Time Saving',
    description: 'Reach destinations faster with direct routings and no connections or layovers.',
    icon: Zap,
  },
  {
    title: 'Dedicated Concierge',
    description: 'One travel advisor from request to arrival, reachable at any hour of the journey.',
    icon: Headphones,
  },
  {
    title: 'Flexible Destinations',
    description: 'Access thousands of airports worldwide, including airstrips airlines cannot serve.',
    icon: Globe,
  },
];

export const ChartersWhyChooseSection: React.FC = () => {
  return (
    <section className="w-full text-gray-900">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">
        <div className="lg:col-span-5">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#8F6D62]">The Difference</p>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">Why Fly Private?</h2>
          <p className="mt-6 text-base leading-8 text-slate-600 max-w-xl">
            Chartering is less about the aircraft and more about the hours it gives back to you — the early start you no longer need, the connection you no longer make, the evening you get home for.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white shadow-sm">
            <div className="divide-y divide-slate-200">
              {chartersWhyChooseItems.map(({ title, description, icon: Icon }, index) => (
                <div
                  key={title}
                  className={`flex flex-col gap-4 px-6 py-6 sm:px-8 sm:py-7 ${index === 0 ? '' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E7E3] text-[#8C1A24] shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChartersWhyChooseSection;
