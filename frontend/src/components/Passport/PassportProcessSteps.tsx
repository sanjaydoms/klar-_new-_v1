import React from 'react';

interface Step {
  number: string;
  title: string;
  points: string[];
}

export const PassportProcessSteps: React.FC = () => {
  const steps: Step[] = [
    {
      number: '01',
      title: 'Choose',
      points: ['Select passport type', 'Make payment', 'Upload documents'],
    },
    {
      number: '02',
      title: 'Verify',
      points: ['Documents verified', 'Application prepared', 'Appointment scheduled'],
    },
    {
      number: '03',
      title: 'Submit',
      points: ['Visit Passport Office', 'Submit application', 'Complete biometrics'],
    },
    {
      number: '04',
      title: 'Receive',
      points: ['Passport dispatched to your address'],
    },
  ];

  return (
    <section className="w-full py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-10 md:mb-14">
          {/* Subheading tag */}
          <div className="flex items-center space-x-2">
            <span className="w-6 h-[1.5px] bg-[#580B14] inline-block"></span>
            <span className="text-xs sm:text-sm font-bold text-[#580B14] uppercase tracking-wider">
              How it works
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight leading-snug max-w-2xl">
            Four steps from application to passport in hand
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            You handle the appointment visit. We handle everything around it.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative w-full">
          
          {/* Desktop Horizontal Connecting Line */}
          <div 
            className="hidden lg:block absolute top-[28px] left-[calc(12.5%-12px)] right-[calc(12.5%-12px)] h-[1px] bg-slate-200 z-0" 
            aria-hidden="true" 
          />

          {/* Steps Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-start">
                
                {/* Number Badge */}
                <div className="w-14 h-14 rounded-full bg-white text-slate-800 font-serif font-semibold text-lg flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100/80 mb-5 relative">
                  {step.number}
                </div>

                {/* Step Content */}
                <div className="flex flex-col items-start w-full">
                  {/* Step Title */}
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900 mb-3">
                    {step.title}
                  </h3>

                  {/* Bullet Points */}
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 font-medium">
                    {step.points.map((point, pIndex) => (
                      <li key={pIndex} className="flex items-start space-x-2">
                        <span className="text-slate-400 font-bold leading-tight select-none">
                          •
                        </span>
                        <span className="leading-snug text-slate-600">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};

export default PassportProcessSteps;