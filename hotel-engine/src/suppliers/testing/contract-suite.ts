import { describe, expect, it } from 'vitest';
import { supplierHotelId } from '../../domain/shared/brand.js';
import { sum } from '../../domain/shared/money.js';
import { isCostConsistent } from '../../domain/pricing/supplier-cost.js';
import type { HotelSupplier } from '../contract/hotel-supplier.js';
import type {
  SupplierBookRequest,
  SupplierRate,
  SupplierSearchRequest,
  SupplierSearchTarget,
} from '../contract/dto.js';
import { SupplierRegistry, type SupplierConfig } from '../contract/registry.js';
import {
  TEST_BOOKING_ID,
  TEST_NATIONALITY,
  TEST_OCCUPANCY,
  TEST_STAY,
  stubTransport,
  testContext,
  type StubRoute,
  type StubTransport,
} from './harness.js';

/**
 * The gate every supplier passes before it may be registered.
 *
 * A shared suite rather than per-supplier tests, because the properties that
 * matter are exactly the ones that must hold *identically* across suppliers. In
 * the reference, each supplier was verified on its own terms, and the
 * asymmetries that produced the central defect — one supplier's prices carrying
 * platform markup and the other's not — were invisible precisely because
 * nothing compared the two adapters against one standard.
 *
 * A supplier that cannot pass this does not go into a search that promises the
 * lowest bookable price.
 */
export interface ContractSuiteSubject {
  readonly name: string;
  /**
   * Build the adapter over a stub transport the suite owns.
   *
   * The suite constructs the transport rather than the subject, because some
   * properties are about what went *out* — that a commit was sent exactly once
   * — and those cannot be asserted from the result alone.
   */
  readonly createOver: (transport: StubTransport) => HotelSupplier;
  /** A search target this supplier accepts. */
  readonly searchTarget: SupplierSearchTarget;
  /** Routes returning a realistic, populated search response. */
  readonly happyRoutes: readonly StubRoute[];
  /** Path fragment of the search endpoint, for failure-injection routes. */
  readonly searchPath: string;
  /** How many hotels `happyRoutes` should yield. */
  readonly expectedHotels: number;
  /**
   * Routes returning bookable rates.
   *
   * Required when `capabilities.searchReturnsRates` is false: RateGain's
   * `bestproperties` returns properties with an indicative price and no rate
   * key, so the rate-level assertions have to run against `getRates` instead.
   */
  readonly ratesRoutes?: readonly StubRoute[];
  /** The property to request rates for. Defaults to the first search result. */
  readonly ratesHotelId?: string;
  readonly config: SupplierConfig;
}

const searchRequest = (target: SupplierSearchTarget, page = 1): SupplierSearchRequest => ({
  target,
  stay: TEST_STAY,
  occupancy: TEST_OCCUPANCY,
  nationality: TEST_NATIONALITY,
  page,
  pageSize: 20,
});

/**
 * A commit that every adapter can attempt: two adults, matching `TEST_OCCUPANCY`,
 * carrying the supplier state each one demands before it will send anything.
 */
const bookRequest = (overrides: Partial<SupplierBookRequest> = {}): SupplierBookRequest => ({
  klarBookingId: TEST_BOOKING_ID,
  supplierHotelId: supplierHotelId('X1'),
  supplierRateRef: 'RATE-1',
  stay: TEST_STAY,
  occupancy: TEST_OCCUPANCY,
  nationality: TEST_NATIONALITY,
  guests: [
    { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
    { firstName: 'Vikram', lastName: 'Rao', isPrimary: false, isChild: false },
  ],
  holdOnly: false,
  supplierState: { bookingId: 'BK-1', quotedTotalMajor: 10_000 },
  idempotencyKey: 'idem-1',
  ...overrides,
});

export function runContractSuite(subject: ContractSuiteSubject): void {
  describe(`supplier contract — ${subject.name}`, () => {
    const ctx = () => testContext(subject.config.code);

    const over = (routes: readonly StubRoute[]) => {
      const transport = stubTransport(routes);
      return { supplier: subject.createOver(transport), transport };
    };
    const create = (routes: readonly StubRoute[]): HotelSupplier => over(routes).supplier;
    const brokenRoute: StubRoute = { path: '/', status: 500, body: { message: 'down' } };

    /**
     * Bookable rates, from wherever this supplier issues them.
     *
     * A supplier whose search returns rates is asked once; one whose search is
     * a property listing is asked twice, exactly as the orchestrator will have
     * to. Either way the same assertions run against the result.
     */
    const collectRates = async (): Promise<readonly SupplierRate[]> => {
      const supplier = create(subject.happyRoutes);
      if (supplier.capabilities.searchReturnsRates) {
        const result = await supplier.search(searchRequest(subject.searchTarget), ctx());
        return result.hotels.flatMap((h) => h.rates);
      }

      const withRates = create(subject.ratesRoutes ?? subject.happyRoutes);
      const result = await withRates.getRates(
        {
          supplierHotelId: supplierHotelId(subject.ratesHotelId ?? 'HOTEL-1'),
          stay: TEST_STAY,
          occupancy: TEST_OCCUPANCY,
          nationality: TEST_NATIONALITY,
        },
        ctx(),
      );
      return result.rates;
    };

    describe('registration', () => {
      it('is accepted by the registry', () => {
        const registry = new SupplierRegistry();
        expect(() =>
          registry.register(create(subject.happyRoutes), subject.config),
        ).not.toThrow();
      });

      it('declares at least one search target it can serve', () => {
        const supplier = create(subject.happyRoutes);
        expect(supplier.capabilities.searchTargets.length).toBeGreaterThan(0);
      });

      it('implements the poll when it claims async booking', () => {
        const supplier = create(subject.happyRoutes);
        if (supplier.capabilities.asyncBooking) {
          expect(typeof supplier.getBookingStatus).toBe('function');
        }
      });

      it('can be prechecked, booked and cancelled', () => {
        // Optional booking would permit a supplier whose prices can be shown
        // and not honoured (ADR-0004).
        const supplier = create(subject.happyRoutes);
        expect(typeof supplier.precheck).toBe('function');
        expect(typeof supplier.book).toBe('function');
        expect(typeof supplier.cancel).toBe('function');
      });
    });

    describe('search returns usable, self-consistent costs', () => {
      it('finds hotels in a healthy response', async () => {
        const result = await create(subject.happyRoutes)
          .search(searchRequest(subject.searchTarget), ctx());

        expect(result.status).toBe('SUCCESS');
        expect(result.hotels).toHaveLength(subject.expectedHotels);
        expect(result.supplier).toBe(subject.config.code);
      });

      /**
       * `searchReturnsRates` is a promise about what search hands back, and the
       * orchestrator plans around it: a supplier that declares false needs a
       * second call before any of its properties can be priced. Declaring it
       * wrongly is how every result of a search ends up silently discarded.
       */
      it('search matches what its capabilities promise', async () => {
        const supplier = create(subject.happyRoutes);
        const result = await supplier.search(searchRequest(subject.searchTarget), ctx());

        for (const hotel of result.hotels) {
          if (supplier.capabilities.searchReturnsRates) {
            expect(hotel.rates.length, `${hotel.name} should carry rates`).toBeGreaterThan(0);
          } else {
            expect(hotel.rates, `${hotel.name} must not claim bookable rates`).toEqual([]);
          }
        }
      });

      /**
       * The invariant a two-phase supplier lives or dies by.
       *
       * If search returns no bookable rates, the orchestrator must be able to
       * fetch them for a hotel that search returned, using ONLY what search
       * returned. RateGain's `getproducts` requires `PropertyCode` and
       * `BrandCode`, both documented as coming from `bestproperties` — and
       * `bestproperties` returns no rates to hang them on. An adapter that
       * drops them makes every rate lookup fail, which reads from the outside
       * as "RateGain never has availability".
       */
      it('can price a hotel its own search returned, from what search returned', async () => {
        const supplier = create(subject.happyRoutes);
        if (supplier.capabilities.searchReturnsRates) return;

        const found = await supplier.search(searchRequest(subject.searchTarget), ctx());
        const hotel = found.hotels[0];
        expect(hotel, 'fixture must return at least one hotel').toBeDefined();
        if (hotel === undefined) return;

        const withRates = create(subject.ratesRoutes ?? subject.happyRoutes);
        const rates = await withRates.getRates(
          {
            supplierHotelId: hotel.supplierHotelId,
            stay: TEST_STAY,
            occupancy: TEST_OCCUPANCY,
            nationality: TEST_NATIONALITY,
            ...(hotel.supplierState !== undefined ? { supplierState: hotel.supplierState } : {}),
          },
          ctx(),
        );

        expect(rates.status).toBe('SUCCESS');
        expect(rates.rates.length).toBeGreaterThan(0);
      });

      it('carries whatever the rate call requires on the property itself', async () => {
        const supplier = create(subject.happyRoutes);
        if (supplier.capabilities.searchReturnsRates) return;

        const found = await supplier.search(searchRequest(subject.searchTarget), ctx());
        for (const hotel of found.hotels) {
          // There are no rates to hold it, so it has to live here.
          expect(
            hotel.supplierState,
            `${hotel.name} must carry property-scoped supplier state`,
          ).toBeDefined();
        }
      });

      it('an indicative price, where offered, is self-consistent', async () => {
        const result = await create(subject.happyRoutes)
          .search(searchRequest(subject.searchTarget), ctx());

        for (const hotel of result.hotels) {
          if (hotel.indicativeCost === undefined) continue;
          expect(isCostConsistent(hotel.indicativeCost), hotel.name).toBe(true);
          expect(hotel.indicativeCost.total.minor).toBeGreaterThan(0);
        }
      });

      it('emits costs whose parts sum to their total', async () => {
        const rates = await collectRates();
        expect(rates.length, 'fixture must yield at least one bookable rate').toBeGreaterThan(0);

        for (const rate of rates) {
          expect(isCostConsistent(rate.cost), rate.supplierRateRef).toBe(true);
          expect(
            sum([rate.cost.base, rate.cost.taxes, rate.cost.fees], rate.cost.currency).minor,
          ).toBe(rate.cost.total.minor);
        }
      });

      it('emits only positive totals in one currency', async () => {
        for (const rate of await collectRates()) {
          expect(rate.cost.total.minor).toBeGreaterThan(0);
          expect(rate.cost.base.currency).toBe(rate.cost.currency);
          expect(rate.cost.taxes.currency).toBe(rate.cost.currency);
          expect(rate.cost.fees.currency).toBe(rate.cost.currency);
        }
      });

      /**
       * A minimum selling price is a contractual floor, not a cost. Folding it
       * into the cost would inflate what we believe we owe the supplier and
       * corrupt reconciliation.
       */
      it('keeps a minimum selling price out of the cost', async () => {
        for (const rate of await collectRates()) {
          if (rate.minimumSellingPrice === undefined) continue;
          expect(rate.minimumSellingPrice.amount.currency).toBe(rate.cost.currency);
          expect(rate.minimumSellingPrice.amount.minor).toBeGreaterThan(0);
          expect(typeof rate.minimumSellingPrice.mandatory).toBe('boolean');
        }
      });

      /**
       * The structural guarantee against the teardown's central defect: an
       * adapter has no field in which to return a customer price, so it cannot
       * apply markup even by accident.
       */
      it('returns cost only — never anything price-shaped', async () => {
        for (const rate of await collectRates()) {
          const asAny = rate as unknown as Record<string, unknown>;
          expect(asAny['price']).toBeUndefined();
          expect(asAny['sellingRate']).toBeUndefined();
          expect(asAny['markup']).toBeUndefined();
          const cost = rate.cost as unknown as Record<string, unknown>;
          expect(cost['markup']).toBeUndefined();
          expect(cost['platformMarkup']).toBeUndefined();
        }
      });

      it('every rate carries a reference that can be re-priced', async () => {
        for (const rate of await collectRates()) {
          expect(rate.supplierRateRef.length).toBeGreaterThan(0);
          expect(Object.keys(rate.supplierState).length).toBeGreaterThan(0);
        }
      });

      it('reports a duration and a paging signal', async () => {
        const result = await create(subject.happyRoutes)
          .search(searchRequest(subject.searchTarget), ctx());

        expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
        expect(typeof result.pageInfo.hasMore).toBe('boolean');
      });
    });

    describe('honest data', () => {
      /**
       * The reference synthesised amenities from star rating and hotel name
       * when a feed was silent, and those inventions then drove the amenity
       * filter (D-18).
       */
      it('reports no amenities when the supplier reported none', async () => {
        const result = await create(subject.happyRoutes)
          .search(searchRequest(subject.searchTarget), ctx());

        const bare = result.hotels.find((h) => h.name.includes('No Amenities'));
        expect(bare, 'fixture must include a hotel with no amenity data').toBeDefined();
        expect(bare?.amenityLabels).toEqual([]);
      });

      it('does not claim refundability the supplier did not state', async () => {
        const rates = await collectRates();
        const silent = rates.find((r) => r.supplierRateRef.includes('unknown-cxl'));
        expect(silent, 'fixture must include a rate with no cancellation signal').toBeDefined();
        expect(silent?.cancellation.refundable).toBe('UNKNOWN');
        expect(silent?.cancellation.tier).toBe('UNKNOWN');
      });

      it('emits absolute image URLs or none at all', async () => {
        const result = await create(subject.happyRoutes)
          .search(searchRequest(subject.searchTarget), ctx());

        for (const hotel of result.hotels) {
          for (const url of hotel.imageUrls) {
            expect(url, `${hotel.name} image`).toMatch(/^https?:\/\//);
          }
        }
      });
    });

    describe('failure is data, never an exception', () => {
      const failureModes: ReadonlyArray<readonly [string, StubRoute]> = [
        ['a 500', { path: subject.searchPath, status: 500, body: { message: 'boom' } }],
        ['a 401', { path: subject.searchPath, status: 401, body: { message: 'bad key' } }],
        ['a 429', { path: subject.searchPath, status: 429, body: {} }],
        ['a timeout', { path: subject.searchPath, throws: 'TIMEOUT' }],
        ['a network drop', { path: subject.searchPath, throws: 'NETWORK' }],
        ['garbage', { path: subject.searchPath, status: 200, body: { unexpected: true } }],
        ['null', { path: subject.searchPath, status: 200, body: null }],
      ];

      it.each(failureModes)('resolves rather than rejecting on %s', async (_label, route) => {
        const supplier = create([route]);
        const result = await supplier.search(searchRequest(subject.searchTarget), ctx());

        expect(result.supplier).toBe(subject.config.code);
        expect(['ERROR', 'EMPTY', 'TIMEOUT', 'CIRCUIT_OPEN', 'PARTIAL']).toContain(result.status);
        expect(result.hotels).toEqual([]);
      });

      it('normalises the error rather than leaking the supplier body', async () => {
        const supplier = create([
          {
            path: subject.searchPath,
            status: 500,
            body: { secretInternalTrace: 'jdbc://prod-db/creds', message: 'boom' },
          },
        ]);
        const result = await supplier.search(searchRequest(subject.searchTarget), ctx());

        if (result.error !== undefined) {
          expect(result.error.code).toMatch(/^SUPPLIER_/);
          expect(typeof result.error.retryable).toBe('boolean');
          expect(JSON.stringify(result.error)).not.toContain('jdbc://');
        }
      });

      it('reports a timeout as TIMEOUT, not as no availability', async () => {
        // Conflating the two is what let the reference imply a price was the
        // cheapest available when a supplier had simply not answered (D-8).
        const supplier = create([{ path: subject.searchPath, throws: 'TIMEOUT' }]);
        const result = await supplier.search(searchRequest(subject.searchTarget), ctx());
        expect(result.status).toBe('TIMEOUT');
      });

      it('stops immediately when the deadline has already passed', async () => {
        const supplier = create(subject.happyRoutes);
        const expired = testContext(subject.config.code, {
          now: 1_000_000,
          deadlineAtMs: 999_000,
        });
        const result = await supplier.search(searchRequest(subject.searchTarget), expired);
        expect(['TIMEOUT', 'ERROR', 'EMPTY']).toContain(result.status);
      });

      it('stops when the search is aborted', async () => {
        const supplier = create(subject.happyRoutes);
        const aborted = testContext(subject.config.code, { aborted: true });
        const result = await supplier.search(searchRequest(subject.searchTarget), aborted);
        expect(result.hotels).toEqual([]);
      });
    });

    describe('the rest of the lifecycle also resolves', () => {
      it('precheck resolves on failure', async () => {
        const result = await create([brokenRoute]).precheck(
          {
            supplierHotelId: supplierHotelId('X1'),
            supplierRateRef: 'RATE-1',
            stay: TEST_STAY,
            occupancy: TEST_OCCUPANCY,
            nationality: TEST_NATIONALITY,
            supplierState: { quotedTotalMajor: 10_000 },
          },
          ctx(),
        );
        expect(result.available).toBe(false);
        expect(result.error?.code).toMatch(/^SUPPLIER_/);
      });

      it('book resolves on failure', async () => {
        const result = await create([brokenRoute]).book(bookRequest(), ctx());
        expect(['FAILED', 'PENDING']).toContain(result.status);
        expect(result.error?.code).toMatch(/^SUPPLIER_/);
      });

      it('cancel resolves on failure', async () => {
        const result = await create([brokenRoute])
          .cancel({ supplierBookingRef: 'BK-1' }, ctx());
        expect(['REJECTED', 'PENDING']).toContain(result.status);
      });

      it('getRates resolves on failure', async () => {
        const result = await create([brokenRoute]).getRates(
          {
            supplierHotelId: supplierHotelId('X1'),
            stay: TEST_STAY,
            occupancy: TEST_OCCUPANCY,
            nationality: TEST_NATIONALITY,
          },
          ctx(),
        );
        expect(['ERROR', 'EMPTY']).toContain(result.status);
        expect(result.rates).toEqual([]);
      });

      it('getHotelDetails resolves on failure', async () => {
        const result = await create([brokenRoute])
          .getHotelDetails({ supplierHotelId: supplierHotelId('X1') }, ctx());
        expect(result).toBeNull();
      });
    });

    /**
     * What a supplier must get right at the one step that cannot be undone by
     * searching again.
     *
     * Every property here was a live defect in both adapters when Phase 8
     * started, and each is the kind that a per-supplier test would have to
     * remember to write. They are asserted once, for everyone, because the cost
     * of a supplier that gets one of them wrong is a duplicate reservation, a
     * refunded booking that still exists, or a hotel holding a room for a
     * traveller called "Guest".
     */
    describe('committing is treated as a write, not a read', () => {
      it('does not repeat a commit whose outcome is unknown', async () => {
        // A timeout on a commit is the case where a retry is most tempting and
        // most expensive: the supplier has very often received it, and sending
        // it again books the room twice.
        const { supplier, transport } = over([{ path: '/', throws: 'TIMEOUT' }]);
        await supplier.book(bookRequest(), ctx());

        expect(transport.calls).toHaveLength(1);
      });

      it('reports an unknown outcome as pending rather than failed', async () => {
        // 500 does not mean "not booked". Reporting FAILED refunds the customer
        // and abandons a reservation the supplier may be holding.
        const result = await create([brokenRoute]).book(bookRequest(), ctx());
        expect(result.status).toBe('PENDING');
      });

      it('reports a refusal as failed', async () => {
        // The other side of the same rule: a 400 is a definite refusal, and
        // sending it to reconciliation would leave a dead booking open.
        const result = await create([{ path: '/', status: 400, body: { message: 'no' } }]).book(
          bookRequest(),
          ctx(),
        );
        expect(result.status).toBe('FAILED');
      });

      it('refuses a hold it cannot honour', async () => {
        const { supplier, transport } = over(subject.happyRoutes);
        const result = await supplier.book(bookRequest({ holdOnly: true }), ctx());

        if (supplier.capabilities.supportsHold) {
          expect(result.status).not.toBe('CONFIRMED');
        } else {
          // Declaring no hold support and then committing anyway answers "hold
          // this room" with a booking the customer is liable for.
          expect(result.status).toBe('FAILED');
          expect(transport.calls).toHaveLength(0);
        }
      });

      it('refuses a guest list that does not fill the occupancy it priced', async () => {
        const { supplier, transport } = over(subject.happyRoutes);
        const result = await supplier.book(
          // TEST_OCCUPANCY is two adults; one is supplied.
          bookRequest({
            guests: [{ firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false }],
          }),
          ctx(),
        );

        expect(result.status).toBe('FAILED');
        expect(result.error?.code).toBe('SUPPLIER_BAD_REQUEST');
        // Nothing went out: padding the party with an invented traveller would
        // put a person who does not exist on a real reservation.
        expect(transport.calls).toHaveLength(0);
      });

      it('refuses a party with no primary guest', async () => {
        const { supplier, transport } = over(subject.happyRoutes);
        const result = await supplier.book(
          bookRequest({
            guests: [
              { firstName: 'Asha', lastName: 'Rao', isPrimary: false, isChild: false },
              { firstName: 'Vikram', lastName: 'Rao', isPrimary: false, isChild: false },
            ],
          }),
          ctx(),
        );

        expect(result.status).toBe('FAILED');
        expect(result.error?.code).toBe('SUPPLIER_BAD_REQUEST');
        // Asserted on what went out, not only on the status: `happyRoutes` has
        // no commit route, so a supplier that sent one anyway would still come
        // back FAILED — and the test would pass while the defect was live.
        expect(transport.calls).toHaveLength(0);
      });

      it('only asks to be polled when there is something to poll for', async () => {
        const result = await create([brokenRoute]).book(bookRequest(), ctx());
        if (result.status !== 'PENDING') {
          expect(result.poll).toBeUndefined();
        }
      });
    });

    describe('credentials stay out of the response', () => {
      it('never echoes a credential into a result or an error', async () => {
        const supplier = create([
          { path: subject.searchPath, status: 401, body: { message: 'unauthorized' } },
        ]);
        const result = await supplier.search(searchRequest(subject.searchTarget), ctx());
        const serialised = JSON.stringify(result);
        expect(serialised).not.toContain('SECRET-KEY');
        expect(serialised).not.toContain('SECRET-SECRET');
      });
    });
  });
}
