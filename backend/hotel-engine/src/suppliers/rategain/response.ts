import type { CurrencyCode } from '../../domain/shared/brand.js';
import { countryCode, supplierHotelId } from '../../domain/shared/brand.js';
import { fromMajor, toMajor, zero } from '../../domain/shared/money.js';
import type { Money } from '../../domain/shared/money.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms, type CancellationWindow } from '../../domain/rate/cancellation.js';
import type { Occupancy } from '../../domain/rate/occupancy.js';
import type { SupplierCost } from '../../domain/pricing/supplier-cost.js';
import { supplierCost } from '../../domain/pricing/supplier-cost.js';
import type { MinimumSellingPrice } from '../../domain/pricing/customer-price.js';
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
import { classifyPropertyType } from '../tripjack/response.js';
import { RATEGAIN } from './config.js';

/**
 * RateGain wire shapes → KLAR domain values. Cost only; never a price.
 *
 * Field semantics here follow the Smart Distribution API Specification v1.5.3
 * (23 Jan 2026). Where the spec and the previous reverse-engineered
 * implementation disagreed, the spec wins — several of those disagreements were
 * money bugs.
 */

// ── Taxes and fees ──────────────────────────────────────────────────────────

/**
 * Split a tax or fee list into what is already inside the quoted price and what
 * is charged on top.
 *
 * Spec, `taxes[].included` and `Fees[].Included`: **true = included in total
 * price, false = NOT included in total price**. The distinction is money: a
 * resort fee of 20 and a cleaning fee of 50 marked `Included: false` are
 * payable on top of `totalPrice`, and quoting the total alone leaves the
 * customer 70 short of what they will be asked for.
 *
 * Only entries in the requested currency are counted. RateGain repeats the same
 * tax in the hotel's local currency and the client's — the sample response
 * carries USD 10.00 and EUR 12.00 for one tax — so summing every entry
 * double-counts it.
 */
export interface AmountSplit {
  readonly includedMajor: number;
  readonly excludedMajor: number;
}

const EMPTY_SPLIT: AmountSplit = { includedMajor: 0, excludedMajor: 0 };

export function readTaxSplit(raw: unknown, currency: CurrencyCode): AmountSplit {
  // Some endpoints send a bare number or numeric string instead of the object.
  if (typeof raw === 'number') return { includedMajor: 0, excludedMajor: raw };
  if (typeof raw === 'string') {
    const parsed = Number(raw.replace(/,/g, ''));
    return Number.isFinite(parsed) ? { includedMajor: 0, excludedMajor: parsed } : EMPTY_SPLIT;
  }

  // Two shapes, both live: `{ allIncluded, taxes: [...] }` on products and
  // precheck, and the bare array one level shallower elsewhere. Reading only
  // the nested form made an unrecognised shape look like a rate with no tax on
  // it, which under-quotes by the whole excluded amount rather than failing —
  // the silent direction, and the one this rebuild exists to eliminate.
  const entries = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw)['taxes']) ? readArray(raw, 'taxes') : [];
  if (entries.length === 0) return EMPTY_SPLIT;

  const allIncluded = readBoolean(raw, 'allIncluded') ?? false;
  let included = 0;
  let excluded = 0;

  for (const entry of entries) {
    const entryCurrency = readString(entry, 'clientCurrency', 'currency');
    if (entryCurrency !== undefined && entryCurrency.toUpperCase() !== currency) continue;

    const amount = readNumber(entry, 'clientAmount', 'amount');
    if (amount === undefined) continue;

    if (readBoolean(entry, 'included') ?? allIncluded) included += amount;
    else excluded += amount;
  }

  return { includedMajor: included, excludedMajor: excluded };
}

/** `Fees[]` — resort fees, cleaning fees. Same included/excluded semantics. */
export function readFeeSplit(raw: unknown, currency: CurrencyCode): AmountSplit {
  const entries = Array.isArray(raw) ? raw : [];
  let included = 0;
  let excluded = 0;

  for (const entry of entries) {
    const entryCurrency = readString(entry, 'Currency', 'currency');
    if (entryCurrency !== undefined && entryCurrency.toUpperCase() !== currency) continue;

    const amount = readNumber(entry, 'Amount', 'amount');
    if (amount === undefined) continue;

    if (readBoolean(entry, 'Included', 'included') ?? false) included += amount;
    else excluded += amount;
  }

  return { includedMajor: included, excludedMajor: excluded };
}

// ── Cost ────────────────────────────────────────────────────────────────────

/**
 * The stay total RateGain quotes, before excluded taxes and fees.
 *
 * `totalPrice` (products, precheck) and `totalNet` (precheck/commit summary)
 * are stay totals. `price` on a `bestproperties` hotel is an indicative
 * lead-in, not a bookable figure — the spec calls it "Starting price of the
 * hotel (per night or package)".
 *
 * `sellingRate` is deliberately absent from this list. It is the minimum
 * selling price, not a cost — see `readMinimumSellingPrice`.
 */
export function readQuotedTotalMajor(raw: unknown): number | undefined {
  const total = readNumber(raw, 'totalPrice', 'TotalPrice', 'totalNet', 'RoomRate');
  return total !== undefined && total > 0 ? total : undefined;
}

/**
 * MSP. `isMandatory` marks the rates where, per the spec, the "partner must
 * sell at or above the MSP". Recorded either way; enforced only when mandatory.
 */
export function readMinimumSellingPrice(
  raw: unknown,
  currency: CurrencyCode,
): MinimumSellingPrice | undefined {
  const selling = readNumber(raw, 'sellingRate', 'SellingRate');
  if (selling === undefined || selling <= 0) return undefined;
  return {
    amount: fromMajor(selling, currency),
    mandatory: readBoolean(raw, 'isMandatory', 'IsMandatory') ?? false,
  };
}

/**
 * Build a cost from a rate object.
 *
 * ```
 * payable = totalPrice + excludedTaxes + excludedFees
 * taxes   = includedTaxes + excludedTaxes
 * fees    = includedFees  + excludedFees
 * base    = payable − taxes − fees
 * ```
 *
 * The previous implementation subtracted tax from the total unconditionally,
 * which is right for included taxes and under-quotes by the whole amount for
 * excluded ones.
 */
export function toSupplierCost(raw: unknown, currency: CurrencyCode): SupplierCost | null {
  const quoted = readQuotedTotalMajor(raw);
  if (quoted === undefined) return null;

  const rec = asRecord(raw);
  const taxSplit = readTaxSplit(rec['taxes'] ?? rec['Taxes'], currency);
  const feeSplit = readFeeSplit(rec['Fees'] ?? rec['fees'], currency);

  const payableMajor = quoted + taxSplit.excludedMajor + feeSplit.excludedMajor;
  const taxesMajor = taxSplit.includedMajor + taxSplit.excludedMajor;
  const feesMajor = feeSplit.includedMajor + feeSplit.excludedMajor;

  const payable = fromMajor(payableMajor, currency);
  const taxes = fromMajor(taxesMajor, currency);
  const fees = fromMajor(feesMajor, currency);
  const baseMinor = payable.minor - taxes.minor - fees.minor;

  const commissionMajor = readNumber(rec, 'CommissionAmt', 'commissionAmt');
  const commission: { commission: Money } | Record<string, never> =
    commissionMajor !== undefined && commissionMajor > 0
      ? { commission: fromMajor(commissionMajor, currency) }
      : {};

  // A declared tax larger than the whole quote means the payload is
  // inconsistent. Report the payable total unsplit rather than refusing to sell
  // the room.
  if (baseMinor < 0) {
    return supplierCost({
      base: payable,
      taxesIncludedInBase: true,
      ...commission,
    });
  }

  return supplierCost({
    base: { minor: baseMinor, currency },
    taxes,
    fees,
    // True when nothing is charged on top of the quoted figure.
    taxesIncludedInBase: taxSplit.excludedMajor === 0 && feeSplit.excludedMajor === 0,
    ...commission,
  });
}

/** The indicative lead-in price on a `bestproperties` hotel. Never bookable. */
export function toIndicativeCost(raw: unknown, currency: CurrencyCode): SupplierCost | null {
  const price = readNumber(raw, 'price');
  if (price === undefined || price <= 0) return null;
  return supplierCost({ base: fromMajor(price, currency), taxesIncludedInBase: true });
}

// ── Cancellation ────────────────────────────────────────────────────────────

/**
 * RateGain stamps the same policy in two formats, and the adapter absorbs it.
 *
 * `getproducts` emits `"2026-09-05 00:00:00"` — a naive local datetime with a
 * space — while `PreCheckReservation` and `CommitReservation` emit
 * `"2026-09-05T00:00:00+05:30"`. `CancellationWindow.from` is documented as an
 * ISO instant, and passing both through verbatim made two spellings of one
 * deadline compare unequal at the booking gate.
 *
 * The naive form is read as IST, which is the offset RateGain itself sends on
 * the reservation side and the zone its platform operates in. It is an
 * assumption, and it is recorded as one (OPEN-ISSUES §3.2) — but the
 * alternative is not "no assumption", it is reading the same timestamp as
 * whatever zone the SERVER happens to run in, which makes a cancellation
 * deadline depend on where the process was deployed.
 */
const RATEGAIN_OFFSET = '+05:30';

function toIsoInstant(value: string): string {
  const trimmed = value.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return trimmed.replace(' ', 'T');
  // A bare date, or a naive datetime: give it RateGain's own offset rather than
  // the deploy host's.
  const withT = trimmed.replace(' ', 'T');
  const withTime = /T\d{2}:\d{2}/.test(withT) ? withT : `${withT}T00:00:00`;
  return `${withTime}${RATEGAIN_OFFSET}`;
}

function toCancellationWindows(raw: unknown, currency: CurrencyCode): CancellationWindow[] {
  const windows: CancellationWindow[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const from = readString(entry, 'from', 'fromDate');
    const amount = readNumber(entry, 'amount');
    if (from === undefined) continue;
    windows.push({
      from: toIsoInstant(from),
      penalty: amount === undefined ? zero(currency) : fromMajor(amount, currency),
    });
  }
  return windows;
}

function rateCancellation(raw: unknown, currency: CurrencyCode) {
  const rec = asRecord(raw);
  const windows = toCancellationWindows(
    rec['cancellationPolicies'] ?? rec['CancellationPolicies'],
    currency,
  );
  const notes = readString(rec, 'rateComments', 'rateComment');

  // RateGain has no explicit refundable flag; a zero-amount window is the
  // signal, and `rateComments` sometimes carries a NON-REFUNDABLE note.
  return deriveCancellationTerms({
    windows,
    ...(notes !== undefined ? { notes } : {}),
  });
}

// ── Rates ───────────────────────────────────────────────────────────────────

/** `rateType` per the spec: BOOKABLE, or RECHECK when it must be re-priced. */
function readRateStatus(raw: unknown): SupplierRate['rateStatus'] {
  const rateType = readString(raw, 'rateType')?.toUpperCase();
  const status = readString(raw, 'status')?.toUpperCase();
  if (status !== undefined && status !== 'AVAILABLE') return 'UNAVAILABLE';
  if (rateType === 'RECHECK') return 'RECHECK';
  if (rateType === 'BOOKABLE') return 'BOOKABLE';
  return undefined;
}

export interface RateContext {
  readonly currency: CurrencyCode;
  readonly requestedOccupancy: Occupancy;
  readonly propertyId: string;
  /** Room name and code live on the parent product, not on the rate. */
  readonly roomName?: string;
  readonly roomCode?: string;
  /**
   * Whether this code is comparable with one from another call.
   *
   * RateGain has TWO room-code spaces. `getproducts` returns
   * `products[].roomCode` — an internal numeric product id, `"483146225"` — and
   * `PreCheckReservation` and `CommitReservation` return
   * `rooms[].RoomCode`, a room-type code, `"DBL.ST"`. They identify the same
   * room and never match each other.
   *
   * `roomsDiffer` prefers a supplier's own code over the name whenever both
   * sides carry one (the C-2 fix), which is right when the codes come from one
   * space. Here it compared `"483146225"` against `"DBL.ST"` and reported
   * ROOM_CHANGED — so the booking gate would have refused **every RateGain
   * booking**, at the last step before payment, with a substitution that never
   * happened.
   *
   * So the reservation-side code is carried for the envelope that needs it and
   * kept off the comparison, leaving the room NAME to decide. "DELUXE ROOM"
   * against "DELUXE ROOM" matches, and "Deluxe King" against "Deluxe Twin"
   * still does not.
   */
  readonly roomCodeIsComparable?: boolean;
  readonly supplierState?: Readonly<Record<string, unknown>>;
}

export function toSupplierRate(raw: unknown, ctx: RateContext): SupplierRate | null {
  const cost = toSupplierCost(raw, ctx.currency);
  if (cost === null) return null;

  // The spec's rate object calls this `rateKey`; its booking payloads call the
  // same value `RoomSelectionKey`. Both spellings occur in live responses.
  const rateRef = readString(raw, 'rateKey', 'RoomSelectionKey', 'roomSelectionKey', 'RateKey');
  if (rateRef === undefined) return null;

  const rec = asRecord(raw);
  const msp = readMinimumSellingPrice(rec, ctx.currency);
  const rateStatus = readRateStatus(rec);
  const allotment = readNumber(rec, 'allotment');
  // Required on precheck and commit whenever the products call returned one.
  const allocationDetails = readString(rec, 'allocationDetails');
  const roomTypeCode = ctx.roomCode ?? readString(rec, 'RoomTypeCode', 'roomTypeCode');

  return {
    supplierRateRef: rateRef,
    room: room({
      name: ctx.roomName ?? readString(rec, 'rateName') ?? 'Room',
      ...(roomTypeCode !== undefined && ctx.roomCodeIsComparable !== false
        ? { code: roomTypeCode }
        : {}),
    }),
    board: classifyBoard(readString(rec, 'boardName', 'boardCode')),
    // RateGain prices the occupancy it was asked for and does not echo a
    // per-rate breakdown, so claiming one would be inventing it.
    occupancy: ctx.requestedOccupancy,
    cancellation: rateCancellation(rec, ctx.currency),
    cost,
    ...(msp !== undefined ? { minimumSellingPrice: msp } : {}),
    ...(rateStatus !== undefined ? { rateStatus } : {}),
    ...(allotment !== undefined ? { allotment } : {}),
    onHoldAllowed: false,
    supplierState: {
      propertyId: ctx.propertyId,
      rateKey: rateRef,
      // `BookingRate` on precheck and commit must be the net this rate quoted.
      // Carrying it on the rate means those calls work from the rate alone,
      // instead of depending on a caller to remember to supply it.
      quotedTotalMajor: toMajor(cost.total),
      ...(msp !== undefined ? { sellingRateMajor: toMajor(msp.amount) } : {}),
      ...(roomTypeCode !== undefined ? { roomTypeCode } : {}),
      ...(allocationDetails !== undefined ? { allocationDetails } : {}),
      ...(readString(rec, 'boardName') !== undefined
        ? { boardName: readString(rec, 'boardName') as string }
        : {}),
      ...ctx.supplierState,
    },
  };
}

// ── Hotels ──────────────────────────────────────────────────────────────────

/**
 * Star rating from `categoryCode`, which is a string like "5S", "4EST" or
 * "4 Star Hotel" — not a number. Reading it numerically loses the rating for
 * every RateGain property.
 */
export function readStarRating(rec: Record<string, unknown>): number | undefined {
  const direct = readNumber(rec, 'starRating', 'StarRating', 'ranking');
  if (direct !== undefined && direct >= 1 && direct <= 5) return direct;

  for (const key of ['categoryCode', 'categoryName']) {
    const text = readString(rec, key);
    if (text === undefined) continue;
    const match = /(\d(?:\.\d)?)/.exec(text);
    if (match?.[1] !== undefined) {
      const parsed = Number(match[1]);
      if (parsed >= 1 && parsed <= 5) return parsed;
    }
  }
  return undefined;
}

function hotelIdentity(rec: Record<string, unknown>) {
  return {
    id: readString(rec, 'propertyId', 'PropertyId', 'propertyID'),
    name: readString(rec, 'propertyName', 'PropertyName', 'hotelName', 'name'),
  };
}

function hotelCommonFields(
  rec: Record<string, unknown>,
  images: ImageResolver,
): Omit<SupplierHotel, 'supplier' | 'supplierHotelId' | 'name' | 'rates'> {
  const lat = readNumber(rec, 'latitude', 'Latitude');
  const lng = readNumber(rec, 'longitude', 'Longitude');
  const country = readString(rec, 'countryCode', 'CountryCode');
  const star = readStarRating(rec);
  const segment = readString(asRecord(readArray(rec, 'hotelSegments')[0]), 'name');
  const accType = readString(rec, 'accTypeDesc');
  const accomodation = readString(rec, 'accomodationType');
  const propertyType = classifyPropertyType(
    accomodation,
    segment,
    accType,
    readString(rec, 'propertyName', 'hotelName'),
  );
  const chain = readString(rec, 'chainName', 'chainCode');

  return {
    ...(readString(rec, 'address', 'Address') !== undefined
      ? { address: readString(rec, 'address', 'Address') as string }
      : {}),
    ...(readString(rec, 'city', 'City', 'destinationName') !== undefined
      ? { city: readString(rec, 'city', 'City', 'destinationName') as string }
      : {}),
    ...(country !== undefined && country.length === 2 ? { countryCode: countryCode(country) } : {}),
    ...(lat !== undefined && lng !== undefined ? { location: { lat, lng } } : {}),
    ...(star !== undefined ? { starRating: star } : {}),
    ...(propertyType !== undefined ? { propertyType } : {}),
    ...(chain !== undefined ? { chainCode: chain } : {}),
    imageUrls: images(rec['images']),
    // Only what RateGain reported. `hotelAmenities` is a flat string list;
    // `hotelFacility` is grouped and carries the richer set.
    amenityLabels: [
      ...new Set([
        ...readStringList(rec['hotelAmenities']),
        ...readStringList(readArray(rec, 'hotelFacility').flatMap((g) => readArray(g, 'facilityInfo'))),
      ]),
    ],
  };
}

/**
 * A `bestproperties` hotel.
 *
 * Per the spec this endpoint returns **no bookable rates** — a property carries
 * one indicative `price` and no rate key. Rates require a `getproducts` call.
 * The previous implementation looked for `roomRates`/`options` here and
 * discarded any hotel without them, which would have dropped every result of
 * every RateGain search.
 */
export function toSearchHotel(
  raw: unknown,
  ctx: { currency: CurrencyCode; images: ImageResolver },
): SupplierHotel | null {
  const rec = asRecord(raw);
  const { id, name } = hotelIdentity(rec);
  if (id === undefined || name === undefined) return null;

  const indicative = toIndicativeCost(rec, ctx.currency);

  return {
    supplier: RATEGAIN,
    supplierHotelId: supplierHotelId(id),
    name,
    ...hotelCommonFields(rec, ctx.images),
    rates: [],
    ...(indicative !== null ? { indicativeCost: indicative } : {}),
    // `getproducts` marks PropertyCode and BrandCode Required, and the spec
    // says to take them from here. There are no rates on a bestproperties
    // hotel to attach them to, so they live on the property — without this
    // every subsequent rate lookup goes out incomplete and is rejected.
    supplierState: propertyState(rec),
  };
}

/** Identifiers the products, precheck and commit calls all require. */
function propertyState(rec: Record<string, unknown>): Readonly<Record<string, unknown>> {
  const propertyCode = readString(rec, 'propertyCode', 'PropertyCode');
  const brandCode = readString(rec, 'brandCode', 'BrandCode');
  const destinationCode = readString(rec, 'destinationCode', 'DestinationCode');
  return {
    ...(propertyCode !== undefined ? { propertyCode } : {}),
    ...(brandCode !== undefined ? { brandCode } : {}),
    ...(destinationCode !== undefined ? { destinationCode } : {}),
  };
}

/**
 * A `getproducts` response: the hotel plus every bookable rate.
 *
 * Rates live at `body.products[].rate[]`, and the room name and code live on
 * the **product**, not on the rate — so they are threaded down rather than
 * looked up on the rate, where they do not exist.
 */
export function toProductsHotel(
  body: unknown,
  ctx: {
    currency: CurrencyCode;
    requestedOccupancy: Occupancy;
    images: ImageResolver;
    /** Reported rather than lost silently, as the search mapper does (C-4). */
    onSkippedRate?: (error: unknown, index: number) => void;
  },
): SupplierHotel | null {
  const rec = asRecord(body);
  const { id, name } = hotelIdentity(rec);
  if (id === undefined || name === undefined) return null;

  const supplierState = propertyState(rec);

  /**
   * One unmappable rate loses that rate, never the property (C-4).
   *
   * `toSupplierRate` reaches domain constructors that throw rather than
   * represent a value they cannot — `COST_NEGATIVE` on a discount line that
   * arrives as a negative tax, `MONEY_NOT_INTEGER` on a total outside the safe
   * range. This mapper runs outside `callSupplier`'s parse guard, so an
   * unguarded loop turned one bad rate into a rejected `getRates`, and — until
   * the enrichment stage grew its own isolation barrier — into a 500 for a
   * search that already had results from every other supplier.
   */
  const rates: SupplierRate[] = [];
  for (const product of readArray(rec, 'products')) {
    const productRec = asRecord(product);
    const roomName = readString(productRec, 'name');
    const roomCode = readString(productRec, 'roomCode');
    rates.push(
      ...mapDefensively(
        readArray(productRec, 'rate'),
        (rate) =>
          toSupplierRate(rate, {
            currency: ctx.currency,
            requestedOccupancy: ctx.requestedOccupancy,
            propertyId: id,
            ...(roomName !== undefined ? { roomName } : {}),
            ...(roomCode !== undefined ? { roomCode } : {}),
            supplierState,
          }),
        (error, index) => ctx.onSkippedRate?.(error, index),
      ),
    );
  }

  return {
    supplier: RATEGAIN,
    supplierHotelId: supplierHotelId(id),
    name,
    ...hotelCommonFields(rec, ctx.images),
    rates,
    supplierState,
  };
}

/**
 * The rate a precheck confirmed: `body.preCheckResponse.rooms[].rates[]`.
 * The room name is on the room, as in `getproducts`.
 */
export function precheckRate(
  body: unknown,
  ctx: {
    currency: CurrencyCode;
    requestedOccupancy: Occupancy;
    propertyId: string;
    /** The rate that was asked about. Matched before anything is returned. */
    expectedRateRef?: string;
  },
): SupplierRate | null {
  const response = readRecord(readRecord(body, 'body'), 'preCheckResponse');
  const mapped: SupplierRate[] = [];

  for (const roomEntry of readArray(response, 'rooms')) {
    const roomRec = asRecord(roomEntry);
    const roomName = readString(roomRec, 'name');
    const roomCode = readString(roomRec, 'RoomCode', 'roomCode');
    for (const rate of readArray(roomRec, 'rates')) {
      const one = toSupplierRate(rate, {
        currency: ctx.currency,
        requestedOccupancy: ctx.requestedOccupancy,
        propertyId: ctx.propertyId,
        ...(roomName !== undefined ? { roomName } : {}),
        ...(roomCode !== undefined ? { roomCode } : {}),
        // A reservation-side `RoomCode` is not the shopping-side `roomCode` the
        // quote was sealed with. See `RateContext.roomCodeIsComparable`.
        roomCodeIsComparable: false,
      });
      if (one !== null) mapped.push(one);
    }
  }

  /**
   * The rate that was asked about, not merely the first one offered.
   *
   * This used to return `rooms[0].rates[0]` regardless. A precheck response
   * carrying more than one room or rate would then confirm a DIFFERENT offer
   * from the one being booked, and revalidation would compare the customer's
   * quote against a rate they never chose — reporting a price change, a room
   * change, or worse, agreement, entirely by accident.
   *
   * Falling back to the first is deliberate and safe: RateGain does not always
   * echo the key, and revalidation compares room, board, cancellation and price
   * against the sealed quote anyway, so a genuinely different offer is caught
   * one layer up rather than silently accepted here.
   */
  if (ctx.expectedRateRef !== undefined) {
    const exact = mapped.find((r) => r.supplierRateRef === ctx.expectedRateRef);
    if (exact !== undefined) return exact;
  }
  return mapped[0] ?? null;
}

// ── Envelope ────────────────────────────────────────────────────────────────

/** RateGain reports success as `status: true` alongside `statusCode: 200`. */
export function isRgSuccess(body: unknown): boolean {
  const rec = asRecord(body);
  if (rec['status'] === true) return true;
  if (typeof rec['status'] === 'string' && rec['status'].toLowerCase() === 'success') return true;
  const headerStatus = readString(readRecord(rec, 'header'), 'status');
  if (headerStatus !== undefined && headerStatus.toLowerCase() === 'success') return true;
  return readNumber(rec, 'statusCode') === 200 && rec['status'] !== false;
}

export function rgTotalRecords(body: unknown): number {
  const rec = asRecord(body);
  return readNumber(rec, 'totalRecord') ?? readNumber(readRecord(rec, 'header'), 'totalRecord') ?? 0;
}

/** `description` carries RateGain's own message, e.g. "...; ErrorCode:1999". */
export function rgDescription(body: unknown): string | undefined {
  return readString(body, 'description', 'message');
}
