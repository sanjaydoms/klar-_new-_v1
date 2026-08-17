import type { CountryCode, SupplierCode } from '../../domain/shared/brand.js';
import { DomainError } from '../../domain/shared/errors.js';
import type { HotelSupplier } from './hotel-supplier.js';

/**
 * Operator-controlled settings, loaded from `supplier_config` rather than from
 * environment variables.
 *
 * The reference implementation read 80 distinct `process.env` values across the
 * two hotel services, most of them inline in business logic and none of them
 * documented (D-19), which meant changing a supplier's timeout was a redeploy.
 * These are rows, so an operator can disable a misbehaving supplier or put it
 * into maintenance without one.
 */
export interface SupplierConfig {
  readonly code: SupplierCode;
  readonly enabled: boolean;
  /** Tiebreak only. Never overrides a cheaper comparable price. */
  readonly priority: number;
  readonly searchTimeoutMs: number;
  readonly detailTimeoutMs: number;
  readonly bookTimeoutMs: number;
  readonly maxRetries: number;
  readonly maxConcurrency: number;
  readonly circuitBreaker: {
    readonly failureThreshold: number;
    readonly openMs: number;
  };
  /** Restrict to these markets. Empty ⇒ everywhere the supplier supports. */
  readonly countries: readonly CountryCode[];
  /** Serves cached results only; issues no live calls. */
  readonly maintenanceMode: boolean;
  /** Higher is better. Breaks exact price ties in deal selection. */
  readonly reliabilityScore: number;
}

export interface RegisteredSupplier {
  readonly supplier: HotelSupplier;
  readonly config: SupplierConfig;
}

export interface SupplierSelection {
  readonly countryCode?: CountryCode;
  /** Restrict to these codes, e.g. from a `providers` filter. */
  readonly requested?: readonly SupplierCode[];
}

/**
 * The registry.
 *
 * Adding a supplier is `register()` plus a config row. Nothing in the search
 * orchestrator, the matcher, the pricing engine or the booking engine changes —
 * that property is the acceptance test for the whole architecture, so the
 * registry deliberately exposes no way to ask "is this TripJack?".
 */
export class SupplierRegistry {
  readonly #suppliers = new Map<SupplierCode, RegisteredSupplier>();

  register(supplier: HotelSupplier, config: SupplierConfig): void {
    if (supplier.code !== config.code) {
      throw new DomainError(
        'SUPPLIER_CONFIG_MISMATCH',
        'Supplier code does not match its configuration',
        { supplier: supplier.code, config: config.code },
      );
    }
    if (this.#suppliers.has(supplier.code)) {
      throw new DomainError(
        'SUPPLIER_ALREADY_REGISTERED',
        'A supplier with this code is already registered',
        { code: supplier.code },
      );
    }
    if (supplier.capabilities.asyncBooking && !supplier.getBookingStatus) {
      throw new DomainError(
        'SUPPLIER_MISSING_POLL',
        'A supplier declaring asyncBooking must implement getBookingStatus',
        { code: supplier.code },
      );
    }
    this.#suppliers.set(supplier.code, { supplier, config });
  }

  get(code: SupplierCode): RegisteredSupplier | undefined {
    return this.#suppliers.get(code);
  }

  /** Throws — for paths where the supplier came from a persisted record. */
  require(code: SupplierCode): RegisteredSupplier {
    const found = this.#suppliers.get(code);
    if (!found) {
      throw new DomainError(
        'SUPPLIER_NOT_REGISTERED',
        'No supplier is registered under this code',
        { code },
      );
    }
    return found;
  }

  all(): RegisteredSupplier[] {
    return [...this.#suppliers.values()];
  }

  /**
   * Suppliers to query for one search.
   *
   * Order is by descending priority then by code, so a fan-out is reproducible
   * and logs from two identical searches line up.
   */
  selectFor(selection: SupplierSelection): RegisteredSupplier[] {
    return this.all()
      .filter(({ config }) => config.enabled)
      .filter(({ config }) =>
        selection.requested === undefined || selection.requested.length === 0
          ? true
          : selection.requested.includes(config.code),
      )
      .filter(({ config, supplier }) => {
        if (!selection.countryCode) return true;
        const allowed = config.countries.length > 0 ? config.countries : supplier.capabilities.countries;
        return allowed.length === 0 || allowed.includes(selection.countryCode);
      })
      .sort((a, b) =>
        b.config.priority - a.config.priority || a.config.code.localeCompare(b.config.code),
      );
  }

  reliabilityScores(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const { config } of this.#suppliers.values()) {
      out[config.code] = config.reliabilityScore;
    }
    return out;
  }
}
