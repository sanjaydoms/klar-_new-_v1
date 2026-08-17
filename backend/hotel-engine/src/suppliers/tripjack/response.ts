import type { CurrencyCode, SupplierHotelId } from '../../domain/shared/brand.js';
import { countryCode, supplierHotelId } from '../../domain/shared/brand.js';
import type { Money } from '../../domain/shared/money.js';
import { fromMajor, zero } from '../../domain/shared/money.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms, type CancellationWindow } from '../../domain/rate/cancellation.js';
import { occupancy, roomRequest, type Occupancy } from '../../domain/rate/occupancy.js';
import type { SupplierCost } from '../../domain/pricing/supplier-cost.js';
import { supplierCostFromTotal } from '../../domain/pricing/supplier-cost.js';
import type { PropertyType } from '../../domain/hotel/canonical-hotel.js';
import type { SupplierHotel, SupplierRate } from '../contract/dto.js';
import type { ImageResolver } from '../common/images.js';
import {
  asRecord,
  mapDefensively,
  readArray,
  readBoolean,
  readNumber,
  readRecord,
  readString,
  readStringList,
} from '../common/parse.js';
import { TRIPJACK } from './config.js';

/**
 * TripJack wire shapes → KLAR domain values.
 *
 * The output is `SupplierCost`. There is no markup here and no way to add one:
 * the mapper has no pricing context and returns a type that cannot hold a
 * customer price (ADR-0002).
 */

const PROPERTY_TYPES: ReadonlyArray<readonly [RegExp, PropertyType]> = [
  [/\b(resort)\b/i, 'RESORT'],
  [/\b(apartment|serviced|studio)\b/i, 'APARTMENT'],
  [/\b(villa|bungalow|cottage)\b/i, 'VILLA'],
  [/\b(hostel|dorm)\b/i, 'HOSTEL'],
  [/\b(guest\s*house|guesthouse)\b/i, 'GUESTHOUSE'],
  [/\b(b\s*&\s*b|bed\s*and\s*breakfast)\b/i, 'BNB'],
  [/\b(motel)\b/i, 'MOTEL'],
  [/\b(lodge)\b/i, 'LODGE'],
  [/\b(homestay)\b/i, 'HOMESTAY'],
  [/\b(camp|tent)\b/i, 'CAMP'],
  [/\b(hotel|palace|inn)\b/i, 'HOTEL'],
];

export function classifyPropertyType(...signals: (string | undefined)[]): PropertyType | undefined {
  const text = signals.filter(Boolean).join(' ');
  if (text.trim().length === 0) return undefined;
  for (const [pattern, type] of PROPERTY_TYPES) {
    if (pattern.test(text)) return type;
  }
  return undefined;
}

/**
 * TripJack's cancellation penalties. Field naming is inconsistent across
 * endpoints (`fromDate` on some, `from` on others), so both are read.
 */
function toCancellationWindows(penalties: unknown[], currency: CurrencyCode): CancellationWindow[] {
  const windows: CancellationWindow[] = [];
  for (const raw of penalties) {
    const from = readString(raw, 'fromDate', 'from', 'startDate');
    const amount = readNumber(raw, 'amount', 'penalty', 'charge');
    if (from === undefined) continue;
    windows.push({ from, penalty: amount === undefined ? zero(currency) : fromMajor(amount, currency) });
  }
  return windows;
}

/**
 * TripJack quotes `totalPrice` as the all-in figure, with `basePrice`, `taxes`,
 * `mf` and `mft` as its parts.
 *
 * The total is treated as authoritative and the base derived from it, rather
 * than trusting the parts to add up. They usually do; when they do not, the
 * total is what TripJack invoices and what the cancellation liability is
 * measured against, so a base that disagrees with it is the field to bend.
 * Trusting the parts instead would produce a `SupplierCost` whose own identity
 * assertion fails and take down the whole page.
 */
export function toSupplierCost(pricing: unknown, fallbackCurrency: CurrencyCode): SupplierCost | null {
  const currencyRaw = readString(pricing, 'currency');
  const currency = (currencyRaw?.toUpperCase() ?? fallbackCurrency) as CurrencyCode;

  const total = readNumber(pricing, 'totalPrice', 'tp', 'total');
  if (total === undefined || total <= 0) return null;

  const taxes = readNumber(pricing, 'taxes', 'tax') ?? 0;
  const managementFee = readNumber(pricing, 'mf') ?? 0;
  const managementFeeTax = readNumber(pricing, 'mft') ?? 0;
  const fees = managementFee + managementFeeTax;

  const totalMoney = fromMajor(total, currency);
  const taxMoney = fromMajor(Math.max(0, taxes), currency);
  const feeMoney = fromMajor(Math.max(0, fees), currency);

  // Guard the derivation: a payload whose taxes exceed its total is
  // inconsistent, and reporting the total with no split beats refusing to sell
  // the room.
  if (taxMoney.minor + feeMoney.minor > totalMoney.minor) {
    return supplierCostFromTotal({ total: totalMoney, taxesIncludedInBase: true });
  }

  return supplierCostFromTotal({
    total: totalMoney,
    taxes: taxMoney,
    fees: feeMoney,
    taxesIncludedInBase: false,
  });
}

/**
 * Cost of an option, wherever this endpoint happens to put the money.
 *
 * Listing and pricing nest it under `pricing`; review returns a flat `tp` on
 * the option itself. Both callers go through here so the two shapes cannot
 * drift apart — reading `option` where `option.pricing` was meant is exactly
 * how precheck came to report a perfectly good rate as unavailable.
 */
export function costFromOption(option: unknown, currency: CurrencyCode): SupplierCost | null {
  const pricing = readRecord(option, 'pricing');
  return toSupplierCost(Object.keys(pricing).length > 0 ? pricing : option, currency);
}

/** Occupancy a TripJack option is priced for, falling back to what we asked. */
function optionOccupancy(option: unknown, requested: Occupancy): Occupancy {
  const roomInfo = readArray(option, 'roomInfo');
  if (roomInfo.length === 0) return requested;

  const rooms = roomInfo.map((info) => {
    // No default. Occupancy is part of the equivalence class, so inventing an
    // adult count files the deal in the wrong comparability bucket and prices a
    // party we were never told about — the same mistake as defaulting the
    // traveller's nationality inside an adapter (A-5). If TripJack did not say,
    // the honest answer is what we asked for.
    const adults = readNumber(info, 'numberOfAdults', 'adults');
    if (adults === undefined) return null;

    const childAges = readArray(info, 'childAge')
      .map((a) => (typeof a === 'number' ? a : Number(a)))
      .filter((a) => Number.isFinite(a));
    const children = readNumber(info, 'numberOfChild', 'children') ?? childAges.length;
    // An age per child is required; if TripJack echoed a count without ages we
    // cannot honestly claim to know them, so fall back to the requested rooms.
    if (children !== childAges.length) return null;
    return roomRequest(adults, children, childAges);
  });

  return rooms.every((r) => r !== null) ? occupancy(rooms) : requested;
}

export function toSupplierRate(
  option: unknown,
  ctx: {
    currency: CurrencyCode;
    requestedOccupancy: Occupancy;
    correlationId: string;
    reviewHash?: string;
    hid: string;
  },
): SupplierRate | null {
  const cost = costFromOption(option, ctx.currency);
  if (cost === null) return null;

  const rateRef = readString(option, 'id', 'optionId');
  if (rateRef === undefined) return null;

  const cancellation = readRecord(option, 'cancellation');
  const explicit = readBoolean(cancellation, 'isRefundable');
  const windows = toCancellationWindows(readArray(cancellation, 'penalties'), cost.currency);

  const roomInfo = asRecord(readArray(option, 'roomInfo')[0]);
  const roomName = readString(roomInfo, 'name') ?? readString(option, 'roomName', 'name');
  const board = readString(roomInfo, 'mealBasis') ?? readString(option, 'mealBasis', 'boardName');

  const compliance = readRecord(option, 'compliance');
  const panRequired = readBoolean(compliance, 'panRequired') ?? false;
  const passportRequired = readBoolean(compliance, 'passportRequired') ?? false;
  const gstType = readString(compliance, 'gstType');

  const optionType = readString(option, 'optionType');
  // CRSM/CRCM are TripJack's bundles of differing rooms or meal plans sold as
  // one option. They are genuinely not one room category, and saying so keeps
  // them out of equivalence classes they do not belong in.
  const isMixed = optionType === 'CRSM' || optionType === 'CRCM';

  return {
    supplierRateRef: rateRef,
    room: room({
      name: isMixed ? 'Mixed rooms' : (roomName ?? 'Room'),
      ...(isMixed ? { category: 'MIXED' as const } : {}),
      ...(readString(roomInfo, 'id') !== undefined ? { code: readString(roomInfo, 'id') as string } : {}),
      ...(readString(roomInfo, 'bed_config') !== undefined
        ? { bedConfig: readString(roomInfo, 'bed_config') as string }
        : {}),
    }),
    board: classifyBoard(board),
    occupancy: optionOccupancy(option, ctx.requestedOccupancy),
    cancellation: deriveCancellationTerms({
      ...(explicit !== undefined ? { explicit } : {}),
      windows,
    }),
    cost,
    onHoldAllowed: readBoolean(option, 'onHoldAllowed') ?? readBoolean(cancellation, 'onHoldAllowed') ?? false,
    ...(readNumber(option, 'allotment', 'availableRooms') !== undefined
      ? { allotment: readNumber(option, 'allotment', 'availableRooms') as number }
      : {}),
    ...(panRequired || passportRequired || gstType !== undefined
      ? { compliance: { panRequired, passportRequired, ...(gstType !== undefined ? { gstType } : {}) } }
      : {}),
    // Everything Review and Book will need, sealed into the rate token. None of
    // it is ever serialised to a client.
    supplierState: {
      correlationId: ctx.correlationId,
      hid: ctx.hid,
      optionId: rateRef,
      ...(ctx.reviewHash !== undefined ? { reviewHash: ctx.reviewHash } : {}),
    },
  };
}

/**
 * A star rating, only when it plausibly is one.
 *
 * `rating` is not necessarily a star count — a review score of 8.5 lives in the
 * same field shape, and unbounded it would travel into the star facet as a
 * "9-star" bucket, into the star filter, and into the matcher's `STAR_RATING`
 * signal, where an 8.5 can never sit within one of a real 5. RateGain's reader
 * already bounds its own; this brings TripJack into line.
 */
function starRatingOf(raw: unknown): number | undefined {
  const value = readNumber(raw, 'rating', 'starRating', 'star_rating');
  return value !== undefined && value >= 1 && value <= 5 ? value : undefined;
}

export function toSupplierHotel(
  raw: unknown,
  ctx: {
    currency: CurrencyCode;
    requestedOccupancy: Occupancy;
    correlationId: string;
    images: ImageResolver;
    /** Called for an option that could not be mapped, so it is not lost silently. */
    onSkippedRate?: (error: unknown, index: number) => void;
  },
): SupplierHotel | null {
  const id = readString(raw, 'tjHotelId', 'hotelId', 'id', 'hid');
  const name = readString(raw, 'name', 'hotelName');
  if (id === undefined || name === undefined) return null;

  // One unmappable option is one option. Mapping the list with a bare `.map`
  // let a single malformed price throw out of the whole hotel, losing every
  // other rate on a property that was otherwise perfectly bookable.
  const rates = mapDefensively(
    readArray(raw, 'options'),
    (option) =>
      toSupplierRate(option, {
        currency: ctx.currency,
        requestedOccupancy: ctx.requestedOccupancy,
        correlationId: ctx.correlationId,
        hid: id,
      }),
    ctx.onSkippedRate,
  );

  const accType = readString(raw, 'accTypeDesc');
  const accMulti = readString(raw, 'accMultiDesc');
  const accomodation = readString(raw, 'accomodationType');
  const propertyType = classifyPropertyType(accType, accMulti, accomodation, name);

  const lat = readNumber(raw, 'latitude', 'lat');
  const lng = readNumber(raw, 'longitude', 'lng', 'long');
  const country = readString(raw, 'country', 'countryName');
  const star = starRatingOf(raw);

  const rawImages = asRecord(raw)['images'] ?? asRecord(raw)['img'];

  return {
    supplier: TRIPJACK,
    supplierHotelId: supplierHotelId(id),
    name,
    ...(readString(raw, 'address') !== undefined ? { address: readString(raw, 'address') as string } : {}),
    ...(readString(raw, 'city') !== undefined ? { city: readString(raw, 'city') as string } : {}),
    // Only an ISO-2 code is a country code. A country *name* is a display
    // string and belongs to the matcher, not here.
    ...(country !== undefined && country.length === 2 ? { countryCode: countryCode(country) } : {}),
    ...(lat !== undefined && lng !== undefined ? { location: { lat, lng } } : {}),
    ...(star !== undefined ? { starRating: star } : {}),
    ...(propertyType !== undefined ? { propertyType } : {}),
    imageUrls: ctx.images(rawImages),
    // Only what TripJack reported. Nothing is synthesised from star rating or
    // from the hotel's name (D-18) — an amenity we invented would go on to
    // drive the amenity filter.
    amenityLabels: readStringList(asRecord(raw)['amenities']),
    rates,
  };
}

/** TripJack signals a hotel with no availability by returning it with no options. */
export const hasBookableRates = (hotel: SupplierHotel): boolean => hotel.rates.length > 0;

export interface TjStaticDetail {
  readonly name?: string;
  readonly description?: string;
  readonly address?: string;
  readonly city?: string;
  readonly starRating?: number;
  readonly location?: { readonly lat: number; readonly lng: number };
  readonly imageUrls: readonly string[];
  readonly amenityLabels: readonly string[];
  readonly checkInTime?: string;
  readonly checkOutTime?: string;
  readonly policies: readonly string[];
}

export function toStaticDetail(raw: unknown, images: ImageResolver): TjStaticDetail {
  const locale = readRecord(raw, 'locale');
  const address = readRecord(locale, 'address');
  const coords = readRecord(locale, 'coordinates');
  const hotelInfo = readRecord(raw, 'hotelInfo');

  const lat = readNumber(coords, 'lat', 'latitude');
  const lng = readNumber(coords, 'long', 'lng', 'longitude');
  const star = readNumber(raw, 'star_rating', 'starRating');

  return {
    ...(readString(raw, 'name') !== undefined ? { name: readString(raw, 'name') as string } : {}),
    ...(readString(readRecord(raw, 'descriptions'), 'default') !== undefined
      ? { description: readString(readRecord(raw, 'descriptions'), 'default') as string }
      : {}),
    ...(readString(address, 'fulladdr', 'address') !== undefined
      ? { address: readString(address, 'fulladdr', 'address') as string }
      : {}),
    ...(readString(address, 'city') !== undefined ? { city: readString(address, 'city') as string } : {}),
    ...(star !== undefined ? { starRating: star } : {}),
    ...(lat !== undefined && lng !== undefined ? { location: { lat, lng } } : {}),
    imageUrls: images(asRecord(raw)['images']),
    amenityLabels: readStringList(asRecord(raw)['amenities']),
    ...(readString(hotelInfo, 'checkInTime', 'checkIn') !== undefined
      ? { checkInTime: readString(hotelInfo, 'checkInTime', 'checkIn') as string }
      : {}),
    ...(readString(hotelInfo, 'checkOutTime', 'checkOut') !== undefined
      ? { checkOutTime: readString(hotelInfo, 'checkOutTime', 'checkOut') as string }
      : {}),
    policies: readStringList(asRecord(raw)['policies'] ?? asRecord(hotelInfo)['policies']),
  };
}

/** TripJack reports its own failures inside a 200 response. */
export function tjReportedFailure(body: unknown): string | null {
  const status = readRecord(body, 'status');
  const success = readBoolean(status, 'success');
  if (success === false) {
    const errors = readArray(body, 'errors');
    const first = readString(errors[0], 'message', 'description');
    return first ?? readString(status, 'description') ?? 'TripJack reported failure';
  }
  return null;
}

export const asSupplierHotelId = (v: string): SupplierHotelId => supplierHotelId(v);

/** Money helper shared with the adapter's book/cancel paths. */
export const tjMoney = (amount: number, currency: CurrencyCode): Money =>
  fromMajor(amount, currency);
