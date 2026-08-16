import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

/**
 * The service strip under the header on the mobile results screens, per the
 * results design. Switching service goes back to the dashboard with that tab
 * selected — DashboardPage reads `location.state.activeTab`.
 */
const TABS = [
  { key: 'flights', label: 'Flights', icon: '/logo/landing_flight_logo.png' },
  { key: 'hotels', label: 'Hotels', icon: '/logo/landing_hotel_logo.png' },
  { key: 'visa', label: 'Visa', icon: '/logo/landing_visa_logo.png' },
  { key: 'insurance', label: 'Insurance', icon: '/logo/landing_insurance_logo.png' },
  { key: 'tours', label: 'Holiday', icon: '/logo/landing_tours_logo.png' },
  { key: 'cabs', label: 'Cabs', icon: '/logo/landing_cab_logo.png' },
];

export default function MobileServiceTabs({ active = 'flights' }: { active?: string }) {
  const navigate = useNavigate();

  return (
    <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate('/', { state: { activeTab: tab.key } })}
            className={`flex min-w-[64px] shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors ${
              isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-secondary'
            }`}
          >
            <img
              src={tab.icon}
              alt=""
              className={`h-5 w-5 object-contain ${isActive ? 'brightness-0 invert' : ''}`}
            />
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex min-w-[64px] shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-gray-600 transition-colors hover:bg-secondary"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span className="text-[11px] font-medium">More</span>
      </button>
    </div>
  );
}
