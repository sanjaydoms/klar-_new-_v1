/**
 * Bug Condition Exploration Tests
 *
 * **Validates: Requirements 1.1, 1.16, 1.28, 1.34, 1.52**
 *
 * IMPORTANT: These tests run on UNFIXED code and are EXPECTED TO FAIL.
 * A failing test confirms the bug exists. Do NOT fix the tests — fix the
 * underlying source code as described in the spec (tasks 3–13).
 *
 * Test strategy:
 *  - Each test isolates the minimal logic path that triggers the bug.
 *  - Where possible the logic is extracted directly from the component
 *    without importing the component itself (avoids heavy React/router deps).
 *  - fast-check property generators explore the full domain; concrete
 *    counterexamples are also provided for quick triage.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Bug 1.1 — Stale closure in HotelFilters.applyChanges
// ---------------------------------------------------------------------------
// Reproduction: recreate the EXACT logic from HotelFilters.tsx.
// The handlers call applyChanges({ [field]: next }) while applyChanges reads
// the OTHER fields from closed-over state — which hasn't updated yet when two
// toggles fire in rapid succession (simulating React's async state batching).
// ---------------------------------------------------------------------------

describe('Bug 1.1 — Stale closure in HotelFilters.applyChanges', () => {
  /**
   * Minimal reproduction of the stale-closure pattern extracted from
   * HotelFilters.tsx lines 341-384 (handleStarToggle / handleAmenityToggle /
   * applyChanges).
   *
   * KEY: In React, when two event handlers fire in quick succession within a
   * single render cycle, setState is batched. Both `handleStarToggle` and
   * `handleAmenityToggle` read from the SAME render's closed-over state
   * snapshot. The second handler's `applyChanges` call sees `selectedStars`
   * from the ORIGINAL snapshot (before starToggle committed), so the star
   * selection is dropped.
   *
   * We simulate batching by capturing state ONCE at the start of the cycle,
   * then running both handlers against that same snapshot before any state
   * commits (mirroring React's batch update semantics).
   */
  function buildFilterComponent() {
    // Simulate React state captured in a single render snapshot
    let selectedStars: number[] = [];
    let selectedAmenities: string[] = [];
    const emittedFilters: Array<{ starRatings: number[]; amenities: string[] }> = [];

    // applyChanges reads from outer-scope closures for fields NOT in `updates`
    const applyChanges = (updates: { stars?: number[]; amenities?: string[] }) => {
      // BUG: reads closed-over `selectedStars` / `selectedAmenities`
      // which still hold PRE-TOGGLE values when second handler fires in same batch
      const starRatings = updates.stars ?? selectedStars;
      const amenitiesList = updates.amenities ?? selectedAmenities;
      emittedFilters.push({ starRatings: [...starRatings], amenities: [...amenitiesList] });
    };

    /**
     * React-batch simulation:
     * Both handlers run against the SAME initial state snapshot.
     * State commits are deferred — only applied after ALL handlers complete.
     * This models React 18 automatic batching behavior.
     */
    const handleStarToggle = (star: number) => {
      // Reads from closure (stale — initial snapshot, not reflecting amenity changes)
      const next = selectedStars.includes(star)
        ? selectedStars.filter((s) => s !== star)
        : [...selectedStars, star];
      applyChanges({ stars: next });
      // NOTE: In real React, setState here defers the update — selectedStars
      // is NOT updated yet when the second handler fires in the same batch.
      // We simulate: do NOT update selectedStars here (deferred).
    };

    const handleAmenityToggle = (amenity: string) => {
      // Reads from closure — selectedStars is STILL [] (stale, star not committed yet)
      const next = selectedAmenities.includes(amenity)
        ? selectedAmenities.filter((a) => a !== amenity)
        : [...selectedAmenities, amenity];
      applyChanges({ amenities: next });
      // State commit deferred similarly
    };

    // Apply deferred state commits AFTER both handlers complete
    const commitBatch = (newStars: number[], newAmenities: string[]) => {
      selectedStars = newStars;
      selectedAmenities = newAmenities;
    };

    return { handleStarToggle, handleAmenityToggle, emittedFilters, commitBatch };
  }

  it('PROPERTY: rapid multi-toggle — final emitted filter must contain ALL toggled fields', () => {
    /**
     * Validates: Requirements 1.1
     * Property: for any sequence of ≥2 distinct filter toggles (within same
     * React batch), the LAST emitted filter must reflect ALL active toggles.
     *
     * EXPECTED ON UNFIXED CODE: FAIL
     * Counterexample: star=3 ON + amenity="Pool" ON in same batch:
     *   handleStarToggle(3) emits:   { starRatings: [3], amenities: [] }
     *   handleAmenityToggle('Pool') emits: { starRatings: [], amenities: ['Pool'] }
     *   (starRatings is [] because it reads from the original snapshot — stale)
     *   Last emit = { starRatings: [], amenities: ['Pool'] } — star LOST
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.constantFrom('Pool', 'Gym', 'Spa', 'WiFi', 'Parking'),
        (star, amenity) => {
          const { handleStarToggle, handleAmenityToggle, emittedFilters, commitBatch } =
            buildFilterComponent();

          // Simulate React batch: both handlers fire against same state snapshot
          handleStarToggle(star); // does NOT commit state update
          handleAmenityToggle(amenity); // reads stale selectedStars = []
          // Batch commits AFTER both handlers
          commitBatch([star], [amenity]);

          const lastEmit = emittedFilters[emittedFilters.length - 1];
          const hasStar = lastEmit.starRatings.includes(star);
          const hasAmenity = lastEmit.amenities.includes(amenity);
          return hasStar && hasAmenity;
        },
      ),
      { verbose: true, numRuns: 50 },
    );
  });

  it('CONCRETE counterexample: star=3 ON then amenity="Pool" ON (same batch) — both must appear in last emitted filter', () => {
    /**
     * Validates: Requirements 1.1
     * Concrete failing case from spec: star=3, amenity="Pool"
     *
     * On unfixed code (React batched):
     *   handleStarToggle(3): reads selectedAmenities=[] → emits { stars:[3], amenities:[] }
     *   handleAmenityToggle('Pool'): reads selectedStars=[] (stale!) → emits { stars:[], amenities:['Pool'] }
     *   Last emit = { starRatings:[], amenities:['Pool'] }  ← star=3 dropped
     */
    const { handleStarToggle, handleAmenityToggle, emittedFilters, commitBatch } =
      buildFilterComponent();

    handleStarToggle(3);
    handleAmenityToggle('Pool');
    commitBatch([3], ['Pool']); // batch commits after both handlers

    const lastEmit = emittedFilters[emittedFilters.length - 1];
    // On unfixed code: { starRatings: [], amenities: ['Pool'] } — star dropped
    // Expected:        { starRatings: [3], amenities: ['Pool'] }
    expect(
      lastEmit.starRatings,
      'starRatings should contain 3, but stale closure loses it',
    ).toContain(3);
    expect(lastEmit.amenities, 'amenities should contain Pool').toContain('Pool');
  });
});

// ---------------------------------------------------------------------------
// Bug 1.16 — Negative basePrice in hotelSearchService.searchHotels
// ---------------------------------------------------------------------------
// Reproduction: extract the basePrice computation directly from the mapping
// in hotelSearchService.ts (line ~175).
// ---------------------------------------------------------------------------

describe('Bug 1.16 — Negative basePrice when taxAmount > price', () => {
  /**
   * Extracted verbatim from hotelSearchService.ts hotel mapping:
   *   basePrice: hotel.basePrice ?? (hotel.taxAmount ? price - hotel.taxAmount : price),
   *
   * BUG: when taxAmount > price the result is negative.
   */
  function computeBasePrice(hotel: { basePrice?: number; taxAmount?: number; price: number }) {
    const price = hotel.price;
    // THIS IS THE UNFIXED COMPUTATION from hotelSearchService.ts
    return hotel.basePrice ?? (hotel.taxAmount ? price - hotel.taxAmount : price);
  }

  it('PROPERTY: for any hotel where taxAmount > price, basePrice must be >= 0', () => {
    /**
     * Validates: Requirements 1.16
     * Property: basePrice >= 0 for all valid hotel objects.
     *
     * EXPECTED ON UNFIXED CODE: FAIL
     * Counterexample: price=100, taxAmount=150 → basePrice = -50
     */
    fc.assert(
      fc.property(
        fc.record({
          price: fc.float({ min: 1, max: 10000, noNaN: true }),
          taxAmount: fc.float({ min: 0, max: 20000, noNaN: true }),
        }),
        ({ price, taxAmount }) => {
          const hotel = { price, taxAmount };
          const basePrice = computeBasePrice(hotel);
          return basePrice >= 0;
        },
      ),
      { verbose: true, numRuns: 200 },
    );
  });

  it('CONCRETE counterexample: price=100, taxAmount=150 → basePrice must be >= 0 not -50', () => {
    /**
     * Validates: Requirements 1.16
     * Exact counterexample from spec.
     */
    const hotel = { price: 100, taxAmount: 150 };
    const basePrice = computeBasePrice(hotel);
    // On unfixed code: basePrice = -50
    expect(basePrice, `basePrice should be >= 0, got ${basePrice}`).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Bug 1.28 — Math.random() ratings in CabSearchResultsPage
// ---------------------------------------------------------------------------
// Reproduction: extract the cab mapping logic from fetchQuotes in
// CabSearchResultsPage.tsx (line ~65).
// ---------------------------------------------------------------------------

describe('Bug 1.28 — Math.random() ratings change on every render', () => {
  /**
   * Extracted verbatim from CabSearchResultsPage.tsx mappedCabs:
   *   rating: 4.5 + (Math.random() * 0.5),
   *
   * BUG: rating is re-assigned on every call, so same cabId ≠ same rating.
   */
  function mapCab(rawQuote: { quotationId?: string; model?: string }, index: number) {
    return {
      cabId: rawQuote.quotationId ? `${rawQuote.quotationId}-${index}` : `cab-${index}`,
      vehicleName: rawQuote.model ?? 'Sedan',
      // THIS IS THE UNFIXED COMPUTATION
      rating: 4.5 + Math.random() * 0.5,
    };
  }

  it('PROPERTY: same cabId must produce same rating across two independent mapping calls', () => {
    /**
     * Validates: Requirements 1.28
     * Property: rating(cabId) is deterministic — calling mapCab twice with the
     * same inputs must return the same rating.
     *
     * EXPECTED ON UNFIXED CODE: FAIL
     * Counterexample: cab "C001" → rating=4.73 on call 1, rating=4.91 on call 2
     */
    fc.assert(
      fc.property(
        fc.record({
          quotationId: fc.string({ minLength: 1, maxLength: 20 }),
          model: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        fc.integer({ min: 0, max: 100 }),
        (rawQuote, index) => {
          const cab1 = mapCab(rawQuote, index);
          const cab2 = mapCab(rawQuote, index);

          // Same input → same rating
          return cab1.rating === cab2.rating;
        },
      ),
      { verbose: true, numRuns: 100 },
    );
  });

  it('CONCRETE counterexample: same quotationId mapped twice must yield identical ratings', () => {
    /**
     * Validates: Requirements 1.28
     * Two mapping calls with the same input should produce the same rating.
     */
    const rawQuote = { quotationId: 'Q-C001', model: 'Swift Dzire' };
    const index = 0;

    const cab1 = mapCab(rawQuote, index);
    const cab2 = mapCab(rawQuote, index);

    // On unfixed code these will differ (Math.random() differs each call)
    expect(
      cab1.rating,
      `rating on render 1: ${cab1.rating}, render 2: ${cab2.rating} — must be equal`,
    ).toBe(cab2.rating);
  });
});

// ---------------------------------------------------------------------------
// Bug 1.34 — agentMarkup: 0 hardcoded in CabReviewPage booking payload
// ---------------------------------------------------------------------------
// Reproduction: extract the buildBookingPayload logic from handleBooking in
// CabReviewPage.tsx (lines ~248-280).
// ---------------------------------------------------------------------------

describe('Bug 1.34 — agentMarkup: 0 hardcoded in booking payload', () => {
  /**
   * Extracted from CabReviewPage.tsx handleBooking → bookingPayload.pricingInfo.
   * BUG: agentMarkup is hardcoded to 0 even though cabMarkupAmount is computed.
   */
  function buildPricingInfo(opts: {
    netAmount: number;
    taxAmount: number;
    cabMarkupAmount: number; // correctly computed, but NOT used in payload
  }) {
    const grossAmount = opts.netAmount + opts.taxAmount;
    // THIS IS THE UNFIXED PAYLOAD (from CabReviewPage.tsx)
    return {
      netAmount: opts.netAmount.toFixed(2),
      addonsPrice: '0.00',
      tjTaxAmount: opts.taxAmount.toFixed(2),
      tjManagementFee: '0.00',
      agentMarkup: 0, // BUG: should be opts.cabMarkupAmount
      agentMarkupSplitup: {
        onwardJourneyMarkup: 0, // BUG: should be opts.cabMarkupAmount
        returnJourneyMarkup: 0,
      },
      grossAmount: grossAmount.toFixed(2),
    };
  }

  it('PROPERTY: for any cabMarkupAmount > 0, payload.pricingInfo.agentMarkup must equal cabMarkupAmount', () => {
    /**
     * Validates: Requirements 1.34
     * Property: agentMarkup in payload must equal the computed cabMarkupAmount.
     *
     * EXPECTED ON UNFIXED CODE: FAIL
     * Counterexample: cabMarkupAmount=150 → payload.pricingInfo.agentMarkup=0
     */
    fc.assert(
      fc.property(
        fc.record({
          netAmount: fc.float({ min: 100, max: 50000, noNaN: true }),
          taxAmount: fc.float({ min: 0, max: 5000, noNaN: true }),
          cabMarkupAmount: fc.float({ min: 1, max: 5000, noNaN: true }),
        }),
        ({ netAmount, taxAmount, cabMarkupAmount }) => {
          const pricingInfo = buildPricingInfo({ netAmount, taxAmount, cabMarkupAmount });
          return pricingInfo.agentMarkup === cabMarkupAmount;
        },
      ),
      { verbose: true, numRuns: 100 },
    );
  });

  it('CONCRETE counterexample: cabMarkupAmount=150 → payload.pricingInfo.agentMarkup must be 150 not 0', () => {
    /**
     * Validates: Requirements 1.34
     * Exact counterexample from spec: cabMarkupAmount=150.
     */
    const pricingInfo = buildPricingInfo({
      netAmount: 1000,
      taxAmount: 100,
      cabMarkupAmount: 150,
    });

    // On unfixed code: pricingInfo.agentMarkup === 0
    expect(pricingInfo.agentMarkup, 'agentMarkup should be 150 but is hardcoded 0').toBe(150);
  });
});

// ---------------------------------------------------------------------------
// Bug 1.52 — No traveller form validation in CabReviewPage.handleBooking
// ---------------------------------------------------------------------------
// Reproduction: extract the handleBooking guard logic from CabReviewPage.tsx
// and mock createCabBooking to detect whether it is called.
// ---------------------------------------------------------------------------

describe('Bug 1.52 — handleBooking proceeds with empty traveller fields', () => {
  /**
   * Extracted from CabReviewPage.tsx handleBooking (lines ~224-230).
   *
   * BUG: guard is only `if (!confirmed || !selectedCab || !searchParams) return`
   * — no validation of travellerForm fields.
   * So empty firstName/email still triggers createCabBooking.
   */
  type TravellerForm = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pan: string;
    specialRequest: string;
  };

  /**
   * Simulates the UNFIXED handleBooking entry-point logic.
   * Returns true if createCabBooking would be called.
   */
  function wouldCallCreateCabBooking(
    travellerForm: TravellerForm,
    opts: {
      confirmed: boolean;
      selectedCab: object | null;
      searchParams: object | null;
      walletBalance: number;
      totalAmount: number;
    },
  ): boolean {
    // THIS IS THE UNFIXED GUARD (from CabReviewPage.tsx)
    if (!opts.confirmed || !opts.selectedCab || !opts.searchParams) {
      return false;
    }

    // Wallet check (passes when balance >= totalAmount)
    if (opts.walletBalance < opts.totalAmount) {
      return false;
    }

    // BUG: NO travellerForm validation here — proceeds regardless of empty fields
    // Expected fix: validate firstName, lastName, email, phone before proceeding
    return true; // createCabBooking would be called
  }

  it('PROPERTY: createCabBooking must NOT be called when any required traveller field is empty', () => {
    /**
     * Validates: Requirements 1.52
     * Property: for all travellerForm inputs where any required field is empty,
     * createCabBooking must not be invoked.
     *
     * EXPECTED ON UNFIXED CODE: FAIL
     * Counterexample: firstName="" → createCabBooking is called with empty passenger details
     */
    fc.assert(
      fc.property(
        // Generate traveller forms where at least one required field is empty
        fc.record({
          firstName: fc.oneof(fc.constant(''), fc.string({ minLength: 0, maxLength: 0 })),
          lastName: fc.string({ minLength: 0, maxLength: 20 }),
          email: fc.string({ minLength: 0, maxLength: 40 }),
          phone: fc.string({ minLength: 0, maxLength: 15 }),
          pan: fc.constant(''),
          specialRequest: fc.constant(''),
        }),
        (travellerForm) => {
          const called = wouldCallCreateCabBooking(travellerForm, {
            confirmed: true,
            selectedCab: { cabId: 'C001', price: 500 },
            searchParams: { from: 'Delhi', to: 'Agra', pickupDate: '2025-06-01 10:00' },
            walletBalance: 10000,
            totalAmount: 500,
          });

          // When firstName is empty, createCabBooking MUST NOT be called
          if (!travellerForm.firstName) {
            return !called; // should be false (not called), but unfixed code returns true
          }
          return true; // non-empty firstName — not the bug condition
        },
      ),
      { verbose: true, numRuns: 200 },
    );
  });

  it('CONCRETE counterexample: firstName="" — createCabBooking must NOT be called', () => {
    /**
     * Validates: Requirements 1.52
     * Exact counterexample: empty firstName with otherwise valid booking context.
     */
    const travellerForm: TravellerForm = {
      firstName: '', // EMPTY — required field
      lastName: 'Sharma',
      email: 'test@example.com',
      phone: '9876543210',
      pan: '',
      specialRequest: '',
    };

    const called = wouldCallCreateCabBooking(travellerForm, {
      confirmed: true,
      selectedCab: { cabId: 'C001', price: 500 },
      searchParams: { from: 'Delhi', to: 'Agra', pickupDate: '2025-06-01 10:00' },
      walletBalance: 10000,
      totalAmount: 500,
    });

    // On unfixed code: called === true (bug — booking proceeds with empty firstName)
    expect(called, 'createCabBooking MUST NOT be called when firstName is empty').toBe(false);
  });

  it('CONCRETE counterexample: all empty required fields — createCabBooking must NOT be called', () => {
    /**
     * Validates: Requirements 1.52
     * All required fields empty — booking must be blocked in all cases.
     */
    const travellerForm: TravellerForm = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pan: '',
      specialRequest: '',
    };

    const called = wouldCallCreateCabBooking(travellerForm, {
      confirmed: true,
      selectedCab: { cabId: 'C001', price: 500 },
      searchParams: { from: 'Delhi', to: 'Agra', pickupDate: '2025-06-01 10:00' },
      walletBalance: 10000,
      totalAmount: 500,
    });

    expect(called, 'createCabBooking MUST NOT be called when all required fields are empty').toBe(
      false,
    );
  });
});
