import type { SupplierCode } from '../domain/shared/brand.js';
import type { NormalizedSupplierError } from '../suppliers/contract/errors.js';
import type { Clock, Logger } from './ports.js';

/**
 * One supplier's failure stays one supplier's failure.
 *
 * ADR-0003 §3 says a supplier call never rejects: every contract method
 * resolves with a status. That is a promise the *contract* makes, and it held
 * for both adapters — but no caller can verify it, and `Promise.all` rejects on
 * the first rejection. An adapter that threw anyway (a malformed payload
 * reaching a domain constructor is the realistic route, and B-1 confirmed it)
 * took every other supplier's results down with it and recorded no attempt for
 * anyone.
 *
 * This lives in one place because the search fan-out and the detail fan-out
 * both need it and a second hand-rolled copy is how two implementations of one
 * rule drift apart (§1.3). Anything that fans out to suppliers goes through
 * here.
 */
export type Isolated<T> =
  | { readonly ok: true; readonly value: T; readonly durationMs: number }
  | { readonly ok: false; readonly error: NormalizedSupplierError; readonly durationMs: number };

export interface IsolationDeps {
  readonly clock: Clock;
  readonly logger: Logger;
}

export async function isolateSupplierCall<T>(
  supplier: SupplierCode,
  run: () => Promise<T>,
  deps: IsolationDeps,
): Promise<Isolated<T>> {
  const startedAt = deps.clock.now();
  try {
    const value = await run();
    return { ok: true, value, durationMs: deps.clock.now() - startedAt };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    deps.logger.error('supplier threw out of its own contract', { supplier, reason });
    return {
      ok: false,
      error: { code: 'SUPPLIER_MALFORMED_RESPONSE', message: reason, retryable: false },
      durationMs: deps.clock.now() - startedAt,
    };
  }
}
