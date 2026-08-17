import { describe, expect, it } from 'vitest';
import {
  countryCode,
  currencyCode,
  dealId,
  klarHotelId,
  searchId,
  supplierCode,
  supplierHotelId,
  type DealId,
} from '../../domain/shared/brand.js';
import { fromMajor, toMajor } from '../../domain/shared/money.js';
import { stayDates } from '../../domain/shared/stay.js';
import { classifyBoard } from '../../domain/rate/board.js';
import { room } from '../../domain/rate/room.js';
import { deriveCancellationTerms } from '../../domain/rate/cancellation.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import { supplierCost } from '../../domain/pricing/supplier-cost.js';
import type { MarkupRule } from '../../domain/pricing/markup.js';
import type { SupplierPrecheckResult, SupplierRate } from '../../suppliers/contract/dto.js';
import { supplierError } from '../../suppliers/contract/errors.js';
import { SupplierRegistry } from '../../suppliers/contract/registry.js';
import { PricingService } from '../pricing/pricing-service.js';
import {
  FakeClock,
  FakeMarkupProvider,
  FakeRateTokenStore,
  SequentialIds,
  silentLogger,
} from '../testing/fakes.js';
import { fakeConfig, fakeSupplier } from '../testing/fake-supplier.js';
import { RevalidationService } from './revalidation-service.js';

const INR = currencyCode('INR');
const IN = countryCode('IN');
const RG = supplierCode('RG');

/** 12% platform markup, so a supplier cost and a customer price differ visibly. */
const RULES: MarkupRule[] = [
  { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
];

const quotedRate: SupplierRate = {
  supplierRateRef: 'rk-original',
  room: room({ name: 'Deluxe Room' }),
  board: classifyBoard('Bed and Breakfast'),
  occupancy: occupancy([roomRequest(2, 0, [])]),
  cancellation: deriveCancellationTerms({ explicit: true }),
  cost: supplierCost({ base: fromMajor(11_500, INR), taxesIncludedInBase: true }),
  onHoldAllowed: false,
  supplierState: { allocationDetails: 'ALLOC-1', quotedTotalMajor: 11_500 },
};

/** A precheck answer, scripted. */
type Script = (req: unknown) => SupplierPrecheckResult;

const availableAt = (
  netMajor: number,
  over: Partial<SupplierPrecheckResult> = {},
): SupplierPrecheckResult => ({
  supplier: RG,
  available: true,
  cost: supplierCost({ base: fromMajor(netMajor, INR), taxesIncludedInBase: true }),
  room: quotedRate.room,
  board: quotedRate.board,
  cancellation: quotedRate.cancellation,
  supplierRateRef: 'rk-refreshed',
  supplierState: { allocationDetails: 'ALLOC-2' },
  ...over,
});

async function harness(
  script: Script | 'throws',
  opts: {
    enabled?: boolean;
    rules?: MarkupRule[];
    /** Rules in force when the quote was SEALED. Defaults to `rules`. */
    quoteRules?: MarkupRule[];
  } = {},
) {
  const registry = new SupplierRegistry();
  const base = fakeSupplier({ code: 'RG' });
  registry.register(
    {
      ...base,
      precheck:
        script === 'throws'
          ? () => {
              throw new Error('adapter blew up inside precheck');
            }
          : (req) => Promise.resolve(script(req)),
    },
    fakeConfig('RG', { enabled: opts.enabled ?? true }),
  );

  const rateTokens = new FakeRateTokenStore();
  const pricing = new PricingService(new FakeMarkupProvider(opts.rules ?? RULES));
  const clock = new FakeClock();
  const scope = { channel: 'B2C' as const, homeCountry: IN, destinationCountry: IN, nights: 3 };

  // Price the quote the way search would have, under the rules in force THEN,
  // then seal it. Sealing through a separate engine is what lets a test change
  // the margin between quoting and revalidating.
  const quotePricing = new PricingService(
    new FakeMarkupProvider(opts.quoteRules ?? opts.rules ?? RULES, 'mk-at-quote-time'),
  );
  const resolved = await quotePricing.resolve(scope);
  const quotedPrice = quotePricing.priceRate(quotedRate, RG, scope, resolved);

  const issued = await rateTokens.issue({
    searchId: searchId('KLAR-SRCH-1'),
    supplier: RG,
    supplierHotelId: supplierHotelId('RG-900'),
    klarHotelId: klarHotelId('KLAR-TAJ'),
    rate: quotedRate,
    quotedPrice,
    stay: stayDates('2026-09-10', '2026-09-13'),
    occupancy: occupancy([roomRequest(2, 0, [])]),
    nationality: IN,
    scope: { channel: 'B2C', homeCountry: IN, destinationCountry: IN, nights: 3 },
    markupVersion: resolved.markupVersion,
    validForMs: 900_000,
  });

  const service = new RevalidationService({
    registry,
    rateTokens,
    pricing,
    clock,
    ids: new SequentialIds(),
    logger: silentLogger,
    config: { deadlineMs: 30_000 },
  });

  return { service, rateTokens, quotedPrice, dealId: issued.dealId };
}

// ═══ Definition of done: the price-increase path, end to end ═══════════════

describe('a price that moved', () => {
  it('passes a small increase through without asking again', async () => {
    // Default tolerance is the larger of ₹10 and 0.5%, so ~₹64 on this quote.
    const { service, dealId: id, quotedPrice } = await harness(() => availableAt(11_540));
    const report = await service.revalidate(id);

    expect(report.status).toBe('REVALIDATED');
    expect(report.outcome?.kind).toBe('PRICE_INCREASED_WITHIN_TOLERANCE');
    expect(report.requiresConsent).toBe(false);
    // The charge is the FRESH number, not the quoted one.
    expect(report.chargeable?.total.minor).toBeGreaterThan(quotedPrice.total.minor);
  });

  /** The Phase 7 definition of done. */
  it('stops a real increase and demands consent', async () => {
    const { service, dealId: id, quotedPrice } = await harness(() => availableAt(13_000));
    const report = await service.revalidate(id);

    expect(report.status).toBe('REVALIDATED');
    expect(report.outcome?.kind).toBe('PRICE_INCREASED');
    expect(report.requiresConsent).toBe(true);

    const outcome = report.outcome;
    if (outcome?.kind !== 'PRICE_INCREASED') throw new Error('expected a price increase');
    // Both figures are customer prices — markup included on each side — so the
    // customer is shown the change they would actually pay.
    expect(outcome.from.minor).toBe(quotedPrice.total.minor);
    expect(toMajor(outcome.to)).toBeGreaterThan(toMajor(outcome.from));
    expect(toMajor(outcome.to)).toBeGreaterThan(13_000);
  });

  it('passes a decrease straight on to the customer', async () => {
    const { service, dealId: id, quotedPrice } = await harness(() => availableAt(10_000));
    const report = await service.revalidate(id);

    expect(report.outcome?.kind).toBe('PRICE_DECREASED');
    // No consent needed — we were going to be invoiced the lower amount anyway.
    expect(report.requiresConsent).toBe(false);
    expect(report.chargeable!.total.minor).toBeLessThan(quotedPrice.total.minor);
  });

  it('reports an unchanged price as unchanged', async () => {
    const { service, dealId: id, quotedPrice } = await harness(() => availableAt(11_500));
    const report = await service.revalidate(id);

    expect(report.outcome?.kind).toBe('UNCHANGED');
    expect(report.chargeable?.total.minor).toBe(quotedPrice.total.minor);
    expect(report.requiresConsent).toBe(false);
  });
});

// ═══ The quote is read, never recomputed ═══════════════════════════════════

describe('the sealed quote is the expected side', () => {
  /**
   * The heart of Phase 7.
   *
   * If the quoted price were re-derived at precheck, a markup edit between
   * search and booking would show the customer a "price change" that no
   * supplier made — quoted one number, charged another, which is D-1 in a
   * different costume.
   */
  it('does not re-price the quote when the markup rules have changed', async () => {
    // Sealed under 12%. Revalidated under 30%, with the supplier quoting
    // EXACTLY the cost it quoted before.
    const { service, dealId: id, quotedPrice } = await harness(() => availableAt(11_500), {
      quoteRules: RULES,
      rules: [
        { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 30, region: 'ALL', basis: 'NET' },
      ],
    });

    const report = await service.revalidate(id);
    const outcome = report.outcome;

    // Had the quote been re-derived from today's rules, both sides would read
    // 30% and this would say UNCHANGED — the margin edit would have been
    // charged to the customer silently. Sealed, it surfaces as a price change
    // the customer is asked about.
    if (outcome?.kind !== 'PRICE_INCREASED') {
      throw new Error(`expected a price increase, got ${String(outcome?.kind)}`);
    }
    expect(outcome.from.minor).toBe(quotedPrice.total.minor);
    // 11,500 + 12% is what was quoted; the fresh side carries 30%.
    expect(toMajor(outcome.from)).toBeCloseTo(12_880, 0);
    expect(toMajor(outcome.to)).toBeCloseTo(14_950, 0);
    expect(report.requiresConsent).toBe(true);
  });

  it('detects a room substitution the supplier slipped in', async () => {
    const { service, dealId: id } = await harness(() =>
      availableAt(11_500, { room: room({ name: 'Garden View Room' }) }),
    );
    const report = await service.revalidate(id);

    // Same price, different room. Both classify UNKNOWN/DELUXE respectively —
    // the C-2 fix is what makes this visible at all.
    expect(report.outcome?.kind).toBe('ROOM_CHANGED');
    expect(report.requiresConsent).toBe(true);
  });

  it('detects a board substitution', async () => {
    const { service, dealId: id } = await harness(() =>
      availableAt(11_500, { board: classifyBoard('Room Only') }),
    );
    expect((await service.revalidate(id)).outcome?.kind).toBe('BOARD_CHANGED');
  });

  it('detects cancellation terms that hardened', async () => {
    const { service, dealId: id } = await harness(() =>
      availableAt(11_500, { cancellation: deriveCancellationTerms({ explicit: false }) }),
    );
    expect((await service.revalidate(id)).outcome?.kind).toBe('CANCELLATION_CHANGED');
  });
});

// ═══ What the supplier did not say ═════════════════════════════════════════

describe('an incomplete answer is not an unchanged one', () => {
  /**
   * `SupplierPrecheckResult` has room, board and cancellation all optional
   * while `RevalidationInput` requires them. Falling back to the expected value
   * to satisfy the type would turn "the supplier did not say" into "nothing
   * changed" — a silent substitution at the booking gate.
   */
  it('names what it could not verify and asks for consent anyway', async () => {
    const { service, dealId: id } = await harness(() => {
      const { room: _r, board: _b, ...rest } = availableAt(11_500);
      return rest as SupplierPrecheckResult;
    });

    const report = await service.revalidate(id);
    expect(report.status).toBe('REVALIDATED');
    // The price genuinely did not move, and that is still not enough.
    expect(report.outcome?.kind).toBe('UNCHANGED');
    expect(report.unverified).toEqual(['room', 'board']);
    expect(report.requiresConsent).toBe(true);
  });

  /**
   * Available at no price is not "available at the old price". Treating a
   * missing cost as unchanged would bill the customer on a confirmation the
   * supplier never gave.
   */
  it('refuses to proceed when the supplier confirms without a price', async () => {
    const { service, dealId: id } = await harness(() => ({
      supplier: RG,
      available: true,
      room: quotedRate.room,
    }));

    const report = await service.revalidate(id);
    expect(report.status).toBe('INCOMPLETE');
    expect(report.chargeable).toBeNull();
    expect(report.requiresConsent).toBe(true);
  });
});

// ═══ Everything that is not an answer about the price ══════════════════════

describe('when there is nothing to compare', () => {
  it('reports a sold-out room as sold out', async () => {
    const { service, dealId: id } = await harness(() => ({ supplier: RG, available: false }));
    const report = await service.revalidate(id);

    expect(report.outcome?.kind).toBe('SOLD_OUT');
    expect(report.chargeable).toBeNull();
  });

  it('treats an unknown or expired deal as one answer', async () => {
    const { service } = await harness(() => availableAt(11_500));
    const report = await service.revalidate(dealId('deal-never-existed') as DealId);

    // Indistinguishable on purpose: telling a client which it was lets it probe
    // for live ids.
    expect(report.status).toBe('DEAL_NOT_FOUND');
    expect(report.chargeable).toBeNull();
  });

  it('distinguishes a supplier failure from a sold-out room', async () => {
    const { service, dealId: id } = await harness(() => ({
      supplier: RG,
      available: false,
      error: supplierError('SUPPLIER_TIMEOUT', 'took too long'),
    }));

    const report = await service.revalidate(id);
    // A transient failure must not read as "someone else took the room".
    expect(report.status).toBe('SUPPLIER_UNAVAILABLE');
    expect(report.attempt?.errorCode).toBe('SUPPLIER_TIMEOUT');
  });

  it('absorbs an adapter that throws out of its own contract', async () => {
    const { service, dealId: id } = await harness('throws');
    const report = await service.revalidate(id);

    expect(report.status).toBe('SUPPLIER_UNAVAILABLE');
    expect(report.attempt?.errorCode).toBe('SUPPLIER_MALFORMED_RESPONSE');
  });

  it('reports a supplier switched off since the quote', async () => {
    const { service, dealId: id } = await harness(() => availableAt(11_500), { enabled: false });
    expect((await service.revalidate(id)).status).toBe('SUPPLIER_UNAVAILABLE');
  });
});

// ═══ The sealed handle ═════════════════════════════════════════════════════

describe('the supplier handle moves on; the deal does not', () => {
  /**
   * TripJack mints a booking id at review and RateGain refreshes
   * `allocationDetails`. Booking must use the new one, and the client must keep
   * the opaque id it already holds.
   */
  it('reseals the refreshed handle under the same dealId', async () => {
    const { service, rateTokens, dealId: id } = await harness(() => availableAt(11_500));
    await service.revalidate(id);

    const resealed = await rateTokens.resolve(id);
    expect(resealed?.supplierRateRef).toBe('rk-refreshed');
    expect(resealed?.supplierState).toMatchObject({ allocationDetails: 'ALLOC-2' });
    // State the supplier did not restate is kept, not lost.
    expect(resealed?.supplierState).toMatchObject({ quotedTotalMajor: 11_500 });
  });

  /**
   * A precheck is repeatable by design: a customer may refresh the review page,
   * or be re-prechecked after accepting a price change. Consuming the deal here
   * would retire it before it was ever booked.
   */
  it('does not consume the deal', async () => {
    const { service, rateTokens, dealId: id } = await harness(() => availableAt(11_500));

    const first = await service.revalidate(id);
    const second = await service.revalidate(id);

    expect(rateTokens.consumed).toEqual([]);
    expect(first.status).toBe('REVALIDATED');
    expect(second.status).toBe('REVALIDATED');
    // And the second answer is the same as the first — the quote did not drift.
    expect(second.outcome?.kind).toBe(first.outcome?.kind);
  });
});
