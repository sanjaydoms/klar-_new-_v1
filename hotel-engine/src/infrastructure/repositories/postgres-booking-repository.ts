import {
  klarBookingId,
  supplierCode,
  type KlarBookingId,
} from '../../domain/shared/brand.js';
import { stayDates } from '../../domain/shared/stay.js';
import type { Booking, BookingStatus, DealSnapshot, Guest } from '../../domain/booking/booking.js';
import type {
  BookingCreation,
  BookingEvent,
  BookingPatch,
  BookingRepository,
  SupplierPayloadRecord,
} from '../../modules/ports.js';
import type { Database, SqlRow, SqlValue } from '../db/database.js';
import { asDate, asJson, asString } from '../db/database.js';

/**
 * Bookings, on Postgres.
 *
 * Three writes carry the whole phase, and each of them is a race the DATABASE
 * settles rather than the caller:
 *
 *  - `create` leans on the unique index over `idempotency_key`. A duplicate is
 *    caught as a constraint violation and answered with the booking that
 *    already exists — not with an error the caller has to interpret, and not
 *    with a second reservation.
 *  - `advance` puts the expected status in the WHERE clause, so two workers who
 *    both read `SUPPLIER_PENDING` cannot both act on it. A read-then-write in
 *    application code is B-3's shape and produces exactly B-3's outcome.
 *  - `claimRefund` is a conditional update over the refund state. It is what
 *    makes the in-request path, the poller and the reconciliation worker refund
 *    a failed booking once between them rather than three times.
 *
 * The canonical `deal_snapshot` is the only thing a customer surface reads. Raw
 * supplier payloads go to their own table, which is why adding a third supplier
 * needs no migration and no frontend release.
 */
export interface PostgresBookingRepositoryOptions {
  readonly now?: () => Date;
}

interface BookingRow extends SqlRow {
  klar_booking_id: string;
  public_token: string;
  idempotency_key: string;
  supplier: string;
  supplier_booking_ref: string | null;
  hotel_confirmation_number: string | null;
  supplier_state: unknown;
  status: string;
  check_in: unknown;
  check_out: unknown;
  deal_snapshot: unknown;
  guests: unknown;
  payment: unknown;
  refund: unknown;
  channel: string;
  agent_id: string | null;
  user_id: string | null;
  created_at: unknown;
  updated_at: unknown;
}

/** `date` comes back as a Date on one driver and as `YYYY-MM-DD` on another. */
function isoDay(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  throw new Error(`a booking row carried an unreadable date: ${String(value)}`);
}

/**
 * Revive the snapshot.
 *
 * Only `quotedAt` needs work: everything else in a `DealSnapshot` is already
 * JSON — `Money` is `{ minor, currency }`, and the branded ids are strings at
 * runtime. Reviving it wholesale through a generic date-walker would be worse,
 * not better: it would silently convert any future string that happens to look
 * like an instant.
 */
function reviveSnapshot(raw: unknown): DealSnapshot {
  const snapshot = asJson<DealSnapshot & { quotedAt: unknown }>(raw, null as never);
  return { ...snapshot, quotedAt: asDate(snapshot.quotedAt) ?? new Date(0) };
}

function revivePayment(raw: unknown): Booking['payment'] {
  const payment = asJson<(NonNullable<Booking['payment']> & { verifiedAt: unknown }) | null>(
    raw,
    null,
  );
  if (payment === null) return undefined;
  return { ...payment, verifiedAt: asDate(payment.verifiedAt) ?? new Date(0) };
}

function reviveRefund(raw: unknown): Booking['refund'] {
  const refund = asJson<
    (NonNullable<Booking['refund']> & { attemptedAt?: unknown; completedAt?: unknown }) | null
  >(raw, null);
  if (refund === null) return undefined;

  const attemptedAt = asDate(refund.attemptedAt);
  const completedAt = asDate(refund.completedAt);
  return {
    ...refund,
    ...(attemptedAt !== undefined ? { attemptedAt } : { attemptedAt: undefined }),
    ...(completedAt !== undefined ? { completedAt } : { completedAt: undefined }),
  };
}

function toBooking(row: BookingRow): Booking {
  const supplierState = asJson<Record<string, unknown> | null>(row.supplier_state, null);
  const payment = revivePayment(row.payment);
  const refund = reviveRefund(row.refund);

  return {
    klarBookingId: klarBookingId(row.klar_booking_id),
    publicToken: row.public_token,
    idempotencyKey: row.idempotency_key,
    supplier: supplierCode(row.supplier),
    ...(asString(row.supplier_booking_ref) !== undefined
      ? { supplierBookingRef: row.supplier_booking_ref as string }
      : {}),
    ...(asString(row.hotel_confirmation_number) !== undefined
      ? { hotelConfirmationNumber: row.hotel_confirmation_number as string }
      : {}),
    ...(supplierState !== null ? { supplierState } : {}),
    status: row.status as BookingStatus,
    stay: stayDates(isoDay(row.check_in), isoDay(row.check_out)),
    deal: reviveSnapshot(row.deal_snapshot),
    guests: asJson<readonly Guest[]>(row.guests, []),
    ...(payment !== undefined ? { payment } : {}),
    ...(refund !== undefined ? { refund } : {}),
    channel: row.channel as Booking['channel'],
    ...(asString(row.agent_id) !== undefined ? { agentId: row.agent_id as string } : {}),
    ...(asString(row.user_id) !== undefined ? { userId: row.user_id as string } : {}),
    createdAt: asDate(row.created_at) ?? new Date(0),
    updatedAt: asDate(row.updated_at) ?? new Date(0),
  };
}

const SELECT = `
  SELECT klar_booking_id, public_token, idempotency_key, supplier, supplier_booking_ref,
         hotel_confirmation_number, supplier_state, status, check_in, check_out,
         deal_snapshot, guests, payment, refund, channel, agent_id, user_id,
         created_at, updated_at
    FROM booking`;

/** 23505 is Postgres' unique-violation SQLSTATE. */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = error as { code?: unknown; constraint?: unknown; message?: unknown };
  if (e?.code === '23505') {
    return typeof e.constraint === 'string' ? e.constraint === constraint : true;
  }
  // PGlite surfaces the same failure as a plain Error whose message names the
  // index. Reading the message is a fallback, not the primary signal.
  return typeof e?.message === 'string' && e.message.includes(constraint);
}

export class PostgresBookingRepository implements BookingRepository {
  readonly #db: Database;
  readonly #now: () => Date;

  constructor(db: Database, options: PostgresBookingRepositoryOptions = {}) {
    this.#db = db;
    this.#now = options.now ?? (() => new Date());
  }

  async create(booking: Booking): Promise<BookingCreation> {
    try {
      await this.#db.query(
        `INSERT INTO booking
           (klar_booking_id, public_token, idempotency_key, supplier, supplier_booking_ref,
            hotel_confirmation_number, supplier_state, status, klar_hotel_id, deal_id,
            check_in, check_out, deal_snapshot, guests, currency, total_minor, cost_minor,
            payment, refund, channel, agent_id, user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb,
                 $14::jsonb, $15, $16, $17, $18::jsonb, $19::jsonb, $20, $21, $22, $23, $23)`,
        [
          String(booking.klarBookingId),
          booking.publicToken,
          booking.idempotencyKey,
          String(booking.supplier),
          booking.supplierBookingRef ?? null,
          booking.hotelConfirmationNumber ?? null,
          // A real SQL NULL, not the JSON literal `null`: `jsonb 'null' || '{}'`
          // concatenates into an ARRAY, so an absent supplier state stored as
          // JSON null would turn the first merge in `advance` into `[null, {…}]`
          // and lose the identifiers cancelling needs.
          booking.supplierState !== undefined ? JSON.stringify(booking.supplierState) : null,
          booking.status,
          String(booking.deal.klarHotelId),
          String(booking.deal.dealId),
          booking.stay.checkIn,
          booking.stay.checkOut,
          JSON.stringify(booking.deal),
          JSON.stringify(booking.guests),
          String(booking.deal.price.currency),
          booking.deal.price.total.minor,
          booking.deal.cost.total.minor,
          booking.payment !== undefined ? JSON.stringify(booking.payment) : null,
          booking.refund !== undefined ? JSON.stringify(booking.refund) : null,
          booking.channel,
          booking.agentId ?? null,
          booking.userId ?? null,
          booking.createdAt,
        ] as SqlValue[],
      );
      return { created: true, booking };
    } catch (error) {
      if (!isUniqueViolation(error, 'booking_idempotency_key')) throw error;

      const existing = await this.findByIdempotencyKey(booking.idempotencyKey);
      // The row must exist — the index is why we are here — but a null would
      // mean something stranger than a duplicate, and re-raising is honest.
      if (existing === null) throw error;
      return { created: false, reason: 'DUPLICATE', existing };
    }
  }

  async findById(id: KlarBookingId): Promise<Booking | null> {
    return this.#one(`${SELECT} WHERE klar_booking_id = $1`, [String(id)]);
  }

  async findByPublicToken(token: string): Promise<Booking | null> {
    return this.#one(`${SELECT} WHERE public_token = $1`, [token]);
  }

  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    return this.#one(`${SELECT} WHERE idempotency_key = $1`, [key]);
  }

  async findByUser(userId: string, limit: number): Promise<readonly Booking[]> {
    const rows = await this.#db.query<BookingRow>(
      `${SELECT} WHERE user_id = $1 ORDER BY created_at DESC, klar_booking_id DESC LIMIT $2`,
      [userId, limit],
    );
    return rows.map(toBooking);
  }

  /** The WHERE clause matches the `booking_unsettled` partial index exactly, so this is an index scan, not a table scan. */
  async findUnsettled(limit: number): Promise<readonly Booking[]> {
    const rows = await this.#db.query<BookingRow>(
      `${SELECT}
        WHERE status IN ('SUPPLIER_PENDING', 'CANCELLATION_PENDING', 'MANUAL_REVIEW', 'PAYMENT_HELD')
        ORDER BY updated_at ASC
        LIMIT $1`,
      [limit],
    );
    return rows.map(toBooking);
  }

  /**
   * The expected status is part of the WHERE clause, deliberately.
   *
   * Reading the booking, checking its status and then writing is two statements
   * with a gap in between, and the gap is where two workers both decide they
   * may act. Postgres updates zero rows for the loser, and zero rows is the
   * answer "someone else got there first".
   */
  async advance(input: {
    id: KlarBookingId;
    to: BookingStatus;
    expect: readonly BookingStatus[];
    patch?: BookingPatch;
    at: Date;
  }): Promise<Booking | null> {
    const patch = input.patch ?? {};
    const rows = await this.#db.query<BookingRow>(
      `UPDATE booking
          SET status = $2,
              updated_at = $3,
              supplier_booking_ref = COALESCE($4, supplier_booking_ref),
              hotel_confirmation_number = COALESCE($5, hotel_confirmation_number),
              -- Merged, not replaced: a later call must not drop the identifiers
              -- an earlier one recorded, and cancelling needs all of them (A-3).
              supplier_state = COALESCE(supplier_state, '{}'::jsonb) || COALESCE($6::jsonb, '{}'::jsonb),
              payment = COALESCE($7::jsonb, payment)
        WHERE klar_booking_id = $1
          AND status = ANY($8)
        RETURNING klar_booking_id, public_token, idempotency_key, supplier, supplier_booking_ref,
                  hotel_confirmation_number, supplier_state, status, check_in, check_out,
                  deal_snapshot, guests, payment, refund, channel, agent_id, user_id,
                  created_at, updated_at`,
      [
        String(input.id),
        input.to,
        input.at,
        patch.supplierBookingRef ?? null,
        patch.hotelConfirmationNumber ?? null,
        patch.supplierState !== undefined ? JSON.stringify(patch.supplierState) : null,
        patch.payment !== undefined ? JSON.stringify(patch.payment) : null,
        input.expect.map(String),
      ] as SqlValue[],
    );

    const row = rows[0];
    return row === undefined ? null : toBooking(row);
  }

  /**
   * One conditional write decides who may move money.
   *
   * Claimable only from "nobody owns it" and "the last attempt failed" — a
   * refund that could not be paid still has to be, and any other state means
   * another path is already paying it.
   */
  async claimRefund(id: KlarBookingId, record: NonNullable<Booking['refund']>): Promise<boolean> {
    const rows = await this.#db.query<SqlRow>(
      `UPDATE booking
          SET refund = $2::jsonb, updated_at = $3
        WHERE klar_booking_id = $1
          AND (refund IS NULL
               OR refund->>'status' IS NULL
               OR refund->>'status' IN ('NONE', 'FAILED'))
        RETURNING klar_booking_id`,
      [String(id), JSON.stringify(record), this.#now()] as SqlValue[],
    );
    return rows.length > 0;
  }

  async settleRefund(id: KlarBookingId, record: NonNullable<Booking['refund']>): Promise<void> {
    await this.#db.query(
      `UPDATE booking SET refund = $2::jsonb, updated_at = $3 WHERE klar_booking_id = $1`,
      [String(id), JSON.stringify(record), this.#now()] as SqlValue[],
    );
  }

  async recordSupplierPayload(record: SupplierPayloadRecord): Promise<void> {
    await this.#db.query(
      `INSERT INTO booking_supplier_payload
         (klar_booking_id, supplier, operation, request, response, recorded_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        String(record.klarBookingId),
        String(record.supplier),
        record.operation,
        JSON.stringify(record.request ?? null),
        JSON.stringify(record.response ?? null),
        record.recordedAt,
      ] as SqlValue[],
    );
  }

  async supplierPayloads(id: KlarBookingId): Promise<readonly SupplierPayloadRecord[]> {
    const rows = await this.#db.query<SqlRow>(
      `SELECT supplier, operation, request, response, recorded_at
         FROM booking_supplier_payload
        WHERE klar_booking_id = $1
        ORDER BY recorded_at, id`,
      [String(id)],
    );

    return rows.map((row) => ({
      klarBookingId: id,
      supplier: supplierCode(String(row['supplier'])),
      operation: String(row['operation']) as SupplierPayloadRecord['operation'],
      request: asJson<unknown>(row['request'], null),
      response: asJson<unknown>(row['response'], null),
      recordedAt: asDate(row['recorded_at']) ?? new Date(0),
    }));
  }

  /** `RETURNING id` and counting rows, not `rowCount` — the structural `QueryableClient` port only guarantees `rows`. */
  async purgeSupplierPayloadsBefore(cutoff: Date): Promise<number> {
    const rows = await this.#db.query<SqlRow>(
      `DELETE FROM booking_supplier_payload WHERE recorded_at < $1 RETURNING id`,
      [cutoff] as SqlValue[],
    );
    return rows.length;
  }

  async appendEvent(event: BookingEvent): Promise<void> {
    await this.#db.query(
      `INSERT INTO booking_event (klar_booking_id, type, status, detail, occurred_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [
        String(event.klarBookingId),
        event.type,
        event.status ?? null,
        JSON.stringify(event.detail ?? {}),
        event.occurredAt,
      ] as SqlValue[],
    );
  }

  async events(id: KlarBookingId): Promise<readonly BookingEvent[]> {
    const rows = await this.#db.query<SqlRow>(
      `SELECT type, status, detail, occurred_at
         FROM booking_event
        WHERE klar_booking_id = $1
        ORDER BY occurred_at, id`,
      [String(id)],
    );

    return rows.map((row) => ({
      klarBookingId: id,
      type: String(row['type']),
      ...(asString(row['status']) !== undefined
        ? { status: String(row['status']) as BookingStatus }
        : {}),
      detail: asJson<Record<string, unknown>>(row['detail'], {}),
      occurredAt: asDate(row['occurred_at']) ?? new Date(0),
    }));
  }

  async #one(sql: string, params: readonly SqlValue[]): Promise<Booking | null> {
    const rows = await this.#db.query<BookingRow>(sql, params);
    const row = rows[0];
    return row === undefined ? null : toBooking(row);
  }
}
