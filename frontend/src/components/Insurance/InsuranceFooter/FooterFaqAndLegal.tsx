import React from 'react';

const faqs = [
  {
    q: 'Q: How to buy travel insurance online with Klar?',
    a: 'Buying travel insurance is simple on Klar. All you need to do first is to download our app on your Android or iOS device or simply use your computer. On the app, tap on insurance section. Choose your preferred coverage plan and add it to your package. You can review benefits and coverage details before confirming. Complete your booking and your travel insurance policy details will be sent to your email instantly.'
  },
  {
    q: 'Q: How to find the best travel insurance plan for my trip?',
    a: 'Klar offers multiple travel insurance plans, tailored to your destination and trip duration. Use the filters on our platform to select based on coverage amount, medical benefits, baggage protection, or adventure activity coverage. You can compare plans side by side, and view full policy details before making a choice.'
  },
  {
    q: 'Q: How to file a travel insurance claim with Klar?',
    a: 'Filing a travel insurance claim is hassle-free with Klar. For TATA AIG policies, you can notify your claim by sending an SMS, calling the 24x7 helpline, or emailing the claims department. Gather all necessary documents like your claim form, travel tickets, medical records, and receipts. Submit them to the Tata AIG claims team using the provided address or email. The insurance company will review your claim and documents, and any further steps or requirements will be shared with you. Claims are settled within 30 days after submission of all required paperwork. Always check your policy document for the detailed checklist and claim guidance.'
  },
  {
    q: 'Q: Where can I find detailed coverage and exclusions for my travel insurance?',
    a: 'All coverage details, inclusions, and exclusions for Klar travel insurance plans are displayed on the policy information page before checkout. Click "View Details" next to any plan to see full coverage, claims process, and exclusions. After purchase, your policy document and certificate will be emailed to you, or accessible through your Manage Booking section for future reference.'
  },
  {
    q: 'Q: What is travel insurance?',
    a: 'An insurance policy works to provide you with financial coverage for any contingent unfortunate occurrences involving financial inconveniences when travelling. Such unexpected occurrences should be covered by your insurance policy for you to receive claims.'
  },
  {
    q: 'Q: Is travel insurance compulsory?',
    a: 'Yes, insurance policies are available for purchase as well as after making your travel bookings.'
  }
];

export const FooterFaqAndLegal: React.FC = () => {
  return (
    <div className="bg-[#ebebeb] pt-10 pb-12 px-4 sm:px-8 md:px-12 w-full font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Main Title */}
        <h2 className="text-xl font-[600] text-black mb-10 tracking-wider font-[Roboto]">
          Frequently Asked Questions
        </h2>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10 pb-8">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-600 pb-8 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold font-[Roboto] text-gray-700 text-base md:text-lg mb-3 tracking-wider leading-snug">
                  {faq.q}
                </h3>
                <p className="text-[11px] text-gray-800 leading-normal">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};