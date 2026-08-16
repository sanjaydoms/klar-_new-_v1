import { dealId, type DealId } from '../../domain/shared/brand.js';
import type { IssuedRateToken, RateTokenStore, SealedQuote } from '../../modules/ports.js';

/**
 * A short-lived key/value store. Redis in production; in-memory in tests.
 *
 * Kept as a port rather than an ioredis import so the token semantics — expiry,
 * single resolution, tamper-resistance — are testable without a server.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  /**
   * Remove a key, resolving `true` when this call is the one that removed it.
   *
   * Redis' `DEL` already answers exactly this. It matters because retiring a
   * deal is how two concurrent commits for the same rate are separated, and a
   * `delete` that cannot say whether it did anything cannot decide a race.
   */
  delete(key: string): Promise<boolean>;
}

export class InMemoryKeyValueStore implements KeyValueStore {
  readonly #entries = new Map<string, { value: string; expiresAt: number }>();
  readonly #now: () => number;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  get(key: string): Promise<string | null> {
    const entry = this.#entries.get(key);
    if (entry === undefined) return Promise.resolve(null);
    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  set(key: string, value: string, ttlMs: number): Promise<void> {
    this.#entries.set(key, { value, expiresAt: this.#now() + ttlMs });
    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    return Promise.resolve(this.#entries.delete(key));
  }

  get size(): number {
    return this.#entries.size;
  }
}

export interface RateTokenStoreOptions {
  readonly kv: KeyValueStore;
  readonly newId: () => string;
  readonly now: () => number;
  /** Never outlive the supplier's own rate validity, whatever the caller asks. */
  readonly maxTtlMs?: number;
}

const KEY_PREFIX = 'klar:deal:';

/**
 * Quotes sealed behind opaque ids.
 *
 * The whole point is that the sealed side never leaves the server. The client
 * holds an id; precheck and commit resolve it here. In the reference the
 * browser assembled a native RateGain `BookReservation` envelope — `ResStatus`,
 * `EchoToken`, `RoomSelectionKey`, per-night `RoomRate` — from search results it
 * had been handed, which is why adding a supplier would have meant a frontend
 * release.
 */
export class KeyValueRateTokenStore implements RateTokenStore {
  readonly #kv: KeyValueStore;
  readonly #newId: () => string;
  readonly #now: () => number;
  readonly #maxTtlMs: number;

  constructor(opts: RateTokenStoreOptions) {
    this.#kv = opts.kv;
    this.#newId = opts.newId;
    this.#now = opts.now;
    this.#maxTtlMs = opts.maxTtlMs ?? 30 * 60 * 1000;
  }

  async issue(input: Parameters<RateTokenStore['issue']>[0]): Promise<IssuedRateToken> {
    const id = dealId(this.#newId());
    const issuedAtMs = this.#now();
    const ttl = Math.max(1_000, Math.min(input.validForMs, this.#maxTtlMs));
    const expiresAtMs = issuedAtMs + ttl;

    const sealed: SealedQuote = {
      dealId: id,
      searchId: String(input.searchId),
      supplier: input.supplier,
      supplierHotelId: input.supplierHotelId,
      klarHotelId: input.klarHotelId,

      supplierRateRef: input.rate.supplierRateRef,
      supplierState: input.rate.supplierState,

      stay: input.stay,
      occupancy: input.occupancy,
      nationality: input.nationality,

      room: input.rate.room,
      board: input.rate.board,
      cancellation: input.rate.cancellation,

      quotedPrice: input.quotedPrice,
      quotedCost: input.rate.cost,

      scope: input.scope,
      markupVersion: input.markupVersion,

      issuedAtMs,
      expiresAtMs,
    };

    await this.#write(id, sealed, ttl);
    return { dealId: id, expiresAt: new Date(expiresAtMs) };
  }

  async resolve(id: DealId): Promise<SealedQuote | null> {
    const raw = await this.#kv.get(KEY_PREFIX + String(id));
    if (raw === null) return null;

    let parsed: SealedQuote;
    try {
      parsed = revive(JSON.parse(raw) as SealedQuote);
    } catch {
      return null;
    }
    // The store's own TTL is the primary guard; this catches a clock skew or a
    // backend that does not honour expiry.
    if (parsed.expiresAtMs <= this.#now()) {
      await this.#kv.delete(KEY_PREFIX + String(id));
      return null;
    }
    return parsed;
  }

  /**
   * Move the supplier handle on, leave the quote alone.
   *
   * The remaining TTL is preserved rather than extended: a precheck confirms a
   * rate, it does not buy more time on it, and refreshing the window on every
   * precheck would let a client hold a price open indefinitely by re-asking.
   */
  async reseal(
    id: DealId,
    supplier: { supplierRateRef: string; supplierState: Readonly<Record<string, unknown>> },
  ): Promise<void> {
    const existing = await this.resolve(id);
    if (existing === null) return;

    const remaining = existing.expiresAtMs - this.#now();
    if (remaining <= 0) return;

    await this.#write(
      id,
      {
        ...existing,
        supplierRateRef: supplier.supplierRateRef,
        supplierState: supplier.supplierState,
      },
      remaining,
    );
  }

  /**
   * Retire a token once its booking is committed, so it cannot be replayed.
   *
   * Resolves `true` only for the caller whose delete actually removed
   * something. That makes the token the lock on a deal: two commits for the
   * same `dealId` under different idempotency keys both get past the booking
   * table's unique index, and this is what stops the second one reaching the
   * supplier.
   */
  async consume(id: DealId): Promise<boolean> {
    return this.#kv.delete(KEY_PREFIX + String(id));
  }

  async #write(id: DealId, quote: SealedQuote, ttlMs: number): Promise<void> {
    await this.#kv.set(KEY_PREFIX + String(id), JSON.stringify(quote), ttlMs);
  }
}

/**
 * JSON has no Date, and `CancellationTerms.windows` and `CustomerPrice.fx`
 * carry them.
 *
 * A revived quote must be usable by the same domain functions that produced it,
 * so what comes back has to be shaped identically — a string where a `Date` was
 * expected surfaces much later as a comparison that silently never matches.
 */
function revive(raw: SealedQuote): SealedQuote {
  const fx = raw.quotedPrice.fx;
  if (fx === undefined) return raw;
  return {
    ...raw,
    quotedPrice: { ...raw.quotedPrice, fx: { ...fx, asOf: new Date(fx.asOf) } },
  };
}

/** The rate a token was issued for, reconstructed for a supplier call. */
export function rateRefFrom(
  quote: SealedQuote,
): Pick<import('../../suppliers/contract/dto.js').SupplierRate, 'supplierRateRef' | 'supplierState'> {
  return { supplierRateRef: quote.supplierRateRef, supplierState: quote.supplierState };
}
