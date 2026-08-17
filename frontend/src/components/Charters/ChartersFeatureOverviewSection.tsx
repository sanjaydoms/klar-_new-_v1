import React from 'react';

const WHO_WE_FLY_LIST = [
  ['Business Executives', 'Family Holidays'],
  ['Destination Weddings', 'Celebrity Travel'],
  ['Government Delegations', 'Medical Emergencies'],
  ['Pilgrimages', 'Sports Teams'],
  ['Film Production', 'Luxury Vacations'],
];

export const ChartersFeatureOverviewSection: React.FC = () => {
  return (
    <section className="w-full bg-white text-gray-900 pt-6 pb-12 md:pt-10 md:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6">
            <div className="inline-block border-b-2 border-[#5c1218] pb-1 mb-2">
              <span className="text-[#5c1218] font-serif text-sm font-semibold tracking-wide">
                Who We Fly
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-4">
              Perfect For
            </h2>

            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-8">
              From boardroom schedules to family celebrations, each itinerary is
              planned by someone who understands what the trip is really for.
            </p>

            <div className="space-y-3">
              {WHO_WE_FLY_LIST.map(([leftItem, rightItem], index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 border-b border-gray-100 pb-3"
                >
                  <div className="flex items-center text-xs sm:text-sm font-medium text-gray-800">
                    <span className="w-1.5 h-1.5 bg-[#5c1218] mr-2.5 shrink-0" />
                    {leftItem}
                  </div>
                  <div className="flex items-center text-xs sm:text-sm font-medium text-gray-800">
                    <span className="w-1.5 h-1.5 bg-[#5c1218] mr-2.5 shrink-0" />
                    {rightItem}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-sm aspect-[4/3] bg-gray-100">
              <img
                src="/images/charters_perfect_for_img.jpg"
                alt="Business meeting at airport private terminal"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChartersFeatureOverviewSection;