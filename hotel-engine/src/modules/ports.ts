import type {
  CountryCode,
  DealId,
  KlarBookingId,
  KlarDestinationId,
  KlarHotelId,
  SearchId,
  SupplierCode,
  SupplierHotelId,
} from '../domain/shared/brand.js';
import type { Money } from '../domain/shared/money.js';
import type { Booking, BookingStatus } from '../domain/booking/booking.js';
import type { CanonicalHotel, GeoPoint } from '../domain/hotel/canonical-hotel.js';
import type { StayDates } from '../domain/shared/stay.js';
import type { Occupancy } from '../domain/rate/occupancy.js';
import type { Room } from '../domain/rate/room.js';
import type { Board } from '../domain/rate/board.js';
import type { CancellationTerms } from '../domain/rate/cancellation.js';
import type { CustomerPrice } from '../domain/pricing/customer-price.js';
import type { SupplierCost } from '../domain/pricing/supplier-cost.js';
import type { MatchConfidence, MatchSignal } from '../domain/hotel/match-confidence.js';
import type { MarkupRule, MarkupRegion } from '../domain/pricing/markup.js';
import type { SearchTarget } from '../domain/search/request.js';
import type { SearchDiagnostics } from '../domain/search/result.js';
import type { SupplierRate, SupplierSearchTarget } from '../suppliers/contract/dto.js';

/**
 * Everything the modules need from the world, as interfaces.
 *
 * The orchestrator is testable end-to-end against in-memory fakes because it
 * never reaches for a database, a clock or a random number directly. That is
 * also what makes the §52 scenario matrix expressible as ordinary tests rather
 * than an integration environment.
 */

// ── Identity ────────────────────────────────────────────────────────────────

export interface SupplierRef {
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
}

export interface MatchCandidateQuery {
  readonly name: string;
  readonly location?: GeoPoint;
  readonly city?: string;
  readonly countryCode?: CountryCode;
}

export interface MappingWriteback {
  readonly klarHotelId: KlarHotelId;
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly confidence: MatchConfidence;
  readonly matchedBy: readonly MatchSignal[];
}

export interface UnresolvedMatch {
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly name: string;
  readonly nearestKlarHotelId?: KlarHotelId;
  readonly score: number;
  readonly reason: string;
}

export interface PropertyRepository {
  /** Tier 1: mappings we have already resolved. The only fully trusted tier. */
  findBySupplierRefs(refs: readonly SupplierRef[]): Promise<Map<string, CanonicalHotel>>;

  /**
   * One hotel by KLAR identity, with every supplier that sells it.
   *
   * The detail page's entry point: a hotel is asked for by canonical id, and
   * the mappings are what say which suppliers to ask for rates. `null` when the
   * id is unknown — an absent hotel is a 404, not an error.
   */
  findByKlarHotelId(id: KlarHotelId): Promise<CanonicalHotel | null>;

  /**
   * Narrow the catalogue to plausible matches for tiers 3–4. Implementations
   * should bound this — a city-wide scan per unmatched hotel is what makes
   * matching O(n²) again.
   */
  findMatchCandidates(query: MatchCandidateQuery): Promise<readonly CanonicalHotel[]>;

  /**
   * A confirmed tier-3/4 match, so the next search resolves at tier 1.
   *
   * Resolves `false` when the store refuses the mapping because that supplier
   * already sells this canonical hotel under a different id. That refusal is a
   * correct outcome, not a failure: one supplier maps to one hotel, and the
   * alternative — two of its properties collapsing into one — is the false
   * merge ADR-0001 exists to prevent. Implementations must return rather than
   * throw, because a write-back is an optimisation for the *next* search and
   * must never take down the one in flight.
   */
  persistMapping(mapping: MappingWriteback): Promise<boolean>;

  /** A property we have never seen. Creates the canonical record. */
  createFromSupplier(input: {
    supplier: SupplierCode;
    supplierHotelId: SupplierHotelId;
    name: string;
    address?: string;
    city?: string;
    countryCode?: CountryCode;
    location?: GeoPoint;
    starRating?: number;
    propertyType?: CanonicalHotel['propertyType'];
    chainCode?: string;
    imageUrls: readonly string[];
    amenityLabels: readonly string[];
  }): Promise<CanonicalHotel>;

  /** Tier-5 pairs, queued for an operator rather than merged. */
  recordUnresolved(candidate: UnresolvedMatch): Promise<void>;
}

// ── Destinations ────────────────────────────────────────────────────────────

/**
 * What a supplier will accept as a search target.
 *
 * The resolver needs this to choose a shape: TripJack takes a list of candidate
 * hotel ids and nothing else, RateGain takes a destination code or a geofilter.
 * Passing capabilities in keeps that decision in the resolver, where the
 * destination mappings live, instead of leaking supplier knowledge outward.
 */
export interface SupplierTargetCapability {
  readonly code: SupplierCode;
  readonly searchTargets: readonly SupplierSearchTarget['kind'][];
}

/**
 * A destination the customer might have meant.
 *
 * `score` is 1 for an exact name or alias hit and below it for a fuzzy one, so
 * a caller can refuse to guess. The reference resolved free text by chaining
 * regex, text search and a comma fallback against a *RateGain* table, which is
 * how "Goa" could resolve to a supplier's idea of Goa rather than KLAR's.
 */
export interface DestinationCandidate {
  readonly klarDestinationId: KlarDestinationId;
  readonly name: string;
  readonly countryCode: CountryCode;
  /** Properties KLAR knows there. The tiebreak between two plausible places. */
  readonly propertyCount: number;
  readonly score: number;
}

export interface DestinationResolver {
  /**
   * Free text → canonical destinations, best first.
   *
   * The API edge needs this because the existing frontend sends
   * `destination: "Goa"` rather than an id (teardown §2.2). Returning
   * candidates rather than one answer keeps the choice at the edge: a search
   * may take the best, an autocomplete lists them all.
   */
  lookup(query: {
    text: string;
    countryCode?: CountryCode;
    limit?: number;
  }): Promise<readonly DestinationCandidate[]>;

  /**
   * A KLAR destination, expressed the way each supplier wants it.
   *
   * `null` for a supplier that cannot serve this destination — no mapping for
   * it, or no target shape in common. The orchestrator reports that as
   * NOT_ELIGIBLE, which is not a gap in the comparison.
   */
  resolveTargets(
    target: SearchTarget,
    suppliers: readonly SupplierTargetCapability[],
  ): Promise<Map<SupplierCode, SupplierSearchTarget | null>>;

  /** Property count for the destination, for "showing 40 of 6,179". */
  inventoryCount(target: SearchTarget): Promise<number>;

  /**
   * Which country the search is *for*, which decides the markup region.
   *
   * Asked of the destination rather than read off the results, because the
   * region has to be a property of the question. Deriving it from returned
   * inventory made it depend on which supplier answered and in what order, and
   * a region decides a price — quoting and charging have to reach the same
   * answer or the customer is quoted one number and billed another.
   *
   * `undefined` for a bare coordinate search, which has no destination record
   * to carry a country.
   */
  countryOf(target: SearchTarget): Promise<CountryCode | undefined>;
}

// ── Pricing configuration ───────────────────────────────────────────────────

export interface MarkupProvider {
  rulesFor(region: MarkupRegion, channel: 'B2C' | 'B2B'): Promise<readonly MarkupRule[]>;
  /**
   * Changes whenever any rule changes. Part of the dynamic cache key, so an
   * operator's margin edit takes effect instead of waiting out a TTL.
   */
  version(): string;
}

// ── Rate tokens ─────────────────────────────────────────────────────────────

export interface IssuedRateToken {
  readonly dealId: DealId;
  readonly expiresAt: Date;
}

/**
 * Everything needed to re-ask a supplier about one offer, and to tell whether
 * the answer changed.
 *
 * It seals the **quote**, not just the rate handle, and that distinction is the
 * whole of Phase 7. Revalidation compares a `CustomerPrice` against a
 * `CustomerPrice`; the token used to carry only a supplier *cost*, so there was
 * no expected side to compare and `ROOM_CHANGED` / `BOARD_CHANGED` /
 * `CANCELLATION_CHANGED` could never fire.
 *
 * The alternative — re-deriving the quoted price at precheck from today's rules
 * — is worse than incomplete: a markup edit, a region resolved differently, or a
 * different channel would move the customer's price for a reason that has
 * nothing to do with the supplier. That is D-1 with extra steps. What was quoted
 * is a fact about the past and is stored as one.
 *
 * `scope` is sealed for the same reason: `PricingScope` is what turns the fresh
 * supplier cost into a comparable price, and channel, region country and nights
 * were request-time facts that nothing else persists.
 */
export interface SealedQuote {
  readonly dealId: DealId;
  readonly searchId: string;
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly klarHotelId: KlarHotelId;

  /** The supplier's own handle, and whatever state its precheck needs back. */
  readonly supplierRateRef: string;
  readonly supplierState: Readonly<Record<string, unknown>>;

  /** What the stay actually is. `SupplierPrecheckRequest` requires all three. */
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  readonly nationality: CountryCode;

  /** The product as quoted — the "expected" side of every comparison. */
  readonly room: Room;
  readonly board: Board;
  readonly cancellation: CancellationTerms;

  /** What the customer was shown. Never recomputed. */
  readonly quotedPrice: CustomerPrice;
  /** What the supplier said it would invoice. Carried for reconciliation. */
  readonly quotedCost: SupplierCost;

  /** Reproduces the pricing context for the FRESH cost, identically. */
  readonly scope: {
    readonly channel: 'B2C' | 'B2B';
    readonly homeCountry: CountryCode;
    readonly destinationCountry?: CountryCode;
    readonly nights: number;
  };
  /** The markup generation the quote was priced under. Diagnostic. */
  readonly markupVersion: string;

  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
}

export interface RateTokenStore {
  /**
   * Seal a supplier's rate state behind an opaque id.
   *
   * The client receives the id and nothing else, which is what keeps supplier
   * protocol out of the browser and lets a supplier be added without a
   * frontend release.
   */
  issue(input: {
    searchId: SearchId;
    supplier: SupplierCode;
    supplierHotelId: SupplierHotelId;
    klarHotelId: KlarHotelId;
    rate: SupplierRate;
    quotedPrice: CustomerPrice;
    stay: StayDates;
    occupancy: Occupancy;
    nationality: CountryCode;
    scope: SealedQuote['scope'];
    markupVersion: string;
    validForMs: number;
  }): Promise<IssuedRateToken>;

  /**
   * An id back to its quote.
   *
   * `null` covers both "never existed" and "expired", deliberately: the two are
   * indistinguishable to a caller and both mean the same thing — search again.
   * Telling a client which one it was would let it probe for valid ids.
   */
  resolve(dealId: DealId): Promise<SealedQuote | null>;

  /**
   * Replace the sealed supplier handle after a precheck, keeping the same id.
   *
   * Suppliers rotate the handle routinely — TripJack mints a booking id at
   * review, RateGain refreshes `allocationDetails` — and booking must use the
   * new one. Re-sealing under the same `dealId` means the client keeps the
   * opaque reference it already holds while the server-side state moves on.
   *
   * The QUOTE is deliberately not re-sealed: what was quoted is what the
   * customer agreed to, and a precheck that quietly rewrote it would make the
   * price-change contract unfalsifiable.
   */
  reseal(
    dealId: DealId,
    supplier: {
      supplierRateRef: string;
      supplierState: Readonly<Record<string, unknown>>;
    },
  ): Promise<void>;

  /**
   * Retire an id so it cannot be replayed, and say whether THIS caller did it.
   *
   * Called by commit, never by precheck: a precheck is repeatable by design — a
   * customer may sit on the review page, refresh, or be re-prechecked after
   * accepting a price change — and consuming the deal there would retire it
   * before it was ever booked.
   *
   * The boolean is the mutual exclusion. Two commits under DIFFERENT idempotency
   * keys for the same deal both pass the booking table's unique index, so
   * without this they would both reach the supplier and book the room twice.
   * Whoever retires the token books; the other is told the deal is spent. It
   * must therefore be a single atomic delete-if-present — `DEL` returning its
   * count, not a read followed by a delete.
   */
  consume(dealId: DealId): Promise<boolean>;
}

// ── Bookings ────────────────────────────────────────────────────────────────

/**
 * Everything a booking's audit trail records about one supplier exchange.
 *
 * Kept out of the booking itself. The reference stored the raw request on the
 * booking row and the bookings page read the room name out of it, so display
 * depended on a supplier's wire format and a third supplier broke the page.
 */
export interface SupplierPayloadRecord {
  readonly klarBookingId: KlarBookingId;
  readonly supplier: SupplierCode;
  readonly operation: 'PRECHECK' | 'BOOK' | 'STATUS' | 'CANCEL';
  readonly request?: unknown;
  readonly response?: unknown;
  readonly recordedAt: Date;
}

export interface BookingEvent {
  readonly klarBookingId: KlarBookingId;
  readonly type: string;
  readonly status?: BookingStatus;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

/**
 * The result of trying to create a booking.
 *
 * `DUPLICATE` is a success, not a failure: the client retried, the store refused
 * the second row, and the booking that already exists is the answer. Returning
 * it rather than throwing is what lets a retried commit be idempotent without
 * the caller having to interpret a Postgres error code.
 */
export type BookingCreation =
  | { readonly created: true; readonly booking: Booking }
  | { readonly created: false; readonly reason: 'DUPLICATE'; readonly existing: Booking };

/** What a commit or a poll may write onto a booking as it moves. */
export interface BookingPatch {
  readonly supplierBookingRef?: string;
  readonly hotelConfirmationNumber?: string;
  readonly supplierState?: Readonly<Record<string, unknown>>;
  readonly payment?: Booking['payment'];
}

export interface BookingRepository {
  /**
   * Persist a new booking, or report the one that already holds this
   * idempotency key. Implementations must not create a second row for a key
   * they have seen — that is a second room and a second charge.
   */
  create(booking: Booking): Promise<BookingCreation>;

  findById(id: KlarBookingId): Promise<Booking | null>;
  /** Anonymous guest access. The token, never the id. */
  findByPublicToken(token: string): Promise<Booking | null>;
  findByIdempotencyKey(key: string): Promise<Booking | null>;
  findByUser(userId: string, limit: number): Promise<readonly Booking[]>;

  /**
   * Bookings a reconciliation worker still has to settle: `SUPPLIER_PENDING`,
   * `CANCELLATION_PENDING`, `MANUAL_REVIEW`, `PAYMENT_HELD` — the
   * `booking_unsettled` index. Oldest first, so a worker with a bounded batch
   * still makes progress on the ones that have waited longest.
   */
  findUnsettled(limit: number): Promise<readonly Booking[]>;

  /**
   * Move a booking to a new status, only from a status it is allowed to be in.
   *
   * `expect` is checked by the STORE, in the same statement as the write, so two
   * workers that both read `SUPPLIER_PENDING` cannot both act on it. Resolves
   * `null` when the row was not in one of those states — which is an answer
   * ("someone else got there first"), not an error.
   */
  advance(input: {
    id: KlarBookingId;
    to: BookingStatus;
    expect: readonly BookingStatus[];
    patch?: BookingPatch;
    at: Date;
  }): Promise<Booking | null>;

  /**
   * Take ownership of this booking's refund, or resolve `false` because someone
   * else already has it.
   *
   * The conditional write is the whole mechanism: `claimRefund` decides whether
   * a refund is owed, and this decides who pays it. Both are needed — the
   * in-request path, the status poller and the reconciliation worker can all
   * pass the domain check simultaneously, and only one may move money.
   */
  claimRefund(id: KlarBookingId, record: NonNullable<Booking['refund']>): Promise<boolean>;
  /** Record the outcome of a refund this caller claimed. */
  settleRefund(id: KlarBookingId, record: NonNullable<Booking['refund']>): Promise<void>;

  recordSupplierPayload(record: SupplierPayloadRecord): Promise<void>;
  /** For operations and reconciliation. Never for anything a customer sees. */
  supplierPayloads(id: KlarBookingId): Promise<readonly SupplierPayloadRecord[]>;

  /**
   * Delete supplier-payload rows recorded before `cutoff`. Resolves the count
   * removed.
   *
   * The retention window is a policy this port takes no position on — the
   * caller states `cutoff`, the same posture `KLAR_MARKUP_RULES` takes on
   * markup: a decision read from configuration, never defaulted (OPEN-ISSUES
   * §4, "`booking_supplier_payload` has no retention policy").
   */
  purgeSupplierPayloadsBefore(cutoff: Date): Promise<number>;

  appendEvent(event: BookingEvent): Promise<void>;
  events(id: KlarBookingId): Promise<readonly BookingEvent[]>;
}

/**
 * Taking money, and giving it back.
 *
 * A port with no implementation in this phase: KLAR has no gateway credentials
 * here, and inventing one would make the booking path untestable against the
 * thing it will actually do. What matters for Phase 8 is that the ENGINE treats
 * payment as a step that can fail and must be reversed, so wiring a real
 * provider is a composition-root change rather than a rewrite of the commit
 * flow.
 *
 * The amount is never taken from the client. `authorize` is handed the figure
 * the server computed from the sealed quote and the fresh supplier cost, so the
 * reference's `b2cPriceFloor` guard — which existed to stop a tampered-low
 * client price booking at cost — has nothing to guard.
 */
export interface PaymentAuthorization {
  readonly provider: 'RAZORPAY' | 'WALLET';
  readonly orderId?: string;
  readonly paymentId?: string;
  readonly capturedAmount: Money;
  readonly verifiedAt: Date;
}

export type PaymentOutcome =
  | { readonly ok: true; readonly payment: PaymentAuthorization }
  | { readonly ok: false; readonly reason: string };

export interface PaymentGateway {
  /**
   * Confirm that this booking has been paid for, to at least this amount.
   *
   * `reference` is whatever the client was given by the payment provider; the
   * gateway's job is to verify it against the provider and to refuse a
   * reference that does not cover `amount`.
   */
  authorize(input: {
    klarBookingId: KlarBookingId;
    amount: Money;
    reference?: string;
  }): Promise<PaymentOutcome>;

  refund(input: {
    klarBookingId: KlarBookingId;
    payment: PaymentAuthorization;
    amount: Money;
    reason: string;
  }): Promise<{ readonly ok: boolean; readonly providerRefundId?: string; readonly error?: string }>;
}

// ── Caching ─────────────────────────────────────────────────────────────────

/**
 * What a cache lookup found, and how much to trust it.
 *
 * Three states rather than two, because `STALE` is a different decision from
 * `MISS`: an entry just past its freshness window is still a good enough answer
 * to hand back *now* while a fresh one is fetched behind it, and the alternative
 * — making one unlucky customer per window wait the full supplier latency — is
 * the whole reason the reference implementation grew stale-while-revalidate.
 * `SearchDiagnostics.cache` has carried these three names since Phase 4.
 */
export type CacheLookup<T> =
  | { readonly state: 'HIT'; readonly value: T }
  | { readonly state: 'STALE'; readonly value: T; readonly ageMs: number }
  | { readonly state: 'MISS' };

export interface CacheTtl {
  /** How long the value is served without question. */
  readonly freshMs: number;
  /**
   * How long past that it may still be served while a replacement is fetched.
   * Zero disables stale-while-revalidate for this entry.
   */
  readonly staleMs?: number;
}

/**
 * A cache, and a promise about what it may not do.
 *
 * **Every method resolves.** ADR-0005 §5 says Redis being down degrades latency
 * and never correctness, and the only way to hold a caller to that is to make
 * failure unrepresentable in the return type: a store that cannot be reached
 * reports `MISS`, and a write that fails is dropped. A cache that can throw is a
 * cache that can take down a search which would otherwise have succeeded — the
 * B-1 lesson, one layer out.
 */
export interface Cache {
  get<T>(key: string): Promise<CacheLookup<T>>;
  set<T>(key: string, value: T, ttl: CacheTtl): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Run `work` once per key, however many callers ask for it at the same time.
 *
 * The teardown lists request coalescing among the things the reference got
 * right and worth carrying (§5.10). It is what stops a cold cache on a popular
 * destination becoming N identical 14-second fan-outs the moment a TTL expires.
 */
export interface Coalescer {
  run<T>(key: string, work: () => Promise<T>): Promise<T>;
  /** In-flight keys. Diagnostics and tests; not a control surface. */
  readonly inFlight: number;
}

// ── Auth ────────────────────────────────────────────────────────────────────

/**
 * The result of checking one Authorization header.
 *
 * `userId` is the identity the API edge trusts from here on. Threading it in
 * place of anything the client claims in a request body is the actual gap
 * this closes: OPEN-ISSUES §4 — "a stated `userId` is not an authenticated
 * one."
 */
export type AuthResult =
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Verifies a bearer token; does not issue one.
 *
 * This engine sits behind whatever mints the token (ADR-0008: "the reference
 * used JWT via an auth-service; wiring one is an API-edge change, not an
 * engine change"). There is no login, no user store and no session here —
 * only a check of what a caller presents.
 */
export interface AuthVerifier {
  verify(authorizationHeader: string | undefined): Promise<AuthResult>;
}

// ── Metrics ─────────────────────────────────────────────────────────────────

/**
 * What OPEN-ISSUES' "observability, metrics, tracing" gap asks for beyond a
 * log line: the same `SearchDiagnostics` every search already produces,
 * aggregated somewhere a scraper can read rather than only a log a human
 * greps. `record` is the write side (called once per search, the same place
 * `SearchDiagnostics` is logged); `toPrometheusText` is the read side, served
 * at `GET /metrics`. One port, because one registry is both — there is no
 * caller that needs only one half.
 */
export interface SearchMetrics {
  record(diagnostics: SearchDiagnostics): void;
  toPrometheusText(): string;
}

// ── Ambient ─────────────────────────────────────────────────────────────────

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  searchId(): SearchId;
  correlationId(): string;
  /** `KLAR-BKG-…`. Minted before the supplier is called, so a commit that never answers still has a name. */
  bookingId(): KlarBookingId;
  /** Unguessable, for anonymous access to one booking. */
  publicToken(): string;
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

/** Key for the maps returned by `findBySupplierRefs`. */
export const supplierRefKey = (supplier: SupplierCode, id: SupplierHotelId | string): string =>
  `${supplier}:${String(id)}`;
