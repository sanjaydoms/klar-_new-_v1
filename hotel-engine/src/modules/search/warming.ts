import { searchTargetKey, type UnifiedHotelSearchRequest } from '../../domain/search/request.js';
import type { UnifiedSearchResult } from '../../domain/search/result.js';
import type { Logger } from '../ports.js';

/**
 * Cache warming (ADR-0005 §4-5, the third and last item OPEN-ISSUES §4 lists
 * under Phase 9): keep the dynamic search cache — and, as a side effect, the
 * static property and destination caches a search reads on its way through —
 * fresh for a curated list of searches, so the customer who runs one of them
 * finds a HIT instead of paying the full fan-out.
 *
 * There is no popularity tracking in this system (Phase 10, observability).
 * The honest thing to warm, until there is, is a list an operator states —
 * the same posture `KLAR_MARKUP_RULES` takes on markup: a commercial decision
 * read from configuration, not inferred.
 *
 * Warming runs a request through `SearchOrchestrator.search()` unchanged and
 * discards the result. That is deliberate, not a shortcut: `search()` already
 * carries the one rule that matters here — ADR-0005 §4's `isCacheable`, which
 * refuses to cache a partial answer. A bespoke warming path would have to
 * reimplement that rule to avoid freezing a supplier's timeout into the
 * cache for every real customer behind it; reusing `search()` makes that
 * impossible to get wrong a second way.
 */
export interface Searcher {
  search(request: UnifiedHotelSearchRequest): Promise<UnifiedSearchResult>;
}

export interface CacheWarmerConfig {
  readonly targets: readonly UnifiedHotelSearchRequest[];
  /**
   * How often to re-run the list. Should sit comfortably inside the dynamic
   * cache's fresh window (`DEFAULT_SEARCH_CACHE_TTL.freshMs`, 120 s) or a
   * target goes cold between passes and warming buys nothing.
   */
  readonly intervalMs: number;
  /** TripJack's WAF answers bursts with 403s (ADR-0000 §3.1b) — stay modest. */
  readonly concurrency: number;
}

export const DEFAULT_WARM_INTERVAL_MS = 90_000;
export const DEFAULT_WARM_CONCURRENCY = 3;

export interface WarmPassResult {
  readonly warmed: number;
  readonly failed: number;
  readonly total: number;
}

export class CacheWarmer {
  readonly #searcher: Searcher;
  readonly #logger: Logger;
  readonly #config: CacheWarmerConfig;
  #timer: NodeJS.Timeout | undefined;
  #running = false;

  constructor(searcher: Searcher, logger: Logger, config: CacheWarmerConfig) {
    this.#searcher = searcher;
    this.#logger = logger.child({ component: 'cache-warmer' });
    this.#config = config;
  }

  /** Idempotent: a second call while already running is a no-op. */
  start(): void {
    if (this.#timer !== undefined || this.#config.targets.length === 0) return;
    const tick = (): void => {
      this.runOnce().catch((error: unknown) => {
        this.#logger.error('warming pass threw', {
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

  /**
   * One pass over every target, in waves bounded by `concurrency` — the same
   * wave pattern `enrichRates` uses for the same reason.
   *
   * Each target's failure is caught and logged on its own: one destination
   * having a bad moment must not stop the rest of the list from warming,
   * which is ADR-0003's supplier-isolation rule, one layer out.
   *
   * Re-entrant calls are skipped rather than queued — a pass still running
   * when the next tick fires means the list did not finish inside its own
   * interval, and piling another pass on top would only make that worse.
   */
  async runOnce(): Promise<WarmPassResult> {
    if (this.#running) {
      this.#logger.warn('previous warming pass still in flight; skipping this tick');
      return { warmed: 0, failed: 0, total: this.#config.targets.length };
    }
    this.#running = true;
    let warmed = 0;
    let failed = 0;
    try {
      const { targets, concurrency } = this.#config;
      for (let i = 0; i < targets.length; i += concurrency) {
        const wave = targets.slice(i, i + concurrency);
        const settled = await Promise.allSettled(wave.map((t) => this.#searcher.search(t)));
        settled.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            warmed += 1;
          } else {
            failed += 1;
            const target = wave[idx];
            this.#logger.warn('warming target failed', {
              ...(target !== undefined ? { target: searchTargetKey(target.target) } : {}),
              reason:
                result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          }
        });
      }
    } finally {
      this.#running = false;
    }
    const total = this.#config.targets.length;
    this.#logger.info('warming pass complete', { warmed, failed, total });
    return { warmed, failed, total };
  }
}
