/**
 * The catalogue of travel services KLAR can buy from a supplier, and the
 * operations each one is made of.
 *
 * This is the vocabulary the whole control center speaks: capabilities,
 * routing rules, health records and API logs are all keyed by a
 * (service, operation) pair drawn from here. Nothing else in the system
 * enumerates operations — add one here and it becomes routable, monitorable
 * and toggleable everywhere.
 *
 * A supplier declares which of these it SUPPORTS (see Provider.services);
 * an operation absent from a provider's list can never be routed to it.
 */

/** §54 — a provider may serve several of these; one provider != one service. */
export const SERVICES = [
  "HOTEL",
  "FLIGHT",
  "TRANSFER",
  "ACTIVITY",
  "INSURANCE",
  "VISA",
  "TOUR",
  "OTHER",
] as const;

export type ServiceCode = (typeof SERVICES)[number];

/**
 * Operations per service.
 *
 * AUTH is listed for the services that authenticate separately because a
 * credential failure has to be visible as its own broken operation — an
 * expired API key shows up as "authentication critical", not as "every
 * operation critical", which is what §24 asks for.
 */
export const OPERATIONS: Record<ServiceCode, readonly string[]> = {
  HOTEL: [
    "AUTH",
    "SEARCH",
    "DETAILS",
    "AVAILABILITY",
    "BOOKING",
    "CANCELLATION",
    "MODIFICATION",
    "BOOKING_STATUS",
  ],
  FLIGHT: [
    "AUTH",
    "SEARCH",
    "PRICING",
    "BOOKING",
    "CANCELLATION",
    "BOOKING_STATUS",
  ],
  TRANSFER: ["AUTH", "SEARCH", "BOOKING", "CANCELLATION", "BOOKING_STATUS"],
  ACTIVITY: ["AUTH", "SEARCH", "DETAILS", "BOOKING", "CANCELLATION"],
  INSURANCE: ["AUTH", "SEARCH", "BOOKING", "CANCELLATION"],
  VISA: ["AUTH", "SEARCH", "BOOKING", "BOOKING_STATUS"],
  TOUR: ["AUTH", "SEARCH", "DETAILS", "BOOKING", "CANCELLATION"],
  OTHER: ["AUTH"],
} as const;

/**
 * Operations that create or alter a supplier-side booking.
 *
 * These are the ones §21 forbids blind retry on: a timeout does not mean the
 * supplier did nothing, so a second attempt against a different provider can
 * double-book a real room. Failover policy reads this set — search may fail
 * over freely, these may not.
 */
export const MUTATING_OPERATIONS: readonly string[] = [
  "BOOKING",
  "CANCELLATION",
  "MODIFICATION",
];

export const isMutating = (operation: string): boolean =>
  MUTATING_OPERATIONS.includes(operation);

export const isKnownService = (service: string): service is ServiceCode =>
  (SERVICES as readonly string[]).includes(service);

export const isKnownOperation = (service: string, operation: string): boolean =>
  isKnownService(service) && OPERATIONS[service].includes(operation);
