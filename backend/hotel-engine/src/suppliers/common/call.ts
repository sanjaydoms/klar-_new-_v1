import type { SupplierContext } from '../contract/context.js';
import type { NormalizedSupplierError } from '../contract/errors.js';
import { countsAgainstBreaker, supplierError } from '../contract/errors.js';
import type { CircuitBreaker } from './circuit-breaker.js';
import type { HttpRequest, HttpResponse, HttpTransport } from './http.js';
import { TransportError } from './http.js';

/**
 * Success or a normalised failure. Never a thrown exception.
 *
 * Every method on `HotelSupplier` resolves rather than rejects (ADR-0004), and
 * the only way to guarantee that across two adapters and a dozen call sites is
 * to make the failure path a return type the compiler forces you to handle.
 */
export type CallOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly durationMs: number }
  | { readonly ok: false; readonly error: NormalizedSupplierError; readonly durationMs: number };

export interface CallDeps {
  readonly transport: HttpTransport;
  readonly breaker: CircuitBreaker;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  /** Injected for deterministic tests. */
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * May this exchange be sent a second time?
 *
 * **Opt-in, and deliberately so.** A retry is worth one extra call on a search
 * and is worth a duplicate reservation on nothing at all: a commit that times
 * out has very often been received, and repeating it books the room twice — at
 * the hotel, on the customer's card, and on our invoice. The asymmetry decides
 * the default. Forgetting `repeatable: true` on a search costs a retry;
 * defaulting writes to repeatable costs a booking, and the supplier-side
 * idempotency that would make it safe (TripJack's `x-idempotency-key`,
 * RateGain's `EchoToken`) is sent but unverified against either specification
 * (OPEN-ISSUES §3.1).
 */
export interface CallOptions {
  readonly repeatable?: boolean;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Turn an HTTP status into a supplier error code.
 *
 * The supplier's own message is captured for our logs and never becomes the
 * customer-facing text — that comes from `customerMessageFor()` on the code.
 */
function fromHttpStatus(res: HttpResponse): NormalizedSupplierError {
  const supplierMessage = describeBody(res);
  if (res.status === 401 || res.status === 403) {
    return supplierError('SUPPLIER_AUTH_FAILED', supplierMessage, { httpStatus: res.status });
  }
  if (res.status === 429) {
    return supplierError('SUPPLIER_RATE_LIMITED', supplierMessage, { httpStatus: res.status });
  }
  if (res.status >= 500) {
    return supplierError('SUPPLIER_UNAVAILABLE', supplierMessage, { httpStatus: res.status });
  }
  if (res.status >= 400) {
    return supplierError('SUPPLIER_BAD_REQUEST', supplierMessage, { httpStatus: res.status });
  }
  return supplierError('SUPPLIER_UNKNOWN_ERROR', supplierMessage, { httpStatus: res.status });
}

/** A short, non-PII description of a failure body, for our own logs. */
function describeBody(res: HttpResponse): string {
  if (res.rawText) return `non-JSON response: ${res.rawText.slice(0, 200)}`;
  const body = res.body as { errors?: unknown; message?: unknown; description?: unknown } | null;
  const candidate = body?.description ?? body?.message;
  if (typeof candidate === 'string' && candidate.length > 0) return candidate.slice(0, 200);
  return `HTTP ${res.status}`;
}

function fromThrown(err: unknown, signalAborted: boolean): NormalizedSupplierError {
  if (err instanceof TransportError) {
    if (err.kind === 'TIMEOUT') return supplierError('SUPPLIER_TIMEOUT', err.message);
    if (err.kind === 'ABORTED') return supplierError('SUPPLIER_CANCELLED', err.message);
    return supplierError('SUPPLIER_UNAVAILABLE', err.message);
  }
  if (signalAborted) return supplierError('SUPPLIER_CANCELLED', 'search deadline passed');
  return supplierError(
    'SUPPLIER_UNKNOWN_ERROR',
    err instanceof Error ? err.message : 'unknown adapter failure',
  );
}

/**
 * One supplier HTTP exchange, with the deadline, breaker and retry policy
 * applied in the one place rather than at each call site.
 *
 * Ordering matters and is deliberate:
 *  - the breaker is checked before the deadline, so an open breaker is reported
 *    as CIRCUIT_OPEN rather than being mistaken for slowness;
 *  - the deadline is checked before the call, so a request that could not
 *    possibly finish is not sent;
 *  - the per-call timeout is clamped to whatever remains of the deadline, so a
 *    supplier can never outlive the search that asked for it;
 *  - and nothing is retried unless the caller says it may be (`CallOptions`).
 */
export async function callSupplier<T>(
  ctx: SupplierContext,
  deps: CallDeps,
  req: HttpRequest,
  parse: (res: HttpResponse) => CallOutcome<T> | { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: NormalizedSupplierError },
  opts: CallOptions = {},
): Promise<CallOutcome<T>> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;
  const maxRetries = opts.repeatable === true ? deps.maxRetries : 0;
  const startedAt = now();
  const elapsed = (): number => now() - startedAt;

  if (!deps.breaker.canAttempt()) {
    return {
      ok: false,
      error: supplierError('SUPPLIER_CIRCUIT_OPEN', 'circuit breaker is open for this supplier'),
      durationMs: 0,
    };
  }

  let lastError: NormalizedSupplierError = supplierError(
    'SUPPLIER_UNKNOWN_ERROR',
    'no attempt was made',
  );

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const remaining = ctx.deadline.remainingMs(now());
    if (remaining <= 0) {
      lastError = supplierError('SUPPLIER_CANCELLED', 'search deadline passed before the call');
      break;
    }

    try {
      const res = await deps.transport.request(req, {
        signal: ctx.signal,
        timeoutMs: Math.min(deps.timeoutMs, remaining),
      });

      if (!res.ok) {
        lastError = fromHttpStatus(res);
      } else {
        const parsed = parse(res);
        if (parsed.ok) {
          deps.breaker.recordSuccess();
          return { ok: true, value: parsed.value, durationMs: elapsed() };
        }
        lastError = parsed.error;
      }
    } catch (err) {
      lastError = fromThrown(err, ctx.signal.aborted);
    }

    // A cancellation is our decision, not a supplier fault: stop immediately and
    // do not hold it against the breaker.
    if (lastError.code === 'SUPPLIER_CANCELLED') break;
    if (!lastError.retryable) break;
    if (attempt === maxRetries) break;

    // Only back off if there is room inside the deadline to do so.
    const backoff = Math.min(200 * 2 ** attempt, 1_000);
    if (ctx.deadline.remainingMs(now()) <= backoff) break;
    ctx.logger.debug('retrying supplier call', {
      path: req.path,
      attempt: attempt + 1,
      code: lastError.code,
    });
    await sleep(backoff);
  }

  if (countsAgainstBreaker(lastError.code)) {
    deps.breaker.recordFailure();
  } else {
    deps.breaker.recordIgnored();
  }

  ctx.logger.warn('supplier call failed', {
    path: req.path,
    code: lastError.code,
    httpStatus: lastError.httpStatus,
  });

  return { ok: false, error: lastError, durationMs: elapsed() };
}
