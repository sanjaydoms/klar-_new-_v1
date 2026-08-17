import {
  Briefcase,
  Building2,
  Car,
  FileText,
  Plane,
  ShieldCheck,
  Compass,
  type LucideIcon,
} from 'lucide-react';

/**
 * The boarding pass on the login page's left panel.
 *
 * It was `OverlayImage.jpg` — a 1.7 MB raster in the Heritage palette: gold
 * compass and plane on cream stock with a near-black stub. Heritage is off the
 * product, and a flat image cannot be recoloured, so it is markup now: navy
 * stub, white stock, signal red for the accents, and the lucide icons the rest
 * of the app already uses. Crisp at any density, themeable, and roughly 1.7 MB
 * lighter.
 *
 * Decorative: the whole thing is `aria-hidden`, since a screen reader gains
 * nothing from a mock travel document.
 */

const EXPLORE: [LucideIcon, string][] = [
  [Plane, 'Flights'],
  [Building2, 'Hotels'],
  [FileText, 'Visa'],
  [Car, 'Cabs'],
];

const PROTECT: [LucideIcon, string][] = [
  [ShieldCheck, 'Insurance'],
  [Briefcase, 'Baggage'],
];

/** Deterministic bar widths — a real barcode would encode nothing useful. */
const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 3, 1, 1, 2, 2, 1, 3];

export default function BoardingPass({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ${className}`}
    >
      {/* Stub */}
      <div className="flex w-[38%] flex-col justify-between bg-primary p-5 text-white">
        <div>
          <p className="font-display text-[15px] leading-tight font-medium">Premium</p>
          <p className="mt-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase text-white/60">
            Travel Pass
          </p>
        </div>

        <div className="flex justify-center py-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5">
            <Compass className="h-7 w-7 text-[var(--color-brand-red)]" strokeWidth={1.5} />
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[8px] font-semibold tracking-[0.18em] uppercase text-white/50">
              Member Tier
            </p>
            <p className="text-[13px] font-semibold">Platinum</p>
          </div>
          <div className="h-px bg-white/15" />
          <div>
            <p className="text-[8px] font-semibold tracking-[0.18em] uppercase text-white/50">
              Reward Points
            </p>
            <p className="font-display text-[20px] leading-none font-medium">24,680</p>
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div className="relative w-px bg-transparent">
        <div className="absolute inset-y-3 left-0 w-px border-l border-dashed border-gray-300" />
      </div>

      {/* Pass */}
      <div className="flex w-[62%] flex-col justify-between p-5">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-[var(--color-brand-red)]" strokeWidth={1.75} />
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-primary">
              VIP Boarding Pass
            </p>
            <p className="text-[8px] tracking-[0.1em] uppercase text-gray-400">
              Your journey starts here
            </p>
          </div>
        </div>

        <div className="py-3">
          <p className="text-[8px] font-semibold tracking-[0.18em] uppercase text-gray-400">
            Destination
          </p>
          <p className="font-display text-[26px] leading-tight font-medium text-primary">
            Your <span className="text-[var(--color-brand-red)]">World</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-200 pt-3">
          <div>
            <p className="mb-1.5 text-[8px] font-semibold tracking-[0.18em] uppercase text-gray-400">
              Explore
            </p>
            <ul className="space-y-1">
              {EXPLORE.map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-1.5 text-[10px] text-primary">
                  <Icon className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[8px] font-semibold tracking-[0.18em] uppercase text-gray-400">
              Protect
            </p>
            <ul className="space-y-1">
              {PROTECT.map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-1.5 text-[10px] text-primary">
                  <Icon className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="flex h-8 items-end gap-[2px]">
            {BARS.map((w, i) => (
              <span
                key={i}
                className="h-full bg-primary"
                style={{ width: `${w}px`, opacity: w === 1 ? 0.85 : 1 }}
              />
            ))}
          </div>
          <p className="mt-2 text-[7px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Global Travel Network · Destination: Your World
          </p>
        </div>
      </div>
    </div>
  );
}
