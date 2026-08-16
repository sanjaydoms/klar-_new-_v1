import { countryCode, supplierHotelId } from '../domain/shared/brand.js';
import type { SupplierConfig } from './contract/registry.js';
import { CircuitBreaker } from './common/circuit-breaker.js';
import { runContractSuite } from './testing/contract-suite.js';
import { frozenClock, instantSleep, type StubTransport } from './testing/harness.js';
import { TripJackAdapter } from './tripjack/adapter.js';
import { RATEGAIN, RateGainAdapter } from './rategain/index.js';
import { TRIPJACK } from './tripjack/config.js';
import { TJ_LISTING_RESPONSE } from './tripjack/fixtures.js';
import {
  RG_BEST_PROPERTIES_RESPONSE,
  RG_GET_PRODUCTS_RESPONSE,
} from './rategain/fixtures.js';

/**
 * Both live suppliers, run against one standard.
 *
 * This is where "adding a supplier is additive" stops being a claim: a third
 * adapter joins by adding one `runContractSuite(...)` call below, and if it
 * cannot pass the same assertions as these two it does not ship.
 */

const baseConfig = (code: SupplierConfig['code']): SupplierConfig => ({
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
});

// Credentials that would be conspicuous if they ever leaked into a response.
const SECRET_KEY = 'SECRET-KEY';
const SECRET_SECRET = 'SECRET-SECRET';

runContractSuite({
  name: 'TripJack',
  config: baseConfig(TRIPJACK),
  searchPath: '/hms/v3/hotel/listing',
  searchTarget: {
    kind: 'HOTEL_IDS',
    ids: [supplierHotelId('100000001234'), supplierHotelId('100000005678'), supplierHotelId('100000009999')],
  },
  // The third fixture hotel is sold out (no options) and must not be counted.
  expectedHotels: 2,
  happyRoutes: [{ path: '/hms/v3/hotel/listing', body: TJ_LISTING_RESPONSE }],
  createOver: (transport: StubTransport) =>
    new TripJackAdapter({
      hms: transport,
      oms: transport,
      credentials: {
        hmsBaseUrl: 'https://hms.tripjack.example',
        omsBaseUrl: 'https://oms.tripjack.example',
        apiKey: SECRET_KEY,
        agencyId: 'AGENCY-1',
        imageBaseUrl: 'https://cdn.tripjack.example',
      },
      resolveNationality: (c) => Promise.resolve(c === countryCode('IN') ? '101' : '1'),
      newCorrelationId: () => 'corr-fixed',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    }),
});

runContractSuite({
  name: 'RateGain',
  config: baseConfig(RATEGAIN),
  searchPath: '/api/SmartDistribution/bestproperties',
  searchTarget: { kind: 'DEST_CODE', code: 'GOA' },
  expectedHotels: 2,
  happyRoutes: [
    { path: '/api/SmartDistribution/bestproperties', body: RG_BEST_PROPERTIES_RESPONSE },
  ],
  // bestproperties returns no rate keys, so the rate-level assertions run
  // against getproducts — the same second call the orchestrator has to make.
  ratesRoutes: [{ path: '/api/SmartDistribution/getproducts', body: RG_GET_PRODUCTS_RESPONSE }],
  ratesHotelId: 'ChIJCYQhdhVDXz4R5lEANKNzFlA',
  createOver: (transport: StubTransport) =>
    new RateGainAdapter({
      transport,
      credentials: {
        baseUrl: 'https://rategain.example',
        apiKey: SECRET_KEY,
        apiSecret: SECRET_SECRET,
        imageBaseUrl: 'https://images.rategain.example',
      },
      newEchoToken: () => 'echo-fixed',
      breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
      now: frozenClock(),
      sleep: instantSleep,
    }),
});
