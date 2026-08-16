import React, { useState } from 'react';
import { Plus, Minus, ArrowRight, Sparkles } from 'lucide-react';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const TABS = [
  { id: 'booking', label: 'Booking' },
  { id: 'payment', label: 'Payment' },
  { id: 'refund', label: 'Refund' },
  { id: 'visa', label: 'Visa' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'flight', label: 'Flight' },
  { id: 'packages', label: 'Packages' },
];

const FAQ_DATA: FAQItem[] = [
  // Booking
  {
    id: 'b1',
    category: 'booking',
    question: 'How do I confirm a booking made over the phone?',
    answer:
      'Once our agent completes your booking over the phone, a payment link and itinerary draft will be sent to your registered email and WhatsApp. Completing payment via the link instantly confirms your reservation.',
  },
  {
    id: 'b2',
    category: 'booking',
    question: 'Can I hold a fare without paying?',
    answer:
      'Yes, select flight and hotel options allow a 24-to-48 hour fare hold for a nominal fee or free of charge depending on airline/hotel rules.',
  },
  // Payment
  {
    id: 'p1',
    category: 'payment',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major Credit/Debit Cards, Net Banking, UPI (Google Pay, PhonePe, Paytm), Corporate Cards, and Wire Transfers.',
  },
  {
    id: 'p2',
    category: 'payment',
    question: 'Is it safe to store my payment details for faster checkouts?',
    answer:
      'Yes, all payment processing complies with PCI-DSS Level 1 standards with 256-bit encryption.',
  },
  // Refund
  {
    id: 'r1',
    category: 'refund',
    question: 'How long does it take to get a refund processed?',
    answer:
      'Once approved, airline and hotel refunds are credited back to your original payment method within 3 to 7 business days.',
  },
  {
    id: 'r2',
    category: 'refund',
    question: 'Where can I track the status of my refund?',
    answer:
      'You can track your refund in real-time under "My Bookings" -> "Refund Status" or through our WhatsApp support bot.',
  },
  // Visa
  {
    id: 'v1',
    category: 'visa',
    question: 'Do you provide appointment scheduling for visa interviews?',
    answer:
      'Yes, our dedicated visa desk handles document verification, form filling, and biometrics/interview slot booking for major destinations.',
  },
  {
    id: 'v2',
    category: 'visa',
    question: 'What happens if my visa gets rejected?',
    answer:
      'While visa fees are non-refundable by embassies, our Visa Cancellation Protection add-on covers eligible non-refundable flight and hotel expenses.',
  },
  // Hotel
  {
    id: 'h1',
    category: 'hotel',
    question: 'Can I request an early check-in or late check-out?',
    answer:
      'Special requests can be submitted during booking or added later in your dashboard. Final approval rests with the hotel upon arrival.',
  },
  {
    id: 'h2',
    category: 'hotel',
    question: 'Are local taxes included in the hotel total price?',
    answer:
      'Base taxes are included. However, city resort fees or local occupancy taxes in specific international cities may be payable directly at hotel check-in.',
  },
  // Flight
  {
    id: 'f1',
    category: 'flight',
    question: 'How do I select seats or add extra baggage?',
    answer:
      'You can manage seat selection, meals, and extra baggage during the booking process or post-booking through "My Bookings" up to 6 hours before departure.',
  },
  {
    id: 'f2',
    category: 'flight',
    question: 'What should I do if my flight is rescheduled or canceled by the airline?',
    answer:
      'Our 24/7 travel desk will automatically notify you via SMS/Email and offer full refund or complimentary rebooking on alternative flights.',
  },
  // Packages
  {
    id: 'pkg1',
    category: 'packages',
    question: 'Can I customize a pre-designed holiday package itinerary?',
    answer:
      'Absolutely! All holiday packages can be customized for dates, hotel categories, sightseeing options, and transfers with our specialists.',
  },
  {
    id: 'pkg2',
    category: 'packages',
    question: 'Are airport transfers included in tour packages?',
    answer:
      'Most luxury and standard packages include private airport transfers. Specific inclusions are detailed on the package breakdown page.',
  },
];

export default function FAQSection() {
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [showAllFaqs, setShowAllFaqs] = useState<boolean>(false);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('b1');

  // Filter FAQs based on active tab or show all FAQs
  const displayedFaqs = showAllFaqs
    ? FAQ_DATA
    : FAQ_DATA.filter((faq) => faq.category === activeTab);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleViewAllToggle = () => {
    setShowAllFaqs((prev) => !prev);
  };

  return (
    <section className="w-full bg-[#FDF5F1] py-12 md:py-16">
      {/* Container aligned with standard page width & padding */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        {/* --- TOP HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <span
              className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full"
              style={{ backgroundColor: '#FDF7F4', color: '#4E0004' }}
            >
              ✦ Frequently asked questions
            </span>
            <h2
              className="text-3xl md:text-5xl font-serif font-bold mb-3"
              style={{ color: '#16255F' }}
            >
              Support questions, answered
            </h2>
            <p className="text-sm md:text-base" style={{ color: '#7B6A64' }}>
              The questions our desks hear most, grouped by what you're dealing with.
            </p>
          </div>

          {/* View All FAQs Button */}
          <div>
            <button
              onClick={handleViewAllToggle}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs sm:text-sm font-semibold transition-all hover:bg-gray-50 whitespace-nowrap"
              style={{ color: '#16255F' }}
            >
              <span>{showAllFaqs ? 'Show Category FAQs' : 'View all FAQs'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- CATEGORY TABS (Hidden when viewing all FAQs) --- */}
        {!showAllFaqs && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 bg-transparent'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#4E0004' : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* --- FAQ ACCORDION LIST --- */}
        <div className="rounded-3xl border border-[#F5E8E2] bg-white overflow-hidden divide-y divide-[#F5E8E2] mb-16 shadow-sm">
          {displayedFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <div key={faq.id} className="transition-colors hover:bg-[#FFFDFC]">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none"
                >
                  <span
                    className="font-serif font-bold text-base sm:text-lg pr-4"
                    style={{ color: '#16255F' }}
                  >
                    {faq.question}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform"
                    style={{ backgroundColor: '#FDF5F1', color: '#4E0004' }}
                  >
                    {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-0">
                    <p
                      className="text-xs sm:text-sm leading-relaxed"
                      style={{ color: '#7B6A64' }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- STATS SECTION ("Klar Travels support in numbers") --- */}
        <div className="w-full">
          <p
            className="text-xs sm:text-sm font-normal mb-6"
            style={{ color: '#7B6A64' }}
          >
            Klar Travels support in numbers
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Left Big Maroon Card */}
            <div
              className="md:col-span-4 relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-white shadow-md min-h-[220px]"
              style={{ backgroundColor: '#581014' }}
            >
              <div>
                <h3 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight mb-2">
                  2,200+
                </h3>
              </div>

              <div className="flex items-end justify-between pt-8">
                <p className="text-xl sm:text-2xl font-serif leading-tight max-w-[180px]">
                  Conversations Handled Daily
                </p>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#581014]">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
              </div>
            </div>

            {/* Right 4 Metric Cards */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div
                className="p-6 rounded-3xl border flex flex-col justify-center"
                style={{ backgroundColor: '#FFFDFB', borderColor: '#F5E8E2' }}
              >
                <h4 className="text-3xl sm:text-4xl font-serif font-bold mb-1" style={{ color: '#16255F' }}>
                  19
                </h4>
                <p className="text-sm font-semibold" style={{ color: '#4E0004' }}>
                  Countries Covered
                </p>
              </div>

              {/* Card 2 */}
              <div
                className="p-6 rounded-3xl border flex flex-col justify-center"
                style={{ backgroundColor: '#FFFDFB', borderColor: '#F5E8E2' }}
              >
                <h4 className="text-3xl sm:text-4xl font-serif font-bold mb-1" style={{ color: '#16255F' }}>
                  120
                </h4>
                <p className="text-sm font-semibold" style={{ color: '#4E0004' }}>
                  Travel Experts
                </p>
              </div>

              {/* Card 3 */}
              <div
                className="p-6 rounded-3xl border flex flex-col justify-center"
                style={{ backgroundColor: '#FFFDFB', borderColor: '#F5E8E2' }}
              >
                <h4 className="text-3xl sm:text-4xl font-serif font-bold mb-1" style={{ color: '#16255F' }}>
                  98.4%
                </h4>
                <p className="text-sm font-semibold" style={{ color: '#4E0004' }}>
                  Issues Solved First Contact
                </p>
              </div>

              {/* Card 4 */}
              <div
                className="p-6 rounded-3xl border flex flex-col justify-center"
                style={{ backgroundColor: '#FFFDFB', borderColor: '#F5E8E2' }}
              >
                <h4 className="text-3xl sm:text-4xl font-serif font-bold mb-1" style={{ color: '#16255F' }}>
                  25 Yrs
                </h4>
                <p className="text-sm font-semibold" style={{ color: '#4E0004' }}>
                  Serving Travellers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}