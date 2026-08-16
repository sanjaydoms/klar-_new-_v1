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

export default function FlightCardFooter({
  refundable,
  checkInBaggage,
  cabinBaggage,
}: FlightCardFooterProps) {
  const label = refundable?.trim();
  // "Unknown" is the normalizer's way of saying the fare didn't state it —
  // showing it would be as misleading as the old hardcoded "REFUNDABLE".
  const tone = label ? TONE[label.toLowerCase()] : undefined;

  const checkIn = checkInBaggage?.trim();
  const cabin = cabinBaggage?.trim();
  const baggage =
    checkIn && cabin
      ? `${checkIn} / ${cabin}`
      : checkIn
        ? `${checkIn} check-in`
        : cabin
          ? `${cabin} cabin`
          : '';

  if (!tone && !baggage) return null;

  return (
    <div
      className="mt-2 pb-2 pt-2 px-4 -mx-4 border-t flex items-center justify-between text-xs"
      style={{
        borderTop: '1px solid rgba(203, 139, 12, 0.25)',
        background:
          'linear-gradient(90deg, rgba(250, 197, 93, 0.25) 11.01%, rgba(203, 139, 12, 0.25) 59.57%)',
      }}
    >
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
