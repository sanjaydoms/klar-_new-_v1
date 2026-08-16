import {
  countryCode,
  currencyCode,
  dealId,
  klarBookingId,
  klarDestinationId,
  klarHotelId,
  searchId,
  supplierHotelId,
  type CountryCode,
  type DealId,
  type KlarBookingId,
  type KlarHotelId,
  type SupplierCode,
  type SupplierHotelId,
} from '../../domain/shared/brand.js';
import type { Booking, BookingStatus } from '../../domain/booking/booking.js';
import type { CanonicalHotel, GeoPoint } from '../../domain/hotel/canonical-hotel.js';
import { normalizeName, nameSimilarity } from '../../domain/hotel/name-normalization.js';
import type { MarkupRule, MarkupRegion } from '../../domain/pricing/markup.js';
import type { SearchTarget } from '../../domain/search/request.js';
import type { SupplierSearchTarget } from '../../suppliers/contract/dto.js';
import type {
  AuthResult,
  AuthVerifier,
  BookingCreation,
  BookingEvent,
  BookingPatch,
  BookingRepository,
  Clock,
  DestinationCandidate,
  DestinationResolver,
  IdGenerator,
  IssuedRateToken,
  Logger,
  PaymentGateway,
  PaymentOutcome,
  SealedQuote,
  MappingWriteback,
  MarkupProvider,
  MatchCandidateQuery,
  PropertyRepository,
  RateTokenStore,
  SupplierPayloadRecord,
  SupplierRef,
  SupplierTargetCapability,
  UnresolvedMatch,
} from '../ports.js';
import { supplierRefKey } from '../ports.js';

/**
 * In-memory implementations of every port.
 *
 * The orchestrator can be driven end-to-end against these with no database, no
 * network and no clock — which is what makes the brief's Definition-of-Done
 * scenarios ordinary tests instead of an integration environment.
 */

export const INR = currencyCode('INR');
export const IN = countryCode('IN');

export class FakeClock implements Clock {
  #t: number;
  constructor(start = 1_700_000_000_000) {
    this.#t = start;
  }
  now(): number {
    return this.#t;
  }
  advance(ms: number): void {
    this.#t += ms;
  }
}

export class SequentialIds implements IdGenerator {
  #n = 0;
  searchId() {
    this.#n += 1;
    return searchId(`KLAR-SRCH-${this.#n}`);
  }
  correlationId(): string {
    this.#n += 1;
    return `corr-${this.#n}`;
  }
  bookingId() {
    this.#n += 1;
    return klarBookingId(`KLAR-BKG-${this.#n}`);
  }
  publicToken(): string {
    this.#n += 1;
    return `tok-${this.#n}`;
  }
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
};

export interface SeedHotel {
  readonly klarHotelId: string;
  readonly name: string;
  readonly city?: string;
  readonly location?: GeoPoint;
  readonly address?: string;
  readonly starRating?: number;
  readonly mappings?: ReadonlyArray<{ supplier: SupplierCode; supplierHotelId: string }>;
}

/**
 * A catalogue that behaves like the real one: tier-1 lookups by supplier ref,
 * candidate narrowing by city and name, and write-back of confirmed matches.
 */
export class InMemoryPropertyRepository implements PropertyRepository {
  readonly hotels = new Map<KlarHotelId, CanonicalHotel>();
  readonly unresolved: UnresolvedMatch[] = [];
  readonly persisted: MappingWriteback[] = [];
  #created = 0;

  constructor(seed: readonly SeedHotel[] = []) {
    for (const s of seed) {
      const id = klarHotelId(s.klarHotelId);
      this.hotels.set(id, {
        klarHotelId: id,
        name: s.name,
        normalizedName: normalizeName(s.name),
        ...(s.address !== undefined ? { address: s.address } : {}),
        ...(s.city !== undefined ? { city: s.city } : {}),
        ...(s.location !== undefined ? { location: s.location } : {}),
        ...(s.starRating !== undefined ? { starRating: s.starRating } : {}),
        images: [],
        amenities: [],
        supplierMappings: (s.mappings ?? []).map((m) => ({
          supplier: m.supplier,
          supplierHotelId: supplierHotelId(m.supplierHotelId),
          confidence: 'EXACT_SUPPLIER_MAPPING' as const,
          matchedBy: ['PERSISTED_MAPPING' as const],
          firstSeenAt: new Date(0),
          lastSeenAt: new Date(0),
        })),
        updatedAt: new Date(0),
      });
    }
  }

  findBySupplierRefs(refs: readonly SupplierRef[]): Promise<Map<string, CanonicalHotel>> {
    const out = new Map<string, CanonicalHotel>();
    for (const ref of refs) {
      for (const hotel of this.hotels.values()) {
        const hit = hotel.supplierMappings.some(
          (m) => m.supplier === ref.supplier && m.supplierHotelId === ref.supplierHotelId,
        );
        if (hit) out.set(supplierRefKey(ref.supplier, ref.supplierHotelId), hotel);
      }
    }
    return Promise.resolve(out);
  }

  findByKlarHotelId(id: KlarHotelId): Promise<CanonicalHotel | null> {
    return Promise.resolve(this.hotels.get(id) ?? null);
  }

  findMatchCandidates(query: MatchCandidateQuery): Promise<readonly CanonicalHotel[]> {
    // Narrow by city first, exactly as a real implementation must — a
    // catalogue-wide scan per unmatched hotel is O(n²) matching again.
    const pool = [...this.hotels.values()].filter((h) =>
      query.city === undefined || h.city === undefined
        ? true
        : h.city.toLowerCase() === query.city.toLowerCase(),
    );
    return Promise.resolve(pool.filter((h) => nameSimilarity(h.name, query.name) > 0.2));
  }

  /**
   * Upsert, mirroring the `ON CONFLICT` in the Postgres implementation.
   *
   * Appending would make a re-run of the same search accumulate duplicate
   * mappings — which is what this fake did until the shared contract suite
   * compared it against the real repository.
   *
   * The `(klar_hotel_id, supplier)` rule is a *refusal*, not an overwrite. This
   * fake used to drop the incumbent mapping and install the new one, which
   * quietly reassigned one property's identity to another and made the fake
   * disagree with the database about the one thing the index exists to decide.
   */
  persistMapping(mapping: MappingWriteback): Promise<boolean> {
    const hotel = this.hotels.get(mapping.klarHotelId);
    if (hotel === undefined) {
      this.persisted.push(mapping);
      return Promise.resolve(true);
    }

    const incumbent = hotel.supplierMappings.find((m) => m.supplier === mapping.supplier);
    if (
      incumbent !== undefined &&
      String(incumbent.supplierHotelId) !== String(mapping.supplierHotelId)
    ) {
      return Promise.resolve(false);
    }

    this.persisted.push(mapping);
    const kept = hotel.supplierMappings.filter((m) => m.supplier !== mapping.supplier);
    this.hotels.set(mapping.klarHotelId, {
      ...hotel,
      supplierMappings: [
        ...kept,
        {
          supplier: mapping.supplier,
          supplierHotelId: mapping.supplierHotelId,
          confidence: mapping.confidence,
          matchedBy: mapping.matchedBy,
          firstSeenAt: new Date(0),
          lastSeenAt: new Date(0),
        },
      ],
    });
    return Promise.resolve(true);
  }

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
  }): Promise<CanonicalHotel> {
    // A supplier id already in the catalogue keeps its hotel. Minting a second
    // identity would leave the first one's mapping pointing elsewhere and the
    // new record owned by nobody — the unreachable-hotel case the real store's
    // `ON CONFLICT` guards.
    for (const existing of this.hotels.values()) {
      const owns = existing.supplierMappings.some(
        (m) =>
          m.supplier === input.supplier &&
          String(m.supplierHotelId) === String(input.supplierHotelId),
      );
      if (owns) return Promise.resolve(existing);
    }

    this.#created += 1;
    const id = klarHotelId(`KLAR-NEW-${this.#created}`);
    const hotel: CanonicalHotel = {
      klarHotelId: id,
      name: input.name,
      normalizedName: normalizeName(input.name),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.starRating !== undefined ? { starRating: input.starRating } : {}),
      ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
      ...(input.chainCode !== undefined ? { chainCode: input.chainCode } : {}),
      images: input.imageUrls.map((url) => ({ url, sourcedFrom: input.supplier })),
      amenities: input.amenityLabels.map((label) => ({
        code: normalizeName(label).replace(/\s+/g, '_').toUpperCase(),
        label,
        sourcedFrom: input.supplier,
      })),
      supplierMappings: [
        {
          supplier: input.supplier,
          supplierHotelId: input.supplierHotelId,
          confidence: 'EXACT_SUPPLIER_MAPPING',
          matchedBy: ['PERSISTED_MAPPING'],
          firstSeenAt: new Date(0),
          lastSeenAt: new Date(0),
        },
      ],
      updatedAt: new Date(0),
    };
    this.hotels.set(id, hotel);
    return Promise.resolve(hotel);
  }

  recordUnresolved(candidate: UnresolvedMatch): Promise<void> {
    this.unresolved.push(candidate);
    return Promise.resolve();
  }
}

export class FakeDestinationResolver implements DestinationResolver {
  readonly #targets: Map<SupplierCode, SupplierSearchTarget | null>;
  readonly #inventory: number;
  readonly #country: CountryCode | undefined;
  readonly #destinations: readonly SeedDestination[];

  constructor(
    targets: Map<SupplierCode, SupplierSearchTarget | null>,
    inventory = 100,
    /** Absent mirrors an AREA search: a destination with no country on record. */
    country?: CountryCode,
    destinations: readonly SeedDestination[] = [],
  ) {
    this.#targets = targets;
    this.#inventory = inventory;
    this.#country = country;
    this.#destinations = destinations;
  }

  resolveTargets(
    _target: SearchTarget,
    suppliers: readonly SupplierTargetCapability[],
  ): Promise<Map<SupplierCode, SupplierSearchTarget | null>> {
    const out = new Map<SupplierCode, SupplierSearchTarget | null>();
    for (const s of suppliers) out.set(s.code, this.#targets.get(s.code) ?? null);
    return Promise.resolve(out);
  }

  inventoryCount(): Promise<number> {
    return Promise.resolve(this.#inventory);
  }

  countryOf(): Promise<CountryCode | undefined> {
    return Promise.resolve(this.#country);
  }

  /**
   * Scripted destinations, matched on a normalised name or an alias.
   *
   * `countryCode` is a HARD filter, exactly as the Postgres resolver applies it
   * (`AND country_code = $n`). This fake used to ignore it, so a test could
   * pass a country that would have excluded every row and still see results —
   * which is how a defect that killed all outbound international search
   * survived a passing suite.
   */
  lookup(query: {
    text: string;
    countryCode?: CountryCode;
    limit?: number;
  }): Promise<readonly DestinationCandidate[]> {
    const needle = normalizeName(query.text);
    if (needle.length === 0) return Promise.resolve([]);
    return Promise.resolve(
      this.#destinations
        .filter(
          (d) =>
            normalizeName(d.name) === needle ||
            (d.aliases ?? []).some((a) => normalizeName(a) === needle),
        )
        .filter(
          (d) => query.countryCode === undefined || (d.countryCode ?? IN) === query.countryCode,
        )
        .map((d) => ({
          klarDestinationId: klarDestinationId(d.klarDestinationId),
          name: d.name,
          countryCode: d.countryCode ?? IN,
          propertyCount: d.propertyCount ?? 0,
          score: 1,
        }))
        .slice(0, query.limit ?? 10),
    );
  }
}

export interface SeedDestination {
  readonly klarDestinationId: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly countryCode?: CountryCode;
  readonly propertyCount?: number;
}

export class FakeMarkupProvider implements MarkupProvider {
  readonly #rules: readonly MarkupRule[];
  readonly #version: string;

  constructor(rules: readonly MarkupRule[] = [], version = 'mk-1') {
    this.#rules = rules;
    this.#version = version;
  }

  rulesFor(_region: MarkupRegion, _channel: 'B2C' | 'B2B'): Promise<readonly MarkupRule[]> {
    return Promise.resolve(this.#rules);
  }

  version(): string {
    return this.#version;
  }
}

/**
 * An in-memory quote store.
 *
 * It keeps the whole `SealedQuote`, not just a counter, because the thing a
 * revalidation test is actually testing is whether the quote survived the round
 * trip intact. A fake that returned a fresh object would agree with itself
 * about a price no matter what the real store did — the divergence that has now
 * caught four defects (§1.3, B-3, C-8, D-1's revert check).
 */
export class FakeRateTokenStore implements RateTokenStore {
  #n = 0;
  readonly issued: Array<{ supplier: SupplierCode; supplierRateRef: string }> = [];
  readonly consumed: DealId[] = [];
  readonly quotes = new Map<string, SealedQuote>();
  /** Set to make every resolve miss, as an expired or unknown id does. */
  expireEverything = false;

  issue(input: Parameters<RateTokenStore['issue']>[0]): Promise<IssuedRateToken> {
    this.#n += 1;
    const id = dealId(`deal-${this.#n}`);
    const expiresAt = new Date(Date.UTC(2030, 0, 1));

    this.issued.push({ supplier: input.supplier, supplierRateRef: input.rate.supplierRateRef });
    this.quotes.set(String(id), {
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
      issuedAtMs: 0,
      expiresAtMs: expiresAt.getTime(),
    });

    return Promise.resolve({ dealId: id, expiresAt });
  }

  resolve(id: DealId): Promise<SealedQuote | null> {
    if (this.expireEverything) return Promise.resolve(null);
    return Promise.resolve(this.quotes.get(String(id)) ?? null);
  }

  reseal(
    id: DealId,
    supplier: { supplierRateRef: string; supplierState: Readonly<Record<string, unknown>> },
  ): Promise<void> {
    const existing = this.quotes.get(String(id));
    // A missing id is a no-op, as it is in the real store: there is nothing to
    // re-seal and inventing an entry would resurrect an expired quote.
    if (existing !== undefined) {
      this.quotes.set(String(id), {
        ...existing,
        supplierRateRef: supplier.supplierRateRef,
        supplierState: supplier.supplierState,
      });
    }
    return Promise.resolve();
  }

  /**
   * Answers `false` for the second caller, exactly as a `DEL` does.
   *
   * A fake that always said `true` would report both of two concurrent commits
   * for the same deal as the winner, and the double booking they cause would
   * pass the test suite.
   */
  consume(id: DealId): Promise<boolean> {
    this.consumed.push(id);
    return Promise.resolve(this.quotes.delete(String(id)));
  }
}

/**
 * A booking store that refuses everything Postgres refuses.
 *
 * Written against the same contract suite as the PostgreSQL one, and every
 * refusal below exists because the alternative is a real defect: a permissive
 * fake here would certify a double booking, a double refund or a lost race as
 * correct, and the orchestrator-level tests that run against it would agree.
 * Four defects in this codebase were hidden exactly that way.
 */
export class InMemoryBookingRepository implements BookingRepository {
  readonly bookings = new Map<string, Booking>();
  readonly payloads: SupplierPayloadRecord[] = [];
  readonly appended: BookingEvent[] = [];

  create(booking: Booking): Promise<BookingCreation> {
    // The unique index, in one line. Postgres raises 23505 here; a fake that
    // simply overwrote would turn a double-submitted commit into one booking in
    // the test suite and two rooms in production.
    const clash = [...this.bookings.values()].find(
      (b) => b.idempotencyKey === booking.idempotencyKey,
    );
    if (clash !== undefined) {
      return Promise.resolve({ created: false, reason: 'DUPLICATE', existing: clash });
    }

    this.bookings.set(String(booking.klarBookingId), booking);
    return Promise.resolve({ created: true, booking });
  }

  findById(id: KlarBookingId): Promise<Booking | null> {
    return Promise.resolve(this.bookings.get(String(id)) ?? null);
  }

  findByPublicToken(token: string): Promise<Booking | null> {
    return Promise.resolve(
      [...this.bookings.values()].find((b) => b.publicToken === token) ?? null,
    );
  }

  findByIdempotencyKey(key: string): Promise<Booking | null> {
    return Promise.resolve(
      [...this.bookings.values()].find((b) => b.idempotencyKey === key) ?? null,
    );
  }

  findByUser(userId: string, limit: number): Promise<readonly Booking[]> {
    return Promise.resolve(
      [...this.bookings.values()]
        .filter((b) => b.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit),
    );
  }

  readonly #unsettled = new Set<Booking['status']>([
    'SUPPLIER_PENDING',
    'CANCELLATION_PENDING',
    'MANUAL_REVIEW',
    'PAYMENT_HELD',
  ]);

  findUnsettled(limit: number): Promise<readonly Booking[]> {
    return Promise.resolve(
      [...this.bookings.values()]
        .filter((b) => this.#unsettled.has(b.status))
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
        .slice(0, limit),
    );
  }

  advance(input: {
    id: KlarBookingId;
    to: BookingStatus;
    expect: readonly BookingStatus[];
    patch?: BookingPatch;
    at: Date;
  }): Promise<Booking | null> {
    const existing = this.bookings.get(String(input.id));
    // The store's own guard, not the caller's: `expect` is checked here because
    // in Postgres it is checked in the same statement as the write, and a fake
    // that trusted the caller would hide a lost update.
    if (existing === undefined || !input.expect.includes(existing.status)) {
      return Promise.resolve(null);
    }

    const patch = input.patch ?? {};
    const updated: Booking = {
      ...existing,
      status: input.to,
      updatedAt: input.at,
      ...(patch.supplierBookingRef !== undefined
        ? { supplierBookingRef: patch.supplierBookingRef }
        : {}),
      ...(patch.hotelConfirmationNumber !== undefined
        ? { hotelConfirmationNumber: patch.hotelConfirmationNumber }
        : {}),
      ...(patch.supplierState !== undefined
        ? { supplierState: { ...(existing.supplierState ?? {}), ...patch.supplierState } }
        : {}),
      ...(patch.payment !== undefined ? { payment: patch.payment } : {}),
    };
    this.bookings.set(String(input.id), updated);
    return Promise.resolve(updated);
  }

  claimRefund(id: KlarBookingId, record: NonNullable<Booking['refund']>): Promise<boolean> {
    const existing = this.bookings.get(String(id));
    if (existing === undefined) return Promise.resolve(false);

    const current = existing.refund;
    // Claimable only from "nobody owns it" and "the last attempt failed". Any
    // other state means another path is already paying, and paying twice is
    // the failure this guard exists for.
    if (current !== undefined && current.status !== 'NONE' && current.status !== 'FAILED') {
      return Promise.resolve(false);
    }

    this.bookings.set(String(id), { ...existing, refund: record });
    return Promise.resolve(true);
  }

  settleRefund(id: KlarBookingId, record: NonNullable<Booking['refund']>): Promise<void> {
    const existing = this.bookings.get(String(id));
    if (existing !== undefined) {
      this.bookings.set(String(id), { ...existing, refund: record });
    }
    return Promise.resolve();
  }

  recordSupplierPayload(record: SupplierPayloadRecord): Promise<void> {
    this.payloads.push(record);
    return Promise.resolve();
  }

  supplierPayloads(id: KlarBookingId): Promise<readonly SupplierPayloadRecord[]> {
    return Promise.resolve(this.payloads.filter((p) => String(p.klarBookingId) === String(id)));
  }

  purgeSupplierPayloadsBefore(cutoff: Date): Promise<number> {
    const before = this.payloads.length;
    const kept = this.payloads.filter((p) => p.recordedAt >= cutoff);
    this.payloads.length = 0;
    this.payloads.push(...kept);
    return Promise.resolve(before - kept.length);
  }

  appendEvent(event: BookingEvent): Promise<void> {
    this.appended.push(event);
    return Promise.resolve();
  }

  events(id: KlarBookingId): Promise<readonly BookingEvent[]> {
    return Promise.resolve(
      this.appended.filter((e) => String(e.klarBookingId) === String(id)),
    );
  }
}

/**
 * A gateway that takes the money and gives it back, without a provider.
 *
 * Enough to exercise the commit path's ordering — pay, then book, then refund if
 * the booking failed — which is the part Phase 8 has to get right. `declineNext`
 * and `failRefunds` exist because the interesting cases are the failures.
 */
export class FakePaymentGateway implements PaymentGateway {
  readonly authorized: Array<{ klarBookingId: KlarBookingId; amountMinor: number }> = [];
  readonly refunded: Array<{ klarBookingId: KlarBookingId; amountMinor: number }> = [];
  declineNext = false;
  failRefunds = false;

  authorize(input: Parameters<PaymentGateway['authorize']>[0]): Promise<PaymentOutcome> {
    if (this.declineNext) {
      this.declineNext = false;
      return Promise.resolve({ ok: false, reason: 'PAYMENT_DECLINED' });
    }
    this.authorized.push({
      klarBookingId: input.klarBookingId,
      amountMinor: input.amount.minor,
    });
    return Promise.resolve({
      ok: true,
      payment: {
        provider: 'RAZORPAY',
        capturedAmount: input.amount,
        paymentId: `pay_${String(input.klarBookingId)}`,
        verifiedAt: new Date(0),
        ...(input.reference !== undefined ? { orderId: input.reference } : {}),
      },
    });
  }

  refund(
    input: Parameters<PaymentGateway['refund']>[0],
  ): Promise<{ ok: boolean; providerRefundId?: string; error?: string }> {
    if (this.failRefunds) {
      return Promise.resolve({ ok: false, error: 'gateway unavailable' });
    }
    this.refunded.push({
      klarBookingId: input.klarBookingId,
      amountMinor: input.amount.minor,
    });
    return Promise.resolve({ ok: true, providerRefundId: `rfnd_${String(input.klarBookingId)}` });
  }
}

export const VALID_TEST_TOKEN = 'valid-test-token';

/** Accepts exactly one bearer token; everything else is refused, same as `refusingAuthVerifier`. */
export class FakeAuthVerifier implements AuthVerifier {
  readonly #userId: string;
  readonly #token: string;

  constructor(userId = 'user-1', token = VALID_TEST_TOKEN) {
    this.#userId = userId;
    this.#token = token;
  }

  verify(header: string | undefined): Promise<AuthResult> {
    if (header === `Bearer ${this.#token}`) {
      return Promise.resolve({ ok: true, userId: this.#userId });
    }
    return Promise.resolve({ ok: false, reason: 'invalid token' });
  }
}
