import React from 'react';

export const FooterGuideGrid: React.FC = () => {
  return (
    <div className="py-10 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10 text-[11px] font-sans text-gray-600 leading-relaxed tracking-normal">
      {/* Column 1 */}
      <div className="space-y-8">
        {/* Travel Insurance Online */}
        <div className="border-b border-gray-300 pb-8">
          <h3 className="text-lg font-bold font-[Roboto] tracking-wider text-black mb-3">
            Travel Insurance Online
          </h3>
          <p className="leading-normal">
            Managing your finances comes with its own set of challenges, many of which require smart tools and real-time insights. While no single app can solve every financial need, Klar gives you the control and transparency to handle your money with confidence. You can access personalised financial features that help you spend, save, and grow your money — all from one place.
          </p>
        </div>

        {/* Types of Travel Insurance Plans */}
        <div className="border-b border-gray-300 pb-8">
          <h3 className="text-lg font-bold font-[Roboto] tracking-wider text-black mb-3">
            Types of Travel Insurance Plans
          </h3>
          <p className="leading-normal mb-3">
            Before you plan to buy travel insurance, it is essential to know the types of coverage available for extensive financial protection. Here’s a list of essential coverages:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-gray-600">
            <li>
              <span className="font-normal">
                Individual Travel Insurance: When on a solo international trip, individual coverage is one of the best travel insurance plans to pick for securing your peace of mind. This insurance coverage suits individual travellers,
              </span>
            </li>
          </ul>
        </div>

        {/* How to Claim */}
        <div className="border-b border-gray-300 md:border-none pb-8 md:pb-0">
          <h3 className="text-lg font-bold font-[Roboto] tracking-wider text-black mb-3">
            How to Claim
          </h3>
          <p className="leading-normal mb-3">
            Customers can make claims against travel insurance policies in the following ways:
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-800">Cashless claims</h4>
              <p className="leading-normal">
                Cashless claims simplify insurance claim procedures, especially during overseas trips. Cashless claims provided under policies allow the insured to avail of cashless benefits from network travel or healthcare providers when seeking assistance for covered benefits. For instance, in case of covered illnesses, hospitalisation at a network healthcare facility allows the insured to avail immediate medical assistance without any out-of-pocket payment through simple documentation of such cashless claims.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-800">Reimbursements</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2 */}
      <div className="space-y-8">
        {/* Why You Need Travel Insurance */}
        <div className="border-b border-gray-300 pb-8">
          <h3 className="text-lg font-bold text-black mb-3 font-[Roboto] tracking-wider">
            Why You Need Travel Insurance
          </h3>
          <p className="leading-normal">
            Klar is committed to making financial services accessible and transparent for everyone. With a focus on simplicity and trust, Klar provides digital banking solutions that empower users to take control of their finances. From fee-free accounts to instant transfers and smart budgeting tools, Klar ensures that managing your money is effortless, secure, and tailored to your everyday needs.
          </p>
        </div>

        {/* Travel Insurance Coverage */}
        <div className="border-b border-gray-300 pb-8">
          <h3 className="text-lg font-bold text-black mb-3 font-[Roboto] tracking-wider">
            Travel Insurance Coverage
          </h3>
          <p className="leading-normal mb-3">
            Coverage benefits under a travel insurance plan inclusively include the following benefits:
          </p>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">Medical coverage</h4>
            <p className="leading-normal">
              The importance of travel insurance with medical coverage benefits cannot be overstated. It is extensive and can include the following:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-gray-600">
              <li>Medical expenses related</li>
            </ul>
          </div>
        </div>

        {/* Travel Insurance for Most Visited Countries */}
        <div className="border-b border-gray-300 md:border-none pb-8 md:pb-0">
          <h3 className="text-lg font-bold text-black mb-3 font-[Roboto] tracking-wider">
            Travel Insurance for Most Visited Countries
          </h3>
          <p className="leading-normal mb-3">
            Take a look at some most visited countries you can purchase an insurance plan for when going there for a trip from India:
          </p>
          <ul className="list-disc pl-4 space-y-2 text-gray-600">
            <li>
              <span>
                The UAE: When travelling to UAE, a country in the Middle East, you can pick a customised insurance plan that covers probable contingencies and mitigates financial risks on this overseas trip.
              </span>
            </li>
            <li>
              <span>
                Thailand: Thailand is another popular destination Indians travel to. You can protect your overseas trip to
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};