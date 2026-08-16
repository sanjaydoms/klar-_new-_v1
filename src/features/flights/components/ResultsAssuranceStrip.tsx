import { BadgePercent, ExternalLink, Headphones, ShieldCheck } from 'lucide-react';

/**
 * The four assurances above the results list, per the results design. Static
 * copy — nothing here comes from the search response.
 */
const ITEMS = [
  { icon: BadgePercent, title: 'Best Price Guarantee', sub: 'We match any price' },
  { icon: ExternalLink, title: 'Free Cancellation', sub: 'On selected flights' },
  { icon: ShieldCheck, title: 'Secure Booking', sub: 'Your data is protected' },
  { icon: Headphones, title: '24/7 Support', sub: 'We are here to help' },
];

export default function ResultsAssuranceStrip() {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card px-6 py-4 shadow-[0_10px_30px_-24px_rgba(15,30,77,0.5)]">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <Icon className="h-5 w-5 text-amber-600" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-primary">{title}</span>
              <span className="text-xs text-gray-500">{sub}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
