import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Supplier identity must not decide what a customer is told.
 *
 * Which wholesaler filled a rate is our supply-chain detail. When it leaks into
 * presentation, two hotels differ for reasons that have nothing to do with the
 * stay — and the failure is silent, because each supplier's pages look fine in
 * isolation. These are source-level guards: cheap, and they fail loudly if the
 * pattern comes back.
 *
 * Both adapters share one refundability convention — `isRefundable` is true,
 * false, or undefined for genuinely unknown (tripJackAdapter.ts:318,
 * rateGainAdapter.ts:458) — so a supplier name carries no information here that
 * the data does not already state.
 */

const SRC = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');

/** Strip comments so prose explaining a removed pattern doesn't trip the guard. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('refundability is decided by data, not by supplier', () => {
  const PAGES = [
    'pages/Hotels/HotelDetailPage.tsx',
    'pages/Hotels/HotelReviewBooking.tsx',
    'pages/Hotels/HotelBookingConfirmed.tsx',
  ];

  it.each(PAGES)('%s does not exempt a supplier from the non-refundable warning', (page) => {
    const src = code(page);

    // The exact regression: `!isFreeCancel && source !== 'RateGain' && source !== 'RG'`
    // meant a RateGain room never warned, even when genuinely non-refundable —
    // through the detail page, the review page and past payment.
    expect(src).not.toMatch(/!==\s*['"]RateGain['"]/);
    expect(src).not.toMatch(/!==\s*['"]RG['"]/);
  });

  it.each(PAGES)('%s still computes a non-refundable state at all', (page) => {
    // Guards the lazy "fix" of deleting the warning outright.
    expect(code(page)).toMatch(/isNonRef/);
  });
});

describe('supplier names are not shown to customers', () => {
  it('the downloadable search-results PDF carries no supplier badge', () => {
    const src = code('pages/Hotels/SearchResultsPdfTemplate.tsx');

    // This PDF is generated for the customer, with no dev gate — unlike the
    // in-app provider chips, which sit behind `hostname === 'localhost'`.
    expect(src).not.toMatch(/SourceBadge/);
    expect(src).not.toMatch(/TripJack|RateGain/);
  });
});

describe('the TripJack precheck service exposes only what is used', () => {
  const service = code('features/hotels/services/tripjackBookingService.ts');

  it('has no uncalled exports', () => {
    // commitTJ and cancelTJ had zero callers; commit goes through
    // commitUnifiedBooking and cancellation through hotelBookingService.
    expect(service).not.toMatch(/export const commitTJ/);
    expect(service).not.toMatch(/export const cancelTJ/);
    expect(service).toMatch(/export const precheckTJ/);
  });

  it('still posts the payload unwrapped', () => {
    // Not cosmetic. hotel-booking-service picks the supplier from
    // `payload.propertyId || payload.PropertyId || payload.BookReservation?.propertyID`
    // (precheck.service.ts:6-12). Wrapping the payload as `{ BookReservation: … }`
    // — which is what merging this into precheckBooking would do — makes every
    // term miss, so the id resolves to "" and a TripJack precheck is routed to
    // the RateGain provider on the live booking path.
    expect(service).toMatch(/api\.post\(\s*BOOKING_API_ENDPOINTS\.PRECHECK,\s*payload\s*\)/);
    expect(service).not.toMatch(/BookReservation/);
  });
});

describe('which suppliers exist comes from the backend, not the frontend', () => {
  const src = code('features/hotels/components/HotelFilters.tsx');

  it('does not hardcode the supplier list', () => {
    // The filter used to be a literal two-item array plus a
    // `p === 'TJ' ? 'TripJack' : 'RateGain'` ternary, so a third supplier would
    // return hotels the panel could neither list nor label — and the ternary
    // would confidently call it "RateGain".
    expect(src).not.toMatch(/id:\s*['"]TJ['"]/);
    expect(src).not.toMatch(/id:\s*['"]RG['"]/);
    expect(src).not.toMatch(/===\s*['"]TJ['"]\s*\?/);
  });

  it('derives the supplier list from the registry-backed facet counts', () => {
    // Guards the lazy "fix" of deleting the panel instead of un-hardcoding it.
    // providerCounts is seeded backend-side from supplierRegistry.all()
    // (hotel-search-service facets.service.ts).
    expect(src).toMatch(/Object\.keys\(providerCounts\)/);
  });

  it('degrades an unknown supplier code to the code itself', () => {
    // A label map is fine — it is presentation. Falling back to the raw code is
    // what stops a newly registered supplier rendering blank or mislabelled.
    expect(src).toMatch(/PROVIDER_LABELS\[code\]\s*\?\?\s*code/);
  });
});
