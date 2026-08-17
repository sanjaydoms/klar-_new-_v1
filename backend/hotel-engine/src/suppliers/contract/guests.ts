import type { Occupancy } from '../../domain/rate/occupancy.js';
import type { SupplierGuest } from './dto.js';

/**
 * Who sleeps in which room, decided once for every supplier.
 *
 * Both adapters were reaching into a flat guest array with a positional cursor
 * and filling any gap with `'Guest'`. Two things went wrong with that, and
 * neither is visible from inside one adapter:
 *
 *  1. **A short guest list booked anyway.** A party priced for four adults and
 *     sent with two produced a reservation whose third and fourth travellers
 *     were named "Guest Guest" — a real booking, at a real hotel, for people
 *     with no names. The same silent-default-on-a-required-field as A-5 and
 *     C-5, at the one step that cannot be undone by searching again.
 *
 *  2. **The two suppliers disagreed about who the booking was under.** TripJack
 *     read `isPrimary` off each guest; RateGain assigned it positionally to
 *     whoever happened to be first. Hand both the same party in a different
 *     order and the voucher, the hotel's guest list and the invoice name
 *     different people.
 *
 * So the allocation is computed here and refused here. An adapter's job is to
 * express a party in its supplier's wire format, not to decide what the party
 * is.
 */
export interface RoomParty {
  /** Lead first for room 0, so a supplier that reads position agrees with one that reads a flag. */
  readonly adults: readonly SupplierGuest[];
  readonly children: readonly SupplierGuestWithAge[];
}

/** A child whose age is known — either given, or taken from what was priced. */
export type SupplierGuestWithAge = SupplierGuest & { readonly age: number };

export type GuestAllocation =
  | { readonly ok: true; readonly rooms: readonly RoomParty[]; readonly lead: SupplierGuest }
  | { readonly ok: false; readonly reason: string };

export function allocateGuests(
  occupancy: Occupancy,
  guests: readonly SupplierGuest[],
): GuestAllocation {
  const adults = guests.filter((g) => !g.isChild);
  const children = guests.filter((g) => g.isChild);

  const adultsNeeded = occupancy.rooms.reduce((n, r) => n + r.adults, 0);
  const childrenNeeded = occupancy.rooms.reduce((n, r) => n + r.children, 0);

  if (adults.length !== adultsNeeded) {
    return {
      ok: false,
      reason: `the rate was priced for ${adultsNeeded} adult(s) and ${adults.length} were supplied`,
    };
  }
  if (children.length !== childrenNeeded) {
    return {
      ok: false,
      reason: `the rate was priced for ${childrenNeeded} child(ren) and ${children.length} were supplied`,
    };
  }

  const leads = adults.filter((g) => g.isPrimary);
  if (leads.length !== 1) {
    // Not defaulted to the first: the lead guest is who the hotel holds the
    // room for and who the invoice is addressed to. A caller that did not say
    // has not decided, and guessing makes the two suppliers disagree.
    return {
      ok: false,
      reason: `exactly one guest must be the primary guest; ${leads.length} were marked`,
    };
  }
  const lead = leads[0] as SupplierGuest;
  const followers = adults.filter((g) => g !== lead);

  const ordered = [lead, ...followers];
  let adultCursor = 0;
  let childCursor = 0;
  const rooms: RoomParty[] = [];

  for (const room of occupancy.rooms) {
    const roomAdults = ordered.slice(adultCursor, adultCursor + room.adults);
    adultCursor += room.adults;

    const roomChildren: SupplierGuestWithAge[] = [];
    for (let i = 0; i < room.children; i++) {
      const child = children[childCursor] as SupplierGuest;
      childCursor += 1;
      // A child's age is part of what was priced, so an absent one falls back
      // to the age the search asked for rather than to a number we invented.
      const age = child.age ?? room.childAges[i];
      if (age === undefined) {
        return { ok: false, reason: 'a child guest has no age, and none was priced for that slot' };
      }
      roomChildren.push({ ...child, age });
    }

    rooms.push({ adults: roomAdults, children: roomChildren });
  }

  return { ok: true, rooms, lead };
}

/**
 * Guest-shaped placeholders for an envelope that needs slots before there are
 * guests.
 *
 * RateGain's `PreCheckReservation` shares its shape with `CommitReservation`
 * and is sent long before anyone has typed a name. That is the one legitimate
 * use for an anonymous traveller, and it gets its own function so it cannot be
 * reached by accident from a commit: a placeholder is correct when re-pricing
 * and is a person who does not exist when booking.
 */
export function placeholderParty(occupancy: Occupancy): readonly RoomParty[] {
  return occupancy.rooms.map((room, roomIdx) => ({
    adults: Array.from({ length: room.adults }, (_, i) => ({
      firstName: 'Guest',
      lastName: 'Guest',
      isPrimary: roomIdx === 0 && i === 0,
      isChild: false,
    })),
    children: room.childAges.map((age) => ({
      firstName: 'Guest',
      lastName: 'Guest',
      isPrimary: false,
      isChild: true,
      age,
    })),
  }));
}
