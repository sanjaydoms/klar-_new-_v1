/**
 * The selectable fare-variant strip under a results card.
 *
 * TripJack returns one entry per fare group for the same physical flight;
 * `groupFareVariants` folds them back into one card and this renders the
 * choice. Shared by the oneway, return and multicity cards so the three lists
 * read identically. Renders nothing for a single fare.
 */
interface FareVariantRowsProps {
  /** Variants of one physical flight, cheapest first. */
  fares: any[];
  activeIndex: number;
  onSelectFare: (index: number) => void;
}

export default function FareVariantRows({
  fares,
  activeIndex,
  onSelectFare,
}: FareVariantRowsProps) {
  if (!fares || fares.length < 2) return null;

  return (
    <div className="mt-3 divide-y divide-border rounded-lg border border-border">
      {fares.map((f, i) => (
        <button
          key={f?.fareId || f?.flightKey || i}
          type="button"
          onClick={() => onSelectFare(i)}
          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
            i === activeIndex ? 'bg-secondary/60' : 'hover:bg-muted/60'
          }`}
        >
          <span className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full border ${
                i === activeIndex ? 'border-accent bg-accent' : 'border-border'
              }`}
            />
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
              {f?.fareIdentifier || 'Fare'}
            </span>
            <span className="text-xs text-muted-foreground">{f?.refundable}</span>
          </span>
          <span className="font-display text-sm font-medium text-primary">
            ₹ {f?.price != null ? Math.round(f.price).toLocaleString('en-IN') : ''}
          </span>
        </button>
      ))}
    </div>
  );
}
