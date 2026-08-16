import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Car,
  ChevronDown,
  FileText,
  Building2,
  Heart,
  LayoutGrid,
  Plane,
  Ship,
  ShieldCheck,
  Palmtree,
  User,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/routes/routes.config';
import { LANDING_RAIL } from './landingRail';

/**
 * The landing nav: ONE white bar holding the logo, the service tabs and the
 * account actions, divided by hairlines rather than split into separate
 * floating pills.
 *
 * Icons are lucide rather than the per-tab PNGs this used to load. The active
 * tab is white-on-navy, and a PNG cannot recolour — serving a second white
 * copy of every icon is the pattern that was removed from the mobile home
 * screen. `currentColor` does it for free.
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

interface Tab {
  key: string;
  label: string;
  Icon: LucideIcon;
}

const PRIMARY_TABS: Tab[] = [
  { key: 'flights', label: 'Flights', Icon: Plane },
  { key: 'hotels', label: 'Hotels', Icon: Building2 },
  { key: 'tours', label: 'Holidays', Icon: Palmtree },
  { key: 'cabs', label: 'Cabs', Icon: Car },
  { key: 'visa', label: 'Visa', Icon: FileText },
  { key: 'insurance', label: 'Insurance', Icon: ShieldCheck },
  { key: 'cruise', label: 'Cruise', Icon: Ship },
];

/** The two that do not fit the bar live behind "More". */
const MORE_TABS: Tab[] = [
  { key: 'charters', label: 'Charters', Icon: Plane },
  { key: 'passport', label: 'Passport', Icon: FileText },
];

/** A hairline between the bar's three groups. */
function Divider() {
  return <span aria-hidden="true" className="mx-2 h-14 w-px shrink-0 bg-gray-200" />;
}

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

  /** Icon over label, and the red rule under the active one. */
  const tabButton = ({ key, label, Icon }: Tab) => {
    const isActive = activeTab === key;
    return (
      <div key={key} className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => {
            onTabChange(key);
            setMoreOpen(false);
          }}
          aria-current={isActive ? 'page' : undefined}
          className={`flex w-[74px] flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-semibold transition-colors ${
            isActive ? 'bg-primary text-white' : 'text-primary hover:bg-secondary/60'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
        <span
          aria-hidden="true"
          className={`mt-1 h-[3px] w-9 rounded-full ${
            isActive ? 'bg-[var(--color-brand-red)]' : 'bg-transparent'
          }`}
        />
      </div>
    );
  };

  /** My Trips / Wishlist: icon, label, and the grey line under it. */
  const actionButton = (
    Icon: LucideIcon,
    label: string,
    sub: string,
    onClick?: () => void,
    iconClass = 'text-primary',
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[92px] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
    >
      <Icon className={`h-5 w-5 ${iconClass}`} strokeWidth={1.75} />
      <span className="text-[13px] font-semibold leading-tight text-primary">{label}</span>
      <span className="text-center text-[11px] leading-tight text-gray-500">{sub}</span>
    </button>
  );

  return (
    <nav className="relative z-50 pt-5">
      <div className={LANDING_RAIL}>
        <div className="flex items-center rounded-3xl bg-white px-5 py-3 shadow-[0_18px_50px_-24px_rgba(15,30,77,0.45)]">
          <img src="/logo/KLARBlue.png" alt="Klar Travels" className="h-12 w-auto shrink-0" />

          <Divider />

          <div className="flex flex-1 items-center justify-center gap-0.5">
            {PRIMARY_TABS.map((t) => tabButton(t))}

            <div className="relative flex flex-col items-center" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex w-[74px] flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-semibold transition-colors ${
                  activeInMore ? 'bg-primary text-white' : 'text-primary hover:bg-secondary/60'
                }`}
              >
                <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
                <span className="flex items-center gap-0.5 whitespace-nowrap">
                  More
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
              <span
                aria-hidden="true"
                className={`mt-1 h-[3px] w-9 rounded-full ${
                  activeInMore ? 'bg-[var(--color-brand-red)]' : 'bg-transparent'
                }`}
              />
              {moreOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-white p-1.5 shadow-lg">
                  {MORE_TABS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onTabChange(key);
                        setMoreOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === key
                          ? 'bg-primary text-white'
                          : 'text-primary hover:bg-secondary/60'
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Divider />

          <div className="flex items-center gap-1">
            {actionButton(Briefcase, 'My Trips', 'Manage bookings', () =>
              navigate(ROUTES.MY_BOOKINGS ?? '/my-bookings'),
            )}
            {actionButton(
              Heart,
              'Wishlist',
              'Saved favourites',
              undefined,
              'text-[var(--color-brand-red)]',
            )}

            {!user && (
              <button
                type="button"
                onClick={() => navigate(ROUTES.LOGIN)}
                className="ml-1 flex w-[96px] flex-col items-center gap-1 rounded-2xl bg-primary px-3 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <User className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-center leading-tight">Login / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
