import { describe, expect, it } from 'vitest';
import { countryCode, supplierCode } from '../../domain/shared/brand.js';
import { DomainError } from '../../domain/shared/errors.js';
import { SupplierRegistry, type SupplierConfig } from './registry.js';
import type { HotelSupplier } from './hotel-supplier.js';

const TJ = supplierCode('TJ');
const RG = supplierCode('RG');
const SC = supplierCode('SC');

const stubSupplier = (
  code: ReturnType<typeof supplierCode>,
  over: Partial<HotelSupplier['capabilities']> = {},
  extra: Partial<HotelSupplier> = {},
): HotelSupplier =>
  ({
    code,
    capabilities: {
      searchTargets: ['DEST_CODE'],
      searchReturnsRates: true,
      supportsHold: false,
      supportsAmendment: false,
      asyncBooking: false,
      countries: [],
      rateValidityMs: 900_000,
      maxConcurrency: 4,
      pageSize: 20,
      ...over,
    },
    search: () => Promise.reject(new Error('not called')),
    getHotelDetails: () => Promise.reject(new Error('not called')),
    getRates: () => Promise.reject(new Error('not called')),
    precheck: () => Promise.reject(new Error('not called')),
    book: () => Promise.reject(new Error('not called')),
    cancel: () => Promise.reject(new Error('not called')),
    ...extra,
  }) as HotelSupplier;

const cfg = (
  code: ReturnType<typeof supplierCode>,
  over: Partial<SupplierConfig> = {},
): SupplierConfig => ({
  code,
  enabled: true,
  priority: 0,
  searchTimeoutMs: 14_000,
  detailTimeoutMs: 20_000,
  bookTimeoutMs: 60_000,
  maxRetries: 1,
  maxConcurrency: 4,
  circuitBreaker: { failureThreshold: 5, openMs: 30_000 },
  countries: [],
  maintenanceMode: false,
  reliabilityScore: 50,
  ...over,
});

describe('SupplierRegistry', () => {
  it('registers and resolves a supplier', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(TJ), cfg(TJ));
    expect(r.get(TJ)?.supplier.code).toBe(TJ);
    expect(r.get(RG)).toBeUndefined();
  });

  it('rejects a config whose code does not match its supplier', () => {
    const r = new SupplierRegistry();
    expect(() => r.register(stubSupplier(TJ), cfg(RG))).toThrow(DomainError);
  });

  it('rejects a duplicate registration', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(TJ), cfg(TJ));
    expect(() => r.register(stubSupplier(TJ), cfg(TJ))).toThrow(DomainError);
  });

  it('rejects an async-booking supplier that cannot be polled', () => {
    const r = new SupplierRegistry();
    expect(() =>
      r.register(stubSupplier(TJ, { asyncBooking: true }), cfg(TJ)),
    ).toThrow(DomainError);
  });

  it('accepts an async-booking supplier that implements the poll', () => {
    const r = new SupplierRegistry();
    const s = stubSupplier(TJ, { asyncBooking: true }, {
      getBookingStatus: () => Promise.reject(new Error('not called')),
    });
    expect(() => r.register(s, cfg(TJ))).not.toThrow();
  });

  it('omits disabled suppliers from a search', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(TJ), cfg(TJ));
    r.register(stubSupplier(RG), cfg(RG, { enabled: false }));
    expect(r.selectFor({}).map((s) => s.config.code)).toEqual([TJ]);
  });

  it('honours a requested provider filter', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(TJ), cfg(TJ));
    r.register(stubSupplier(RG), cfg(RG));
    expect(r.selectFor({ requested: [RG] }).map((s) => s.config.code)).toEqual([RG]);
  });

  it('excludes a supplier that does not serve the market', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(TJ), cfg(TJ));
    r.register(stubSupplier(RG), cfg(RG, { countries: [countryCode('IN')] }));
    expect(r.selectFor({ countryCode: countryCode('AE') }).map((s) => s.config.code)).toEqual([TJ]);
  });

  it('orders deterministically by priority then code', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(RG), cfg(RG, { priority: 1 }));
    r.register(stubSupplier(TJ), cfg(TJ, { priority: 1 }));
    r.register(stubSupplier(SC), cfg(SC, { priority: 9 }));
    expect(r.selectFor({}).map((s) => s.config.code)).toEqual([SC, RG, TJ]);
  });

  /** Brief §33/§52 scenario 7: a third supplier must be additive only. */
  it('takes a third supplier with no change to selection logic', () => {
    const r = new SupplierRegistry();
    r.register(stubSupplier(TJ), cfg(TJ));
    r.register(stubSupplier(RG), cfg(RG));
    expect(r.selectFor({})).toHaveLength(2);

    r.register(stubSupplier(SC), cfg(SC));
    expect(r.selectFor({})).toHaveLength(3);
    expect(r.reliabilityScores()['SC']).toBe(50);
  });

  it('throws when a persisted booking names an unregistered supplier', () => {
    const r = new SupplierRegistry();
    expect(() => r.require(SC)).toThrow(DomainError);
  });
});
