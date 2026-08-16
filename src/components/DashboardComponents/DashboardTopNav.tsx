import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ChevronDown, Grid3x3, Heart, User } from 'lucide-react';
import { ROUTES } from '@/routes/routes.config';

/**
 * The floating nav bar from the new landing design: one white pill holding the
 * logo, the service tabs and the account actions.
 *
 * The service tabs used to sit inside the search card; the card now renders
 * only the active service's fields, so this owns `activeTab`.
 */
export interface DashboardTopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Signed-in user, if any — only changes the right-hand cluster. */
  user?: unknown;
}

const PRIMARY_TABS = [
  { key: 'flights', label: 'Flights', icon: '/logo/landing_flight_logo.png' },
  { key: 'hotels', label: 'Hotels', icon: '/logo/landing_hotel_logo.png' },
  { key: 'tours', label: 'Holidays', icon: '/logo/landing_tours_logo.png' },
  { key: 'cabs', label: 'Cabs', icon: '/logo/landing_cab_logo.png' },
  { key: 'visa', label: 'Visa', icon: '/logo/landing_visa_logo.png' },
  { key: 'insurance', label: 'Insurance', icon: '/logo/landing_insurance_logo.png' },
  { key: 'cruise', label: 'Cruise', icon: '/logo/landing_cruise_logo.png' },
];

/** The two that do not fit the bar live behind "More". */
const MORE_TABS = [
  { key: 'charters', label: 'Charters', icon: '/logo/landing_charter_logo.png' },
  { key: 'passport', label: 'Passport', icon: '/logo/landing_pssport_logo.png' },
];

export default function DashboardTopNav({ activeTab, onTabChange, user }: DashboardTopNavProps) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen]);

  const activeInMore = MORE_TABS.some((t) => t.key === activeTab);

  const tabButton = (tab: { key: string; label: string; icon: string }, inMenu = false) => {
    const isActive = activeTab === tab.key;
    return (
      <button
        key={tab.key}
        type="button"
        onClick={() => {
          onTabChange(tab.key);
          setMoreOpen(false);
        }}
        className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          inMenu ? 'w-full justify-start hover:bg-secondary/60' : ''
        } ${isActive ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-primary'}`}
      >
        <img src={tab.icon} alt="" className="h-4 w-4 object-contain" />
        <span className="whitespace-nowrap">{tab.label}</span>
        {isActive && !inMenu && (
          <span className="absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full bg-[var(--color-brand-red)]" />
        )}
      </button>
    );
  };

  return (
    <nav className="relative z-50 px-6 pt-5">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4">
        <img src="/logo/KLARBlue.png" alt="Klar Travels" className="h-11 w-auto shrink-0" />

        <div className="flex items-center gap-1 rounded-2xl bg-white/90 p-1.5 shadow-[0_10px_30px_-12px_rgba(15,30,77,0.35)] backdrop-blur">
          {PRIMARY_TABS.map((t) => tabButton(t))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                activeInMore ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              More
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border bg-white p-1.5 shadow-lg">
                {MORE_TABS.map((t) => tabButton(t, true))}
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.MY_BOOKINGS ?? '/my-bookings')}
            className="flex items-center gap-2.5 rounded-xl bg-white/90 px-4 py-2.5 text-left shadow-[0_10px_30px_-12px_rgba(15,30,77,0.35)] backdrop-blur transition-shadow hover:shadow-md"
          >
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-primary">My Trips</span>
              <span className="text-[10px] text-gray-500">Manage bookings</span>
            </span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl bg-white/90 px-4 py-2.5 text-left shadow-[0_10px_30px_-12px_rgba(15,30,77,0.35)] backdrop-blur transition-shadow hover:shadow-md"
          >
            <Heart className="h-5 w-5 text-[var(--color-brand-red)]" />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-primary">Wishlist</span>
              <span className="text-[10px] text-gray-500">Saved favourites</span>
            </span>
          </button>

          {!user && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.LOGIN)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(15,30,77,0.6)] transition-opacity hover:opacity-90"
            >
              <User className="h-4 w-4" />
              Login / Sign Up
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
