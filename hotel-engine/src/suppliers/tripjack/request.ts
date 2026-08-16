import type { CountryCode } from '../../domain/shared/brand.js';
import type { StayDates } from '../../domain/shared/stay.js';
import type { Occupancy } from '../../domain/rate/occupancy.js';
import type { SupplierGuest } from '../contract/dto.js';
import type { RoomParty } from '../contract/guests.js';

/**
 * KLAR request shapes → TripJack wire shapes.
 *
 * Kept apart from response mapping and from transport so each can be read and
 * tested on its own. In the reference, one 622-line provider held payload
 * construction, HTTP, response mapping, pricing, static-detail merging and
 * image resolution together.
 */

export interface TjRoom {
  readonly adults: number;
  readonly children: number;
  readonly childAge?: readonly number[];
}

/**
 * TripJack prices children by age, so an occupancy with a child and no age is a
 * different (and wrong) quote. `roomRequest()` already refuses to construct
 * that, so by here the ages are guaranteed present.
 */
export function toTjRooms(occupancy: Occupancy): TjRoom[] {
  return occupancy.rooms.map((r) => ({
    adults: r.adults,
    children: r.children,
    ...(r.childAges.length > 0 ? { childAge: [...r.childAges] } : {}),
  }));
}

export interface TjListingRequest {
  readonly checkIn: string;
  readonly checkOut: string;
  readonly rooms: readonly TjRoom[];
  readonly currency: string;
  readonly nationality: string;
  readonly hids: readonly number[];
  readonly correlationId: string;
}

export function buildListingRequest(input: {
  stay: StayDates;
  occupancy: Occupancy;
  currency: string;
  nationalityId: string;
  hids: readonly string[];
  correlationId: string;
}): TjListingRequest {
  return {
    checkIn: input.stay.checkIn,
    checkOut: input.stay.checkOut,
    rooms: toTjRooms(input.occupancy),
    currency: input.currency,
    nationality: input.nationalityId,
    // Non-numeric ids are dropped rather than sent as NaN, which TripJack
    // answers with a 400 for the whole call — one bad id would lose the page.
    hids: input.hids
      .map((id) => Number.parseInt(id, 10))
      .filter((n) => Number.isSafeInteger(n)),
    correlationId: input.correlationId,
  };
}

export interface TjPricingRequest {
  readonly correlationId: string;
  readonly hid: number | string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly rooms: readonly TjRoom[];
  readonly currency: string;
  readonly nationality: string;
}

export function buildPricingRequest(input: {
  hid: string;
  stay: StayDates;
  occupancy: Occupancy;
  currency: string;
  nationalityId: string;
  correlationId: string;
}): TjPricingRequest {
  const numeric = Number.parseInt(input.hid, 10);
  return {
    correlationId: input.correlationId,
    hid: Number.isSafeInteger(numeric) ? numeric : input.hid,
    checkIn: input.stay.checkIn,
    checkOut: input.stay.checkOut,
    rooms: toTjRooms(input.occupancy),
    currency: input.currency,
    nationality: input.nationalityId,
  };
}

export interface TjReviewRequest {
  readonly correlationId?: string;
  readonly optionId: string;
  readonly reviewHash?: string;
  readonly hid?: number | string;
}

/**
 * Review is TripJack's precheck: it re-prices an option and issues the
 * `bookingId` that Book consumes. The session values it needs — correlation id,
 * review hash — travel in the sealed rate token, never through the client.
 */
export function buildReviewRequest(input: {
  supplierRateRef: string;
  supplierState: Readonly<Record<string, unknown>>;
}): TjReviewRequest {
  const state = input.supplierState;
  const correlationId = typeof state['correlationId'] === 'string' ? state['correlationId'] : undefined;
  const reviewHash = typeof state['reviewHash'] === 'string' ? state['reviewHash'] : undefined;
  const hid = typeof state['hid'] === 'string' ? state['hid'] : undefined;

  return {
    optionId: input.supplierRateRef,
    ...(correlationId !== undefined ? { correlationId } : {}),
    ...(reviewHash !== undefined ? { reviewHash } : {}),
    ...(hid !== undefined ? { hid } : {}),
  };
}

export interface TjTraveller {
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly isLeadPax: boolean;
  readonly paxType: 'ADULT' | 'CHILD';
  readonly age?: number;
}

export interface TjBookRequest {
  readonly bookingId: string;
  readonly type: 'HOTEL';
  readonly roomTravellerInfo: ReadonlyArray<{ readonly travellerInfo: readonly TjTraveller[] }>;
  readonly deliveryInfo: {
    readonly emails: readonly string[];
    readonly contacts: readonly string[];
  };
}

/**
 * Guests are grouped per room in the order the rooms were requested. TripJack
 * rejects a booking whose traveller groups do not line up with the occupancy it
 * priced.
 *
 * The party arrives already allocated (`allocateGuests`), so nothing here can
 * pad a short guest list with a traveller called "Guest".
 */
export function buildBookRequest(input: {
  bookingId: string;
  rooms: readonly RoomParty[];
  lead: SupplierGuest;
}): TjBookRequest {
  const roomTravellerInfo = input.rooms.map((room) => ({
    travellerInfo: [
      ...room.adults.map(
        (guest): TjTraveller => ({
          title: 'Mr',
          firstName: guest.firstName,
          lastName: guest.lastName,
          isLeadPax: guest.isPrimary,
          paxType: 'ADULT',
        }),
      ),
      ...room.children.map(
        (guest): TjTraveller => ({
          title: 'Mstr',
          firstName: guest.firstName,
          lastName: guest.lastName,
          isLeadPax: false,
          paxType: 'CHILD',
          age: guest.age,
        }),
      ),
    ],
  }));

  const lead = input.lead;
  return {
    bookingId: input.bookingId,
    type: 'HOTEL',
    roomTravellerInfo,
    deliveryInfo: {
      emails: lead.email !== undefined ? [lead.email] : [],
      contacts: lead.phone !== undefined ? [lead.phone] : [],
    },
  };
}

/**
 * TripJack takes a nationality id, not an ISO code, and the mapping comes from
 * its own `/nationality-info`. Resolving it is the composition root's job — an
 * adapter that fetched and cached a lookup table mid-mapping is how the
 * reference ended up with I/O buried inside its pricing path.
 */
export type NationalityResolver = (country: CountryCode) => Promise<string>;
