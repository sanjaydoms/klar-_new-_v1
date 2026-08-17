/**
 * Special Return fares are sold as a pair: when one leg is SPECIAL_RETURN the
 * other must be too, and the two must be the pair the airline offered —
 * matched on sri/msri.
 *
 * flight-service already enforces this at Review
 * (`utils/priceIdValidator.ts:validateSpecialReturnPairing`) and the supplier
 * enforces it at Book. Desktop let the user assemble an invalid pair and only
 * find out at "Book Now", where the message was swallowed into "ERROR: Not get
 * review data". This mirrors the SAME rule — including its leniency — so the
 * user is stopped at selection, with the wording the backend would have used.
 *
 * Deliberately mirrored, not shared: the backend is the authority (it sees the
 * live fares), this copy only spares the round trip. Keep the two in step.
 */

/** msri may arrive as a list or a single value depending on the supplier. */
export function msriContains(msri: unknown, sri: string | undefined): boolean {
  if (!sri) return false;
  if (Array.isArray(msri)) return msri.some((v) => String(v) === sri);
  if (msri === undefined || msri === null) return false;
  return String(msri) === sri;
}

const msriOf = (fare: any) => fare?.msri ?? fare?.meta?.msri;

/** A fare carries pairing identifiers only if sri or a non-empty msri is present. */
export function hasPairingInfo(fare: any): boolean {
  const msri = msriOf(fare);
  return Boolean(fare?.sri) || (Array.isArray(msri) ? msri.length > 0 : Boolean(msri));
}

const isSpecial = (fare: any) => fare?.fareIdentifier === 'SPECIAL_RETURN';

export const PAIRING_MESSAGES = {
  bothLegs:
    'Special Return fares must be booked on both legs — pair this fare with a SPECIAL_RETURN fare on the other leg, or pick a regular fare for both.',
  notAPair:
    'These Special Return fares are not a matching pair. Select the return fare offered against this onward fare.',
};

/**
 * The problem with this pair, or null when it is fine (which includes "not
 * verifiable here"). Both legs must be chosen before anything is judged.
 */
export function specialReturnPairingError(onwardFare: any, returnFare: any): string | null {
  if (!onwardFare || !returnFare) return null;

  const specials = [onwardFare, returnFare].filter(isSpecial);
  if (specials.length === 0) return null;
  if (specials.length === 1) return PAIRING_MESSAGES.bothLegs;

  // Live UAT carries plenty of SPECIAL_RETURN fares with neither identifier
  // populated (55 of 199 onward fares in one DEL-BOM search). Rejecting those
  // would block perfectly bookable pairs, so an unverifiable pair is allowed
  // through to TripJack, the authority on its own inventory.
  if (!hasPairingInfo(onwardFare) || !hasPairingInfo(returnFare)) return null;

  // Both legs carry sri AND msri on live UAT, each listing the other's sri, so
  // either direction confirms the pairing.
  const paired =
    msriContains(msriOf(returnFare), onwardFare.sri) ||
    msriContains(msriOf(onwardFare), returnFare.sri);

  return paired ? null : PAIRING_MESSAGES.notAPair;
}
