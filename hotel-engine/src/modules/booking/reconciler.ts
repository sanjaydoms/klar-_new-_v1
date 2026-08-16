import type { KlarBookingId } from '../../domain/shared/brand.js';
import type { Booking } from '../../domain/booking/booking.js';
import type { BookingRepository, Logger } from '../ports.js';

/**
 * The worker OPEN-ISSUES §4 names as missing: something that asks about a
 * booking `confirm()` was never asked to settle.
 *
 * `confirm(id)` is the only operation that moves a booking out of
 * `SUPPLIER_PENDING` — it polls the supplier and settles CONFIRMED / ON_HOLD /
 * FAILED, or escalates to `MANUAL_REVIEW` when the supplier cannot be asked
 * (no `getBookingStatus`, or the booking carries no reference). A supplier
 * that never declares async booking — RateGain, whose spec documents no
 * status-poll endpoint — is not a gap this closes; that booking is *supposed*
 * to go to `MANUAL_REVIEW` rather than being guessed at (ADR-0008 §7).
 *
 * `CANCELLATION_PENDING`, `MANUAL_REVIEW` and `PAYMENT_HELD` bookings are
 * still returned by `findUnsettled` and still passed to `confirm()`, which is
 * a safe no-op for all three today — `confirm()` only acts on
 * `SUPPLIER_PENDING`. Polling a stuck cancellation, or resolving a review
 * queue automatically, needs its own decision (a cancellation fingerprint to
 * re-ask, a human's judgement) and is deliberately not invented here; this
 * worker calls the one settling operation that exists rather than reaching
 * past it.
 */
export interface Confirmer {
  confirm(id: KlarBookingId): Promise<Booking | null>;
}

export interface BookingReconcilerConfig {
  /** How often to sweep `findUnsettled`. */
  readonly intervalMs: number;
  /** Bookings per sweep. Bounds one pass; the oldest wait longest, so the next sweep still makes progress. */
  readonly batchSize: number;
  /** In-flight `confirm()` calls at once. */
  readonly concurrency: number;
}

export const DEFAULT_RECONCILE_INTERVAL_MS = 60_000;
export const DEFAULT_RECONCILE_BATCH_SIZE = 50;
export const DEFAULT_RECONCILE_CONCURRENCY = 5;

export interface ReconcilePassResult {
  readonly checked: number;
  readonly settled: number;
  readonly failed: number;
}

export class BookingReconciler {
  readonly #bookings: BookingRepository;
  readonly #confirmer: Confirmer;
  readonly #logger: Logger;
  readonly #config: BookingReconcilerConfig;
  #timer: NodeJS.Timeout | undefined;
  #running = false;

  constructor(
    bookings: BookingRepository,
    confirmer: Confirmer,
    logger: Logger,
    config: BookingReconcilerConfig,
  ) {
    this.#bookings = bookings;
    this.#confirmer = confirmer;
    this.#logger = logger.child({ component: 'booking-reconciler' });
    this.#config = config;
  }

  start(): void {
    if (this.#timer !== undefined) return;
    const tick = (): void => {
      this.runOnce().catch((error: unknown) => {
        this.#logger.error('reconciliation pass threw', {
          reason: error instanceof Error ? error.message : String(error),
        });
      });
    };
    tick();
    this.#timer = setInterval(tick, this.#config.intervalMs);
    this.#timer.unref?.();
  }

  stop(): void {
    if (this.#timer !== undefined) clearInterval(this.#timer);
    this.#timer = undefined;
  }

  /** Re-entrant calls are skipped, same reasoning as `CacheWarmer`: a sweep still running when the next tick fires means the batch did not finish inside its own interval. */
  async runOnce(): Promise<ReconcilePassResult> {
    if (this.#running) {
      this.#logger.warn('previous reconciliation pass still in flight; skipping this tick');
      return { checked: 0, settled: 0, failed: 0 };
    }
    this.#running = true;
    let settled = 0;
    let failed = 0;
    let checked = 0;
    try {
      const unsettled = await this.#bookings.findUnsettled(this.#config.batchSize);
      checked = unsettled.length;

      for (let i = 0; i < unsettled.length; i += this.#config.concurrency) {
        const wave = unsettled.slice(i, i + this.#config.concurrency);
        const results = await Promise.allSettled(
          wave.map((booking) => this.#settleOne(booking)),
        );
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) settled += 1;
          if (result.status === 'rejected') failed += 1;
        }
      }
    } finally {
      this.#running = false;
    }
    this.#logger.info('reconciliation pass complete', { checked, settled, failed });
    return { checked, settled, failed };
  }

  /** Whether this booking's status actually moved — the caller only counts real settlements, not the SUPPLIER_PENDING-only no-ops `confirm()` performs on the other three statuses. */
  async #settleOne(booking: Booking): Promise<boolean> {
    const after = await this.#confirmer.confirm(booking.klarBookingId);
    return after !== null && after.status !== booking.status;
  }
}
