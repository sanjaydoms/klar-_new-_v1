import { NO_CACHE } from '../infrastructure/cache/cache.js';
import { InFlightCoalescer } from '../infrastructure/cache/coalescer.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { countryCode, currencyCode, klarBookingId, type SupplierCode } from '../domain/shared/brand.js';
import type { SupplierSearchTarget } from '../suppliers/contract/dto.js';
import { SupplierRegistry } from '../suppliers/contract/registry.js';
import { PricingService } from '../modules/pricing/pricing-service.js';
import { SearchOrchestrator } from '../modules/search/orchestrator.js';
import { HotelDetailService } from '../modules/detail/detail-service.js';
import { RevalidationService } from '../modules/revalidation/revalidation-service.js';
import { BookingService } from '../modules/booking/booking-service.js';
import {
  FakeAuthVerifier,
  FakeClock,
  FakeDestinationResolver,
  FakeMarkupProvider,
  FakePaymentGateway,
  FakeRateTokenStore,
  InMemoryBookingRepository,
  InMemoryPropertyRepository,
  SequentialIds,
  silentLogger,
  VALID_TEST_TOKEN,
  type SeedDestination,
  type SeedHotel,
} from '../modules/testing/fakes.js';
import { RG, TJ, fakeConfig, fakeSupplier, type FakeSupplierSpec } from '../modules/testing/fake-supplier.js';
import type { MarkupRule } from '../domain/pricing/markup.js';
import { DomainError } from '../domain/shared/errors.js';
import { createApiServer } from './server.js';
import { productsHandler, type HandlerDeps } from './handlers.js';
import { HOTEL_NOT_FOUND } from '../modules/detail/detail-service.js';
import { MetricsRegistry } from '../infrastructure/metrics/registry.js';

const IN = countryCode('IN');
void currencyCode;

const SEED: SeedHotel[] = [
  {
    klarHotelId: 'KLAR-TAJ',
    name: 'Taj Exotica Resort and Spa',
    city: 'Goa',
    location: { lat: 15.2596, lng: 73.9188 },
    address: 'Calwaddo, Benaulim, Goa',
    starRating: 5,
    mappings: [
      { supplier: TJ, supplierHotelId: 'TJ-100' },
      { supplier: RG, supplierHotelId: 'RG-900' },
    ],
  },
];

const DESTINATIONS: SeedDestination[] = [
  { klarDestinationId: 'KLAR-DEST-GOA', name: 'Goa', aliases: ['Goa India'], propertyCount: 6_179 },
  { klarDestinationId: 'KLAR-DEST-MUM', name: 'Mumbai', aliases: ['Bombay'], propertyCount: 4_000 },
];

const RULES: MarkupRule[] = [
  { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
];

const supplierSpec = (code: string, id: string, totalMajor: number): FakeSupplierSpec => ({
  code,
  hotels: [
    {
      id,
      name: 'Taj Exotica Resort and Spa',
      city: 'Goa',
      country: 'IN',
      location: { lat: 15.2596, lng: 73.9188 },
      starRating: 5,
      rates: [
        {
          ref: `${code}-rate`,
          totalMajor,
          taxMajor: 900,
          roomName: 'Deluxe Room',
          board: 'Breakfast',
          refundable: true,
        },
      ],
    },
  ],
  precheckAt: totalMajor,
  bookAs: 'CONFIRMED',
  cancelAs: 'CANCELLED',
  ratesByHotel: {
    [id]: [
      {
        ref: `${code}-rate`,
        totalMajor,
        taxMajor: 900,
        roomName: 'Deluxe Room',
        board: 'Breakfast',
        refundable: true,
      },
    ],
  },
});

/** Reachable from the tests, so a booking's stored state can be inspected. */
let bookingStore: InMemoryBookingRepository;
let paymentGateway: FakePaymentGateway;
/** The pieces a second server needs in order to share this one's deal tokens. */
let sharedParts: {
  rateTokens: FakeRateTokenStore;
  pricing: PricingService;
  properties: InMemoryPropertyRepository;
  clock: FakeClock;
  ids: SequentialIds;
};

/**
 * The same booking flow over a registry whose suppliers answer differently.
 *
 * Shares the rate-token store deliberately: a deal issued by one server has to
 * be resolvable by the other, which is exactly the multi-instance property the
 * token design exists to give.
 */
function rebuildBooking(deps: HandlerDeps, registry: SupplierRegistry): BookingService {
  const revalidation = new RevalidationService({
    registry,
    rateTokens: servedParts.rateTokens,
    pricing: servedParts.pricing,
    clock: servedParts.clock,
    ids: servedParts.ids,
    logger: silentLogger,
    config: { deadlineMs: 30_000 },
  });
  return new BookingService({
    registry,
    revalidation,
    rateTokens: servedParts.rateTokens,
    bookings: deps.bookings as InMemoryBookingRepository,
    properties: servedParts.properties,
    payments: paymentGateway,
    clock: servedParts.clock,
    ids: servedParts.ids,
    logger: silentLogger,
    config: { deadlineMs: 60_000 },
  });
}

function buildDeps(): HandlerDeps {
  const registry = new SupplierRegistry();
  const targets = new Map<SupplierCode, SupplierSearchTarget | null>();
  for (const spec of [supplierSpec('TJ', 'TJ-100', 12_000), supplierSpec('RG', 'RG-900', 11_500)]) {
    const supplier = fakeSupplier(spec);
    registry.register(supplier, fakeConfig(spec.code));
    targets.set(supplier.code, { kind: 'DEST_CODE', code: 'GOA' });
  }

  const properties = new InMemoryPropertyRepository(SEED);
  const destinations = new FakeDestinationResolver(targets, 6_179, IN, DESTINATIONS);
  const pricing = new PricingService(new FakeMarkupProvider(RULES));
  const rateTokens = new FakeRateTokenStore();
  const clock = new FakeClock();
  const ids = new SequentialIds();

  bookingStore = new InMemoryBookingRepository();
  paymentGateway = new FakePaymentGateway();
  sharedParts = { rateTokens, pricing, properties, clock, ids };
  const metrics = new MetricsRegistry();

  const revalidation = new RevalidationService({
    registry,
    rateTokens,
    pricing,
    clock,
    ids,
    logger: silentLogger,
    config: { deadlineMs: 30_000 },
  });

  return {
    orchestrator: new SearchOrchestrator({
      registry,
      destinations,
      properties,
      pricing,
      rateTokens,
      cache: NO_CACHE,
      coalescer: new InFlightCoalescer(),
      clock,
      ids,
      logger: silentLogger,
      metrics,
      config: {
        deadlineMs: 15_000,
        homeCountry: IN,
        selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
        rateTokenTtlMs: 900_000,
      },
    }),
    detail: new HotelDetailService({
      registry,
      properties,
      pricing,
      rateTokens,
      clock,
      ids,
      logger: silentLogger,
      config: {
        deadlineMs: 20_000,
        homeCountry: IN,
        selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
        rateTokenTtlMs: 900_000,
      },
    }),
    destinations,
    properties,
    logger: silentLogger,
    defaultCountry: IN,
    revalidation,
    bookings: bookingStore,
    auth: new FakeAuthVerifier(),
    metrics,
    booking: new BookingService({
      registry,
      revalidation,
      rateTokens,
      bookings: bookingStore,
      properties,
      payments: paymentGateway,
      clock,
      ids,
      logger: silentLogger,
      config: { deadlineMs: 60_000 },
    }),
  };
}

let server: Server;
let base: string;

let baseDeps: HandlerDeps;
/**
 * The parts belonging to the SERVED deps, captured here.
 *
 * `buildDeps()` is called again by a later test that needs a failing
 * orchestrator, and that call replaces the module-level `sharedParts`. Anything
 * that has to share this server's rate tokens must hold the ones taken at
 * startup, not whatever the variable points at when it is read.
 */
let servedParts: typeof sharedParts;

beforeAll(async () => {
  baseDeps = buildDeps();
  servedParts = sharedParts;
  server = createApiServer({ deps: baseDeps, corsOrigins: ['https://klar.example'] });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err !== undefined && err !== null ? reject(err) : resolve())),
  );
});

const SEARCH_BODY = {
  destination: 'Goa',
  checkin: '2026-09-10',
  checkout: '2026-09-13',
  countryCode: 'IN',
  currency: 'INR',
  pageNo: 1,
  sortBy: 'price_asc',
  rooms: [{ adults: 2, children: 0, childAges: [] }],
};

/**
 * Carries a valid bearer token by default, since most callers exercise a
 * route that is not about auth itself and would otherwise all need to state
 * one. `authorization: ''` in `headers` overrides it back off, for the tests
 * that are specifically about the 401 case.
 */
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${VALID_TEST_TOKEN}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });

// ═══ The endpoints the frontend calls ══════════════════════════════════════

describe('POST /api/search/hotels/search', () => {
  it('answers the legacy payload with the legacy envelope', async () => {
    const response = await post('/api/search/hotels/search', SEARCH_BODY);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const payload = (await response.json()) as Record<string, unknown>;
    const results = payload['results'] as unknown[];
    expect(results).toHaveLength(1);
    expect(payload['body']).toEqual(results);
    expect(payload['hasMore']).toBe(false);
    expect(payload['inventoryCount']).toBe(6_179);
    expect(payload['priceGuarantee']).toBe('BEST_AVAILABLE');

    const hotel = results[0] as Record<string, unknown>;
    expect(hotel['hotelId']).toBe('RG:RG-900');
    expect(hotel['klarHotelId']).toBe('KLAR-TAJ');
    // 11,500 net + 12% platform markup on the room, so strictly above net.
    expect(hotel['price']).toBeGreaterThan(11_500);
  });

  /** A live price must not be cached between us and the customer. */
  it('forbids caching the response', async () => {
    const response = await post('/api/search/hotels/search', SEARCH_BODY);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('resolves free text through an alias', async () => {
    const response = await post('/api/search/hotels/search', {
      ...SEARCH_BODY,
      destination: 'Bombay',
    });
    // Mumbai resolves, and no supplier serves it in this fixture, so the
    // search is empty rather than an error.
    expect(response.status).toBe(200);
  });

  /**
   * A destination we do not sell is a 404, not a 400: the payload is correct
   * and telling the customer to fix it would be a lie.
   */
  it('reports an unknown destination as not found', async () => {
    const response = await post('/api/search/hotels/search', {
      ...SEARCH_BODY,
      destination: 'Atlantis',
    });
    expect(response.status).toBe(404);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('UNKNOWN_DESTINATION');
  });

  it('rejects a payload with no dates', async () => {
    const { checkin: _a, checkout: _b, ...withoutDates } = SEARCH_BODY;
    const response = await post('/api/search/hotels/search', withoutDates);
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('MISSING_DATES');
  });

  it('accepts a supplier-prefixed hotel id in the destination field', async () => {
    // §2.2: the frontend overloads `destination` for hotel-name search.
    const response = await post('/api/search/hotels/search', {
      ...SEARCH_BODY,
      destination: 'TJ:TJ-100',
    });
    expect(response.status).toBe(200);
  });
});

describe('POST /api/search/hotels/:propertyId/products', () => {
  const body = {
    checkin: '2026-09-10',
    checkout: '2026-09-13',
    currency: 'INR',
    rooms: [{ adults: 2, children: 0 }],
  };

  it('prices one hotel through every supplier that sells it', async () => {
    const response = await post('/api/search/hotels/KLAR-TAJ/products', body);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['klarHotelId']).toBe('KLAR-TAJ');
    const products = payload['products'] as Array<Record<string, unknown>>;
    expect(products.length).toBeGreaterThan(0);

    const rates = products.flatMap((p) => p['rate'] as Array<Record<string, unknown>>);
    expect(rates.map((r) => r['source']).sort()).toEqual(['RG', 'TJ']);
    // The rate key the page reads is a dealId, not a supplier rate reference.
    for (const rate of rates) expect(String(rate['rateKey'])).toMatch(/^deal-/);
  });

  it('accepts the legacy prefixed id the page still routes on', async () => {
    const response = await post('/api/search/hotels/TJ%3ATJ-100/products', body);
    expect(response.status).toBe(200);
    expect(((await response.json()) as Record<string, unknown>)['klarHotelId']).toBe('KLAR-TAJ');
  });

  it('reports an unknown hotel as not found', async () => {
    const response = await post('/api/search/hotels/KLAR-NOPE/products', body);
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('UNKNOWN_HOTEL');
  });

  it('rejects a request with no dates', async () => {
    const response = await post('/api/search/hotels/KLAR-TAJ/products', { rooms: [] });
    expect(response.status).toBe(400);
  });
});

/**
 * D-1 in a second costume.
 *
 * `countryCode` on a legacy payload is the TRAVELLER's nationality, and it was
 * being passed as the detail page's markup region. A search prices under the
 * destination's country, so an Indian customer looking at a Dubai hotel had the
 * card priced INTERNATIONAL and the detail page priced DOMESTIC — two prices
 * for one room, one click apart.
 */
describe('the detail page does not price by nationality', () => {
  it('never sends the traveller’s country as the markup region', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const deps: HandlerDeps = {
      ...baseDeps,
      detail: {
        detail: (req: Record<string, unknown>) => {
          captured.push(req);
          return Promise.resolve(HOTEL_NOT_FOUND);
        },
      } as unknown as HandlerDeps['detail'],
    };

    await productsHandler(
      'KLAR-TAJ',
      { checkin: '2026-09-10', checkout: '2026-09-13', countryCode: 'GB', currency: 'INR' },
      deps,
    );

    expect(captured).toHaveLength(1);
    // The nationality still reaches the suppliers, because it changes the rate.
    expect(String(captured[0]?.['nationality'])).toBe('GB');
    // It does not decide which country's markup rules apply.
    expect(captured[0]?.['destinationCountry']).toBeUndefined();
  });
});

describe('GET /api/search/hotels/suggestions', () => {
  it('suggests destinations and does not shadow the search route', async () => {
    const response = await fetch(`${base}/api/search/hotels/suggestions?q=Goa`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { body: Array<{ name: string }> };
    expect(payload.body[0]?.name).toBe('Goa');
  });

  it('treats an empty query as no suggestions rather than an error', async () => {
    const response = await fetch(`${base}/api/search/hotels/suggestions?q=`);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { body: unknown[] }).body).toEqual([]);
  });
});

// ═══ What the edge must refuse ═════════════════════════════════════════════

describe('the edge itself', () => {
  it('serves health without touching a supplier', async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { status: boolean }).status).toBe(true);
  });

  it('serves Prometheus text at /metrics, unauthenticated, reflecting searches already run', async () => {
    await post('/api/search/hotels/search', SEARCH_BODY);

    const response = await fetch(`${base}/metrics`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');

    const text = await response.text();
    expect(text).toMatch(/^klar_searches_total \d+$/m);
    expect(Number(/klar_searches_total (\d+)/.exec(text)?.[1])).toBeGreaterThan(0);
  });

  it('404s an unknown path and an unknown method', async () => {
    expect((await fetch(`${base}/api/search/hotels/nope/nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/search/hotels/search`)).status).toBe(404);
  });

  it('refuses a body that is not JSON', async () => {
    const response = await fetch(`${base}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('MALFORMED_JSON');
  });

  /** An unbounded body read is a memory-exhaustion primitive. */
  it('refuses an oversized body', async () => {
    const response = await fetch(`${base}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ destination: 'x'.repeat(300 * 1024) }),
    });
    expect(response.status).toBe(413);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('BODY_TOO_LARGE');
  });

  it('turns a rejected stay into a clean 400 without reaching the error mapper', async () => {
    const response = await post('/api/search/hotels/search', {
      ...SEARCH_BODY,
      // Check-out before check-in. The request mapper catches this itself, so
      // the client gets a specific reason rather than a generic failure.
      checkin: '2026-09-13',
      checkout: '2026-09-10',
    });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { status: boolean; error: { code: string } };
    expect(payload.status).toBe(false);
    expect(payload.error.code).toBe('INVALID_REQUEST');
  });

  it('answers CORS preflight only for an allowed origin', async () => {
    const allowed = await fetch(`${base}/api/search/hotels/search`, {
      method: 'OPTIONS',
      headers: { origin: 'https://klar.example' },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://klar.example');

    const denied = await fetch(`${base}/api/search/hotels/search`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('does not echo an unlisted origin onto a real response', async () => {
    const response = await post('/api/search/hotels/search', SEARCH_BODY, {
      origin: 'https://evil.example',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});

// ═══ The error mapper, exercised directly ══════════════════════════════════

describe('what escapes when something deeper throws', () => {
  /**
   * Errors from inside the engine reach the edge only when every guard below
   * has already failed — the adapters map defensively and the fan-out isolates
   * per supplier. Rare is not never, and what the client sees when it happens
   * is a security property, so it is pinned here by making a dependency throw
   * rather than by hoping a real input can still get through.
   */
  const serveWith = async (thrown: unknown) => {
    const deps = buildDeps();
    const failing: HandlerDeps = {
      ...deps,
      orchestrator: {
        search: () => Promise.reject(thrown),
      } as unknown as HandlerDeps['orchestrator'],
    };
    const s = createApiServer({ deps: failing });
    await new Promise<void>((resolve) => s.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
    const response = await fetch(`${url}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(SEARCH_BODY),
    });
    const text = await response.text();
    await new Promise<void>((resolve) => s.close(() => resolve()));
    return { status: response.status, text };
  };

  /**
   * A broken invariant is OUR bug, not the caller's.
   *
   * Every genuine client mistake is answered with a specific 400 by the
   * handlers, long before this point. What gets here is something like
   * `PRICE_SPLIT_MISMATCH` — a price whose parts stopped adding up. A 400 would
   * tell the customer to fix a request that is correct, and the message is an
   * internal invariant's wording: not useful to them, and not theirs to read.
   */
  it('treats a broken domain invariant as an internal failure, not a bad request', async () => {
    const { status, text } = await serveWith(
      new DomainError('PRICE_SPLIT_MISMATCH', 'displayBase + taxesAndFees must equal total', {
        displayBase: 1_180_050,
        supplier: 'RG',
      }),
    );

    expect(status).toBe(500);
    expect(text).not.toMatch(/\/src\/|\.ts:|at Object\.|node_modules/);
    // Neither the context nor the invariant's own wording crosses the wire.
    expect(text).not.toContain('1180050');
    expect(text).not.toContain('displayBase');
    expect(text).not.toContain('PRICE_SPLIT_MISMATCH');

    const payload = JSON.parse(text) as { status: boolean; error: { code: string } };
    expect(payload.status).toBe(false);
    expect(payload.error.code).toBe('INTERNAL');
  });

  it('says nothing at all about an unexpected failure', async () => {
    const { status, text } = await serveWith(new Error('ECONNREFUSED 10.0.3.14:5432 pg-primary'));

    expect(status).toBe(500);
    // No host, no port, no stack: an internal failure is not a client's business.
    expect(text).not.toContain('10.0.3.14');
    expect(text).not.toContain('pg-primary');
    expect(text).not.toMatch(/\/src\/|\.ts:|node_modules/);
    expect((JSON.parse(text) as { error: { code: string } }).error.code).toBe('INTERNAL');
  });
});

// ═══ Phase 7: the booking gate ═════════════════════════════════════════════

describe('POST /api/booking/precheck', () => {
  /**
   * The client sends the opaque id it already holds and nothing else. The
   * legacy frontend posted two entirely different bodies to this URL — a
   * five-key TripJack object and a doubly-wrapped native RateGain
   * `BookReservation` envelope assembled in the browser (teardown §2.7). Both
   * are replaced by one id.
   */
  it('revalidates a deal taken straight from a search response', async () => {
    const search = await post('/api/search/hotels/search', SEARCH_BODY);
    const hotel = ((await search.json()) as { results: Array<{ dealId: string }> }).results[0];
    expect(hotel?.dealId).toBeTruthy();

    const response = await post('/api/booking/precheck', { dealId: hotel?.dealId });
    expect(response.status).toBe(200);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['dealId']).toBe(hotel?.dealId);
    // The fake supplier's precheck reports the rate unavailable, which is a
    // complete answer and not a green light.
    // The supplier re-confirms the same net, so nothing changed and the flow
    // may continue without asking the customer again.
    expect(payload['outcome']).toBe('UNCHANGED');
    expect(payload['status']).toBe(true);
    expect(payload['requiresConsent']).toBe(false);
  });

  it('answers an expired or unknown deal with 409, not 404', async () => {
    // The id was real once; the offer behind it is gone. The client's move is
    // to search again, not to correct a URL.
    const response = await post('/api/booking/precheck', { dealId: 'deal-never-existed' });
    expect(response.status).toBe(409);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['outcome']).toBe('DEAL_NOT_FOUND');
    expect(payload['status']).toBe(false);
    expect(String(payload['message'])).toContain('search again');
  });

  it('requires a dealId and nothing else', async () => {
    expect((await post('/api/booking/precheck', {})).status).toBe(400);
    expect((await post('/api/booking/precheck', { dealId: '' })).status).toBe(400);
    expect((await post('/api/booking/precheck', { dealId: 42 })).status).toBe(400);
  });

  it('never asks the browser to assemble supplier protocol', async () => {
    const search = await post('/api/search/hotels/search', SEARCH_BODY);
    const hotel = ((await search.json()) as { results: Array<{ dealId: string }> }).results[0];
    const response = await post('/api/booking/precheck', { dealId: hotel?.dealId });

    // Nothing a RateGain envelope would need ever reaches the client.
    const text = await response.text();
    for (const leak of ['RoomSelectionKey', 'BookReservation', 'EchoToken', 'ResStatus']) {
      expect(text).not.toContain(leak);
    }
  });
});

// ═══ Phase 8: booking ══════════════════════════════════════════════════════

/** A deal id, taken from a real search response the way a client would. */
const dealFromSearch = async (): Promise<string> => {
  const search = await post('/api/search/hotels/search', SEARCH_BODY);
  const results = ((await search.json()) as { results: Array<{ dealId: string }> }).results;
  const deal = results[0]?.dealId;
  if (deal === undefined) throw new Error('the search returned no deal to book');
  return deal;
};

const GUESTS = [
  { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false, email: 'asha@example.com' },
  { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
];

describe('POST /api/booking/commit', () => {
  /**
   * The whole legacy commit payload, replaced.
   *
   * HotelReviewBooking.tsx built two entirely different bodies for this URL: a
   * native RateGain BookReservation envelope — ResStatus, DemandBookingId,
   * EchoToken, RoomSelection[].RoomSelectionKey, RoomRate as price per room per
   * night — or a TripJack object, chosen by whether the hotel id started with
   * "TJ:". What goes up now is an opaque id and the names of the people staying.
   */
  it('books from a dealId and a guest list, and nothing else', async () => {
    const response = await post('/api/booking/commit', {
      dealId: await dealFromSearch(),
      idempotencyKey: 'idem-api-1',
      guests: GUESTS,
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { body: Record<string, unknown> };
    expect(payload.body['status']).toBe('CONFIRMED');
    expect(payload.body['hotelName']).toBe('Taj Exotica Resort and Spa');
    expect(payload.body['roomType']).toBe('Deluxe Room');
    expect(payload.body['checkIn']).toBe('2026-09-10');
    expect(payload.body['nights']).toBe(3);
    // 11,500 net + 12% platform markup: RateGain is the cheaper supplier.
    expect(payload.body['totalAmount']).toBe(12_772);
    expect(payload.body['currencyCode']).toBe('INR');
    expect(payload.body['guestName']).toBe('Asha Rao');
  });

  /**
   * The bookings page reads hotelName, roomType, hotelImage and rooms[] BEFORE
   * falling back to the stored raw supplier request. Supplying the canonical
   * fields makes the supplier-specific branches unreachable — which is what
   * lets a third supplier be added without a frontend release.
   */
  it('answers with a canonical booking, with no supplier protocol in it', async () => {
    const response = await post('/api/booking/commit', {
      dealId: await dealFromSearch(),
      idempotencyKey: 'idem-api-2',
      guests: GUESTS,
    });

    const text = await response.text();
    for (const leak of [
      'BookReservation',
      'RoomSelectionKey',
      'EchoToken',
      'ResStatus',
      'rateGainRequest',
      'tripJackRequest',
    ]) {
      expect(text, `${leak} must not reach the client`).not.toContain(leak);
    }
  });

  /**
   * The legacy client retries a commit twice on a 503, a 504 or a network
   * error, with no key of its own. Minting one per request would make every one
   * of those retries a fresh booking.
   */
  it('refuses a commit with no idempotency key', async () => {
    const response = await post('/api/booking/commit', {
      dealId: await dealFromSearch(),
      guests: GUESTS,
    });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
  });

  it('answers a retry with the same booking', async () => {
    const dealId = await dealFromSearch();
    const body = { dealId, idempotencyKey: 'idem-api-retry', guests: GUESTS };

    const first = (await (await post('/api/booking/commit', body)).json()) as {
      body: { klarBookingId: string };
    };
    const second = (await (await post('/api/booking/commit', body)).json()) as {
      body: { klarBookingId: string };
    };

    expect(second.body.klarBookingId).toBe(first.body.klarBookingId);
  });

  it('refuses a guest list that is missing or malformed', async () => {
    const dealId = await dealFromSearch();
    const shapes: unknown[] = [undefined, [], [{ firstName: 'Asha' }], 'Asha Rao'];
    for (const [index, guests] of shapes.entries()) {
      const response = await post('/api/booking/commit', {
        dealId,
        idempotencyKey: `idem-bad-${index}`,
        guests,
      });
      expect(response.status).toBe(400);
    }
  });

  it('refuses a party that does not fill what was priced', async () => {
    const response = await post('/api/booking/commit', {
      dealId: await dealFromSearch(),
      idempotencyKey: 'idem-api-short',
      guests: [GUESTS[0]],
    });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('INVALID_PARTY');
  });

  it('reports an expired deal as 409, so the client searches again', async () => {
    const response = await post('/api/booking/commit', {
      dealId: 'deal-never-existed',
      idempotencyKey: 'idem-api-gone',
      guests: GUESTS,
    });
    expect(response.status).toBe(409);
  });
});

describe('authentication on commit and cancel', () => {
  it('refuses a commit with no Authorization header', async () => {
    const response = await post(
      '/api/booking/commit',
      { dealId: await dealFromSearch(), idempotencyKey: 'idem-noauth-1', guests: GUESTS },
      { authorization: '' },
    );
    expect(response.status).toBe(401);
  });

  it('refuses a commit with an invalid token', async () => {
    const response = await post(
      '/api/booking/commit',
      { dealId: await dealFromSearch(), idempotencyKey: 'idem-noauth-2', guests: GUESTS },
      { authorization: 'Bearer not-the-token' },
    );
    expect(response.status).toBe(401);
  });

  it('refuses a cancel with no Authorization header', async () => {
    const response = await post(
      '/api/booking/cancel',
      { bookingId: 'KLAR-BKG-whatever' },
      { authorization: '' },
    );
    expect(response.status).toBe(401);
  });

  /**
   * The actual gap this closes: a client claiming someone else's identity in
   * the body must not be believed. The verified token wins.
   */
  it('ignores a self-reported userId in the body and uses the verified identity', async () => {
    const response = await post('/api/booking/commit', {
      dealId: await dealFromSearch(),
      idempotencyKey: 'idem-spoofed-userid',
      guests: GUESTS,
      userId: 'someone-elses-account',
    });
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { body: { klarBookingId: string } };
    // baseDeps, not the module-level bookingStore: a later test's buildDeps()
    // call reassigns bookingStore to a repository this server never wrote to.
    const booking = await baseDeps.bookings?.findById(klarBookingId(payload.body.klarBookingId));
    // FakeAuthVerifier's default identity for a valid token — see buildDeps().
    expect(booking?.userId).toBe('user-1');
    expect(booking?.userId).not.toBe('someone-elses-account');
  });
});

describe('POST /api/booking/cancel', () => {
  it('cancels a booking it made and reports the refund', async () => {
    const commit = (await (
      await post('/api/booking/commit', {
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-api-cancel',
        guests: GUESTS,
      })
    ).json()) as { body: { klarBookingId: string } };

    const response = await post('/api/booking/cancel', {
      bookingId: commit.body.klarBookingId,
      reason: 'changed plans',
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      body: { status: string };
      refund?: { amount: number };
    };
    expect(payload.body.status).toBe('CANCELLED');
    expect(payload.refund?.amount).toBe(12_772);
  });

  it('answers an unknown booking with 404', async () => {
    const response = await post('/api/booking/cancel', { bookingId: 'KLAR-BKG-nope' });
    expect(response.status).toBe(404);
  });

  /**
   * The oracle-safety property, on the write path: a booking that belongs to
   * someone else answers exactly like one that does not exist, not a 403 that
   * would confirm it exists and is just off-limits.
   */
  it('refuses to cancel someone else’s booking, indistinguishably from one that does not exist', async () => {
    const commit = (await (
      await post('/api/booking/commit', {
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-cancel-not-mine',
        guests: GUESTS,
      })
    ).json()) as { body: { klarBookingId: string } };

    const id = klarBookingId(commit.body.klarBookingId);
    const owned = await baseDeps.bookings?.findById(id);
    expect(owned).not.toBeNull();
    // Reassign ownership, as if this booking belonged to another customer —
    // FakeAuthVerifier only ever authenticates as 'user-1' for a valid token.
    (baseDeps.bookings as InMemoryBookingRepository).bookings.set(String(id), {
      ...(owned as NonNullable<typeof owned>),
      userId: 'someone-elses-account',
    });

    const response = await post('/api/booking/cancel', {
      bookingId: commit.body.klarBookingId,
      reason: 'not mine to cancel',
    });
    expect(response.status).toBe(404);

    // Untouched: the refusal happened before the write.
    const stillActive = await baseDeps.bookings?.findById(id);
    expect(stillActive?.status).not.toBe('CANCELLED');
  });
});

/**
 * The consent round-trip, over HTTP.
 *
 * Phase 7 computed `requiresConsent` and returned it; nothing accepted an
 * approval and re-prechecked against it. This is the other half: the commit is
 * refused with the new figure, the customer accepts THAT figure, and the second
 * commit goes through — at the price they agreed to and no other.
 */
describe('a price that moves between the review page and the commit', () => {
  let movedServer: Server;
  let movedBase: string;

  beforeAll(async () => {
    // The same deals, re-priced 800 higher than they were quoted — beyond the
    // tolerance the domain absorbs — over the SAME rate-token store, so a deal
    // issued by the first server resolves here.
    const registry = new SupplierRegistry();
    for (const spec of [supplierSpec('TJ', 'TJ-100', 12_000), supplierSpec('RG', 'RG-900', 11_500)]) {
      registry.register(
        fakeSupplier({ ...spec, precheckAt: (spec.precheckAt as number) + 800 }),
        fakeConfig(spec.code),
      );
    }
    const moved = { ...baseDeps, booking: rebuildBooking(baseDeps, registry) } as HandlerDeps;

    movedServer = createApiServer({ deps: moved });
    await new Promise<void>((resolve) => movedServer.listen(0, '127.0.0.1', resolve));
    movedBase = `http://127.0.0.1:${(movedServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => movedServer.close(() => resolve()));
  });

  it('refuses without consent, then books at the figure the customer accepted', async () => {
    // The deal is issued by the original server's search, and both share the
    // same rate-token store through `buildDeps`.
    const dealId = await dealFromSearch();

    const refused = await fetch(`${movedBase}/api/booking/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${VALID_TEST_TOKEN}` },
      body: JSON.stringify({ dealId, idempotencyKey: 'idem-consent-1', guests: GUESTS }),
    });

    expect(refused.status).toBe(409);
    const report = (await refused.json()) as {
      requiresConsent: boolean;
      outcome: string;
      body: { totalNet: number };
    };
    expect(report.requiresConsent).toBe(true);
    expect(report.outcome).toBe('PRICE_INCREASED');
    // The figure the page shows is the figure the next commit will charge.
    expect(report.body.totalNet).toBeGreaterThan(12_772);

    const accepted = await fetch(`${movedBase}/api/booking/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${VALID_TEST_TOKEN}` },
      body: JSON.stringify({
        dealId,
        idempotencyKey: 'idem-consent-2',
        guests: GUESTS,
        consent: {
          acceptedTotalMinor: Math.round(report.body.totalNet * 100),
          currency: 'INR',
        },
      }),
    });

    expect(accepted.status).toBe(200);
    const booked = (await accepted.json()) as { body: { status: string; totalAmount: number } };
    expect(booked.body.status).toBe('CONFIRMED');
    expect(booked.body.totalAmount).toBe(report.body.totalNet);
  });

  it('refuses a consent that is not a figure in a currency', async () => {
    const response = await fetch(`${movedBase}/api/booking/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${VALID_TEST_TOKEN}` },
      body: JSON.stringify({
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-consent-bad',
        guests: GUESTS,
        consent: { acceptedTotal: '13,572.00' },
      }),
    });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('INVALID_CONSENT');
  });
});

describe('GET /api/booking/bookings/:id', () => {
  it('answers a guest holding the public token', async () => {
    const commit = (await (
      await post('/api/booking/commit', {
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-api-fetch',
        guests: GUESTS,
      })
    ).json()) as { body: { klarBookingId: string; publicToken: string } };

    const response = await fetch(
      `${base}/api/booking/bookings/${commit.body.klarBookingId}?token=${commit.body.publicToken}`,
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { body: { klarBookingId: string } };
    expect(payload.body.klarBookingId).toBe(commit.body.klarBookingId);
  });

  /**
   * The id turns up in logs, support tickets and URLs; the token does not.
   * Answering on the id alone would make a booking readable by anyone who has
   * seen one — and a wrong token gets the same answer as a booking that does
   * not exist, so the id space cannot be used as an oracle.
   */
  it('does not answer on the id alone', async () => {
    const commit = (await (
      await post('/api/booking/commit', {
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-api-guess',
        guests: GUESTS,
      })
    ).json()) as { body: { klarBookingId: string } };

    const bare = await fetch(`${base}/api/booking/bookings/${commit.body.klarBookingId}`);
    expect(bare.status).toBe(404);

    const wrongToken = await fetch(
      `${base}/api/booking/bookings/${commit.body.klarBookingId}?token=not-the-token`,
    );
    expect(wrongToken.status).toBe(404);
  });
});

describe('GET /api/ops/unsettled-bookings', () => {
  it('refuses without a valid token, the same as commit and cancel', async () => {
    const response = await fetch(`${base}/api/ops/unsettled-bookings`);
    expect(response.status).toBe(401);
  });

  it('lists a booking the reconciler still has to settle, not one that already confirmed', async () => {
    const settled = (await (
      await post('/api/booking/commit', {
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-ops-settled',
        guests: GUESTS,
      })
    ).json()) as { body: { klarBookingId: string } };

    const unsettled = (await (
      await post('/api/booking/commit', {
        dealId: await dealFromSearch(),
        idempotencyKey: 'idem-ops-unsettled',
        guests: GUESTS,
      })
    ).json()) as { body: { klarBookingId: string } };

    // Reconciliation only makes visible progress on the queue it can act
    // on; MANUAL_REVIEW is the one nothing settles automatically.
    await baseDeps.bookings?.advance({
      id: klarBookingId(unsettled.body.klarBookingId),
      to: 'MANUAL_REVIEW',
      expect: ['CONFIRMED'],
      at: new Date(),
    });

    const response = await fetch(`${base}/api/ops/unsettled-bookings`, {
      headers: { authorization: `Bearer ${VALID_TEST_TOKEN}` },
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      body: Array<{ klarBookingId: string; status: string }>;
    };
    const ids = payload.body.map((b) => b.klarBookingId);
    expect(ids).toContain(unsettled.body.klarBookingId);
    expect(ids).not.toContain(settled.body.klarBookingId);
  });
});

describe('rate limiting at the edge', () => {
  it('refuses once the per-IP budget for the window is spent, and reports Retry-After', async () => {
    // Its own server, its own limiter — a tiny budget here must not touch
    // the shared `base` server every other test in this file depends on.
    const limited = createApiServer({
      deps: baseDeps,
      rateLimit: { windowMs: 60_000, maxRequests: 2 },
    });
    await new Promise<void>((resolve) => limited.listen(0, '127.0.0.1', resolve));
    const limitedBase = `http://127.0.0.1:${(limited.address() as AddressInfo).port}`;

    const ok1 = await fetch(`${limitedBase}/api/search/hotels/suggestions?q=Goa`);
    const ok2 = await fetch(`${limitedBase}/api/search/hotels/suggestions?q=Goa`);
    const blocked = await fetch(`${limitedBase}/api/search/hotels/suggestions?q=Goa`);

    expect(ok1.status).not.toBe(429);
    expect(ok2.status).not.toBe(429);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    const payload = (await blocked.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('RATE_LIMITED');

    await new Promise<void>((resolve) => limited.close(() => resolve()));
  });

  it('exempts /health and /metrics from the budget', async () => {
    const limited = createApiServer({
      deps: baseDeps,
      rateLimit: { windowMs: 60_000, maxRequests: 1 },
    });
    await new Promise<void>((resolve) => limited.listen(0, '127.0.0.1', resolve));
    const limitedBase = `http://127.0.0.1:${(limited.address() as AddressInfo).port}`;

    // Spends the one-request budget on a real route.
    await fetch(`${limitedBase}/api/search/hotels/suggestions?q=Goa`);

    const health = await fetch(`${limitedBase}/health`);
    const metrics = await fetch(`${limitedBase}/metrics`);
    expect(health.status).toBe(200);
    expect(metrics.status).toBe(200);

    await new Promise<void>((resolve) => limited.close(() => resolve()));
  });
});
