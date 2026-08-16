/**
 * Nominal typing for identifiers.
 *
 * The single most damaging habit in the reference implementation was letting a
 * supplier's identifier stand in for KLAR's own (`hotelId: "TJ:100000001234"`
 * was simultaneously the supplier key, the routing key and the frontend's
 * primary key). Branding makes that a compile error rather than a convention.
 */

declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** KLAR's own, opaque, stable hotel identifier. Never a supplier's. */
export type KlarHotelId = Brand<string, 'KlarHotelId'>;

/** KLAR's own destination identifier. */
export type KlarDestinationId = Brand<string, 'KlarDestinationId'>;

/** A supplier's identifier for a property, meaningful only to that supplier. */
export type SupplierHotelId = Brand<string, 'SupplierHotelId'>;

/** Short supplier code, e.g. "TJ", "RG". Resolved against supplier_config. */
export type SupplierCode = Brand<string, 'SupplierCode'>;

/** Opaque handle to a priced, bookable offer. Resolves to sealed supplier state. */
export type DealId = Brand<string, 'DealId'>;

/** Correlates every supplier call, log line and metric of one search. */
export type SearchId = Brand<string, 'SearchId'>;

/** KLAR's own booking reference. */
export type KlarBookingId = Brand<string, 'KlarBookingId'>;

/** ISO-4217, uppercase. */
export type CurrencyCode = Brand<string, 'CurrencyCode'>;

/** ISO-3166-1 alpha-2, uppercase. */
export type CountryCode = Brand<string, 'CountryCode'>;

// ── Constructors ────────────────────────────────────────────────────────────
// Deliberately unchecked casts at the boundary. Validation belongs to the
// parsers at the edge (API input, DB rows, supplier responses); once a value is
// inside the domain its type is the guarantee.

export const klarHotelId = (v: string): KlarHotelId => v as KlarHotelId;
export const klarDestinationId = (v: string): KlarDestinationId => v as KlarDestinationId;
export const supplierHotelId = (v: string): SupplierHotelId => v as SupplierHotelId;
export const supplierCode = (v: string): SupplierCode => v.toUpperCase() as SupplierCode;
export const dealId = (v: string): DealId => v as DealId;
export const searchId = (v: string): SearchId => v as SearchId;
export const klarBookingId = (v: string): KlarBookingId => v as KlarBookingId;
export const currencyCode = (v: string): CurrencyCode => v.toUpperCase() as CurrencyCode;
export const countryCode = (v: string): CountryCode => v.toUpperCase() as CountryCode;
