import { AMENDMENT_TYPES, AmendmentType } from "./mappers/cancellation.mapper";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates an amendment request before it reaches TripJack.
 *
 * Previously only `CANCELLATION` was allowed, which is what kept Auto Void and
 * Auto Full Refund unreachable, and trip scoping went unchecked — a partial
 * cancellation missing src/dest/departureDate came back as errCode 2550-2552
 * from the supplier instead of a usable message.
 */
export function validateCancellationPayload(payload: any) {
    if (!payload.bookingId) throw new Error("bookingId is required");

    // Mandatory on every amendment type (doc: errCode 2556).
    if (!payload.remarks?.trim()) throw new Error("remarks is required");

    if (!AMENDMENT_TYPES.includes(payload.type)) {
        throw new Error(
            `Invalid amendment type "${payload.type}" (expected ${AMENDMENT_TYPES.join(", ")})`
        );
    }

    if (payload.trips !== undefined) {
        if (!Array.isArray(payload.trips) || payload.trips.length === 0) {
            throw new Error("trips must be a non-empty array when provided");
        }

        payload.trips.forEach((trip: any, index: number) => {
            // Scoping to a trip requires identifying it. Omitting these is what
            // TripJack answers with "Departure airport cannot be empty".
            if (!trip.src) throw new Error(`trips[${index}].src is required`);
            if (!trip.dest) throw new Error(`trips[${index}].dest is required`);
            if (!trip.departureDate) {
                throw new Error(`trips[${index}].departureDate is required`);
            }
            if (!DATE_REGEX.test(trip.departureDate)) {
                throw new Error(
                    `trips[${index}].departureDate must be YYYY-MM-DD, got "${trip.departureDate}"`
                );
            }

            if (trip.travellers !== undefined) {
                if (!Array.isArray(trip.travellers) || trip.travellers.length === 0) {
                    throw new Error(
                        `trips[${index}].travellers must be a non-empty array when provided`
                    );
                }
                trip.travellers.forEach((t: any, i: number) => {
                    if (!t.fn || !t.ln) {
                        throw new Error(
                            `trips[${index}].travellers[${i}] needs both first and last name`
                        );
                    }
                });
            }
        });
    }
}

/** Human-readable scope, for logging and for the confirmation shown to the user. */
export function describeAmendmentScope(payload: {
    type: AmendmentType;
    trips?: Array<{ src?: string; dest?: string; travellers?: any[] }>;
}) {
    if (!payload.trips?.length) return `${payload.type}: entire booking`;

    return payload.trips
        .map((t) => {
            const route = `${t.src}-${t.dest}`;
            return t.travellers?.length
                ? `${route} (${t.travellers.length} passenger(s))`
                : `${route} (all passengers)`;
        })
        .join(", ");
}
