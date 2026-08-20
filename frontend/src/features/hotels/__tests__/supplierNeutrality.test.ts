import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Source-level guards on what a customer may be told.
 *
 * Two rules, one principle — KLAR states a fact only where it holds evidence
 * for it. Supplier identity must not decide what is said (below), and neither
 * may a field stand in for one we do not have (further down). Both are checked
 * against the source text because both failed silently in review: each page
 * looked correct in isolation.
 *
 * See backend/hotel-engine/docs/UX-CAPABILITY-CONTRACT.md — Part D.
 *
 * ── Rule one: supplier identity ──────────────────────────────────────────
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

/**
 * ── Rule two: a field may not stand in for one we do not have ────────────
 *
 * D-1 and D-2 of the capability contract, which share one root cause: `rating`
 * and `starRating` were separate fields holding the same 1-5 scale, so a
 * `rating || starRating` fallback grew between them at fourteen call sites.
 * Downstream, `hotelSearchService` fed the result into `reviewScore`, and the
 * card carried a 0-10 review-score pathway — bands, labels, colours — waiting
 * to render a star count as a guest review.
 *
 * Neither TripJack nor RateGain returns a guest review score. There is no
 * canonical field for one, so the honest render is absence: not stars, not
 * zero, not a synthetic label.
 *
 * These are source-level guards for the same reason the ones above are: the
 * failure is silent. A five-star hotel scored 5 on a 0-10 scale renders as
 * "Fair", which reads as a real review of a hotel nobody reviewed.
 */

/** Every hotel surface that displays or forwards a star classification. */
const STAR_SURFACES = [
  'features/hotels/components/HotelCard.tsx',
  'features/hotels/components/HotelList.tsx',
  'features/hotels/components/HotelFilters.tsx',
  'features/hotels/components/HotelMapModal.tsx',
  'features/hotels/components/SimilarHotels.tsx',
  'features/hotels/services/hotelSearchService.ts',
  'pages/Hotels/HotelSearchPage.tsx',
  'pages/Hotels/HotelDetailPage.tsx',
  'pages/Hotels/HotelReviewBooking.tsx',
  'pages/Hotels/WishlistPage.tsx',
];

describe('star classification and review score are not interchangeable', () => {
  it.each(STAR_SURFACES)('%s does not fall back between rating and starRating', (file) => {
    const src = code(file);

    // The strong form of the invariant: the `rating` PROPERTY no longer exists
    // on the hotel type, so any read of it is a conflation regardless of how it
    // is spelled. Matching the `starRating || x.rating` shape instead was too
    // weak — a cast between the operands, `starRating || (h as any).rating`,
    // walked straight through it.
    //
    // A local variable named `rating` is untouched by this; only `.rating` is
    // banned, and `.starRating` cannot match it.
    expect(src).not.toMatch(/\.\s*rating\b/);
  });

  it.each(STAR_SURFACES)('%s renders no review score, label or count', (file) => {
    const src = code(file);

    expect(src).not.toMatch(/\breviewScore\b/);
    expect(src).not.toMatch(/\breviewLabel\b/);
    expect(src).not.toMatch(/\breviewCount\b/);
    // The 0-10 band ladder that turned a star count into "Excellent"/"Fair".
    expect(src).not.toMatch(/getReviewLabel|reviewBoxColor|hasReviews/);
  });

  it('the search service does not synthesise a review score from a star rating', () => {
    const src = code('features/hotels/services/hotelSearchService.ts');

    // The exact regression:
    //   reviewScore: hotel.reviewScore ?? hotel.rating ?? hotel.starRating ?? 0
    // Every hotel with a star rating arrived carrying a review score equal to it.
    expect(src).not.toMatch(/reviewScore/);
    // It also emitted the same number under two names, which is what let the
    // `starRating || rating` fallbacks downstream look reasonable.
    expect(src).not.toMatch(/^\s*rating,\s*$/m);
    expect(src).toMatch(/starRating:/);
  });

  it('the hotel type declares starRating and nothing that shadows it', () => {
    const src = code('features/hotels/types/hotelTypes.ts');

    expect(src).toMatch(/\bstarRating\?:\s*number/);
    // A sibling `rating?: number` is what every fallback was written against.
    expect(src).not.toMatch(/^\s*rating\?:\s*number/m);
    expect(src).not.toMatch(/reviewScore\?:|reviewLabel\?:|\breviews\?:/);
  });

  it('no surface invents a star rating for a hotel that has none', () => {
    // `{rating || 5} Star` on the card and the review page, and `|| 'New'` on
    // the map pin. A hotel with no star classification was shown as five-star
    // on the screen immediately before payment.
    for (const file of STAR_SURFACES) {
      const src = code(file);
      // `|| 0` and `?? 0` are fine: zero is "no stars", and every render site
      // is guarded on `> 0`. What is banned is defaulting to a star count or a
      // label we were never given — `|| 5`, `|| 'New'`.
      expect(src).not.toMatch(/starRating\s*(\|\||\?\?)\s*(['"]|[1-9])/);
      expect(src).not.toMatch(/\brating\s*(\|\||\?\?)\s*(['"]|[1-9])/);
    }
  });
});

describe('the guest-rating filter cannot return', () => {
  const FILTER_SURFACES = [
    'features/hotels/components/HotelFilters.tsx',
    'features/hotels/types/hotelTypes.ts',
    'pages/Hotels/HotelSearchPage.tsx',
  ];

  it.each(FILTER_SURFACES)('%s offers no userRatings filter', (file) => {
    // It did not fail — it filtered on `hotel.rating || hotel.starRating`, so
    // "Excellent: 4.5+" silently returned a star-rating filter. A control that
    // answers a different question than its label is worse than a dead one.
    expect(code(file)).not.toMatch(/userRating/i);
  });

  it('initial and reset filter state carry exactly the same keys', () => {
    // The reset literal's own comment says it must mirror the initial state.
    // It has twice drifted — `userRatings` missing from reset, then
    // `priceRanges` present only in reset — and each time a filter had one
    // shape on first load and another after "Clear all".
    const src = code('pages/Hotels/HotelSearchPage.tsx');

    const initial = src.match(/useState<FilterState>\(\{([\s\S]*?)\n  \}\)/);
    const reset = src.match(/setActiveFilters\(\{([\s\S]*?)\n    \}\)/);
    expect(initial, 'initial filter state literal not found').toBeTruthy();
    expect(reset, 'resetFilters literal not found').toBeTruthy();

    const keys = (block: string) =>
      [...block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1] ?? '').sort();

    expect(keys(reset![1] ?? '')).toEqual(keys(initial![1] ?? ''));
  });
});

/**
 * ── Rule three: refundability is decided by data, never by copy ──────────
 *
 * D-3 of the capability contract. Every hotel surface had its own version of
 * "is this refundable", and each one read the display label back:
 *
 *   HotelCard        cancellationPolicy.toUpperCase().includes('FREE CANCELLATION')
 *   HotelDetailPage  same, twice
 *   HotelReviewBooking  same, on the screen before payment
 *   RoomTypeGroup    !/non[-\s]?refundable/i.test(refundableLabel)
 *   hotelSearchService  policy.toUpperCase().includes('NON-REFUNDABLE')
 *
 * That string is generated by this codebase from structured policy data, so
 * reading it back closes a loop: a supplier's wording becomes a contractual
 * claim. "Cancellation charges apply from 5 Sep" contains neither phrase, so
 * RoomTypeGroup rendered it as FREE CANCELLATION.
 *
 * Tracing it also found D-0 alive on two screens. The card required an explicit
 * `false` before saying "Non-Refundable"; the detail page and the review page
 * derived it from `!isFreeCancel`, so an UNKNOWN rate — the common case, since
 * TripJack's listing carries no cancellation block — rendered a hard
 * "Non Refundable" through to the payment step.
 *
 * One resolver now answers this for every surface, and it can say UNKNOWN.
 */

const REFUNDABILITY_SURFACES = [
  'features/hotels/components/HotelCard.tsx',
  'features/hotels/components/RoomTypeGroup.tsx',
  'features/hotels/services/hotelSearchService.ts',
  'pages/Hotels/HotelDetailPage.tsx',
  'pages/Hotels/HotelReviewBooking.tsx',
];

describe('refundability is decided by data, never by display copy', () => {
  it.each(REFUNDABILITY_SURFACES)('%s does not read a refundability claim out of a string', (file) => {
    const src = code(file);

    // Sniffing the generated label for the phrases it was generated from.
    //
    // The word "refundable" is banned only in its UPPER-CASED form, which is
    // how every instance of the defect was written. `f.toLowerCase().includes
    // ('refundable')` is a legitimate and different thing: filtering
    // cancellation text back OUT of an amenities list, which asserts nothing.
    expect(src).not.toMatch(/toUpperCase\(\)\.includes\(\s*['"][^'"]*REFUNDABLE/);
    // The full phrase is never a filter term, so it is banned in any case.
    expect(src).not.toMatch(/includes\(\s*['"][^'"]*free cancellation/i);
    expect(src).not.toMatch(/includes\(\s*['"]NFR['"]/i);
    // RoomTypeGroup's variant: a regex over `refundableLabel`.
    expect(src).not.toMatch(/test\(\s*\w*\.?refundableLabel/);
  });

  it.each(REFUNDABILITY_SURFACES)('%s does not derive "non-refundable" from the absence of a promise', (file) => {
    const src = code(file);

    // `const isNonRef = !isFreeCancel` — UNKNOWN collapses to the negative,
    // which is D-0 with the boolean rebuilt one level up.
    expect(src).not.toMatch(/\bis(Non|NOT)Ref\w*\s*=\s*!/);
    expect(src).not.toMatch(/\bisNonRefundable\w*\s*=\s*!/);
  });

  it('the resolver is three-valued and ignores the label', () => {
    const src = code('utils/hotelUtils.ts');

    expect(src).toMatch(/export const resolveRefundability/);
    expect(src).toMatch(/'REFUNDABLE'\s*\|\s*'NON_REFUNDABLE'\s*\|\s*'UNKNOWN'/);
    // The label must not be reachable from inside the decision.
    expect(src).not.toMatch(/refundableLabel/);
    expect(src).not.toMatch(/cancellationPolicy\b(?!\w)/);
  });

  it.each(REFUNDABILITY_SURFACES.filter((f) => !f.includes('hotelSearchService')))(
    '%s routes through the shared resolver rather than hand-rolling one',
    (file) => {
      // A CALL, not merely the import — `resolveRefundability,` in an import
      // list satisfied a bare-name match while the component went on deriving
      // its own answer inline.
      expect(code(file)).toMatch(/resolveRefundability\s*\(/);
    },
  );

  it('unreadable cancellation policies are not reported as non-refundable', () => {
    // `getCancellationPolicyString` returned the string 'Non-Refundable' when a
    // policy array was present but no amount parsed — inventing the harshest
    // reading of a payload we failed to understand.
    const src = code('features/hotels/services/hotelSearchService.ts');
    const fn = src.slice(src.indexOf('export const getCancellationPolicyString'));
    const body = fn.slice(0, fn.indexOf('\nexport '));

    expect(body).toMatch(/return null;/);
    expect(body).not.toMatch(/else\s*\{\s*return\s*['"]Non-Refundable['"]/);
  });
});

/**
 * ── Rule four: an amenity is reported, never inferred ────────────────────
 *
 * D-5. The card rendered "Free Wi Fi" for any hotel with a star rating, and
 * "Flexible Booking" for every hotel unconditionally — the latter sitting
 * directly above the "✕ Non-Refundable" badge on the same card, contradicting
 * it.
 *
 * The card was the symptom. `rateGainAdapter` was filling every empty amenity
 * list with a guess built from the star rating and from substrings of the
 * hotel's name, and `facets.service.ts` counts `hotel.amenities` into the
 * amenity FILTER — so the guesses became filter options. That is guarded at
 * source in hotel-search-service (`src/adapters/amenities.test.ts`); these are
 * the customer-facing half.
 *
 * Absence stays absence. The fix is not an explicit negative: a hotel that
 * reported no Wi-Fi is not a hotel without Wi-Fi, and the UI says nothing
 * either way.
 */

const AMENITY_SURFACES = [
  'features/hotels/components/HotelCard.tsx',
  'features/hotels/components/RoomTypeGroup.tsx',
  'pages/Hotels/HotelDetailPage.tsx',
  'pages/Hotels/HotelReviewBooking.tsx',
];

describe('amenities are reported, never inferred', () => {
  it.each(AMENITY_SURFACES)('%s hardcodes no amenity claim', (file) => {
    const src = code(file);

    // The generator's own vocabulary, plus the card's two inventions. A filter
    // PANEL may legitimately name an amenity as an option — `HotelFilters` is
    // deliberately not in this list — but a surface that describes one
    // particular hotel may only echo what that hotel reported.
    for (const invention of [
      'Free Wi ?-?Fi',
      'Flexible Booking',
      'Swimming Pool',
      'Fitness Center',
      '24-hour Front Desk',
      'Free Parking',
    ]) {
      expect(src).not.toMatch(new RegExp(`>\\s*${invention}|["'\`]${invention}`, 'i'));
    }
  });

  it.each(AMENITY_SURFACES)('%s gates nothing on the star rating except stars', (file) => {
    const src = code(file);

    // `{starRating >= 1 && (… Free Wi Fi …)}`. A star rating may decide whether
    // to draw STARS; it may not decide whether a hotel has a facility.
    const gates = [...src.matchAll(/starRating\s*[><=]=?\s*\d[^\n]*/g)].map((m) => m[0]);
    for (const gate of gates) {
      expect(gate).not.toMatch(/Wifi|Wi ?-?Fi|Pool|Spa|Parking|Restaurant|Breakfast|Gym/i);
    }
  });

  it('the card renders amenity chips only from the reported list', () => {
    const src = code('features/hotels/components/HotelCard.tsx');
    // Guards the lazy "fix" of deleting the amenity display outright.
    expect(src).toMatch(/amenities/);
  });
});
