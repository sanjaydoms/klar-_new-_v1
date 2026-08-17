import { countryCode, currencyCode, klarBookingId, searchId } from '../../domain/shared/brand.js';
import { stayDates } from '../../domain/shared/stay.js';
import { occupancy, roomRequest } from '../../domain/rate/occupancy.js';
import type { SupplierContext, Logger } from '../contract/context.js';
import { deadlineAt } from '../contract/context.js';
import type { HttpRequest, HttpResponse, HttpTransport } from '../common/http.js';
import { TransportError } from '../common/http.js';

/**
 * Test doubles for the supplier layer.
 *
 * Adapters take an `HttpTransport` rather than owning an axios instance, which
 * is what makes it possible to run every supplier through one shared suite
 * against recorded payloads — no network, no mocking library, and the same
 * assertions for each.
 */

export interface StubRoute {
  /** Substring of the request path this route answers. */
  readonly path: string;
  readonly status?: number;
  readonly body?: unknown;
  /** Throw instead of answering, to exercise the transport failure paths. */
  readonly throws?: 'TIMEOUT' | 'ABORTED' | 'NETWORK';
  /** Resolve only after this many ms of simulated time. */
  readonly delayMs?: number;
}

export interface StubTransport extends HttpTransport {
  readonly calls: ReadonlyArray<HttpRequest>;
  reset(): void;
}

export function stubTransport(routes: readonly StubRoute[]): StubTransport {
  const calls: HttpRequest[] = [];

  return {
    calls,
    reset(): void {
      calls.length = 0;
    },
    async request(req, opts): Promise<HttpResponse> {
      calls.push(req);

      const route = routes.find((r) => req.path.includes(r.path));
      if (route === undefined) {
        return Promise.resolve({ status: 404, ok: false, body: { description: 'no stub route' } });
      }
      if (route.throws !== undefined) {
        return Promise.reject(new TransportError(route.throws, `stub ${route.throws}`));
      }
      if (route.delayMs !== undefined && route.delayMs > opts.timeoutMs) {
        return Promise.reject(new TransportError('TIMEOUT', 'stub exceeded the call budget'));
      }
      if (opts.signal.aborted) {
        return Promise.reject(new TransportError('ABORTED', 'stub saw an aborted signal'));
      }

      const status = route.status ?? 200;
      return Promise.resolve({
        status,
        ok: status >= 200 && status < 300,
        body: route.body ?? null,
      });
    },
  };
}

/** Records log lines so the suite can assert nothing sensitive is written. */
export interface RecordingLogger extends Logger {
  readonly lines: ReadonlyArray<{ level: string; message: string; fields?: Record<string, unknown> }>;
}

export function recordingLogger(): RecordingLogger {
  const lines: { level: string; message: string; fields?: Record<string, unknown> }[] = [];
  const make = (): RecordingLogger => ({
    lines,
    debug: (message, fields) => lines.push({ level: 'debug', message, ...(fields ? { fields } : {}) }),
    info: (message, fields) => lines.push({ level: 'info', message, ...(fields ? { fields } : {}) }),
    warn: (message, fields) => lines.push({ level: 'warn', message, ...(fields ? { fields } : {}) }),
    error: (message, fields) => lines.push({ level: 'error', message, ...(fields ? { fields } : {}) }),
    child: () => make(),
  });
  return make();
}

export interface TestContextOptions {
  readonly deadlineAtMs?: number;
  readonly now?: number;
  readonly aborted?: boolean;
  readonly logger?: RecordingLogger;
}

export const TEST_CURRENCY = currencyCode('INR');
export const TEST_NATIONALITY = countryCode('IN');
export const TEST_STAY = stayDates('2026-09-10', '2026-09-13');
export const TEST_OCCUPANCY = occupancy([roomRequest(2, 0, [])]);
export const TEST_BOOKING_ID = klarBookingId('KLR-TEST-0001');

export function testContext(
  supplier: SupplierContext['supplier'],
  opts: TestContextOptions = {},
): SupplierContext & { logger: RecordingLogger } {
  const now = opts.now ?? 1_000_000;
  const controller = new AbortController();
  if (opts.aborted === true) controller.abort();

  return {
    supplier,
    searchId: searchId('KLAR-SRCH-TEST'),
    correlationId: 'corr-test-0001',
    deadline: deadlineAt(opts.deadlineAtMs ?? now + 15_000),
    signal: controller.signal,
    logger: opts.logger ?? recordingLogger(),
    currency: TEST_CURRENCY,
  };
}

/** A clock that does not move, so retry backoff cannot make tests slow. */
export const frozenClock = (at = 1_000_000) => (): number => at;
export const instantSleep = (): Promise<void> => Promise.resolve();
