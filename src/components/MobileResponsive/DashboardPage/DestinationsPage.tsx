import React from 'react';

interface FeatureCardProps {
  iconBg: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ iconBg, title, description, icon }) => {
  return (
    <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-start transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
      {/* Icon Container with rounded corners matching the UI */}
      <div className={`w-14 h-14 ${iconBg} rounded-[18px] flex items-center justify-center mb-5`}>
        {icon}
      </div>
      
      {/* Text Content */}
      <h3 className="text-[#1A2B49] text-lg sm:text-xl font-bold tracking-tight mb-2 font-sans">
        {title}
      </h3>
      <p className="text-[#8A99AD] text-sm sm:text-base font-normal leading-relaxed font-sans max-w-[240px]">
        {description}
      </p>
    </div>
  );
};

const DestinationsPage: React.FC = () => {
  const features = [
    {
      title: 'Best Price Guarantee',
      description: 'Get the best rates for your journey.',
      iconBg: 'bg-[#E1ECFE]', // Light Blue tint
      icon: (
        <svg className="w-6 h-6 text-[#1A2B49]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: '24/7 Support',
      description: 'Round-the-clock help for your travel.',
      iconBg: 'bg-[#E1FBF0]', // Light Green tint
      icon: (
        <svg className="w-6 h-6 text-[#1A2B49]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-6-11.25a6 6 0 1112 0v1.5a3.375 3.375 0 01-3.375 3.375H15.75m-3.75-3.75H18m-6-3.75h.008v.008H12V8.25z" />
        </svg>
      )
    },
    {
      title: 'Flexible Booking',
      description: 'Change or cancel with flexible options.',
      iconBg: 'bg-[#FFFDE0]', // Light Yellow tint
      icon: (
        <svg className="w-6 h-6 text-[#1A2B49]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
      )
    },
    {
      title: 'Secure Payments',
      description: 'Your info is always safe with us.',
      iconBg: 'bg-[#FFE6E6]', // Light Red/Pink tint
      icon: (
        <svg className="w-6 h-6 text-[#1A2B49]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )
    }
  ];

  return (
    <div className="bg-white py-16 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <div className="max-w-4xl w-full">
        {/* Responsive layout matches a 2x2 grid on mobile up to desktop viewports */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              iconBg={feature.iconBg}
              icon={feature.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DestinationsPage;