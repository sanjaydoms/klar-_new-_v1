import { describe, expect, it } from 'vitest';
import {
  dealId,
  klarHotelId,
  searchId,
  supplierCode,
  supplierHotelId,
} from '../../domain/shared/brand.js';
import { fromMajor } from '../../domain/shared/money.js';
import { countryCode, currencyCode } from '../../domain/shared/brand.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms } from '../../domain/rate/cancellation.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { supplierCost } from '../../domain/pricing/supplier-cost.js';
import { priceFromCost } from '../../domain/pricing/customer-price.js';
import { stayDates } from '../../domain/shared/stay.js';
import type { SupplierRate } from '../../suppliers/contract/dto.js';
import { InMemoryKeyValueStore, KeyValueRateTokenStore } from './rate-token-store.js';

const INR = currencyCode('INR');
const RG = supplierCode('RG');

const rate: SupplierRate = {
  supplierRateRef: 'rk-deluxe-refundable',
  room: room({ name: 'Deluxe Room' }),
  board: classifyBoard('Bed and Breakfast'),
  occupancy: occupancy([roomRequest(2, 0, [])]),
  cancellation: deriveCancellationTerms({ explicit: true }),
  cost: supplierCost({ base: fromMajor(11_500, INR), taxesIncludedInBase: true }),
  onHoldAllowed: false,
  supplierState: {
    propertyId: 'RG-77001',
    allocationDetails: '1755061692000463B1003B1',
    propertyCode: 'HTL001',
  },
};

function build(startAt = 1_000_000) {
  const clock = { now: startAt };
  const now = (): number => clock.now;
  const kv = new InMemoryKeyValueStore(now);
  let n = 0;
  const store = new KeyValueRateTokenStore({
    kv,
    now,
    newId: () => {
      n += 1;
      return `deal-${n}`;
    },
  });
  return { store, kv, clock };
}

const IN = countryCode('IN');

/** What the customer was shown for this rate. */
const quotedPrice = priceFromCost(rate.cost, {
  region: 'DOMESTIC',
  channel: 'B2C',
  rules: [
    { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
  ],
  nights: 3,
  supplier: RG,
});

const issue = (store: KeyValueRateTokenStore, validForMs = 900_000) =>
  store.issue({
    searchId: searchId('KLAR-SRCH-1'),
    supplier: RG,
    supplierHotelId: supplierHotelId('RG-77001'),
    klarHotelId: klarHotelId('KLAR-TAJ'),
    rate,
    quotedPrice,
    stay: stayDates('2026-09-10', '2026-09-13'),
    occupancy: occupancy([roomRequest(2, 0, [])]),
    nationality: IN,
    scope: { channel: 'B2C', homeCountry: IN, destinationCountry: IN, nights: 3 },
    markupVersion: 'mk-abc123',
    validForMs,
  });

/**
 * Rate tokens are what keep supplier protocol out of the browser: the client
 * holds an opaque id, and everything the supplier needs to re-price or book
 * stays server-side (ADR-0004).
 */
describe('rate tokens', () => {
  it('issues an opaque id with an expiry', async () => {
    const { store } = build();
    const issued = await issue(store);
    expect(issued.dealId).toBe('deal-1');
    expect(issued.expiresAt.getTime()).toBe(1_000_000 + 900_000);
  });

  it('resolves back to the supplier state a booking needs', async () => {
    const { store } = build();
    const issued = await issue(store);
    const resolved = await store.resolve(issued.dealId);

    expect(resolved?.supplier).toBe('RG');
    expect(resolved?.supplierRateRef).toBe('rk-deluxe-refundable');
    // RateGain rejects a commit without this; it must survive the round trip.
    expect(resolved?.supplierState).toMatchObject({
      allocationDetails: '1755061692000463B1003B1',
    });
  });

  /**
   * The token seals the QUOTE, not just the rate handle.
   *
   * Revalidation compares a `CustomerPrice` against a `CustomerPrice`. Sealing
   * only a supplier cost left no expected side to compare, so a room, board or
   * cancellation substitution could never be detected — and re-deriving the
   * price at precheck would move it whenever a markup rule or a resolved region
   * changed, for a reason that has nothing to do with the supplier.
   */
  it('seals the whole quote, not just the supplier cost', async () => {
    const { store } = build();
    const issued = await issue(store);
    const resolved = await store.resolve(issued.dealId);

    // What the customer saw, carried verbatim — markup and all.
    expect(resolved?.quotedPrice.total.minor).toBe(quotedPrice.total.minor);
    expect(resolved?.quotedPrice.total.minor).toBeGreaterThan(1_150_000);
    // What the supplier said it would invoice, kept beside it.
    expect(resolved?.quotedCost.total.minor).toBe(1_150_000);

    // The expected side of every non-price comparison.
    expect(resolved?.room.name).toBe('Deluxe Room');
    expect(resolved?.board.code).toBe('BB');
    expect(resolved?.cancellation.refundable).toBe('TRUE');

    // Everything `SupplierPrecheckRequest` requires and nothing else persists.
    expect(resolved?.stay.checkIn).toBe('2026-09-10');
    expect(resolved?.occupancy.rooms[0]?.adults).toBe(2);
    expect(resolved?.nationality).toBe('IN');

    // And the context that reproduces the region for the FRESH cost.
    expect(resolved?.scope).toEqual({
      channel: 'B2C',
      homeCountry: 'IN',
      destinationCountry: 'IN',
      nights: 3,
    });
    expect(resolved?.markupVersion).toBe('mk-abc123');
  });

  /**
   * Suppliers rotate the handle at precheck — TripJack mints a booking id,
   * RateGain refreshes `allocationDetails` — and booking must use the new one.
   */
  it('reseals the supplier handle under the same id, leaving the quote alone', async () => {
    const { store } = build();
    const issued = await issue(store);

    await store.reseal(issued.dealId, {
      supplierRateRef: 'rk-refreshed',
      supplierState: { allocationDetails: 'NEW-ALLOC', bookingId: 'TJ-BK-1' },
    });

    const resolved = await store.resolve(issued.dealId);
    expect(resolved?.supplierRateRef).toBe('rk-refreshed');
    expect(resolved?.supplierState).toMatchObject({ bookingId: 'TJ-BK-1' });
    // The quote is what the customer agreed to. A precheck does not rewrite it.
    expect(resolved?.quotedPrice.total.minor).toBe(quotedPrice.total.minor);
    expect(resolved?.room.name).toBe('Deluxe Room');
  });

  /**
   * A precheck confirms a rate; it does not buy more time on one. Refreshing
   * the window on every precheck would let a client hold a price open
   * indefinitely by re-asking.
   */
  it('does not extend the window when it reseals', async () => {
    const { store, clock } = build();
    const issued = await issue(store, 60_000);

    clock.now += 30_000;
    await store.reseal(issued.dealId, { supplierRateRef: 'rk-2', supplierState: {} });

    clock.now += 30_001;
    expect(await store.resolve(issued.dealId)).toBeNull();
  });

  it('reseals nothing for an id that has already gone', async () => {
    const { store } = build();
    const issued = await issue(store, 60_000);
    await store.consume(issued.dealId);

    await store.reseal(issued.dealId, { supplierRateRef: 'rk-2', supplierState: {} });
    // Re-sealing must not resurrect a retired quote.
    expect(await store.resolve(issued.dealId)).toBeNull();
  });

  it('stops resolving once it expires', async () => {
    const { store, clock } = build();
    const issued = await issue(store, 60_000);
    clock.now += 60_001;
    expect(await store.resolve(issued.dealId)).toBeNull();
  });

  /**
   * An expired token and one that never existed are indistinguishable to the
   * caller, deliberately: both mean "search again", and telling them apart
   * would let a client probe for valid ids.
   */
  it('answers the same way for an unknown id as for an expired one', async () => {
    const { store } = build();
    expect(await store.resolve(dealId('never-issued'))).toBeNull();
  });

  it('caps a caller-supplied lifetime at the configured maximum', async () => {
    // A token must never outlive the supplier's own rate validity, whatever the
    // caller asks for.
    const kv = new InMemoryKeyValueStore(() => 1_000_000);
    const store = new KeyValueRateTokenStore({
      kv,
      now: () => 1_000_000,
      newId: () => 'deal-capped',
      maxTtlMs: 60_000,
    });
    const issued = await issue(store, 24 * 60 * 60 * 1000);
    expect(issued.expiresAt.getTime()).toBe(1_000_000 + 60_000);
  });

  it('is retired once consumed, so it cannot be replayed', async () => {
    const { store } = build();
    const issued = await issue(store);
    await store.consume(issued.dealId);
    expect(await store.resolve(issued.dealId)).toBeNull();
  });

  it('issues a distinct id per rate', async () => {
    const { store } = build();
    const a = await issue(store);
    const b = await issue(store);
    expect(a.dealId).not.toBe(b.dealId);
  });

  it('survives a corrupted stored value without throwing', async () => {
    const { store, kv } = build();
    const issued = await issue(store);
    await kv.set(`klar:deal:${String(issued.dealId)}`, 'not json', 60_000);
    expect(await store.resolve(issued.dealId)).toBeNull();
  });
});

describe('the key-value store', () => {
  it('expires entries on its own clock', async () => {
    const clock = { now: 0 };
    const kv = new InMemoryKeyValueStore(() => clock.now);
    await kv.set('k', 'v', 1_000);
    expect(await kv.get('k')).toBe('v');
    clock.now = 1_001;
    expect(await kv.get('k')).toBeNull();
    expect(kv.size).toBe(0);
  });
});
