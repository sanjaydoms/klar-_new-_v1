import { useMemo, useState } from 'react';
import {
  Plane,
  Star,
  ShieldCheck,
  Luggage,
  RefreshCw,
  Armchair,
  X,
  Maximize,
  Headphones,
  Crown,
  Gem,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface FareSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * The physical flight (any variant — route/airline/date are identical).
   * Tolerates both result shapes: one-way's `from`/`to` and the
   * return/multi-city `departure`/`arrival` naming.
   */
  flight: any;
  /** All fare variants of this flight, cheapest first. */
  fares: any[];
  /** e.g. "1 Adult" — omitted from the header when unknown. */
  paxText?: string;
  /** Selecting a fare hands it back to the card's existing booking flow. */
  onBookFare: (fare: any) => void;
  isLoading?: boolean;
  /** True while the complete fare list is still being fetched. */
  isLoadingFares?: boolean;
}

/**
 * Maps one fare from the fare-details endpoints (`/fare/oneway`, `/fare/return`,
 * `/fare/multicity` — all shaped by TripjackFieldMapper) onto the flat fields
 * the fare cards render. `base` is the search variant the fare belongs to, kept
 * underneath so the booking flow still finds flightKey/segmentId/legIndex.
 */
export const mapDetailedFare = (raw: any, flightKey: string, base: any) => {
  const adult = raw?.FareDetails?.AdultFare;
  if (!adult) return null;
  const rT = adult.RefundableType;
  return {
    ...base,
    flightKey,
    fareId: raw.fareId,
    fareIdentifier: raw.FareIdentifierType,
    price: adult.FareComponents?.TotalFare,
    cabinClass: adult.CabinClass || base?.cabinClass,
    bookingClass: adult.ClassCode,
    mealIncluded: typeof adult.MealIncluded === 'boolean' ? adult.MealIncluded : undefined,
    refundable:
      rT === 1
        ? 'Refundable'
        : rT === 2
          ? 'Partially Refundable'
          : rT === 0
            ? 'Non-Refundable'
            : 'Unknown',
    refundableType: rT,
    seatsRemaining: adult.SeatsRemaining,
    checkInBaggage: adult.BaggageInfo?.CheckInBaggage,
    cabinBaggage: adult.BaggageInfo?.CabinBaggage,
  };
};

/** "1 Adult" / "2 Adults, 1 Child" from the stored search — '' when absent. */
export function getPaxText(): string {
  try {
    const t = JSON.parse(sessionStorage.getItem('flightSearchParams') || '{}').travelerDetails;
    if (!t) return '';
    const parts = [
      t.adults ? `${t.adults} Adult${t.adults > 1 ? 's' : ''}` : '',
      t.children ? `${t.children} Child${t.children > 1 ? 'ren' : ''}` : '',
      t.infants ? `${t.infants} Infant${t.infants > 1 ? 's' : ''}` : '',
    ].filter(Boolean);
    return parts.join(', ');
  } catch {
    return '';
  }
}

/**
 * TripJack mixes cabin classes inside one physical flight's fare list (an
 * AI flight can carry ECONOMY, BUSINESS and FIRST fares at once), so fares
 * are grouped into one tab per class rather than flattened into one grid.
 * Order and copy per class:
 */
const CLASS_ORDER = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;

const CLASS_META: Record<string, { label: string; tagline: string; icon: React.ReactNode }> = {
  ECONOMY: {
    label: 'Economy',
    tagline: 'Affordable fares & value for money',
    icon: <Star className="h-4 w-4 text-amber-400" fill="currentColor" />,
  },
  PREMIUM_ECONOMY: {
    label: 'Premium Economy',
    tagline: 'Extra comfort at great value',
    icon: <Sparkles className="h-4 w-4 text-amber-400" />,
  },
  BUSINESS: {
    label: 'Business',
    tagline: 'Premium comfort & priority services',
    icon: <Gem className="h-4 w-4 text-amber-400" />,
  },
  FIRST: {
    label: 'First',
    tagline: 'The ultimate luxury experience',
    icon: <Crown className="h-4 w-4 text-amber-400" />,
  },
};

const classMeta = (cls: string) =>
  CLASS_META[cls] ?? {
    label: cls
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    tagline: '',
    icon: <Star className="h-4 w-4 text-amber-400" fill="currentColor" />,
  };

const CheckIcon = () => (
  <svg className="h-3.5 w-3.5 flex-shrink-0 text-green-600" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossIcon = () => (
  <svg
    className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-brand-red)]"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const FeatureBlock = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-3 border-t border-gray-100 py-3">
    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 text-primary">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{title}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">{children}</div>
    </div>
  </div>
);

const FeatureLine = ({ ok, text }: { ok: boolean; text: string }) => (
  <span className="flex items-center gap-1.5 text-xs text-gray-700">
    {ok ? <CheckIcon /> : <CrossIcon />}
    <span className="truncate">{text}</span>
  </span>
);

/**
 * "Choose the fare that's right for you" — fare variants of one physical
 * flight, grouped into a tab per cabin class. Every line on a card comes from
 * the search/fare response for THAT variant; nothing is invented, and rows the
 * supplier stayed silent on (meal, booking class, seats) are hidden rather
 * than guessed.
 */
export default function FareSelectModal({
  isOpen,
  onClose,
  flight,
  fares,
  paxText,
  onBookFare,
  isLoading = false,
  isLoadingFares = false,
}: FareSelectModalProps) {
  // Fares per cabin class, in canonical class order, unknown classes last.
  const classGroups = useMemo(() => {
    const byClass = new Map<string, any[]>();
    for (const f of fares) {
      const cls = (f?.cabinClass || 'ECONOMY').toUpperCase();
      const bucket = byClass.get(cls);
      if (bucket) bucket.push(f);
      else byClass.set(cls, [f]);
    }
    const known = CLASS_ORDER.filter((c) => byClass.has(c));
    const unknown = [...byClass.keys()].filter((c) => !CLASS_ORDER.includes(c as any));
    return [...known, ...unknown].map((cls) => ({
      cls,
      fares: [...(byClass.get(cls) as any[])].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)),
    }));
  }, [fares]);

  const [activeClass, setActiveClass] = useState<string | null>(null);
  const currentClass =
    (activeClass && classGroups.find((g) => g.cls === activeClass)) || classGroups[0];

  if (!isOpen || !currentClass) return null;

  const visibleFares = currentClass.fares;

  // "Most popular" = the airline's standard published fare, when present.
  // Anything else would be marketing we cannot back with data.
  const popularIndex =
    visibleFares.length > 1
      ? visibleFares.findIndex((f) =>
          String(f?.fareIdentifier || '')
            .toUpperCase()
            .includes('PUBLISHED'),
        )
      : -1;

  // Both result shapes: one-way `from`/`to`, return/multi-city `departure`/`arrival`.
  const dep = flight?.from ?? flight?.departure ?? {};
  const arr = flight?.to ?? flight?.arrival ?? {};
  const airlineName =
    typeof flight?.airline === 'string' ? flight.airline : flight?.airline?.name || '';
  const headerDate = [dep.day, dep.date].filter(Boolean).join(', ');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-[min(1120px,96vw)] max-w-[96vw] overflow-y-auto rounded-3xl bg-white p-6 sm:max-w-[min(1120px,96vw)] sm:p-8"
      >
        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <DialogTitle className="font-display text-2xl font-bold text-primary sm:text-3xl">
            Choose the fare that&rsquo;s{' '}
            <span className="text-[var(--color-brand-red)]">right</span> for you
          </DialogTitle>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Flight header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
            <Plane className="h-5 w-5 text-[var(--color-brand-red)]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary sm:text-base">
              {dep.city} <span className="text-gray-500">({dep.airportCode})</span>
              <span className="mx-2 text-gray-400">→</span>
              {arr.city} <span className="text-gray-500">({arr.airportCode})</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              {[airlineName, headerDate, paxText].filter(Boolean).join('  ·  ')}
            </p>
          </div>
        </div>

        {/* Cabin class tabs + guarantee */}
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-3">
            {classGroups.map(({ cls, fares: clsFares }) => {
              const meta = classMeta(cls);
              const isActive = cls === currentClass.cls;
              const cheapestInClass = clsFares[0]?.price ?? 0;
              return (
                <button
                  key={cls}
                  onClick={() => setActiveClass(cls)}
                  className={`flex items-center gap-3 rounded-xl px-5 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-[#1A1F4D] text-white shadow-md'
                      : 'border border-gray-200 bg-white text-primary hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                      isActive ? 'bg-white/10' : 'bg-amber-50'
                    }`}
                  >
                    {meta.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {meta.label}
                      {classGroups.length > 1 && (
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            isActive ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {clsFares.length}
                        </span>
                      )}
                    </span>
                    <span
                      className={`block text-xs ${isActive ? 'text-white/90' : 'text-gray-500'}`}
                    >
                      Starting at ₹{Math.round(cheapestInClass).toLocaleString('en-IN')}
                    </span>
                    {meta.tagline && (
                      <span
                        className={`block text-[11px] ${
                          isActive ? 'text-white/60' : 'text-gray-400'
                        }`}
                      >
                        {meta.tagline}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">Best Price Guarantee</p>
              <p className="text-xs text-gray-500">
                {isLoadingFares ? 'Loading all fares…' : 'We match any price'}
              </p>
            </div>
          </div>
        </div>

        {/* Fare cards for the selected class */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 pt-1">
          {visibleFares.map((fare, i) => {
            const f = fare as any;
            const isPopular = i === popularIndex;
            const seats = f.seatsRemaining;
            return (
              <div
                key={f.fareId || f.flightKey || i}
                className={`relative flex flex-col rounded-2xl border bg-white p-5 ${
                  isPopular
                    ? 'border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]'
                    : 'border-gray-200'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white">
                    MOST POPULAR
                  </span>
                )}

                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-2xl font-bold text-primary">
                    ₹{Math.round(f.price ?? 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500">per adult</p>
                </div>
                <p className="mt-1 truncate border-b border-gray-100 pb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                  {f.fareIdentifier || 'STANDARD'}
                </p>

                <div className="flex-1">
                  <FeatureBlock icon={<Luggage className="h-4 w-4" />} title="Baggage">
                    {f.cabinBaggage && <FeatureLine ok text={`${f.cabinBaggage} Cabin Baggage`} />}
                    {f.checkInBaggage && (
                      <FeatureLine ok text={`${f.checkInBaggage} Check-in Baggage`} />
                    )}
                    {!f.cabinBaggage && !f.checkInBaggage && (
                      <span className="text-xs text-gray-400">As per airline policy</span>
                    )}
                  </FeatureBlock>

                  <FeatureBlock icon={<RefreshCw className="h-4 w-4" />} title="Flexibility">
                    <FeatureLine
                      ok={f.refundable === 'Refundable' || f.refundable === 'Partially Refundable'}
                      text={f.refundable || 'Unknown'}
                    />
                  </FeatureBlock>

                  <FeatureBlock icon={<Armchair className="h-4 w-4" />} title="Seats, Meals & More">
                    <FeatureLine
                      ok
                      text={`${classMeta(currentClass.cls).label.toUpperCase()}${
                        f.bookingClass ? ` – Class ${f.bookingClass}` : ''
                      }`}
                    />
                    {typeof f.mealIncluded === 'boolean' && (
                      <FeatureLine
                        ok={f.mealIncluded}
                        text={f.mealIncluded ? 'Meal Included' : 'Meal Not Included'}
                      />
                    )}
                  </FeatureBlock>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <span className="text-xs font-medium text-gray-600">
                    {typeof seats === 'number' ? `${seats} seat${seats === 1 ? '' : 's'} left` : ''}
                  </span>
                  <button
                    onClick={() => onBookFare(fare)}
                    disabled={isLoading}
                    className="rounded-lg bg-[var(--color-brand-red)] px-6 py-2.5 text-xs font-bold tracking-wide text-white transition-colors hover:brightness-110 disabled:opacity-50"
                  >
                    {isLoading ? 'LOADING…' : 'BOOK NOW'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assurance strip */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl bg-gray-50 px-6 py-4 sm:grid-cols-3">
          {[
            {
              icon: <Maximize className="h-4 w-4" />,
              t: 'Free Cancellation',
              s: 'On selected fares',
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              t: 'Secure Booking',
              s: 'Your data is protected',
            },
            { icon: <Headphones className="h-4 w-4" />, t: '24/7 Support', s: "We're here to help" },
          ].map(({ icon, t, s }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-primary">
                {icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-primary">{t}</p>
                <p className="text-xs text-gray-500">{s}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
