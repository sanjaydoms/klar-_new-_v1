-- 002 — bookings, their audit trail, and the raw supplier payloads behind them.
--
-- ADR-0005 §2. Three tables, and the split between them is the point:
--
--   booking                  what KLAR sold, in KLAR's own vocabulary
--   booking_supplier_payload what went over the wire — audit only, never a UI's
--   booking_event            append-only, so "how did it get here?" has an answer
--
-- The reference stored `rateGainRequest` / `tripJackRequest` / `tripJackResponse`
-- as named columns on the booking and rendered the bookings list out of them
-- (`booking.rateGainRequest.BookReservation.RoomSelection[0].Property.Name`).
-- Adding a third supplier therefore needed a migration AND a frontend release.
-- Here the display data is a canonical `deal_snapshot` and the wire format lives
-- in a side table keyed by supplier code, so a third supplier adds rows and
-- nothing else.

-- ── Bookings ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking (
  klar_booking_id   text PRIMARY KEY,

  -- Unguessable handle for anonymous guest access. Never the primary key: the
  -- id appears in logs, support tickets and URLs, and a booking must not be
  -- readable by anyone who has seen one.
  public_token      text NOT NULL,

  -- Client-supplied. The unique index below is what makes a double-submitted
  -- booking one booking rather than two rooms and two charges.
  idempotency_key   text NOT NULL,

  -- A STRING keyed to supplier_config, not an enum. The reference's two-value
  -- `BookingProvider` enum meant a third supplier required a schema migration —
  -- one of the two hard blockers on "add a supplier without a rewrite".
  supplier          text NOT NULL,
  supplier_booking_ref text,
  -- The property's own PMS number, when the supplier passes one on. RateGain's
  -- commit carries none, and its `reservationId` is not one (A-4).
  hotel_confirmation_number text,

  -- Whatever cancelling this booking will need and only the commit response
  -- knew: RateGain's `CancelReservation` requires ReservationId, PropertyId and
  -- PropertyCode alongside the confirmation number (A-3). Opaque here on
  -- purpose — the engine never interprets it and no client ever sees it.
  supplier_state    jsonb,

  status            text NOT NULL,
  klar_hotel_id     text,
  deal_id           text,

  check_in          date NOT NULL,
  check_out         date NOT NULL,

  -- Canonical, supplier-neutral. This is what the voucher, the bookings list and
  -- the invoice render from.
  deal_snapshot     jsonb NOT NULL,
  guests            jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Denormalised out of deal_snapshot so money can be summed, reconciled and
  -- indexed without unpacking JSON. Minor units, because that is what Money is.
  currency          char(3) NOT NULL,
  total_minor       bigint NOT NULL,
  cost_minor        bigint NOT NULL,

  payment           jsonb,
  refund            jsonb,

  channel           text NOT NULL DEFAULT 'B2C',
  agent_id          text,
  user_id           text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT booking_status CHECK (status IN (
    'DRAFT', 'PRECHECK_PASSED', 'PAYMENT_HELD', 'SUPPLIER_PENDING', 'CONFIRMED',
    'ON_HOLD', 'CANCELLATION_PENDING', 'CANCELLED', 'FAILED', 'MANUAL_REVIEW'
  )),
  CONSTRAINT booking_channel CHECK (channel IN ('B2C', 'B2B')),
  CONSTRAINT booking_dates CHECK (check_out > check_in),
  -- A booking for nothing is a bug upstream, and it is cheaper to refuse the row
  -- than to explain a zero-value reservation later.
  CONSTRAINT booking_total_positive CHECK (total_minor > 0)
);

-- The constraint that stops a double booking. A retried submit, a double-clicked
-- button and a client that reconnects mid-commit all arrive with the same key,
-- and exactly one of them may become a reservation.
CREATE UNIQUE INDEX IF NOT EXISTS booking_idempotency_key
  ON booking (idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS booking_public_token
  ON booking (public_token);

-- "My bookings", newest first.
CREATE INDEX IF NOT EXISTS booking_by_user
  ON booking (user_id, created_at DESC);

-- The reconciliation worker's query: everything that has not settled.
CREATE INDEX IF NOT EXISTS booking_unsettled
  ON booking (status, updated_at)
  WHERE status IN ('SUPPLIER_PENDING', 'CANCELLATION_PENDING', 'MANUAL_REVIEW', 'PAYMENT_HELD');

-- ── Supplier payloads ───────────────────────────────────────────────────────

-- Audit and dispute resolution only. Nothing that renders a booking may read
-- this table; that is what `deal_snapshot` is for.
CREATE TABLE IF NOT EXISTS booking_supplier_payload (
  id              bigserial PRIMARY KEY,
  klar_booking_id text NOT NULL REFERENCES booking (klar_booking_id) ON DELETE CASCADE,
  supplier        text NOT NULL,
  -- Which exchange this was: 'PRECHECK', 'BOOK', 'STATUS', 'CANCEL'.
  operation       text NOT NULL,
  request         jsonb,
  response        jsonb,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_supplier_payload_by_booking
  ON booking_supplier_payload (klar_booking_id, recorded_at);

-- ── Events ──────────────────────────────────────────────────────────────────

-- Append-only. Statuses say where a booking is; this says how it got there, and
-- it is the only record that survives a status being overwritten.
CREATE TABLE IF NOT EXISTS booking_event (
  id              bigserial PRIMARY KEY,
  klar_booking_id text NOT NULL REFERENCES booking (klar_booking_id) ON DELETE CASCADE,
  type            text NOT NULL,
  status          text,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_event_by_booking
  ON booking_event (klar_booking_id, occurred_at, id);
