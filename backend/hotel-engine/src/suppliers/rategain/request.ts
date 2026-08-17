import type { CountryCode } from '../../domain/shared/brand.js';
import type { StayDates } from '../../domain/shared/stay.js';
import type { Occupancy } from '../../domain/rate/occupancy.js';
import type { SupplierSearchTarget } from '../contract/dto.js';
import type { RoomParty } from '../contract/guests.js';

/**
 * KLAR request shapes → RateGain wire shapes.
 *
 * RateGain's casing is inconsistent across endpoints — `Rooms`/`rooms`,
 * `Echotoken`/`echoToken`, `propertyID`/`PropertyId` — and the reference coped
 * by accepting every spelling on the way in and guessing on the way out. Here
 * each endpoint has one builder that emits exactly the spelling that endpoint
 * documents.
 */

export interface RgPax {
  readonly type: 'Child';
  readonly age: number;
}

export interface RgRoom {
  readonly NumberOfRoom: number;
  readonly Adults: number;
  readonly Children: number;
  readonly paxes: readonly RgPax[];
}

/**
 * One entry per requested room.
 *
 * Child ages are always sent. The reference defaulted a missing age to 5, which
 * quietly quoted a five-year-old's rate for a fifteen-year-old and produced a
 * price the hotel would not honour at check-in. `roomRequest()` makes a missing
 * age unrepresentable, so there is nothing to default here.
 */
export function toRgRooms(occupancy: Occupancy): RgRoom[] {
  return occupancy.rooms.map((r) => ({
    NumberOfRoom: 1,
    Adults: r.adults,
    Children: r.children,
    paxes: r.childAges.map((age) => ({ type: 'Child' as const, age })),
  }));
}

export interface RgBestPropertiesRequest {
  readonly checkin: string;
  readonly checkout: string;
  readonly CountryCode: string;
  readonly Currency: string;
  readonly Rooms: readonly RgRoom[];
  readonly Echotoken: string;
  readonly pageNo: number;
  readonly destinationCode?: string;
  readonly PropertyId?: string;
  readonly Geofilter?: {
    readonly latitude: string;
    readonly longitude: string;
    readonly radius: number;
  };
}

export function buildBestPropertiesRequest(input: {
  target: SupplierSearchTarget;
  stay: StayDates;
  occupancy: Occupancy;
  nationality: CountryCode;
  currency: string;
  pageNo: number;
  echoToken: string;
  minRadiusKm: number;
  maxRadiusKm: number;
}): RgBestPropertiesRequest | null {
  const common = {
    checkin: input.stay.checkIn,
    checkout: input.stay.checkOut,
    CountryCode: String(input.nationality),
    Currency: input.currency,
    Rooms: toRgRooms(input.occupancy),
    Echotoken: input.echoToken,
    pageNo: input.pageNo,
  };

  switch (input.target.kind) {
    case 'DEST_CODE':
      return { ...common, destinationCode: input.target.code };
    case 'GEO':
      return {
        ...common,
        Geofilter: {
          latitude: input.target.centre.lat.toFixed(6),
          longitude: input.target.centre.lng.toFixed(6),
          // Spec: radius is km, min 5, max 200. Sending 2 or 500 is rejected,
          // and a rejected page is a supplier missing from the comparison.
          radius: Math.min(
            input.maxRadiusKm,
            Math.max(input.minRadiusKm, Math.round(input.target.radiusKm)),
          ),
        },
      };
    case 'SINGLE_HOTEL':
      return { ...common, PropertyId: String(input.target.id) };
    // `PropertyId` accepts a comma-separated list, so an id-list search is a
    // first-class target rather than something to refuse.
    case 'HOTEL_IDS':
      return input.target.ids.length === 0
        ? null
        : { ...common, PropertyId: input.target.ids.map(String).join(',') };
    default:
      return null;
  }
}

export interface RgGetProductsRequest {
  readonly propertyID: string;
  readonly checkin: string;
  readonly checkout: string;
  readonly CountryCode: string;
  readonly Currency: string;
  readonly Rooms: readonly RgRoom[];
  readonly echoToken: string;
  readonly PropertyCode?: string;
  readonly BrandCode?: string;
  readonly destinationCode?: string;
}

export function buildGetProductsRequest(input: {
  propertyId: string;
  stay: StayDates;
  occupancy: Occupancy;
  nationality: CountryCode;
  currency: string;
  echoToken: string;
  supplierState?: Readonly<Record<string, unknown>>;
}): RgGetProductsRequest {
  const state = input.supplierState ?? {};
  const propertyCode = typeof state['propertyCode'] === 'string' ? state['propertyCode'] : undefined;
  const brandCode = typeof state['brandCode'] === 'string' ? state['brandCode'] : undefined;
  const destinationCode =
    typeof state['destinationCode'] === 'string' ? state['destinationCode'] : undefined;

  return {
    propertyID: input.propertyId,
    checkin: input.stay.checkIn,
    checkout: input.stay.checkOut,
    CountryCode: String(input.nationality),
    Currency: input.currency,
    Rooms: toRgRooms(input.occupancy),
    echoToken: input.echoToken,
    ...(propertyCode !== undefined ? { PropertyCode: propertyCode } : {}),
    ...(brandCode !== undefined ? { BrandCode: brandCode } : {}),
    ...(destinationCode !== undefined ? { destinationCode } : {}),
  };
}

export interface RgGuest {
  readonly FirstName: string;
  readonly LastName: string;
  readonly Primary: boolean;
  readonly Email: string;
  readonly Phone: string;
  readonly EmailType: number;
  readonly ProfileType: number;
  readonly CountryCode?: string;
  readonly PostalCode?: string;
}

export interface RgRoomSelection {
  readonly RoomTypeCode: string;
  readonly RoomSelectionKey: string;
  readonly NumberOfRooms: number;
  readonly NumberOfAdults: number;
  readonly NumberOfChild: number;
  readonly RoomRate: number;
  readonly BoardName?: string;
  /** Required at precheck and commit whenever getproducts returned one. */
  readonly allocationDetails?: string;
  readonly Guest: readonly RgGuest[];
  readonly Children?: ReadonlyArray<{ readonly type: 'Child'; readonly age: number }>;
  readonly SpecialRequest?: string;
}

export interface RgReservationRequest {
  readonly BookReservation: {
    readonly ResStatus: number;
    readonly DemandBookingId?: string;
    readonly TimeStamp: string;
    readonly ReservationDate: string;
    readonly CurrencyCode: string;
    readonly Currency: string;
    readonly CountryCode: string;
    readonly checkin: string;
    readonly checkout: string;
    readonly propertyID: string;
    readonly PropertyCode?: string;
    readonly BrandCode?: string;
    readonly EchoToken: string;
    readonly Session: string;
    /** Spec: the `totalNet` the precheck confirmed. */
    readonly BookingRate: number;
    /** Spec 1.5.3: the MSP from precheck, for B2C net and commissionable models. */
    readonly SellingRate?: number;
    readonly RoomSelection: readonly RgRoomSelection[];
  };
}

/**
 * RateGain's `BookReservation` envelope — built here, on the server.
 *
 * The reference had the *browser* assemble this: `ResStatus`, `DemandBookingId`,
 * `EchoToken`, `RoomSelectionKey`, `Guest[].ProfileType`, and `RoomRate` as
 * price-per-room-per-night. Supplier protocol in the client is why adding a
 * third supplier would have meant a frontend release (D-10). The client now
 * sends a `dealId` and learns nothing about who sells the room.
 *
 * `RoomRate` is per room per night, per RateGain's spec — not the stay total.
 * Sending the total here is a silent overcharge at the hotel's end.
 */
/**
 * Reservation status. Spec: 1 = Confirmed, 9 = Pending. PreCheckReservation and
 * CommitReservation share this envelope and both send 1 on the happy path.
 */
export const RG_RES_STATUS_CONFIRMED = 1;

export function buildReservationRequest(input: {
  propertyId: string;
  rateRef: string;
  stay: StayDates;
  /** Already allocated per room by `allocateGuests`, lead guest first. */
  rooms: readonly RoomParty[];
  nationality: CountryCode;
  currency: string;
  /** The `totalNet` the precheck confirmed, in major units. */
  bookingRateMajor: number;
  /** MSP from precheck. Spec 1.5.3 wants it echoed back on commit. */
  sellingRateMajor?: number;
  roomTypeCode?: string;
  boardName?: string;
  allocationDetails?: string;
  propertyCode?: string;
  brandCode?: string;
  demandBookingId?: string;
  echoToken: string;
  session: string;
  timestamp: string;
  resStatus: number;
  specialRequests?: readonly string[];
}): RgReservationRequest {
  const alphanumeric = (s: string): string => s.replace(/[^a-zA-Z0-9]/g, '');

  const roomSelection: RgRoomSelection[] = input.rooms.map((r, roomIdx) => {
    // `Primary` follows the guest the caller marked, not the array position.
    // Deciding it positionally made RateGain and TripJack put different names
    // on the same booking whenever the lead guest was not listed first.
    const guests: RgGuest[] = r.adults.map((g) => ({
      FirstName: alphanumeric(g.firstName) || 'Guest',
      LastName: alphanumeric(g.lastName) || 'Guest',
      Primary: g.isPrimary,
      Email: g.email ?? '',
      Phone: g.phone ?? '',
      EmailType: 1,
      ProfileType: 1,
      ...(g.countryCode !== undefined ? { CountryCode: String(g.countryCode) } : {}),
      ...(g.postalCode !== undefined ? { PostalCode: g.postalCode } : {}),
    }));

    return {
      RoomTypeCode: input.roomTypeCode ?? '',
      RoomSelectionKey: input.rateRef,
      NumberOfRooms: 1,
      NumberOfAdults: r.adults.length,
      NumberOfChild: r.children.length,
      // Spec: "Price per room per night". Sending the stay total here is a
      // silent overcharge at the hotel's end.
      RoomRate:
        Math.round((input.bookingRateMajor / input.rooms.length / input.stay.nights) * 100) / 100,
      ...(input.boardName !== undefined ? { BoardName: input.boardName } : {}),
      ...(input.allocationDetails !== undefined
        ? { allocationDetails: input.allocationDetails }
        : {}),
      Guest: guests,
      ...(r.children.length > 0
        ? { Children: r.children.map((c) => ({ type: 'Child' as const, age: c.age })) }
        : {}),
      ...(roomIdx === 0 && input.specialRequests !== undefined && input.specialRequests.length > 0
        ? { SpecialRequest: input.specialRequests.join(',') }
        : {}),
    };
  });

  return {
    BookReservation: {
      ResStatus: input.resStatus,
      ...(input.demandBookingId !== undefined
        ? { DemandBookingId: input.demandBookingId }
        : {}),
      TimeStamp: input.timestamp,
      ReservationDate: input.timestamp,
      CurrencyCode: input.currency,
      Currency: input.currency,
      CountryCode: String(input.nationality),
      checkin: input.stay.checkIn,
      checkout: input.stay.checkOut,
      propertyID: input.propertyId,
      ...(input.propertyCode !== undefined ? { PropertyCode: input.propertyCode } : {}),
      ...(input.brandCode !== undefined ? { BrandCode: input.brandCode } : {}),
      EchoToken: input.echoToken,
      Session: input.session,
      BookingRate: input.bookingRateMajor,
      ...(input.sellingRateMajor !== undefined ? { SellingRate: input.sellingRateMajor } : {}),
      RoomSelection: roomSelection,
    },
  };
}

/** Spec §8: cancel requires the reservation id and the property identifiers. */
export function buildCancelRequest(input: {
  confirmationNumber: string;
  reservationId?: string;
  propertyId?: string;
  propertyCode?: string;
  demandCancelId: string;
  echoToken: string;
  timestamp: string;
}): RgCancelRequest {
  return {
    ConfirmationNumber: input.confirmationNumber,
    ...(input.reservationId !== undefined ? { ReservationId: input.reservationId } : {}),
    ...(input.propertyId !== undefined ? { PropertyId: input.propertyId } : {}),
    ...(input.propertyCode !== undefined ? { PropertyCode: input.propertyCode } : {}),
    DemandCancelId: input.demandCancelId,
    EchoToken: input.echoToken,
    TimeStamp: input.timestamp,
  };
}

export interface RgCancelRequest {
  readonly ConfirmationNumber: string;
  readonly ReservationId?: string;
  readonly PropertyId?: string;
  readonly PropertyCode?: string;
  readonly DemandCancelId: string;
  readonly EchoToken: string;
  readonly TimeStamp: string;
}
