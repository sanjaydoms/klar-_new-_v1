/**
 * The only way a supplier adapter reaches the network.
 *
 * An interface rather than a shared axios instance, for two reasons. Adapters
 * become testable against recorded payloads with no network and no mocking
 * library — which is what makes the shared contract suite in `suppliers/testing`
 * possible at all. And credentials stay in one place per supplier instead of
 * being spread across header variants: the reference TripJack client sent the
 * API key under six different header names alongside a spoofed Chrome
 * User-Agent (D-16).
 */
export interface HttpRequest {
  readonly method: 'GET' | 'POST';
  /** Path relative to the supplier's base URL. */
  readonly path: string;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | number | undefined>>;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface HttpResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly body: unknown;
  /** Present when the response was not JSON. Truncated; for logs only. */
  readonly rawText?: string;
}

export interface HttpCallOptions {
  readonly signal: AbortSignal;
  readonly timeoutMs: number;
}

export interface HttpTransport {
  request(req: HttpRequest, opts: HttpCallOptions): Promise<HttpResponse>;
}

/**
 * A transport failure that never reached a status code — DNS, connection reset,
 * TLS, or a client-side abort. Distinguished from an HTTP error response
 * because the two normalise to different supplier error codes.
 */
export class TransportError extends Error {
  readonly kind: 'TIMEOUT' | 'ABORTED' | 'NETWORK';

  constructor(kind: 'TIMEOUT' | 'ABORTED' | 'NETWORK', message: string) {
    super(message);
    this.name = 'TransportError';
    this.kind = kind;
  }
}

export interface FetchTransportOptions {
  readonly baseUrl: string;
  readonly headers: Readonly<Record<string, string>>;
  /** Injected so tests can drive it; defaults to the global. */
  readonly fetchImpl?: typeof globalThis.fetch;
}

/** Trailing slashes on a base URL plus leading slashes on a path make `//`. */
const joinUrl = (base: string, path: string): string =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export function createFetchTransport(opts: FetchTransportOptions): HttpTransport {
  const doFetch = opts.fetchImpl ?? globalThis.fetch;

  return {
    async request(req, callOpts): Promise<HttpResponse> {
      const url = new URL(joinUrl(opts.baseUrl, req.path));
      for (const [k, v] of Object.entries(req.query ?? {})) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }

      // Two reasons to stop waiting: our own deadline (the caller's signal) and
      // this call's budget. Whichever fires first wins.
      const timeout = AbortSignal.timeout(callOpts.timeoutMs);
      const signal = AbortSignal.any([callOpts.signal, timeout]);

      let res: Response;
      try {
        res = await doFetch(url, {
          method: req.method,
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...opts.headers,
            ...req.headers,
          },
          ...(req.body !== undefined ? { body: JSON.stringify(req.body) } : {}),
          signal,
        });
      } catch (err) {
        if (timeout.aborted) throw new TransportError('TIMEOUT', 'supplier call exceeded its budget');
        if (callOpts.signal.aborted) throw new TransportError('ABORTED', 'search deadline passed');
        throw new TransportError('NETWORK', err instanceof Error ? err.message : 'network failure');
      }

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text.length > 0 ? JSON.parse(text) : null;
      } catch {
        // A supplier answering with HTML is usually a WAF or a maintenance page.
        // Keep a short excerpt for diagnosis; it never reaches a customer.
        return { status: res.status, ok: res.ok, body: null, rawText: text.slice(0, 500) };
      }
      return { status: res.status, ok: res.ok, body: parsed };
    },
  };
}
