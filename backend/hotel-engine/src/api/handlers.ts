import type { SearchOrchestrator } from '../modules/search/orchestrator.js';
import { HOTEL_NOT_FOUND, type HotelDetailService } from '../modules/detail/detail-service.js';
import type {
  AuthVerifier,
  DestinationResolver,
  Logger,
  PropertyRepository,
  SearchMetrics,
} from '../modules/ports.js';
import {
  fromLegacySearchRequest,
  type LegacyRequestError,
  type LegacySearchRequest,
} from '../modules/compat/legacy-request.js';
import { toLegacySearchResponse } from '../modules/compat/legacy-search.js';
import { toLegacyProductsResponse } from '../modules/compat/legacy-products.js';
import { toLegacyPrecheckResponse } from '../modules/compat/legacy-precheck.js';
import { toLegacyBooking } from '../modules/compat/legacy-booking.js';
import type { RevalidationService } from '../modules/revalidation/revalidation-service.js';
import type { BookingService } from '../modules/booking/booking-service.js';
import type { BookingRepository } from '../modules/ports.js';
import type { CommitConsent } from '../domain/booking/commit.js';
import { countryCode, dealId, klarBookingId, type CountryCode } from '../domain/shared/brand.js';
import { money, toMajor } from '../domain/shared/money.js';
import { stayDates } from '../domain/shared/stay.js';
import { occupancy, roomRequest } from '../domain/rate/occupancy.js';
import { currencyCode } from '../domain/shared/brand.js';

/**
 * The API's request handlers, with no HTTP in them.
 *
 * A handler takes a parsed body and returns a status and a value. Nothing here
 * knows about sockets, headers or a framework, so the transport underneath can
 * be replaced without touching a line of this — and every one of these is a
 * plain function call in a test rather than a fixture with a running server.
 */
export interface HandlerResult {
  readonly status: number;
  readonly body: unknown;
  /** Set only by handlers whose body is not JSON — `metricsHandler`'s Prometheus text. Absent means the JSON path `server.ts` already takes. */
  readonly contentType?: string;
}

export interface HandlerDeps {
  readonly orchestrator: SearchOrchestrator;
  readonly detail: HotelDetailService;
  readonly destinations: DestinationResolver;
  readonly properties: PropertyRepository;
  readonly logger: Logger;
  readonly defaultCountry: CountryCode;
  /** Supplier codes the registry knows, so an unknown one is refused not ignored. */
  readonly knownSuppliers?: ReadonlySet<string>;
  /** Absent until Phase 7 is wired; the precheck route then reports 503. */
  readonly revalidation?: RevalidationService;
  /** Absent until Phase 8 is wired; the booking routes then report 503. */
  readonly booking?: BookingService;
  readonly bookings?: BookingRepository;
  /** Absent means every `requiresAuth` route refuses (`server.ts`'s `DEFAULT_AUTH_VERIFIER`). */
  readonly auth?: AuthVerifier;
  /** Absent means `GET /metrics` reports 503 rather than an empty scrape. */
  readonly metrics?: SearchMetrics;
}

/** A client mistake, in the shape the frontend's error handling expects. */
const badRequest = (message: string, code: string): HandlerResult => ({
  status: 400,
  body: { status: false, error: { code, message } },
});

const notFound = (message: string, code: string): HandlerResult => ({
  status: 404,
  body: { status: false, error: { code, message } },
});

/** A route whose dependency was not wired. Not the client's fault, and not 404. */
const unavailable = (message: string): HandlerResult => ({
  status: 503,
  body: { status: false, error: { code: 'UNAVAILABLE', message } },
});

/** Client-facing text for each way a legacy payload can fail to translate. */
function explain(error: LegacyRequestError): HandlerResult {
  switch (error.kind) {
    case 'MISSING_DATES':
      return badRequest('checkin and checkout are required', 'MISSING_DATES');
    case 'MISSING_DESTINATION':
      return badRequest('a destination is required', 'MISSING_DESTINATION');
    case 'UNKNOWN_DESTINATION':
      // 404, not 400: the request was well-formed and we simply do not sell
      // there. A 400 would send the customer to fix a payload that is correct.
      return notFound(`no destination matched "${error.text}"`, 'UNKNOWN_DESTINATION');
    case 'UNKNOWN_HOTEL':
      return notFound(`no hotel matched "${error.id}"`, 'UNKNOWN_HOTEL');
    case 'UNKNOWN_SUPPLIER':
      // Not a 404: the request is answerable, it just names suppliers we do not
      // sell through. Returning 200-with-nothing made an unknown provider code
      // indistinguishable from genuinely sold-out inventory.
      return badRequest(
        `no such supplier: ${error.codes.join(', ')}`,
        'UNKNOWN_SUPPLIER',
      );
    case 'INVALID':
      return badRequest(error.reason, 'INVALID_REQUEST');
  }
}

/** `POST /api/search/hotels/search` */
export async function searchHandler(
  body: LegacySearchRequest,
  deps: HandlerDeps,
): Promise<HandlerResult> {
  const translated = await fromLegacySearchRequest(body, {
    destinations: deps.destinations,
    properties: deps.properties,
    defaultCountry: deps.defaultCountry,
    ...(deps.knownSuppliers !== undefined ? { knownSuppliers: deps.knownSuppliers } : {}),
  });
  if (!translated.ok) return explain(translated.error);

  const result = await deps.orchestrator.search(translated.request);
  const projected = toLegacySearchResponse(result);

  // A filter we received and did not honour is reported, not swallowed. The
  // client filters locally on what it asked for, so a silently dropped filter
  // shows up as near-empty pages while `hasMore` keeps promising more.
  return {
    status: 200,
    body:
      translated.unsupportedFilters.length > 0
        ? { ...projected, unsupportedFilters: translated.unsupportedFilters }
        : projected,
  };
}

export interface ProductsBody {
  readonly checkin?: string;
  readonly checkout?: string;
  readonly currency?: string;
  readonly countryCode?: string;
  readonly rooms?: ReadonlyArray<{
    readonly adults?: number;
    readonly children?: number;
    readonly childAge?: readonly number[];
    readonly childAges?: readonly number[];
  }>;
  readonly providers?: readonly string[];
}

/** `POST /api/search/hotels/:propertyId/products` */
export async function productsHandler(
  propertyId: string,
  body: ProductsBody,
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (propertyId.trim().length === 0) {
    return badRequest('a property id is required', 'MISSING_PROPERTY_ID');
  }
  if (body.checkin === undefined || body.checkout === undefined) {
    return badRequest('checkin and checkout are required', 'MISSING_DATES');
  }

  let stay;
  let party;
  try {
    stay = stayDates(body.checkin, body.checkout);
    const rooms = (body.rooms ?? []).map((r) =>
      roomRequest(r.adults ?? 2, r.children ?? 0, r.childAge ?? r.childAges ?? []),
    );
    party = occupancy(rooms.length > 0 ? rooms : [roomRequest(2, 0, [])]);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : 'invalid stay or occupancy',
      'INVALID_REQUEST',
    );
  }

  const nationality =
    body.countryCode !== undefined && body.countryCode.length === 2
      ? countryCode(body.countryCode.toUpperCase())
      : deps.defaultCountry;

  const result = await deps.detail.detail({
    hotelId: propertyId,
    stay,
    occupancy: party,
    currency: currencyCode((body.currency ?? 'INR').toUpperCase()),
    nationality,
    channel: 'B2C',
    /**
     * No `destinationCountry`, deliberately.
     *
     * This passed the traveller's NATIONALITY as the fallback markup region —
     * `countryCode` on a legacy payload is who the guest is, not where the
     * hotel is, which is D-1 in a second costume. A search prices under the
     * destination's country, so an Indian customer looking at a Dubai hotel had
     * the card priced INTERNATIONAL and the detail page priced DOMESTIC: two
     * different prices for one room, on two screens, one click apart.
     *
     * The hotel's own country decides its region either way (`pricingCountryOf`),
     * and that is the value both screens share. A deep link to a hotel whose
     * catalogue record carries no country falls back to region ALL — visible,
     * and honest, where the old fallback was invisible and wrong.
     */
  });

  if (result === HOTEL_NOT_FOUND) {
    return notFound(`no hotel matched "${propertyId}"`, 'UNKNOWN_HOTEL');
  }
  return { status: 200, body: toLegacyProductsResponse(result) };
}

/** `GET /api/search/hotels/suggestions?q=` */
export async function suggestionsHandler(
  query: { q?: string; countryCode?: string; limit?: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  const text = (query.q ?? '').trim();
  // An empty query is not an error; it simply has no suggestions.
  if (text.length === 0) return { status: 200, body: { status: true, body: [] } };

  const candidates = await deps.destinations.lookup({
    text,
    ...(query.countryCode !== undefined && query.countryCode.length === 2
      ? { countryCode: countryCode(query.countryCode.toUpperCase()) }
      : {}),
    limit: Number.isFinite(Number(query.limit)) ? Number(query.limit) : 10,
  });

  return {
    status: 200,
    body: {
      status: true,
      body: candidates.map((c) => ({
        klarDestinationId: String(c.klarDestinationId),
        name: c.name,
        countryCode: String(c.countryCode),
        propertyCount: c.propertyCount,
      })),
    },
  };
}

/**
 * `POST /api/booking/precheck`
 *
 * The gate between a price we showed and a price we charge. The client sends
 * the opaque `dealId` it already holds and nothing else — every fact the check
 * needs was sealed when the deal was issued, so there is no field here a client
 * could get wrong, and no supplier protocol for it to assemble.
 *
 * The legacy frontend posted two entirely different bodies to this URL — a
 * five-key TripJack object and a doubly-wrapped native RateGain
 * `BookReservation` envelope built in the browser (teardown §2.7). Both are
 * replaced by one id.
 */
export async function precheckHandler(
  body: { dealId?: unknown },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (typeof body.dealId !== 'string' || body.dealId.trim().length === 0) {
    return badRequest('a dealId is required', 'MISSING_DEAL_ID');
  }
  if (deps.revalidation === undefined) return unavailable('precheck is not configured');

  const report = await deps.revalidation.revalidate(dealId(body.dealId.trim()));

  // An expired or unknown deal is a 409, not a 404: the id was real, the offer
  // behind it is gone, and the client's move is to search again rather than to
  // correct a URL.
  const status = report.status === 'DEAL_NOT_FOUND' ? 409 : 200;
  return { status, body: toLegacyPrecheckResponse(report) };
}

// ── Booking ─────────────────────────────────────────────────────────────────

/**
 * What a client may send to commit a booking.
 *
 * Compare with what the legacy frontend sent: a doubly-wrapped native RateGain
 * `BookReservation` envelope assembled in the browser — `ResStatus`,
 * `DemandBookingId`, `EchoToken`, `RoomSelection[].RoomSelectionKey`, per-room
 * per-night `RoomRate`, `Guest[].ProfileType` — or, on the other branch, an
 * entirely different TripJack object (teardown §2.7). All of it is replaced by
 * an opaque `dealId` and the names of the people staying.
 *
 * Nothing here can move money. There is no price field, no supplier field and
 * no rate reference: those come from the sealed quote, so a tampered payload
 * has nothing to tamper with. The reference needed a server-side
 * `b2cPriceFloor` to defend a price the browser sent.
 */
export interface CommitBody {
  readonly dealId?: unknown;
  readonly idempotencyKey?: unknown;
  readonly guests?: unknown;
  readonly specialRequests?: unknown;
  readonly holdOnly?: unknown;
  readonly paymentReference?: unknown;
  /** Set by `server.ts` from the verified bearer token, never by the client. */
  readonly authenticatedUserId?: unknown;
  /** The customer's answer when precheck reported a change. */
  readonly consent?: unknown;
}

interface ParsedGuest {
  readonly firstName: string;
  readonly lastName: string;
  readonly isPrimary: boolean;
  readonly isChild: boolean;
  readonly age?: number;
  readonly email?: string;
  readonly phone?: string;
  readonly countryCode?: CountryCode;
  readonly postalCode?: string;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;

/**
 * Guests, type-checked at the boundary.
 *
 * D-5 in miniature: this is the only parser between raw JSON and a domain
 * object, and letting a wrong-shaped field through turns a 400 into a
 * `TypeError` several layers in. Here it would also be a `TypeError` reached
 * after a supplier call.
 */
function parseGuests(raw: unknown): { ok: true; guests: ParsedGuest[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, reason: 'at least one guest is required' };
  }

  const guests: ParsedGuest[] = [];
  for (const [index, entry] of raw.entries()) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, reason: `guest ${index + 1} is not an object` };
    }
    const g = entry as Record<string, unknown>;
    const firstName = str(g['firstName']);
    const lastName = str(g['lastName']);
    if (firstName === undefined || lastName === undefined) {
      return { ok: false, reason: `guest ${index + 1} needs a first and last name` };
    }
    const age = typeof g['age'] === 'number' && Number.isFinite(g['age']) ? g['age'] : undefined;
    const country = str(g['countryCode']);

    guests.push({
      firstName,
      lastName,
      isPrimary: g['isPrimary'] === true,
      isChild: g['isChild'] === true,
      ...(age !== undefined ? { age } : {}),
      ...(str(g['email']) !== undefined ? { email: str(g['email']) as string } : {}),
      ...(str(g['phone']) !== undefined ? { phone: str(g['phone']) as string } : {}),
      ...(country !== undefined && country.length === 2
        ? { countryCode: countryCode(country.toUpperCase()) }
        : {}),
      ...(str(g['postalCode']) !== undefined ? { postalCode: str(g['postalCode']) as string } : {}),
    });
  }
  return { ok: true, guests };
}

/**
 * The customer's acceptance of a changed price.
 *
 * Read as minor units and a currency rather than a decimal, because that is
 * what the engine compares against and a float here would reintroduce the
 * rounding the whole money type exists to avoid.
 */
function parseConsent(raw: unknown): CommitConsent | undefined | 'INVALID' {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object') return 'INVALID';

  const c = raw as Record<string, unknown>;
  const minor = c['acceptedTotalMinor'];
  const currency = str(c['currency']);
  if (typeof minor !== 'number' || !Number.isSafeInteger(minor) || minor < 0) return 'INVALID';
  if (currency === undefined || currency.length !== 3) return 'INVALID';

  const acknowledged = Array.isArray(c['acknowledgedUnverified'])
    ? c['acknowledgedUnverified'].filter(
        (d): d is 'room' | 'board' | 'cancellation' =>
          d === 'room' || d === 'board' || d === 'cancellation',
      )
    : [];

  return {
    acceptedTotal: money(minor, currencyCode(currency.toUpperCase())),
    acceptedAt: new Date(),
    ...(acknowledged.length > 0 ? { acknowledgedUnverified: acknowledged } : {}),
  };
}

/** `POST /api/booking/commit` */
export async function commitHandler(
  body: CommitBody,
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (deps.booking === undefined) {
    return unavailable('booking is not configured');
  }
  const deal = str(body.dealId);
  if (deal === undefined) return badRequest('a dealId is required', 'MISSING_DEAL_ID');

  /**
   * The idempotency key is required, not defaulted.
   *
   * The legacy client retries a commit twice on a 503, a 504 or a network error
   * with no key of its own (`hotelBookingService.ts:209`), which is precisely
   * how one customer ends up with two rooms. Minting one here per request would
   * make every retry a fresh booking; refusing the request is the only answer
   * that cannot silently double-book.
   */
  const idempotencyKey = str(body.idempotencyKey);
  if (idempotencyKey === undefined) {
    return badRequest(
      'an idempotencyKey is required so a retried booking stays one booking',
      'MISSING_IDEMPOTENCY_KEY',
    );
  }

  const guests = parseGuests(body.guests);
  if (!guests.ok) return badRequest(guests.reason, 'INVALID_GUESTS');

  const consent = parseConsent(body.consent);
  if (consent === 'INVALID') {
    return badRequest('consent must carry acceptedTotalMinor and currency', 'INVALID_CONSENT');
  }

  const requests = Array.isArray(body.specialRequests)
    ? body.specialRequests.filter((r): r is string => typeof r === 'string')
    : undefined;

  const outcome = await deps.booking.commit({
    dealId: dealId(deal),
    idempotencyKey,
    guests: guests.guests,
    ...(consent !== undefined ? { consent } : {}),
    ...(requests !== undefined && requests.length > 0 ? { specialRequests: requests } : {}),
    ...(body.holdOnly === true ? { holdOnly: true } : {}),
    ...(str(body.paymentReference) !== undefined
      ? { paymentReference: str(body.paymentReference) as string }
      : {}),
    // `server.ts` sets this from the verified token; a route with
    // `requiresAuth: true` never reaches here without it.
    ...(str(body.authenticatedUserId) !== undefined
      ? { userId: str(body.authenticatedUserId) as string }
      : {}),
  });

  switch (outcome.kind) {
    case 'BOOKED':
      return {
        status: 200,
        body: { status: true, statusCode: 200, body: toLegacyBooking(outcome.booking) },
      };

    case 'PENDING':
      // 202: made, not settled. The client polls `/confirm`, and must not tell
      // the customer either that it worked or that it did not.
      return {
        status: 202,
        body: {
          status: true,
          statusCode: 202,
          body: toLegacyBooking(outcome.booking),
          message: 'the supplier has not confirmed this booking yet',
        },
      };

    case 'CONSENT_REQUIRED':
      // 409, carrying the precheck report: the client already knows how to
      // render one, and the figure it shows is the figure a commit carrying
      // consent will be charged.
      return {
        status: 409,
        body: {
          ...toLegacyPrecheckResponse(outcome.report),
          status: false,
          statusCode: 409,
          requiresConsent: true,
          unverified: outcome.unverified,
        },
      };

    case 'REFUSED':
      return {
        status: outcome.reason === 'DEAL_NOT_FOUND' ? 409 : 409,
        body: { ...toLegacyPrecheckResponse(outcome.report), status: false, statusCode: 409 },
      };

    case 'REJECTED':
      return badRequest(outcome.detail, outcome.reason);

    case 'FAILED':
      // 502: we asked, and the supplier said no. The customer's money is
      // already on its way back, which the refund block reports.
      return {
        status: 502,
        body: {
          status: false,
          statusCode: 502,
          error: { code: 'SUPPLIER_REFUSED', message: outcome.detail },
          body: toLegacyBooking(outcome.booking),
        },
      };
  }
}

/** `POST /api/booking/confirm` — settle a booking the supplier left pending. */
export async function confirmHandler(
  body: { bookingId?: unknown },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (deps.booking === undefined) return unavailable('booking is not configured');

  const id = str(body.bookingId);
  if (id === undefined) return badRequest('a bookingId is required', 'MISSING_BOOKING_ID');

  const booking = await deps.booking.confirm(klarBookingId(id));
  if (booking === null) return notFound(`no booking matched "${id}"`, 'UNKNOWN_BOOKING');

  return { status: 200, body: { status: true, statusCode: 200, body: toLegacyBooking(booking) } };
}

/** `POST /api/booking/cancel` */
export async function cancelHandler(
  body: { bookingId?: unknown; reason?: unknown; authenticatedUserId?: unknown },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (deps.booking === undefined) return unavailable('booking is not configured');

  const id = str(body.bookingId);
  if (id === undefined) return badRequest('a bookingId is required', 'MISSING_BOOKING_ID');

  const gone = notFound(`no booking matched "${id}"`, 'UNKNOWN_BOOKING');

  /**
   * Ownership, checked the same oracle-safe way `bookingHandler`'s read path
   * does: a booking that exists but belongs to someone else answers exactly
   * like one that does not exist, rather than a 403 that would confirm it.
   *
   * A booking with no `userId` predates the auth gate (or was made without
   * one) and has no owner to check against — left alone here, same as the
   * read path leaves it.
   */
  const authenticatedUserId = str(body.authenticatedUserId);
  if (deps.bookings !== undefined && authenticatedUserId !== undefined) {
    const existing = await deps.bookings.findById(klarBookingId(id));
    if (existing !== null && existing.userId !== undefined && existing.userId !== authenticatedUserId) {
      return gone;
    }
  }

  const result = await deps.booking.cancel(
    klarBookingId(id),
    str(body.reason) ?? 'cancelled by the customer',
  );

  switch (result.kind) {
    case 'NOT_FOUND':
      return gone;
    case 'NOT_CANCELLABLE':
      return {
        status: 409,
        body: {
          status: false,
          statusCode: 409,
          error: {
            code: 'NOT_CANCELLABLE',
            message: `a booking in ${result.booking.status} cannot be cancelled`,
          },
          body: toLegacyBooking(result.booking),
        },
      };
    case 'REJECTED':
      return {
        status: 409,
        body: {
          status: false,
          statusCode: 409,
          error: { code: 'CANCELLATION_REJECTED', message: result.detail },
          body: toLegacyBooking(result.booking),
        },
      };
    case 'UNAVAILABLE':
      // 503, not 409: nothing was sent, so nothing was refused. The booking is
      // untouched and the customer may try again.
      return {
        status: 503,
        body: {
          status: false,
          statusCode: 503,
          error: { code: 'UNAVAILABLE', message: result.detail },
          body: toLegacyBooking(result.booking),
        },
      };
    case 'PENDING':
      // Asked, not settled. Saying "cancelled" here would tell a customer to
      // stop expecting a stay the supplier may still be holding.
      return {
        status: 202,
        body: {
          status: true,
          statusCode: 202,
          body: toLegacyBooking(result.booking),
          message: 'the cancellation has been requested and is not yet confirmed',
        },
      };
    case 'CANCELLED':
      return {
        status: 200,
        body: {
          status: true,
          statusCode: 200,
          body: toLegacyBooking(result.booking),
          ...(result.refunded !== null
            ? {
                refund: {
                  amount: toMajor(result.refunded),
                  currency: String(result.refunded.currency),
                },
              }
            : {}),
        },
      };
  }
}

/**
 * `GET /api/booking/bookings/:id`
 *
 * The id may be the booking's own or its public token, and a token is what an
 * anonymous guest holds. The token is unguessable and the id is not — the id
 * appears in logs, support tickets and URLs — so a request bearing only an id
 * is answered only when it also carries the user the booking belongs to.
 */
export async function bookingHandler(
  id: string,
  query: { token?: string; userId?: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (deps.bookings === undefined) return unavailable('booking is not configured');

  // Every refusal below is the same answer, deliberately: telling a caller that
  // a booking exists but is not theirs turns the id space into an oracle.
  const gone = notFound(`no booking matched "${id}"`, 'UNKNOWN_BOOKING');
  const found = (booking: Parameters<typeof toLegacyBooking>[0]): HandlerResult => ({
    status: 200,
    body: { status: true, statusCode: 200, body: toLegacyBooking(booking) },
  });

  const token = str(query.token);
  if (token !== undefined) {
    // The token is the authority, and it must be the token FOR this booking:
    // accepting any valid token against any id would hand booking A to whoever
    // asks for B.
    const byToken = await deps.bookings.findByPublicToken(token);
    return byToken !== null && String(byToken.klarBookingId) === id ? found(byToken) : gone;
  }

  const userId = str(query.userId);
  if (userId === undefined) return gone;

  const booking = await deps.bookings.findById(klarBookingId(id));
  if (booking === null || booking.userId !== userId) return gone;
  return found(booking);
}

/** `GET /api/booking/bookings?userId=` */
export async function bookingsHandler(
  query: { userId?: string; limit?: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (deps.bookings === undefined) return unavailable('booking is not configured');

  const userId = str(query.userId);
  // Without an authenticated caller there is no "my bookings" to answer. Listing
  // everything, or guessing from an email, is how one customer reads another's.
  if (userId === undefined) return badRequest('a userId is required', 'MISSING_USER_ID');

  const limit = Number.isFinite(Number(query.limit))
    ? Math.min(Math.max(Number(query.limit), 1), 50)
    : 20;
  const bookings = await deps.bookings.findByUser(userId, limit);

  return {
    status: 200,
    body: { status: true, statusCode: 200, body: bookings.map(toLegacyBooking) },
  };
}

/**
 * `GET /api/ops/unsettled-bookings` — the queue `BookingReconciler` sweeps,
 * made visible to a human. A booking stuck in `CANCELLATION_PENDING`,
 * `MANUAL_REVIEW` or `PAYMENT_HELD` needs one; the reconciler only ever
 * settles `SUPPLIER_PENDING` on its own.
 *
 * Gated the same way `commit`/`cancel` are (`requiresAuth: true` on the
 * route) rather than a separate ops-auth scheme: it answers with guest names
 * and contact details, the same PII the booking read path already protects,
 * and reusing the one verifier this API has is simpler than inventing a
 * second one.
 */
export async function unsettledBookingsHandler(
  query: { limit?: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  if (deps.bookings === undefined) return unavailable('booking is not configured');

  const limit = Number.isFinite(Number(query.limit))
    ? Math.min(Math.max(Number(query.limit), 1), 200)
    : 50;
  const bookings = await deps.bookings.findUnsettled(limit);

  return {
    status: 200,
    body: { status: true, statusCode: 200, body: bookings.map(toLegacyBooking) },
  };
}

/** `GET /health` — liveness only. It must not touch a supplier. */
export function healthHandler(): HandlerResult {
  return { status: 200, body: { status: true, service: 'hotel-api' } };
}

/**
 * `GET /metrics` — Prometheus text exposition (OPEN-ISSUES §4, "observability").
 *
 * Unauthenticated by design, the same posture Prometheus scraping ordinarily
 * takes: access control belongs at the network/ingress layer, not stated per
 * request here. Nothing served carries customer data — counts and durations
 * only, the same figures `SearchDiagnostics` already logs per search.
 */
export function metricsHandler(deps: HandlerDeps): HandlerResult {
  if (deps.metrics === undefined) return unavailable('metrics are not configured');
  return {
    status: 200,
    body: deps.metrics.toPrometheusText(),
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
  };
}
