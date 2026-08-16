/**
 * Display helpers for the two fields the search normalizers started sending
 * (terminal, aircraftTypes). Both are supplier free-text and both are often
 * absent, so every helper returns '' rather than a placeholder — the card then
 * renders nothing at all.
 */

/** "3" -> "T3", "T2" / "Terminal 1" -> left alone. */
export function formatTerminal(terminal?: string): string {
  const value = terminal?.trim();
  if (!value) return '';
  return /^(t|terminal)\b/i.test(value) || /^T\d/i.test(value) ? value : `T${value}`;
}

/**
 * One aircraft per segment, e.g. "320" or "320 · 738" for a connection.
 * TripJack sends equipment CODES; we have no code-to-name table, so the code
 * is shown as-is rather than guessed at ("Airbus A320").
 */
export function formatAircraft(aircraftTypes?: string[]): string {
  if (!Array.isArray(aircraftTypes)) return '';
  const types = aircraftTypes.map((t) => t?.trim()).filter(Boolean);
  return types.length ? types.join(' · ') : '';
}

/**
 * rT -> the same wording the search normalizer uses (`refundableLabel`).
 * The fare-selection pages inferred refundability from the fare NAME instead
 * ("FLEXI" meant refundable, everything else did not), while `RefundableType`
 * was sitting in the same object. '' for an unstated value, so nothing is
 * claimed either way.
 */
export function refundableLabelFromType(refundableType?: number): string {
  if (refundableType === 1) return 'Refundable';
  if (refundableType === 2) return 'Partially Refundable';
  if (refundableType === 0) return 'Non-Refundable';
  return '';
}

/**
 * Cabin baggage out of a field-mapped BaggageInfo. `cB` under `bI` is cabin
 * baggage and the backend emits it as `CabinBaggage`, with `ClassCode` kept
 * only as a legacy alias that fieldMapper.core intends to drop — so prefer the
 * corrected name and fall back.
 */
export function cabinBaggageOf(baggageInfo?: {
  CabinBaggage?: string;
  ClassCode?: string;
}): string {
  return (baggageInfo?.CabinBaggage || baggageInfo?.ClassCode || '').trim();
}
