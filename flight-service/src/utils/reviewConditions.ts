import { FrontendBookingPayload, PaxType } from "../types/booking.types";

/**
 * The `conditions` block of an AirReviewResponse: the supplier stating, for this
 * specific fare, what the Book request has to carry.
 *
 * Only the flags we can act on are modelled. Everything else in the block is
 * passed over rather than guessed at.
 */
export interface ReviewConditions {
    /** Hold (block) allowed for this fare. */
    isBA?: boolean;
    /** Seat map applicable. */
    isa?: boolean;
    /** Emergency contact details mandatory. */
    iecr?: boolean;
    /** PAN card applicable. */
    ipa?: boolean;
    /** Session time in seconds — how long the bookingId stays valid. */
    st?: number;
    gst?: { igm?: boolean; gstappl?: boolean };
    /** Passport: pm = mandatory, pped = expiry date required. */
    pcs?: { pm?: boolean; pped?: boolean };
    /** DOB required per pax type. */
    dob?: { adobr?: boolean; cdobr?: boolean; idobr?: boolean };
    /** Document id: ida = applicable, idm = mandatory. */
    dc?: { ida?: boolean; idm?: boolean };
    /**
     * Airline name-length limits for this fare: max/min characters for first and
     * last name. Live UAT returns `{fN: 32, finml: 1, lN: 32, lnml: 1}` — tighter
     * than our own 50-character rule, so without this an over-long name is only
     * caught by the supplier, after the wallet has been debited.
     */
    anlm?: { fN?: number; finml?: number; lN?: number; lnml?: number };
}

export class ConditionsError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = "ConditionsError";
    }
}

const DOB_FLAG: Record<PaxType, "adobr" | "cdobr" | "idobr"> = {
    ADULT: "adobr",
    CHILD: "cdobr",
    INFANT: "idobr",
};

/**
 * Enforce what the fare demands, before the payload goes to TripJack.
 *
 * Each of these otherwise comes back as an opaque errCode (1051-1053 DOB,
 * 1064 passport, 1059 hold expired, 2560 emergency contact) after the booking
 * has been attempted. The point is to say which passenger is missing what.
 *
 * Conditions are advisory-until-set: a flag that is absent or false imposes
 * nothing, so a sparse conditions block can never block a valid booking.
 */
export function enforceReviewConditions(
    payload: FrontendBookingPayload,
    conditions: ReviewConditions | null | undefined
): void {
    if (!conditions) return;

    // Hold is only offered when the supplier says so.
    if (payload.isHold && conditions.isBA === false) {
        throw new ConditionsError(
            "This fare cannot be held — it must be booked and ticketed immediately."
        );
    }

    if (conditions.iecr === true) {
        const ec = payload.emergencyContact;
        if (!ec?.phone?.trim() || !ec?.name?.trim()) {
            throw new ConditionsError(
                "This fare requires emergency contact name and phone number."
            );
        }
    }

    if (conditions.gst?.igm === true && !payload.gstInfo?.gstNumber?.trim()) {
        throw new ConditionsError("This fare requires GST details.");
    }

    payload.travellers.forEach((t, index) => {
        const who = `${t.firstName || ""} ${t.lastName || ""}`.trim() || `traveller ${index + 1}`;

        // Name limits are per fare, so they can only be checked here. Bounds are
        // applied only when the supplier states them.
        const nameChecks: Array<[string, string | undefined, number | undefined, number | undefined]> = [
            ["First name", t.firstName, conditions.anlm?.fN, conditions.anlm?.finml],
            ["Last name", t.lastName, conditions.anlm?.lN, conditions.anlm?.lnml],
        ];

        for (const [label, value, max, min] of nameChecks) {
            const length = (value || "").trim().length;

            if (typeof max === "number" && length > max) {
                throw new ConditionsError(
                    `${label} for ${who} is ${length} characters; this fare allows at most ${max}.`
                );
            }

            if (typeof min === "number" && length < min) {
                throw new ConditionsError(
                    `${label} for ${who} must be at least ${min} character${min === 1 ? "" : "s"}.`
                );
            }
        }

        const dobFlag = DOB_FLAG[t.paxType];
        if (dobFlag && conditions.dob?.[dobFlag] === true && !t.dob?.trim()) {
            throw new ConditionsError(
                `Date of birth is required for ${who} (${t.paxType.toLowerCase()}) on this fare.`
            );
        }

        if (conditions.pcs?.pm === true && !t.passportNumber?.trim()) {
            throw new ConditionsError(`Passport number is required for ${who} on this fare.`);
        }

        if (conditions.pcs?.pped === true && !t.passportExpiryDate?.trim()) {
            throw new ConditionsError(`Passport expiry date is required for ${who} on this fare.`);
        }

        if (conditions.ipa === true && !t.pan?.trim()) {
            throw new ConditionsError(`PAN card number is required for ${who} on this fare.`);
        }

        if (conditions.dc?.idm === true && !t.documentId?.trim()) {
            throw new ConditionsError(
                `A document ID is required for ${who} on this fare (student / senior citizen).`
            );
        }
    });
}

/**
 * Requirements the UI should collect. Same source of truth as the enforcement
 * above, so the form and the guard can never drift apart.
 */
export function describeRequirements(conditions: ReviewConditions | null | undefined) {
    return {
        holdAllowed: conditions?.isBA === true,
        seatMapAvailable: conditions?.isa === true,
        emergencyContactRequired: conditions?.iecr === true,
        gstRequired: conditions?.gst?.igm === true,
        gstApplicable: conditions?.gst?.gstappl === true,
        panRequired: conditions?.ipa === true,
        passportRequired: conditions?.pcs?.pm === true,
        passportExpiryRequired: conditions?.pcs?.pped === true,
        documentIdRequired: conditions?.dc?.idm === true,
        // So the form can set maxlength rather than letting the supplier reject.
        nameLimits: {
            firstNameMax: conditions?.anlm?.fN,
            firstNameMin: conditions?.anlm?.finml,
            lastNameMax: conditions?.anlm?.lN,
            lastNameMin: conditions?.anlm?.lnml,
        },
        dobRequired: {
            ADULT: conditions?.dob?.adobr === true,
            CHILD: conditions?.dob?.cdobr === true,
            INFANT: conditions?.dob?.idobr === true,
        },
        sessionSeconds: conditions?.st,
    };
}
