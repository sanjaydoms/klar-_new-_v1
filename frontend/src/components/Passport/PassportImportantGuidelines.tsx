import React from 'react';
import {
  BookOpen,
  Zap,
  Baby,
  FileCheck,
  RotateCcw,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface GuideCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  points: string[];
}

export const PassportImportantGuidelines: React.FC = () => {
  const guideCards: GuideCard[] = [
    {
      id: 'overview',
      icon: BookOpen,
      title: 'Passport Overview',
      description:
        'Issued by the Ministry of External Affairs through Passport Seva Kendras, your passport works as identity proof, citizenship proof and international travel document.',
      points: [
        'Identity proof',
        'Citizenship proof',
        'International travel document',
      ],
    },
    {
      id: 'tatkaal',
      icon: Zap,
      title: 'Tatkaal Passport',
      description:
        'For urgent travel, the Tatkaal scheme moves your application to the front of the queue for an additional government fee.',
      points: [
        'Priority appointment',
        'Faster verification',
        'Quick issuance',
        'Additional government fee',
      ],
    },
    {
      id: 'minors',
      icon: Baby,
      title: 'Passport for Minors',
      description:
        "Children below 18 get a 5-year passport. Both parents' consent and the relevant annexure are mandatory along with the standard documents.",
      points: [
        'Eligibility',
        'Parent consent',
        'Annexure requirements',
        '5-year validity',
      ],
    },
    {
      id: 'pcc',
      icon: FileCheck,
      title: 'Police Clearance Certificate',
      description:
        'A PCC confirms you have no adverse criminal record. It is commonly required for employment, residency or long-term visas abroad.',
      points: [
        'Purpose',
        'When required',
        'Police verification',
        'Background check',
      ],
    },
    {
      id: 'renewal',
      icon: RotateCcw,
      title: 'Passport Renewal',
      description:
        'Renew when your passport has expired or is close to expiry, and reissue when the booklet itself needs replacing.',
      points: [
        'Expired passport',
        'Damaged or lost',
        'Exhausted pages',
        'Name changes',
      ],
    },
    {
      id: 'processing',
      icon: Clock,
      title: 'Processing Time',
      description:
        'Normal applications usually take a few weeks depending on police verification. Tatkaal is designed for urgent travel.',
      points: ['Normal — 10–15 days', 'Tatkaal — 3–5 days'],
    },
  ];

  const handleConsultExpert = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-white font-sans text-slate-800 py-6 md:py-12">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-2 mb-8 md:mb-12">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
          <span className="text-xs sm:text-sm font-bold text-[#5A0C1A] uppercase tracking-wider">
            Passport guide
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight leading-snug max-w-2xl">
          Everything you should know before applying
        </h2>
      </div>

      {/* 2. 6-Card Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 mb-8 md:mb-10">
        {guideCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Maroon Icon Badge */}
                <div className="w-10 h-10 rounded-xl bg-[#5A0C1A] text-white flex items-center justify-center shrink-0 mb-4 shadow-2xs">
                  <IconComponent className="w-5 h-5 stroke-[2]" />
                </div>

                {/* Card Title */}
                <h3 className="text-lg font-serif font-bold text-[#5A0C1A] mb-2">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-5">
                  {card.description}
                </p>
              </div>

              {/* Bulleted Points List */}
              <ul className="space-y-2 pt-4 border-t border-slate-100/80">
                {card.points.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Comparison Card: Renewal vs Reissue */}
      <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        
        {/* Card Header Title */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg sm:text-xl font-serif font-bold text-[#5A0C1A]">
            Renewal vs Reissue
          </h3>
        </div>

        {/* Comparison Content Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-6 gap-6 md:gap-0">
          {/* Left Column: Renewal */}
          <div className="md:pr-6 flex flex-col gap-2">
            <span className="text-xs font-bold text-[#5A0C1A] uppercase tracking-wider">
              Renewal
            </span>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Extends the validity of your existing passport. The same passport number is retained and only the validity period changes.
            </p>
          </div>

          {/* Right Column: Reissue */}
          <div className="md:pl-6 flex flex-col gap-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Reissue
            </span>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Issues a completely new booklet with a new passport number — required for exhausted pages, damage, loss or a change in personal details.
            </p>
          </div>
        </div>

        {/* Bottom Callout Banner */}
        <button
          type="button"
          onClick={handleConsultExpert}
          className="w-full bg-[#FFF0F2] hover:bg-[#FCE3E7] px-6 py-3.5 flex items-center justify-between transition-colors duration-200 cursor-pointer group border-t border-rose-100/60"
        >
          <span className="text-xs sm:text-sm font-semibold text-[#5A0C1A]">
            Not sure which applies to you? Ask an expert
          </span>
          <ArrowRight className="w-4 h-4 text-[#5A0C1A] group-hover:translate-x-1 transition-transform" />
        </button>

      </div>
    </div>
  );
};

export default PassportImportantGuidelines;