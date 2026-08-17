import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileWarning,
  Plane,
  CalendarX,
  Receipt,
  FileText,
  Compass,
  Bell,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';

interface AssistanceCard {
  id: string;
  title: string;
  description: string;
  actionText: string;
  icon: LucideIcon;
  tabKey?: string;
  link?: string;
}

export default function TravelAssistanceSection() {
  const navigate = useNavigate();

  const cards: AssistanceCard[] = [
    {
      id: 'lost-docs',
      title: 'Lost Documents',
      description:
        'Passport, visa or ticket lost while travelling — get an emergency desk within 15 minutes.',
      actionText: 'Report now',
      icon: FileWarning,
      tabKey: 'passport',
    },
    {
      id: 'flight-changes',
      title: 'Flight Changes',
      description:
        'Reschedule dates, routes or passenger names on any confirmed booking.',
      actionText: 'Change flight',
      icon: Plane,
      tabKey: 'flights',
    },
    {
      id: 'cancellation',
      title: 'Cancellation',
      description:
        'Cancel a booking and see airline or hotel penalties before you confirm.',
      actionText: 'Start cancellation',
      icon: CalendarX,
      tabKey: 'flights',
    },
    {
      id: 'refund-status',
      title: 'Refund Status',
      description:
        'Track where your money is, from airline release to bank credit.',
      actionText: 'Track refund',
      icon: Receipt,
      tabKey: 'flights',
    },
    {
      id: 'visa-tracking',
      title: 'Visa Tracking',
      description:
        'Live status of your application, appointment and passport return.',
      actionText: 'Track visa',
      icon: FileText,
      tabKey: 'visa',
    },
    {
      id: 'travel-advisory',
      title: 'Travel Advisory',
      description:
        'Entry rules, transit norms and documentation for your destination.',
      actionText: 'Read advisory',
      icon: Compass,
      tabKey: 'visa',
    },
    {
      id: 'travel-alerts',
      title: 'Travel Alerts',
      description:
        'Strikes, weather disruptions and airport notices on your route.',
      actionText: 'View alerts',
      icon: Bell,
      tabKey: 'flights',
    },
  ];

  const handleCardClick = (card: AssistanceCard) => {
    if (card.tabKey) {
      navigate('/', { state: { activeTab: card.tabKey } });
    }
  };

  return (
    /* Full-bleed outer container with peach background */
    <section className="w-full bg-[#FDF5F1] py-16">
      {/* Aligned Inner Container matching standard width & padding */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        {/* Header Badge & Title */}
        <div className="mb-10 text-left">
          <span
            className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full"
            style={{ backgroundColor: '#F9EBE5', color: '#4E0004' }}
          >
            ✦ Customer assistance
          </span>
          <h2
            className="text-3xl md:text-5xl font-serif font-bold mb-3"
            style={{ color: '#16255F' }}
          >
            Get help while you travel
          </h2>
          <p className="text-sm md:text-base" style={{ color: '#7B6A64' }}>
            The things that go wrong on the road — each one handled by a dedicated queue.
          </p>
        </div>

        {/* Assistance Grid (3 Columns on Desktop, Stacked on Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="group flex flex-col justify-between p-6 rounded-3xl bg-white cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-100"
              >
                <div>
                  {/* Icon Bubble */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: '#FCEFE9' }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: '#4E0004' }} />
                  </div>

                  {/* Card Title */}
                  <h3
                    className="text-lg font-serif font-bold mb-2"
                    style={{ color: '#16255F' }}
                  >
                    {card.title}
                  </h3>

                  {/* Card Description */}
                  <p
                    className="text-xs sm:text-sm leading-relaxed mb-6"
                    style={{ color: '#7B6A64' }}
                  >
                    {card.description}
                  </p>
                </div>

                {/* Bottom Action Link */}
                <div
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors group-hover:underline"
                  style={{ color: '#4E0004' }}
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}