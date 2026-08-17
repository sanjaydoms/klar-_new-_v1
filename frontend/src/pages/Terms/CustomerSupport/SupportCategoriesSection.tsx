import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plane,
  Building2,
  Car,
  FileText,
  Briefcase,
  ShieldCheck,
  Ship,
  BookOpen,
  Palmtree,
  PlaneTakeoff,
  LucideIcon,
} from 'lucide-react';

interface CategoryCard {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tabKey: string;
  externalUrl?: string;
}

interface SectionData {
  title: string;
  description: string;
  cards: CategoryCard[];
}

export default function SupportCategoriesSection() {
  const navigate = useNavigate();

  const handleCardClick = (card: CategoryCard) => {
    if (card.externalUrl) {
      window.open(card.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate('/', { state: { activeTab: card.tabKey } });
    }
  };

  const categories: SectionData[] = [
    {
      title: 'Bookings',
      description: 'Anything you have already reserved with us',
      cards: [
        { id: 'flight', title: 'Flight Booking', subtitle: 'Fares, seats, baggage', icon: Plane, tabKey: 'flights' },
        { id: 'hotel', title: 'Hotel Booking', subtitle: 'Rooms, check-in, city tax', icon: Building2, tabKey: 'hotels' },
        { id: 'cabs', title: 'Cabs', subtitle: 'Status & timelines', icon: Car, tabKey: 'cabs' },
      ],
    },
    {
      title: 'Services',
      description: 'Documentation, cover and managed travel',
      cards: [
        { id: 'visa', title: 'Visa Services', subtitle: 'Documents & appointments', icon: FileText, tabKey: 'visa' },
        { id: 'corporate', title: 'Corporate Travel', subtitle: 'Policies & invoicing', icon: Briefcase, tabKey: 'corporate', externalUrl: 'https://corporate.klartravels.com' },
        { id: 'insurance', title: 'Insurance', subtitle: 'Cover & claims', icon: ShieldCheck, tabKey: 'insurance' },
      ],
    },
    {
      title: 'Other help',
      description: 'Money, cruises and everything else',
      cards: [
        { id: 'cruise', title: 'Cruise', subtitle: 'Cabins, ports, boarding', icon: Ship, tabKey: 'cruise' },
        { id: 'passport', title: 'Passport', subtitle: 'Cards, rates, delivery', icon: BookOpen, tabKey: 'passport' },
        { id: 'holidays', title: 'Holiday Packages', subtitle: 'Itineraries & add-ons', icon: Palmtree, tabKey: 'tours' },
        { id: 'charters', title: 'Charters', subtitle: 'Enquiry jets , helicopters', icon: PlaneTakeoff, tabKey: 'charters' },
      ],
    },
  ];

  return (
    <section className="w-full bg-white py-12">
      {/* Aligned Inner Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        {/* Header Badge & Title */}
        <div className="mb-10 text-left">
          <span
            className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full"
            style={{ backgroundColor: '#FDF7F4', color: '#4E0004' }}
          >
            ✦ Quick help
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3" style={{ color: '#16255F' }}>
            What do you need support with?
          </h1>
          <p className="text-sm md:text-base" style={{ color: '#7B6A64' }}>
            Grouped by the kind of help you need — pick one and we'll route you to the specialist desk that handles it.
          </p>
        </div>

        {/* Categories Sections */}
        <div className="flex flex-col gap-10 w-full">
          {categories.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-4 w-full">
              <div className="flex items-baseline gap-2 pb-2 border-b border-gray-100 w-full">
                <h2 className="text-xl font-bold" style={{ color: '#16255F' }}>
                  {section.title}
                </h2>
                <span className="text-xs md:text-sm" style={{ color: '#7B6A64' }}>
                  {section.description}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {section.cards.map((card) => {
                  const IconComponent = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      className="flex flex-col p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-100 w-full"
                      style={{ backgroundColor: '#FFF9F6' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#FCEFE9' }}>
                        <IconComponent className="w-5 h-5" style={{ color: '#4E0004' }} />
                      </div>
                      <h3 className="font-semibold text-base mb-1" style={{ color: '#16255F' }}>
                        {card.title}
                      </h3>
                      <p className="text-xs" style={{ color: '#7B6A64' }}>
                        {card.subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}