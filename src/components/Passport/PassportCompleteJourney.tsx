// import React from 'react';

// interface JourneyStep {
//   number: number;
//   title: string;
//   isFinal?: boolean;
// }

// export const PassportCompleteJourney: React.FC = () => {
//   const steps: JourneyStep[] = [
//     { number: 1, title: 'Choose passport type' },
//     { number: 2, title: 'Make payment' },
//     { number: 3, title: 'Receive questionnaire' },
//     { number: 4, title: 'Submit details' },
//     { number: 5, title: 'Application filled by expert' },
//     { number: 6, title: 'Appointment scheduled' },
//     { number: 7, title: 'Visit Passport Seva Kendra' },
//     { number: 8, title: 'Biometrics captured' },
//     { number: 9, title: 'Police verification (if required)' },
//     { number: 10, title: 'Passport delivered', isFinal: true },
//   ];

//   return (
//     <section className="w-full bg-[#FFF0F2] py-12 md:py-16">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
//         {/* Header Section */}
//         <div className="flex flex-col gap-2 mb-10 md:mb-14">
//           <div className="flex items-center space-x-2">
//             <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
//             <span className="text-xs sm:text-sm font-bold text-[#580B14] uppercase tracking-wider">
//               Application process
//             </span>
//           </div>

//           <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
//             The complete journey, stage by stage
//           </h2>

//           <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl font-medium">
//             A detailed view of everything that happens between choosing your plan and receiving your passport.
//           </p>
//         </div>

//         {/* Desktop 2-Column Layout */}
//         <div className="hidden md:block relative max-w-4xl">
//           {/* Vertical Connecting Line - Left Column */}
//           <div 
//             className="absolute top-4 bottom-8 left-[17px] w-[1px] bg-sky-200/80 z-0" 
//             aria-hidden="true" 
//           />
//           {/* Vertical Connecting Line - Right Column */}
//           <div 
//             className="absolute top-4 bottom-8 left-[calc(50%+17px)] w-[1px] bg-sky-200/80 z-0" 
//             aria-hidden="true" 
//           />

//           <div className="grid grid-cols-2 gap-x-12 gap-y-7 relative z-10">
//             {steps.map((step) => (
//               <div key={step.number} className="flex items-center gap-4">
//                 {/* Number Circle Badge */}
//                 <div
//                   className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-sm font-semibold shrink-0 transition-all ${
//                     step.isFinal
//                       ? 'bg-[#580B14] text-white shadow-xs'
//                       : 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
//                   }`}
//                 >
//                   {step.number}
//                 </div>

//                 {/* Step Title */}
//                 <span
//                   className={`text-sm leading-snug ${
//                     step.isFinal
//                       ? 'font-bold text-[#580B14]'
//                       : 'font-medium text-slate-700'
//                   }`}
//                 >
//                   {step.title}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Mobile 1-Column Sequential Layout */}
//         <div className="block md:hidden relative">
//           {/* Single Vertical Line connecting 1..10 */}
//           <div 
//             className="absolute top-4 bottom-6 left-[17px] w-[1px] bg-sky-200/80 z-0" 
//             aria-hidden="true" 
//           />

//           <div className="flex flex-col gap-6 relative z-10">
//             {steps.map((step) => (
//               <div key={step.number} className="flex items-center gap-4">
//                 <div
//                   className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-xs font-semibold shrink-0 ${
//                     step.isFinal
//                       ? 'bg-[#580B14] text-white shadow-xs'
//                       : 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
//                   }`}
//                 >
//                   {step.number}
//                 </div>

//                 <span
//                   className={`text-xs sm:text-sm ${
//                     step.isFinal
//                       ? 'font-bold text-[#580B14]'
//                       : 'font-medium text-slate-700'
//                   }`}
//                 >
//                   {step.title}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//       </div>
//     </section>
//   );
// };

// export default PassportCompleteJourney;
























































import React from 'react';

interface JourneyStep {
  number: number;
  title: string;
  isFinal?: boolean;
}

export const PassportCompleteJourney: React.FC = () => {
  // Odd steps for Left Column (1, 3, 5, 7, 9)
  const leftColumnSteps: JourneyStep[] = [
    { number: 1, title: 'Choose passport type' },
    { number: 3, title: 'Receive questionnaire' },
    { number: 5, title: 'Application filled by expert' },
    { number: 7, title: 'Visit Passport Seva Kendra' },
    { number: 9, title: 'Police verification (if required)' },
  ];

  // Even steps for Right Column (2, 4, 6, 8, 10)
  const rightColumnSteps: JourneyStep[] = [
    { number: 2, title: 'Make payment' },
    { number: 4, title: 'Submit details' },
    { number: 6, title: 'Appointment scheduled' },
    { number: 8, title: 'Biometrics captured' },
    { number: 10, title: 'Passport delivered', isFinal: true },
  ];

  // Sequential steps for mobile view (1 to 10)
  const mobileSteps: JourneyStep[] = [
    { number: 1, title: 'Choose passport type' },
    { number: 2, title: 'Make payment' },
    { number: 3, title: 'Receive questionnaire' },
    { number: 4, title: 'Submit details' },
    { number: 5, title: 'Application filled by expert' },
    { number: 6, title: 'Appointment scheduled' },
    { number: 7, title: 'Visit Passport Seva Kendra' },
    { number: 8, title: 'Biometrics captured' },
    { number: 9, title: 'Police verification (if required)' },
    { number: 10, title: 'Passport delivered', isFinal: true },
  ];

  return (
    <section className="w-full bg-[#FFF0F2] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-10 md:mb-14">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
            <span className="text-xs sm:text-sm font-bold text-[#580B14] uppercase tracking-wider">
              APPLICATION PROCESS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            The complete journey, stage by stage
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl font-normal">
            A detailed view of everything that happens between choosing your plan and receiving your passport.
          </p>
        </div>

        {/* Desktop 2-Column Timeline Layout */}
        <div className="hidden md:grid grid-cols-2 gap-x-12 lg:gap-x-16 max-w-4xl">
          
          {/* Left Column (1, 3, 5, 7, 9) */}
          <div className="relative flex flex-col gap-7">
            {/* Perfectly centered vertical line (18px = half of 36px circle) */}
            <div 
              className="absolute top-4 bottom-4 left-[18px] w-[1px] bg-sky-200 z-0" 
              aria-hidden="true" 
            />

            {leftColumnSteps.map((step) => (
              <div key={step.number} className="flex items-center gap-4 relative z-10">
                <div className="w-9 h-9 rounded-full bg-white border border-slate-100 text-slate-800 font-serif text-sm font-semibold flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  {step.number}
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  {step.title}
                </span>
              </div>
            ))}
          </div>

          {/* Right Column (2, 4, 6, 8, 10) */}
          <div className="relative flex flex-col gap-7">
            {/* Perfectly centered vertical line */}
            <div 
              className="absolute top-4 bottom-4 left-[18px] w-[1px] bg-sky-200 z-0" 
              aria-hidden="true" 
            />

            {rightColumnSteps.map((step) => (
              <div key={step.number} className="flex items-center gap-4 relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-sm font-semibold shrink-0 ${
                    step.isFinal
                      ? 'bg-[#580B14] text-white shadow-xs'
                      : 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-sm leading-snug ${
                    step.isFinal
                      ? 'font-bold text-[#580B14]'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Mobile Sequential Timeline Layout */}
        <div className="block md:hidden relative">
          <div 
            className="absolute top-4 bottom-4 left-[18px] w-[1px] bg-sky-200 z-0" 
            aria-hidden="true" 
          />

          <div className="flex flex-col gap-6 relative z-10">
            {mobileSteps.map((step) => (
              <div key={step.number} className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-xs font-semibold shrink-0 ${
                    step.isFinal
                      ? 'bg-[#580B14] text-white shadow-xs'
                      : 'bg-white border border-slate-100 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-xs sm:text-sm ${
                    step.isFinal
                      ? 'font-bold text-[#580B14]'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default PassportCompleteJourney;