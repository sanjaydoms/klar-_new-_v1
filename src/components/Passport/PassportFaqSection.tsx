import React, { useState } from 'react';
import { MessageCircle, Plus, Minus } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const PassportFaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'What is a Passport?',
      answer:
        'A passport is an official travel document issued by the Ministry of External Affairs that certifies your identity and Indian citizenship, and allows you to travel internationally.',
    },
    {
      question: 'What is the validity of a passport?',
      answer:
        "An adult passport is valid for 10 years, while a minor's passport is valid for 5 years or until they reach 18 years of age, whichever is earlier.",
    },
    {
      question: 'What if my passport pages are exhausted?',
      answer:
        'If your passport pages are exhausted, you need to apply for a reissue of your passport under the exhausted pages category to receive a new booklet.',
    },
    {
      question: 'Is personal appearance mandatory?',
      answer:
        'Yes, personal appearance at the Passport Seva Kendra (PSK) or Post Office Passport Seva Kendra (POPSK) is mandatory for biometric capture and document verification.',
    },
    {
      question: 'Can children get a passport?',
      answer:
        "Yes, minors can obtain a passport. Both parents' consent along with relevant documents is required during the application process.",
    },
    {
      question: 'Does a baby need a separate passport?',
      answer:
        'Yes, every individual including newborn babies must have an independent passport to travel internationally.',
    },
    {
      question: 'How is the passport appointment scheduled?',
      answer:
        'Appointments are scheduled online through the official portal after filling out the application form and paying the applicable government fee.',
    },
    {
      question: 'What are the passport requirements?',
      answer:
        'Standard requirements include proof of date of birth, proof of address, and proof of identity along with original documents for verification.',
    },
    {
      question: 'How does the online application process work?',
      answer:
        'Our team guides you through form filling, document verification, fee payment, and appointment booking at your nearest PSK.',
    },
    {
      question: 'Home Assistance vs Online Assistance — what is the difference?',
      answer:
        'Home Assistance includes an executive visiting your doorstep for document collection and verification, while Online Assistance provides complete guidance digitally.',
    },
    {
      question: 'What are the service charges?',
      answer:
        'Service charges vary depending on the chosen package (Normal, Tatkaal, or Doorstep Assistance) and exclude government processing fees.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full bg-white font-sans text-slate-800 py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column (Header & WhatsApp CTA) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-[2px] bg-amber-400 rounded-full inline-block"></span>
              <span className="text-xs sm:text-sm font-bold text-[#580B14] uppercase tracking-wider">
                FAQs
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight leading-snug">
              Answers to the questions we hear most
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal max-w-md mt-1">
              Still unsure about eligibility, documents or timelines? Our team
              replies on WhatsApp within minutes.
            </p>

            <div className="mt-3">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50/40 hover:bg-sky-50 text-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs group"
              >
                <MessageCircle className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition-colors" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Column (Accordion List) */}
          <div className="lg:col-span-7 w-full bg-white border border-slate-100 rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={index}
                  className="border-b border-slate-100/90 last:border-b-0 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                      {faq.question}
                    </span>

                    <span className="shrink-0">
                      {isOpen ? (
                        <div className="w-6 h-6 rounded-full bg-[#580B14] text-white flex items-center justify-center shadow-2xs">
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-[#580B14] text-[#580B14] flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </span>
                  </button>

                  {/* Expanded Answer Content */}
                  {isOpen && (
                    <div className="px-5 sm:px-7 pb-5 pt-0">
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PassportFaqSection;