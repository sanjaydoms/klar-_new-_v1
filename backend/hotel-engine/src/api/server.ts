import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { DomainError } from '../domain/shared/errors.js';
import type { AuthVerifier, Logger } from '../modules/ports.js';
import {
  bookingHandler,
  bookingsHandler,
  cancelHandler,
  commitHandler,
  confirmHandler,
  healthHandler,
  metricsHandler,
  precheckHandler,
  productsHandler,
  searchHandler,
  suggestionsHandler,
  unsettledBookingsHandler,
  type HandlerDeps,
  type HandlerResult,
} from './handlers.js';

/**
 * The HTTP edge.
 *
 * `node:http` rather than a framework, deliberately: the engine has no runtime
 * dependencies at all, the routing surface is four endpoints, and everything a
 * framework would provide here — body limits, timeouts, error mapping — is
 * policy this service needs to state explicitly anyway. The handlers underneath
 * are framework-agnostic, so swapping this file for Fastify later touches
 * nothing else.
 *
 * What it guarantees, and why each one is here:
 *
 *  - **A body limit.** An unbounded read is a memory exhaustion primitive.
 *  - **A request timeout.** Independent of the search deadline, which bounds
 *    supplier work rather than the socket.
 *  - **Errors never leak.** A `DomainError` carries operational detail — money
 *    values, supplier ids — and a stack names the filesystem. A client mistake
 *    is answered specifically by the handler that found it; anything that
 *    reaches this file is our bug and is answered generically. The log gets
 *    everything.
 */
export interface ServerOptions {
  readonly deps: HandlerDeps;
  /** Bytes. A search payload is ~2 KB; this is generous and finite. */
  readonly maxBodyBytes?: number;
  readonly requestTimeoutMs?: number;
  /** Origins allowed to call this API from a browser. Empty disables CORS. */
  readonly corsOrigins?: readonly string[];
  /** Per-IP request budget. Defaults are generous — this is a flood backstop, not a product decision. */
  readonly rateLimit?: { readonly windowMs?: number; readonly maxRequests?: number };
}

const DEFAULTS = {
  maxBodyBytes: 256 * 1024,
  requestTimeoutMs: 30_000,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 300,
};

class BodyTooLarge extends Error {}
class MalformedJson extends Error {}

/**
 * Fixed-window per-IP rate limiting — the API edge had none.
 *
 * A `Map` and a comparison, not a token bucket: no per-key timer, no
 * library. The trade is a burst up to 2x the limit at a window boundary
 * (a key's count resets the instant its window rolls over, so a request
 * just before and one just after both start fresh windows). That is fine
 * for a flood backstop; it would not be fine for a strict billing quota.
 *
 * ponytail: the map is keyed by every distinct remote address seen and is
 * never swept independently of a key's own window rolling over, so an
 * attacker rotating through many source addresses grows it without bound.
 * Add an LRU cap or a periodic sweep if that becomes a real vector — there
 * is no deployment yet for it to matter against.
 */
class RateLimiter {
  readonly #windowMs: number;
  readonly #maxRequests: number;
  readonly #now: () => number;
  readonly #hits = new Map<string, { count: number; windowStart: number }>();

  constructor(options: { windowMs: number; maxRequests: number; now?: () => number }) {
    this.#windowMs = options.windowMs;
    this.#maxRequests = options.maxRequests;
    this.#now = options.now ?? Date.now;
  }

  /** `true` when the request may proceed. */
  admit(key: string): boolean {
    const now = this.#now();
    const entry = this.#hits.get(key);
    if (entry === undefined || now - entry.windowStart >= this.#windowMs) {
      this.#hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= this.#maxRequests) return false;
    entry.count += 1;
    return true;
  }
}

async function readJsonBody(req: IncomingMessage, limit: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    // Checked as it streams, not after: a limit enforced on the assembled body
    // has already allocated the body it was meant to prevent.
    if (size > limit) throw new BodyTooLarge();
    chunks.push(buffer);
  }

  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new MalformedJson();
  }
}

function send(
  res: ServerResponse,
  result: HandlerResult,
  corsOrigin?: string,
  extraHeaders?: Record<string, string>,
): void {
  // `contentType` set means the body is already the wire format (metricsHandler's
  // Prometheus text) — everything else stays the JSON path this always was.
  const payload = result.contentType !== undefined ? (result.body as string) : JSON.stringify(result.body);
  res.writeHead(result.status, {
    'content-type': result.contentType ?? 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    // The response is a live price. A cache between us and the customer would
    // serve a quote we can no longer honour.
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(corsOrigin !== undefined
      ? {
          'access-control-allow-origin': corsOrigin,
          vary: 'Origin',
        }
      : {}),
    ...extraHeaders,
  });
  res.end(payload);
}

/** A route, its method, and the params its path carries. */
type Route = (
  segments: readonly string[],
  query: URLSearchParams,
  body: unknown,
  deps: HandlerDeps,
) => Promise<HandlerResult> | HandlerResult;

interface RouteEntry {
  readonly method: string;
  /** Path segments; `:name` matches one segment. */
  readonly pattern: readonly string[];
  readonly handle: Route;
  /**
   * A route a caller must be authenticated to reach — the write side of
   * booking, where OPEN-ISSUES §4 names the gap this closes. On success the
   * body gains `authenticatedUserId`, which the handler uses in place of
   * anything the client claims about who it is.
   */
  readonly requiresAuth?: boolean;
  /** Operational endpoints (health checks, scrapers) aren't customer traffic to throttle. */
  readonly exemptFromRateLimit?: boolean;
}

/** The default when `deps.auth` is absent: refuses everything, loudly. */
const DEFAULT_AUTH_VERIFIER: AuthVerifier = {
  verify: () => Promise.resolve({ ok: false, reason: 'no auth verifier is configured' }),
};

const ROUTES: readonly RouteEntry[] = [
  {
    method: 'GET',
    pattern: ['health'],
    handle: () => healthHandler(),
    exemptFromRateLimit: true,
  },
  {
    method: 'GET',
    pattern: ['metrics'],
    handle: (_segments, _query, _body, deps) => metricsHandler(deps),
    exemptFromRateLimit: true,
  },
  {
    method: 'POST',
    pattern: ['api', 'search', 'hotels', 'search'],
    handle: (_segments, _query, body, deps) => searchHandler(body as never, deps),
  },
  {
    method: 'GET',
    pattern: ['api', 'search', 'hotels', 'suggestions'],
    handle: (_segments, query, _body, deps) =>
      suggestionsHandler(
        {
          ...(query.get('q') !== null ? { q: query.get('q') as string } : {}),
          ...(query.get('countryCode') !== null
            ? { countryCode: query.get('countryCode') as string }
            : {}),
          ...(query.get('limit') !== null ? { limit: query.get('limit') as string } : {}),
        },
        deps,
      ),
  },
  {
    method: 'POST',
    pattern: ['api', 'booking', 'precheck'],
    handle: (_segments, _query, body, deps) => precheckHandler(body as never, deps),
  },
  {
    method: 'POST',
    pattern: ['api', 'booking', 'commit'],
    handle: (_segments, _query, body, deps) => commitHandler(body as never, deps),
    requiresAuth: true,
  },
  {
    method: 'POST',
    pattern: ['api', 'booking', 'confirm'],
    handle: (_segments, _query, body, deps) => confirmHandler(body as never, deps),
  },
  {
    method: 'POST',
    pattern: ['api', 'booking', 'cancel'],
    handle: (_segments, _query, body, deps) => cancelHandler(body as never, deps),
    requiresAuth: true,
  },
  {
    method: 'GET',
    pattern: ['api', 'booking', 'bookings'],
    handle: (_segments, query, _body, deps) =>
      bookingsHandler(
        {
          ...(query.get('userId') !== null ? { userId: query.get('userId') as string } : {}),
          ...(query.get('limit') !== null ? { limit: query.get('limit') as string } : {}),
        },
        deps,
      ),
  },
  {
    method: 'GET',
    pattern: ['api', 'ops', 'unsettled-bookings'],
    handle: (_segments, query, _body, deps) =>
      unsettledBookingsHandler(
        { ...(query.get('limit') !== null ? { limit: query.get('limit') as string } : {}) },
        deps,
      ),
    requiresAuth: true,
  },
  {
    method: 'GET',
    pattern: ['api', 'booking', 'bookings', ':id'],
    handle: (segments, query, _body, deps) =>
      bookingHandler(
        decodeURIComponent(segments[3] as string),
        {
          ...(query.get('token') !== null ? { token: query.get('token') as string } : {}),
          ...(query.get('userId') !== null ? { userId: query.get('userId') as string } : {}),
        },
        deps,
      ),
  },
  {
    // Must come after `/hotels/search` and `/hotels/suggestions`, which would
    // otherwise match `:propertyId`. Ordered, not sorted by specificity —
    // explicit beats clever when the list is four long.
    method: 'POST',
    pattern: ['api', 'search', 'hotels', ':propertyId', 'products'],
    handle: (segments, _query, body, deps) =>
      productsHandler(decodeURIComponent(segments[3] as string), body as never, deps),
  },
];

function match(method: string, segments: readonly string[]): RouteEntry | undefined {
  return ROUTES.find(
    (route) =>
      route.method === method &&
      route.pattern.length === segments.length &&
      route.pattern.every((part, i) => part.startsWith(':') || part === segments[i]),
  );
}

export function createApiServer(options: ServerOptions): Server {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULTS.maxBodyBytes;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULTS.requestTimeoutMs;
  const allowed = new Set(options.corsOrigins ?? []);
  const logger: Logger = options.deps.logger;
  const rateLimitConfig = {
    windowMs: options.rateLimit?.windowMs ?? DEFAULTS.rateLimitWindowMs,
    maxRequests: options.rateLimit?.maxRequests ?? DEFAULTS.rateLimitMaxRequests,
  };
  const rateLimiter = new RateLimiter(rateLimitConfig);

  const server = createServer((req, res) => {
    const started = Date.now();
    const origin = req.headers.origin;
    const corsOrigin =
      typeof origin === 'string' && allowed.has(origin) ? origin : undefined;

    void (async () => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const segments = url.pathname.split('/').filter((s) => s.length > 0);

        if (req.method === 'OPTIONS') {
          res.writeHead(corsOrigin !== undefined ? 204 : 405, {
            ...(corsOrigin !== undefined
              ? {
                  'access-control-allow-origin': corsOrigin,
                  'access-control-allow-methods': 'GET, POST, OPTIONS',
                  'access-control-allow-headers': 'content-type, authorization',
                  'access-control-max-age': '600',
                  vary: 'Origin',
                }
              : {}),
          });
          res.end();
          return;
        }

        const route = match(req.method ?? 'GET', segments);
        if (route === undefined) {
          send(res, { status: 404, body: { status: false, error: { code: 'NOT_FOUND', message: 'no such endpoint' } } }, corsOrigin);
          return;
        }

        if (route.exemptFromRateLimit !== true) {
          const ip = req.socket.remoteAddress ?? 'unknown';
          if (!rateLimiter.admit(ip)) {
            send(
              res,
              {
                status: 429,
                body: {
                  status: false,
                  error: { code: 'RATE_LIMITED', message: 'too many requests; try again shortly' },
                },
              },
              corsOrigin,
              { 'retry-after': String(Math.ceil(rateLimitConfig.windowMs / 1000)) },
            );
            logger.info('request', {
              method: req.method,
              path: url.pathname,
              status: 429,
              durationMs: Date.now() - started,
            });
            return;
          }
        }

        let body: unknown = req.method === 'POST' ? await readJsonBody(req, maxBodyBytes) : {};

        if (route.requiresAuth === true) {
          const verifier = options.deps.auth ?? DEFAULT_AUTH_VERIFIER;
          const auth = await verifier.verify(req.headers.authorization);
          if (!auth.ok) {
            send(
              res,
              { status: 401, body: { status: false, error: { code: 'UNAUTHORIZED', message: auth.reason } } },
              corsOrigin,
            );
            logger.info('request', {
              method: req.method,
              path: url.pathname,
              status: 401,
              durationMs: Date.now() - started,
            });
            return;
          }
          // Overrides anything the client claimed about who it is — the actual
          // gap OPEN-ISSUES §4 names: "a stated userId is not an authenticated one."
          if (typeof body === 'object' && body !== null) {
            body = { ...(body as Record<string, unknown>), authenticatedUserId: auth.userId };
          }
        }

        const result = await route.handle(segments, url.searchParams, body, options.deps);
        send(res, result, corsOrigin);

        logger.info('request', {
          method: req.method,
          path: url.pathname,
          status: result.status,
          durationMs: Date.now() - started,
        });
      } catch (error) {
        send(res, toErrorResponse(error, req, logger), corsOrigin);
      }
    })();
  });

  // Node's own guards, set explicitly rather than inherited. A socket that
  // opens and never sends holds a connection until one of these fires.
  server.requestTimeout = requestTimeoutMs;
  server.headersTimeout = Math.min(requestTimeoutMs, 20_000);
  server.keepAliveTimeout = 5_000;

  return server;
}

/**
 * Any thrown thing → a response the client can act on and nothing more.
 *
 * `DomainError` carries context — amounts, supplier ids, hotel ids — that is
 * exactly what an operator needs in a log and exactly what must not cross the
 * wire. The client is told which of its inputs was at fault, or nothing at all.
 */
function toErrorResponse(error: unknown, req: IncomingMessage, logger: Logger): HandlerResult {
  if (error instanceof BodyTooLarge) {
    return { status: 413, body: { status: false, error: { code: 'BODY_TOO_LARGE', message: 'request body is too large' } } };
  }
  if (error instanceof MalformedJson) {
    return { status: 400, body: { status: false, error: { code: 'MALFORMED_JSON', message: 'request body is not valid JSON' } } };
  }

  if (error instanceof DomainError) {
    /**
     * A domain invariant broke, and that is OUR bug rather than the caller's.
     *
     * Every genuine client mistake — missing dates, an impossible stay, an
     * unknown destination — is caught by the handlers and answered with a
     * specific 400 long before here. What reaches this point is something like
     * `PRICE_SPLIT_MISMATCH`: a price whose parts stopped adding up. Answering
     * 400 would tell the customer to fix a request that is correct, and the
     * message is an internal invariant's wording, useless to them and not
     * theirs to read. The code and the context go to the log, where someone
     * can act on them.
     */
    logger.error('domain invariant broke at the API edge', {
      path: req.url,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return {
      status: 500,
      body: { status: false, error: { code: 'INTERNAL', message: 'the request could not be completed' } },
    };
  }

  logger.error('unhandled error at the API edge', {
    path: req.url,
    reason: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return {
    status: 500,
    body: { status: false, error: { code: 'INTERNAL', message: 'the request could not be completed' } },
  };
}
