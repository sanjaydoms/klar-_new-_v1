import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { countryCode } from '../domain/shared/brand.js';
import type { MarkupRule } from '../domain/pricing/markup.js';
import { createTestDatabase, type TestDatabase } from '../infrastructure/testing/pglite.js';
import { FakeAuthVerifier, silentLogger, VALID_TEST_TOKEN } from '../modules/testing/fakes.js';
import type { HttpTransport } from '../suppliers/common/http.js';
import {
  RG_BEST_PROPERTIES_RESPONSE,
  RG_COMMIT_RESPONSE,
  RG_GET_PRODUCTS_RESPONSE,
  RG_PRECHECK_RESPONSE,
} from '../suppliers/rategain/fixtures.js';
import type { PaymentGateway } from '../modules/ports.js';
import { buildHotelApi, ConfigMarkupProvider, DEFAULT_API_CONFIG } from './build-api.js';

/**
 * The whole stack, on the code path production takes.
 *
 * Real PostgreSQL, real repositories, the real registry, the real RateGain
 * adapter against its recorded payloads, the real orchestrator, the real HTTP
 * server. The only substitution is the transport — the one place the
 * composition root touches the network.
 */

const IN = countryCode('IN');

const RULES: MarkupRule[] = [
  { layer: 'PLATFORM', enabled: true, type: 'PERCENTAGE', value: 12, region: 'ALL', basis: 'NET' },
];

/** Answers RateGain's endpoints from the recorded fixtures, search to cancel. */
const recordedRateGain: HttpTransport = {
  request: (req) => {
    if (req.path.includes('bestproperties')) {
      return Promise.resolve({ status: 200, ok: true, body: RG_BEST_PROPERTIES_RESPONSE });
    }
    if (req.path.includes('getproducts')) {
      return Promise.resolve({ status: 200, ok: true, body: RG_GET_PRODUCTS_RESPONSE });
    }
    if (req.path.includes('PreCheckReservation')) {
      return Promise.resolve({ status: 200, ok: true, body: RG_PRECHECK_RESPONSE });
    }
    if (req.path.includes('CommitReservation')) {
      return Promise.resolve({ status: 200, ok: true, body: RG_COMMIT_RESPONSE });
    }
    return Promise.resolve({ status: 404, ok: false, body: { status: false } });
  },
};

/** A gateway that takes the money, so the commit path can be exercised whole. */
const payingGateway: PaymentGateway = {
  authorize: (input) =>
    Promise.resolve({
      ok: true,
      payment: {
        provider: 'RAZORPAY',
        capturedAmount: input.amount,
        paymentId: 'pay_test',
        verifiedAt: new Date('2026-08-14T09:00:00Z'),
      },
    }),
  refund: () => Promise.resolve({ ok: true, providerRefundId: 'rfnd_test' }),
};

let pg: TestDatabase;
let server: Server | undefined;
let base: string;
/** Every built server's background workers, so `afterAll` can stop them all — not just the last one `server` points at. */
const builtApis: Array<{ warmer: { stop(): void }; reconciler: { stop(): void } }> = [];

beforeEach(async () => {
  pg ??= await createTestDatabase();
  await pg.truncate();

  await pg.db.query(
    `INSERT INTO canonical_destination
       (klar_destination_id, name, normalized_name, kind, country_code, lat, lng, radius_km, aliases, property_count)
     VALUES ($1,$2,$3,'CITY','IN',15.2993,74.1240,40,'["Goa India"]'::jsonb,6179)`,
    ['KLAR-DEST-GOA', 'Goa', 'goa'],
  );
  await pg.db.query(
    `INSERT INTO destination_mapping (supplier, klar_destination_id, supplier_dest_code)
     VALUES ('RG','KLAR-DEST-GOA','GOA')`,
  );
});

afterAll(async () => {
  for (const built of builtApis) {
    built.warmer.stop();
    built.reconciler.stop();
  }
  if (server !== undefined) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }
  await pg?.close();
});

async function start(credentials = { rategain: { baseUrl: 'https://rg.example', apiKey: 'k', apiSecret: 's' } }) {
  const built = buildHotelApi(
    { ...DEFAULT_API_CONFIG, markupRules: RULES },
    {
      db: pg.client,
      logger: silentLogger,
      credentials,
      payments: payingGateway,
      auth: new FakeAuthVerifier(),
      createTransport: () => recordedRateGain,
    },
  );
  server = built.server;
  builtApis.push(built);
  await new Promise<void>((resolve) => built.server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(built.server.address() as AddressInfo).port}`;
  return built;
}

describe('the composition root', () => {
  it('serves a search end to end, through Postgres and a real adapter', async () => {
    await start();

    const response = await fetch(`${base}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destination: 'Goa',
        checkin: '2026-09-10',
        checkout: '2026-09-13',
        countryCode: 'IN',
        currency: 'INR',
        rooms: [{ adults: 2, children: 0, childAges: [] }],
      }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;

    // The destination resolved out of Postgres, RateGain answered from its
    // recorded `bestproperties` payload, and the catalogue minted canonical
    // identities for properties it had never seen.
    const results = payload['results'] as Array<Record<string, unknown>>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.['klarHotelId']).toMatch(/^KLAR-/);
    expect(payload['inventoryCount']).toBe(6_179);

    // Those hotels are now in the catalogue with a RateGain mapping.
    const rows = await pg.db.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM supplier_property_mapping WHERE supplier = 'RG'`,
    );
    expect(Number(rows[0]?.n)).toBeGreaterThan(0);
  });

  /**
   * Search → precheck → commit, on the production code path.
   *
   * Every step against real Postgres and the real RateGain adapter: the deal
   * id comes out of a search, the precheck resolves it, and the commit turns it
   * into a row in `booking` with an audit trail beside it. The frontend's whole
   * `BookReservation` construction is replaced by two ids and two names.
   */
  it('books a hotel end to end, from a search result to a row in Postgres', async () => {
    await start();

    const search = await fetch(`${base}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destination: 'Goa',
        checkin: '2026-09-10',
        checkout: '2026-09-13',
        countryCode: 'IN',
        currency: 'INR',
        rooms: [{ adults: 2, children: 0, childAges: [] }],
      }),
    });
    const results = ((await search.json()) as { results: Array<{ dealId: string }> }).results;
    const dealId = results[0]?.dealId;
    expect(dealId).toBeTruthy();

    const commit = await fetch(`${base}/api/booking/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${VALID_TEST_TOKEN}` },
      body: JSON.stringify({
        dealId,
        idempotencyKey: 'idem-e2e-1',
        guests: [
          { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
          { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
        ],
      }),
    });

    expect(commit.status).toBe(200);
    const booked = (await commit.json()) as {
      body: { klarBookingId: string; status: string; supplier: string; totalAmount: number };
    };
    expect(booked.body.status).toBe('CONFIRMED');
    expect(booked.body.supplier).toBe('RG');
    expect(booked.body.totalAmount).toBeGreaterThan(0);

    // The booking is in Postgres, with its canonical snapshot and the supplier
    // payload in the side table the UI cannot reach.
    const rows = await pg.db.query<{ status: string; supplier: string; total_minor: string }>(
      `SELECT status, supplier, total_minor FROM booking WHERE klar_booking_id = $1`,
      [booked.body.klarBookingId],
    );
    expect(rows[0]?.status).toBe('CONFIRMED');
    expect(rows[0]?.supplier).toBe('RG');

    const audit = await pg.db.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM booking_supplier_payload WHERE klar_booking_id = $1`,
      [booked.body.klarBookingId],
    );
    expect(Number(audit[0]?.n)).toBe(1);

    const events = await pg.db.query<{ type: string }>(
      `SELECT type FROM booking_event WHERE klar_booking_id = $1 ORDER BY id`,
      [booked.body.klarBookingId],
    );
    expect(events.map((e) => e.type)).toEqual([
      'PRECHECK_PASSED',
      'PAYMENT_HELD',
      'SUPPLIER_BOOKED',
    ]);
  });

  /**
   * A gateway that says yes when none is configured would let a deployment book
   * real rooms against payments nobody took.
   */
  it('declines every commit when no payment gateway is configured', async () => {
    const built = buildHotelApi(
      { ...DEFAULT_API_CONFIG, markupRules: RULES },
      {
        db: pg.client,
        logger: silentLogger,
        credentials: { rategain: { baseUrl: 'https://rg.example', apiKey: 'k', apiSecret: 's' } },
        auth: new FakeAuthVerifier(),
        createTransport: () => recordedRateGain,
      },
    );
    server = built.server;
    builtApis.push(built);
    await new Promise<void>((resolve) => built.server.listen(0, '127.0.0.1', resolve));
    const port = (built.server.address() as AddressInfo).port;

    const search = await fetch(`http://127.0.0.1:${port}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destination: 'Goa',
        checkin: '2026-09-10',
        checkout: '2026-09-13',
        rooms: [{ adults: 2, children: 0, childAges: [] }],
      }),
    });
    const dealId = ((await search.json()) as { results: Array<{ dealId: string }> }).results[0]
      ?.dealId;

    const commit = await fetch(`http://127.0.0.1:${port}/api/booking/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${VALID_TEST_TOKEN}` },
      body: JSON.stringify({
        dealId,
        idempotencyKey: 'idem-no-gateway',
        guests: [
          { firstName: 'Asha', lastName: 'Rao', isPrimary: true, isChild: false },
          { firstName: 'Dev', lastName: 'Rao', isPrimary: false, isChild: false },
        ],
      }),
    });

    expect(commit.status).toBe(400);
    const payload = (await commit.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('PAYMENT_DECLINED');
  });

  it('resolves a destination alias out of the database', async () => {
    await start();
    const response = await fetch(`${base}/api/search/hotels/suggestions?q=Goa%20India`);
    const payload = (await response.json()) as { body: Array<{ klarDestinationId: string }> };
    expect(payload.body[0]?.klarDestinationId).toBe('KLAR-DEST-GOA');
  });

  /**
   * A supplier with no credentials is not registered. Registering one that
   * cannot authenticate would report ERROR on every search and open its
   * breaker, which reads as an outage rather than as "not configured".
   */
  it('does not register a supplier it has no credentials for', async () => {
    const built = await start({} as never);
    expect(built.registry.all()).toHaveLength(0);

    const response = await fetch(`${base}/api/search/hotels/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destination: 'Goa',
        checkin: '2026-09-10',
        checkout: '2026-09-13',
        rooms: [{ adults: 2 }],
      }),
    });

    // Still a well-formed answer, with nothing in it.
    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['results']).toEqual([]);
  });

  it('states the confirmed selection policy rather than inheriting one', () => {
    // ADR-0007 §2: a policy that can be defaulted is a policy nobody decided.
    expect(DEFAULT_API_CONFIG.selectionPolicy).toBe('EQUIVALENT_CLASS_PREFERRED');
    // ADR-0003: the hard deadline derived from RateGain's measured latency.
    expect(DEFAULT_API_CONFIG.searchDeadlineMs).toBe(15_000);
  });
});

describe('markup configuration', () => {
  /**
   * `version()` is part of the dynamic cache key, so it must change whenever a
   * rule does. The reference cached markup with no version at all, so a margin
   * edit took effect only when a TTL happened to expire.
   */
  it('changes its version when a rule changes', () => {
    const a = new ConfigMarkupProvider(RULES);
    const same = new ConfigMarkupProvider([...RULES]);
    const changed = new ConfigMarkupProvider([{ ...(RULES[0] as MarkupRule), value: 13 }]);

    expect(a.version()).toBe(same.version());
    expect(a.version()).not.toBe(changed.version());
  });

  it('hands the whole rule set over, so the ALL fallback stays reachable', async () => {
    const provider = new ConfigMarkupProvider(RULES);
    // Asked for DOMESTIC, it must not filter out the ALL-region rule that
    // `resolveRule` falls back to.
    expect(await provider.rulesFor('DOMESTIC', 'B2C')).toHaveLength(1);
  });
});

void IN;
