/**
 * Per-supplier circuit breaker.
 *
 * Deliberately explicit about what counts as a failure. The reference breaker
 * tripped on any 5xx, which is defensible, but the surrounding code also
 * counted its own deliberate cancellations — so a busy period where the search
 * deadline cut suppliers short would open breakers on feeds that were perfectly
 * healthy, making the next period worse. `countsAgainstBreaker()` in the error
 * taxonomy decides; this class only counts what it is told to.
 *
 * The clock is injected. A breaker whose behaviour can only be tested by
 * sleeping is a breaker nobody tests.
 */
export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly openMs: number;
  readonly now?: () => number;
}

export class CircuitBreaker {
  readonly #threshold: number;
  readonly #openMs: number;
  readonly #now: () => number;

  #failures = 0;
  /** `null` means "never opened". A timestamp of 0 is a valid clock reading. */
  #openedAt: number | null = null;
  #halfOpenInFlight = false;

  constructor(opts: CircuitBreakerOptions) {
    this.#threshold = Math.max(1, opts.failureThreshold);
    this.#openMs = Math.max(0, opts.openMs);
    this.#now = opts.now ?? Date.now;
  }

  state(): BreakerState {
    if (this.#openedAt === null) return 'CLOSED';
    return this.#now() - this.#openedAt >= this.#openMs ? 'HALF_OPEN' : 'OPEN';
  }

  /**
   * In HALF_OPEN, exactly one probe is admitted. Letting a burst through the
   * moment the window elapses is how a recovering supplier gets knocked over
   * again by the traffic that was queued behind the breaker.
   */
  canAttempt(): boolean {
    const state = this.state();
    if (state === 'CLOSED') return true;
    if (state === 'OPEN') return false;
    if (this.#halfOpenInFlight) return false;
    this.#halfOpenInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.#failures = 0;
    this.#openedAt = null;
    this.#halfOpenInFlight = false;
  }

  /**
   * A failure while half open re-opens immediately — it does not start counting
   * towards the threshold again.
   *
   * Without that, the probe that proves the supplier is still down leaves the
   * breaker half open: `state()` keeps reading HALF_OPEN because `openedAt` has
   * not moved, so the next call is admitted, and the next, until a whole fresh
   * threshold of failures accumulates. The class promises "exactly one probe"
   * and delivered one probe per call for as long as the supplier stayed down —
   * on a booking path, that is commit traffic aimed at a supplier we already
   * know is failing.
   */
  recordFailure(): void {
    const wasProbing = this.#openedAt !== null;
    this.#halfOpenInFlight = false;
    this.#failures += 1;
    if (wasProbing || this.#failures >= this.#threshold) {
      this.#openedAt = this.#now();
      this.#failures = 0;
    }
  }

  /** Outcomes that are neither a success nor the supplier's fault. */
  recordIgnored(): void {
    this.#halfOpenInFlight = false;
  }

  /** Test seam. */
  reset(): void {
    this.#failures = 0;
    this.#openedAt = null;
    this.#halfOpenInFlight = false;
  }
}
