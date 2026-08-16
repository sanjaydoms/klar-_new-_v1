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
