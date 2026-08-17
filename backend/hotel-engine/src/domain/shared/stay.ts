import { invariant } from './errors.js';

/** A calendar date with no time and no zone. Hotel stays are local-date facts. */
export type IsoDate = `${number}-${number}-${number}`;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface StayDates {
  readonly checkIn: IsoDate;
  readonly checkOut: IsoDate;
  readonly nights: number;
}

export function isIsoDate(v: string): v is IsoDate {
  if (!ISO_DATE.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  // Rejects 2026-02-30, which Date.parse would otherwise roll forward.
  return new Date(t).toISOString().slice(0, 10) === v;
}

const dayNumber = (d: IsoDate): number =>
  Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

/**
 * Nights between two dates.
 *
 * The reference `calculateNights()` swallowed every bad input and returned 1,
 * so a malformed date silently produced a one-night price for a two-week stay.
 * Here an invalid range is a broken invariant: the API boundary rejects it
 * before the domain ever sees it.
 */
export function stayDates(checkIn: string, checkOut: string): StayDates {
  invariant(isIsoDate(checkIn), 'INVALID_CHECKIN', 'check-in must be YYYY-MM-DD', { checkIn });
  invariant(isIsoDate(checkOut), 'INVALID_CHECKOUT', 'check-out must be YYYY-MM-DD', { checkOut });
  const nights = dayNumber(checkOut) - dayNumber(checkIn);
  invariant(
    nights >= 1,
    'INVALID_STAY_RANGE',
    'check-out must be at least one night after check-in',
    { checkIn, checkOut, nights },
  );
  return { checkIn, checkOut, nights };
}
