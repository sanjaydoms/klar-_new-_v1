import { CheckCircle, AlertCircle } from 'lucide-react';

/**
 * The refundability + baggage strip at the foot of a results card.
 *
 * Every card used to print a green "REFUNDABLE" and "15 KG / 7 KG" as
 * literals, while the search response carries both per FARE — a real DEL-BOM
 * day returns Non-Refundable fares and check-in allowances from "1 Piece" to
 * "40 Kg". Values are supplier free-text ("15 kg", "15 Kg (01 Piece only)",
 * "1 Piece, 15 Kilogram each") and are shown verbatim; anything absent is
 * omitted rather than guessed.
 */
interface FlightCardFooterProps {
  /** Normalizer label: Refundable / Partially Refundable / Non-Refundable. */
  refundable?: string | undefined;
  checkInBaggage?: string | undefined;
  cabinBaggage?: string | undefined;
}

const TONE: Record<string, string> = {
  refundable: 'text-green-600',
  'partially refundable': 'text-amber-600',
  'non-refundable': 'text-destructive',
};

/** Colour for a label, or undefined for absent / "Unknown" — see above. */
export function refundableTone(label?: string): string | undefined {
  return label ? TONE[label.trim().toLowerCase()] : undefined;
}

/** "15 kg / 7 Kg", one side alone, or "" — never a default. */
export function formatBaggage(checkInBaggage?: string, cabinBaggage?: string): string {
  const checkIn = checkInBaggage?.trim();
  const cabin = cabinBaggage?.trim();
  if (checkIn && cabin) return `${checkIn} / ${cabin}`;
  if (checkIn) return `${checkIn} check-in`;
  if (cabin) return `${cabin} cabin`;
  return '';
}

/**
 * One value for a multi-leg itinerary, or undefined when the legs disagree.
 * A combo is priced as one fare but its legs can carry different allowances;
 * picking one leg's value to stand for the trip would be a guess.
 */
export function agreedValue(values: (string | undefined)[]): string | undefined {
  const first = values[0]?.trim();
  if (!first) return undefined;
  return values.every((v) => v?.trim() === first) ? first : undefined;
}

export default function FlightCardFooter({
  refundable,
  checkInBaggage,
  cabinBaggage,
}: FlightCardFooterProps) {
  const label = refundable?.trim();
  // "Unknown" is the normalizer's way of saying the fare didn't state it —
  // showing it would be as misleading as the old hardcoded "REFUNDABLE".
  const tone = refundableTone(label);
  const baggage = formatBaggage(checkInBaggage, cabinBaggage);

  if (!tone && !baggage) return null;

  return (
    // Plain row on the card's own surface, per the results design — this was a
    // banded strip (gold, then grey) spanning the card's full width.
    <div className="flex items-center justify-between pt-3 pb-4 text-xs">
      <div className="flex items-center gap-6">
        {tone && (
          <div className={`flex items-center gap-1 ${tone}`}>
            {tone === TONE['non-refundable'] ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span className="font-semibold uppercase">{label}</span>
          </div>
        )}

        {baggage && (
          <div className="flex items-center gap-1" title="Check-in / cabin baggage">
            <img src="/logo/luggage.png" alt="Baggage" className="w-4 h-4 object-contain" />
            <span className="text-gray-600">{baggage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
