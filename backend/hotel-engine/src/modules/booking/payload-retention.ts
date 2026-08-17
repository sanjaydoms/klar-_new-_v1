import type { BookingRepository, Clock, Logger } from '../ports.js';

/**
 * The purge job OPEN-ISSUES §4 names as missing for `booking_supplier_payload`:
 * raw supplier requests and responses, which carry guest names and contact
 * details, held with no retention policy.
 *
 * This job is the mechanism, not the policy. `retentionMs` is stated by
 * configuration and never defaulted — the same posture `KLAR_MARKUP_RULES`
 * takes on markup: a decision someone has to make, not one this code can
 * guess at. `buildHotelApi` only constructs and starts this job when a
 * retention window is actually configured; absent one, nothing purges.
 */
export interface PayloadRetentionConfig {
  readonly retentionMs: number;
  /** How often to sweep. */
  readonly intervalMs: number;
}

export const DEFAULT_RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface RetentionPassResult {
  readonly purged: number;
}

export class PayloadRetentionJob {
  readonly #bookings: BookingRepository;
  readonly #clock: Clock;
  readonly #logger: Logger;
  readonly #config: PayloadRetentionConfig;
  #timer: NodeJS.Timeout | undefined;
  #running = false;

  constructor(bookings: BookingRepository, clock: Clock, logger: Logger, config: PayloadRetentionConfig) {
    this.#bookings = bookings;
    this.#clock = clock;
    this.#logger = logger.child({ component: 'payload-retention' });
    this.#config = config;
  }

  start(): void {
    if (this.#timer !== undefined) return;
    const tick = (): void => {
      this.runOnce().catch((error: unknown) => {
        this.#logger.error('retention pass threw', {
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

  /** Re-entrant calls are skipped, same reasoning as the warmer and the reconciler. */
  async runOnce(): Promise<RetentionPassResult> {
    if (this.#running) {
      this.#logger.warn('previous retention pass still in flight; skipping this tick');
      return { purged: 0 };
    }
    this.#running = true;
    try {
      const cutoff = new Date(this.#clock.now() - this.#config.retentionMs);
      const purged = await this.#bookings.purgeSupplierPayloadsBefore(cutoff);
      this.#logger.info('retention pass complete', { purged, cutoff: cutoff.toISOString() });
      return { purged };
    } finally {
      this.#running = false;
    }
  }
}
