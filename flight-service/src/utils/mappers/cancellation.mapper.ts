/**
 * Amendment requests share one endpoint (`submit-amendment`) and one shape; only
 * `type` distinguishes cancelling, voiding and claiming a full refund.
 *
 * This previously hardcoded `type: "CANCELLATION"`, so Auto Void and Auto Full
 * Refund were unreachable. It also built `trips: [{ travellers }]` with no
 * src/dest/departureDate for a per-passenger cancellation, which TripJack
 * rejects with 2550/2551/2552 ("Departure airport cannot be empty" etc.).
 */

/** Amendment types this service supports (doc: Cancellation / Auto Void / Auto Full Refund). */
export const AMENDMENT_TYPES = ["CANCELLATION", "VOIDED", "FULL_REFUND"] as const;
export type AmendmentType = (typeof AMENDMENT_TYPES)[number];

/**
 * Remarks that trigger TripJack's automated refund handling. Free text is
 * accepted, but "Refund under DGCA policy" must be exact to be picked up.
 */
export const FULL_REFUND_REMARKS = [
    "Flight Cancelled by Airline",
    "Airline rescheduled flight, revised timings are not suitable",
    "Already cancelled by directly contacting airline customer support team",
    "Airline confirmed, refund is already processed",
    "Refund under DGCA policy",
    "Personal loss or bereavement",
    "Passenger is medically unfit for travel",
    "Refund under empowerment policy",
] as const;

interface AmendmentTrip {
    src?: string;
    dest?: string;
    departureDate?: string;
    travellers?: Array<{ firstName?: string; lastName?: string; fn?: string; ln?: string }>;
}

export function mapToAmendmentPayload(payload: {
    bookingId: string;
    type?: AmendmentType;
    remarks?: string;
    trips?: AmendmentTrip[];
    travellers?: Array<{ firstName?: string; lastName?: string }>;
}) {
    const result: any = {
        bookingId: payload.bookingId,
        type: payload.type || "CANCELLATION",
        remarks: payload.remarks,
    };

    const mapTravellers = (list: AmendmentTrip["travellers"]) =>
        (list || []).map((t) => ({
            fn: t.firstName ?? t.fn,
            ln: t.lastName ?? t.ln,
        }));

    if (payload.trips?.length) {
        // Scope: specific trip (src/dest/date), optionally narrowed to specific
        // passengers. The trip identifiers are mandatory whenever trips is sent.
        result.trips = payload.trips.map((trip) => ({
            src: trip.src,
            dest: trip.dest,
            departureDate: trip.departureDate,
            ...(trip.travellers?.length && {
                travellers: mapTravellers(trip.travellers),
            }),
        }));
    } else if (payload.travellers?.length) {
        // Callers used to be able to send bare `travellers` and we would emit a
        // trip with no identifiers. There is no valid request of that shape, so
        // say which field is missing rather than letting TripJack answer 2550.
        throw new Error(
            "Cancelling specific passengers requires trips[] with src, dest and departureDate"
        );
    }

    return result;
}
