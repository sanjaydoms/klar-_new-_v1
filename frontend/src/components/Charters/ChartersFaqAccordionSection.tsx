import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    question: 'How much does a charter cost?',
    answer:
      'Charters are priced per flight, not per seat. A light jet on a one-hour domestic sector typically starts around ₹4.5 lakh, while a heavy jet on a long-haul international route runs considerably higher. Your quote depends on aircraft type, routing, crew duty, airport handling, and any positioning flights required.',
  },
  {
    question: 'How quickly can I book?',
    answer:
      'Domestic flights can often be arranged within 4 to 6 hours depending on aircraft availability and permit clearances. International flights typically require 24 to 48 hours for overflight and landing permits.',
  },
  {
    question: 'Can I fly internationally?',
    answer:
      'Yes, we arrange international charters worldwide across all major corridors, managing landing permits, overflight clearances, customs, immigration clearance, and passport handling.',
  },
  {
    question: 'Can pets travel onboard?',
    answer:
      'Yes, pets can fly directly in the cabin with you on most private charter flights, subject to proper health documentation and operator approval.',
  },
  {
    question: 'What documents are required?',
    answer:
      'For domestic flights, standard government-issued photo ID is required for all passengers. For international travel, valid passports, visas, and health declarations are needed.',
  },
  {
    question: 'Can I cancel or reschedule?',
    answer:
      'Yes, cancellation and reschedule terms are clearly outlined in your charter agreement. Flexible policies are available depending on the operator and notice given prior to departure.',
  },
  {
    question: 'Are catering and ground transport available?',
    answer:
      'Bespoke inflight catering tailored to your preferences and seamless luxury ground transfers at departure and arrival airports are arranged as part of our concierge service.',
  },
  {
    question: 'Which airports can private jets use?',
    answer:
      'Private jets can access commercial airports as well as thousands of smaller regional airports and private FBO terminals that commercial airlines do not service.',
  },
];

export const ChartersFaqAccordionSection: React.FC = () => {
  // First FAQ item is open by default as shown in the UI design
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full bg-white text-gray-900 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="text-[#5c1218] font-serif text-sm font-semibold uppercase tracking-[0.2em] block">
            Good to Know
          </span>
          <div className="w-10 h-[1px] bg-[#5c1218] mx-auto my-3" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-gray-900 font-normal tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            The questions our charter desk hears most often, answered plainly.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="max-w-3xl mx-auto border-t border-[#e2d9d2]">
          {FAQ_DATA.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="border-b border-[#e2d9d2]">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between py-5 sm:py-6 text-left transition-colors duration-200 cursor-pointer group"
                >
                  <h3 className="text-lg sm:text-xl font-serif text-gray-900 font-normal pr-4 group-hover:text-[#5c1218] transition-colors">
                    {item.question}
                  </h3>
                  <div className="text-[#5c1218] shrink-0 ml-2">
                    {isOpen ? (
                      <Minus className="w-5 h-5 stroke-[1.5]" />
                    ) : (
                      <Plus className="w-5 h-5 stroke-[1.5]" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="pb-6 text-xs sm:text-sm text-gray-600 leading-relaxed pr-6 sm:pr-10">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ChartersFaqAccordionSection;