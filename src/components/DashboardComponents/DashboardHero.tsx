import { Award, ChevronRight, Gem, Gift, Headphones, IndianRupee, ShieldCheck, Star, Tag } from 'lucide-react';

/**
 * Hero copy, trust chips and the offers callout from the new landing design.
 * The headline is the same line as before; it is left-aligned now, with the
 * second half in the brand red rather than gold italic.
 */
const TRUST = [
  { icon: Award, top: 'Trusted', bottom: 'Since 2000' },
  { icon: Gem, top: 'Premium', bottom: 'Experiences' },
  { icon: Headphones, top: '24/7', bottom: 'Support' },
  { icon: ShieldCheck, top: 'Secure', bottom: 'Bookings' },
];

export function DashboardHeroCopy() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 pt-10">
      <div className="flex items-start justify-between gap-8">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-primary/70 uppercase">
            Premium Travel Experiences Since 2000
          </p>

          <h1 className="font-display mt-5 text-[52px] leading-[1.08] font-medium text-primary">
            Extraordinary Journeys,
            <br />
            <span className="text-[var(--color-brand-red)]">Unforgettable Luxury.</span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-600">
            Handpicked luxury travel experiences crafted around you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {TRUST.map(({ icon: Icon, top, bottom }) => (
              <div
                key={top}
                className="flex items-center gap-3 rounded-xl bg-white/85 px-4 py-3 shadow-[0_10px_30px_-14px_rgba(15,30,77,0.4)] backdrop-blur"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/70">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[13px] font-semibold text-primary">{top}</span>
                  <span className="text-[13px] text-gray-500">{bottom}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="mt-2 hidden shrink-0 items-center gap-3 rounded-2xl bg-white/90 px-5 py-4 text-left shadow-[0_16px_40px_-18px_rgba(15,30,77,0.5)] backdrop-blur transition-shadow hover:shadow-lg xl:flex"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary">
            <Tag className="h-5 w-5 text-white" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-primary">Exclusive Offers</span>
            <span className="text-xs text-gray-500">
              Save more on
              <br />
              your bookings
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

const PROMISES = [
  { icon: IndianRupee, title: 'Best Price Guarantee', sub: 'We match any price' },
  { icon: Gift, title: 'Exclusive Offers', sub: 'Save more on your bookings' },
  { icon: null, title: 'Flexible Options', sub: 'Easy changes & cancellations' },
];

/** The navy promise strip that closes the hero. */
export function DashboardHeroPromises() {
  return (
    <div className="mx-auto mt-8 max-w-[1240px] px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-5 text-white shadow-[0_20px_50px_-24px_rgba(15,30,77,0.9)]">
        {PROMISES.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              {Icon ? (
                <Icon className="h-5 w-5 text-white" />
              ) : (
                <span className="text-lg leading-none">⇄</span>
              )}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-xs text-white/70">{sub}</span>
            </span>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
            <Star className="h-5 w-5 fill-current text-white" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold">4.8/5</span>
            <span className="text-xs text-white/70">From 10k+ travellers</span>
          </span>
        </div>
      </div>
    </div>
  );
}
