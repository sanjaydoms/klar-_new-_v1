// import { Shield, CalendarDays, Headphones, Lock, Sparkles } from 'lucide-react';

// const features = [
//   {
//     icon: Shield,
//     title: 'Best Price Guarantee',
//     description: 'Get the best rates for your next journey.',
//     iconBg: 'bg-[#E4EBFB]',
//     iconColor: 'text-[#3B5BDB]',
//   },
//   {
//     icon: CalendarDays,
//     title: 'Flexible Booking',
//     description: 'Change or cancel with flexible options.',
//     iconBg: 'bg-[#FBF0CE]',
//     iconColor: 'text-[#8A6D00]',
//   },
//   {
//     icon: Headphones,
//     title: '24/7 Support',
//     description: 'Round-the-clock assistance for your travel.',
//     iconBg: 'bg-[#DDF3E4]',
//     iconColor: 'text-[#1E8A4C]',
//   },
//   {
//     icon: Lock,
//     title: 'Secure Payments',
//     description: 'Your payment information is always safe with us.',
//     iconBg: 'bg-[#FBE3E3]',
//     iconColor: 'text-[#C24444]',
//   },
// ];

// export const CruiseBookings = () => {
//   return (
//     <section className="w-full bg-white py-16 px-4">
//       <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
//         {/* Eyebrow badge */}
//         <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[radial-gradient(50%_100%_at_50%_50%,rgba(255,255,255,0)_0%,rgba(212,175,55,0.25)_100%)] border border-[#272E7C] mb-5">
// <img src="/logo/cruise_icon.png" alt="cruise icon" className="w-4 h-4" />
//           <span
//             style={{ fontFamily: 'Raleway, sans-serif' }}
//             className="text-xs font-bold tracking-widest text-[#1B2559] uppercase"
//           >
//             Cruise Bookings
//           </span>
//         </div>

//         {/* Heading */}
//         <h2
//           style={{ fontFamily: 'Playfair Display' }}
//           className="font-bold text-[40px] leading-[60px] tracking-[-1px] text-center"
//         >
//           Book Your Cruise
//         </h2>

//         {/* Subtitle */}
//         <p
//           style={{ fontFamily: 'Lato' }}
//           className=" text-[20px] leading-[30px] text-center text-[#45556C]"
//         >
//           Choose your trip. Find the best Luxury Cruise and experience the journey by sea
//         </p>

//         {/* Divider with sparkle */}
//         <div className="flex items-center gap-3 w-full max-w-md mb-12">
//           <span className="h-px flex-1 bg-[#D8B65C]" />
//           <Sparkles className="w-4 h-4 text-[#D8B65C]" fill="currentColor" />
//           <span className="h-px flex-1 bg-[#D8B65C]" />
//         </div>

//         {/* Feature grid */}
//         <div
//           style={{ fontFamily: 'Lato, sans-serif' }}
//           className="grid grid-cols-1 sm:grid-cols-2 gap-x-24 gap-y-8 text-left w-full max-w-2xl mb-14"
//         >
//           {features.map(({ icon: Icon, title, description, iconBg, iconColor }) => (
//             <div key={title} className="flex items-start gap-4">
//               <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
//                 <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
//               </div>
//               <div>
//                 <h3 className="text-[15px] font-semibold text-[#1B2559] mb-0.5">
//                   {title}
//                 </h3>
//                 <p className="text-[13px] text-gray-500 leading-snug">
//                   {description}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Explore divider */}
//         <div className="flex items-center gap-4 w-full max-w-xs">
//           <span className="h-px flex-1 bg-[#D8B65C]" />
//           <span
//             style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
//             className="italic text-xl text-[#D8B65C]"
//           >
//             Explore
//           </span>
//           <span className="h-px flex-1 bg-[#D8B65C]" />
//         </div>
//       </div>
//     </section>
//   );
// };

// export default CruiseBookings;

import { Shield, CalendarDays, Headphones, Lock, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Best Price Guarantee',
    description: 'Get the best rates for your journey.',
    iconBg: 'bg-[#E4EBFB]',
    iconColor: 'text-[#1B2559]',
  },
  {
    icon: CalendarDays,
    title: 'Flexible Booking',
    description: 'Change or cancel with ease.',
    iconBg: 'bg-[#FBF0CE]',
    iconColor: 'text-[#8A6D00]',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Round-the-clock help for you.',
    iconBg: 'bg-[#E4EBFB]',
    iconColor: 'text-[#1B2559]',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'Your data is always safe with us.',
    iconBg: 'bg-[#FBF0CE]',
    iconColor: 'text-[#8A6D00]',
  },
];

export const CruiseBookings = () => {
  return (
    <section className="w-full bg-[#FAFAFA] sm:bg-white py-16 sm:py-20 px-4">
      <div className="max-w-4xl sm:max-w-12xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[radial-gradient(50%_100%_at_50%_50%,rgba(255,255,255,0)_0%,rgba(212,175,55,0.25)_100%)] border border-[#272E7C] mb-6 shadow-sm">
          <img src="/logo/cruise_icon.png" alt="cruise icon" className="w-4 h-4" />
          <span
            style={{ fontFamily: 'Raleway, sans-serif' }}
            className="text-xs font-bold tracking-widest text-[#1B2559] uppercase"
          >
            Cruise Bookings
          </span>
        </div>

        {/* Heading */}
        <h2
          style={{ fontFamily: 'Playfair Display' }}
          className="font-bold text-[36px] sm:text-[44px] leading-[44px] sm:leading-[52px] tracking-[-1px] text-[#1B2559] text-center mb-4"
        >
          Book Your Cruise
        </h2>

        {/* Subtitle */}
        <p
          style={{ fontFamily: 'Lato' }}
          className="text-[16px] sm:text-[18px] leading-[26px] text-center text-[#45556C] mb-8 max-w-2xl"
        >
          Choose your trip. Find the best Luxury Cruise and experience the journey by sea
        </p>

        {/* Divider with sparkle */}
        <div className="flex items-center justify-center gap-3 w-full max-w-sm mb-12">
          <span className="h-px flex-1 bg-[#D8B65C]" />
          <Sparkles className="w-4 h-4 text-[#D8B65C]" fill="currentColor" stroke="none" />
          <span className="h-px flex-1 bg-[#D8B65C]" />
        </div>

        {/* Feature grid */}
        <div
          style={{ fontFamily: 'Lato, sans-serif' }}
          className="grid grid-cols-2 md:grid-cols-2 gap-4 sm:gap-x-12 sm:gap-y-12 md:gap-x-[150px] lg:gap-x-[350px] lg:ml-[-5vw] text-left w-full sm:max-w-5xl mb-14 px-1 sm:px-4"
        >
          {features.map(({ icon: Icon, title, description, iconBg, iconColor }) => (
            <div key={title} className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 bg-[#F1F2F4] sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none">
              <div className={`shrink-0 w-10 h-10 sm:w-15 sm:h-15 sm:min-w-[60px] sm:min-h-[60px] rounded-full sm:rounded-lg flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-5 h-5 sm:w-[32px] sm:h-[32px] ${iconColor}`} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[14px] sm:text-[18px] font-bold text-[#1B2559] mb-1.5 sm:mb-0.5 leading-tight">
                  {title}
                </h3>
                <p className="text-[12px] sm:text-[16px] text-[#45556C] sm:text-gray-500 leading-snug sm:w-[20vw] lg:w-[25vw]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Explore divider (Desktop Only) */}
        <div className="hidden sm:flex items-center gap-4 w-full max-w-xs">
          <span className="h-px flex-1 bg-[#D8B65C]" />
          <span
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            className="italic text-xl text-[#7A1315] sm:text-[28px]
"
          >
            Explore
          </span>
          <span className="h-px flex-1 bg-[#D8B65C]" />
        </div>
      </div>
    </section>
  );
};

export default CruiseBookings;