import { invariant } from '../shared/errors.js';

export interface RoomRequest {
  readonly adults: number;
  readonly children: number;
  /** One age per child. Length must equal `children`. */
  readonly childAges: readonly number[];
}

export interface Occupancy {
  readonly rooms: readonly RoomRequest[];
}

export function roomRequest(
  adults: number,
  children = 0,
  childAges: readonly number[] = [],
): RoomRequest {
  invariant(
    Number.isSafeInteger(adults) && adults >= 1,
    'OCCUPANCY_NO_ADULTS',
    'Every room needs at least one adult',
    { adults },
  );
  invariant(
    Number.isSafeInteger(children) && children >= 0,
    'OCCUPANCY_BAD_CHILDREN',
    'Child count must be a non-negative integer',
    { children },
  );
  invariant(
    childAges.length === children,
    'OCCUPANCY_AGE_COUNT',
    'One age must be supplied per child — suppliers price by age, and a missing age changes the rate',
    { children, ages: childAges.length },
  );
  invariant(
    childAges.every((a) => Number.isSafeInteger(a) && a >= 0 && a <= 17),
    'OCCUPANCY_BAD_AGE',
    'Child ages must be whole numbers between 0 and 17',
    { childAges },
  );
  return { adults, children, childAges: [...childAges] };
}

export function occupancy(rooms: readonly RoomRequest[]): Occupancy {
  invariant(
    rooms.length >= 1,
    'OCCUPANCY_NO_ROOMS',
    'A search must request at least one room',
    { rooms: rooms.length },
  );
  return { rooms: [...rooms] };
}

export const totalRooms = (o: Occupancy): number => o.rooms.length;
export const totalAdults = (o: Occupancy): number =>
  o.rooms.reduce((n, r) => n + r.adults, 0);
export const totalChildren = (o: Occupancy): number =>
  o.rooms.reduce((n, r) => n + r.children, 0);

/**
 * A stable, order-insensitive signature.
 *
 * Two things depend on it: the dynamic cache key, and the equivalence class.
 * Child ages are part of it because they change the price — the reference
 * implementation's cache key did include them, and that was one of the things
 * it got right.
 *
 * Rooms are sorted so that `[2 adults, 1 adult]` and `[1 adult, 2 adults]`
 * produce one cache entry rather than two.
 */
export function occupancySignature(o: Occupancy): string {
  return o.rooms
    .map((r) => `${r.adults}a${r.children}c${[...r.childAges].sort((x, y) => x - y).join('.')}`)
    .sort()
    .join('|');
}
