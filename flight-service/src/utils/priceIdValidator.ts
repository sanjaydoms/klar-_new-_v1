/**
 * Pre-flight checks on the priceIds a client sends to Review.
 *
 * TripJack rejects a bad set with opaque codes (1009 empty, 1071 fare gone) well
 * after the user has committed to an itinerary, and a mismatched Special Return
 * pair is accepted at Review only to fail later. Catching it here turns those
 * into an actionable message.
 */

/** Doc: Domestic Multi-City supports 2–6 legs, so never more than 6 priceIds. */
export const MAX_PRICE_IDS = 6;

/** How many priceIds Review expects, per journey type (doc: Search API table). */
const EXPECTED_COUNT: Record<string, number> = {
    ONEWAY: 1,
    DOMESTIC_RETURN: 2,
    INTERNATIONAL_RETURN: 1, // COMBO — one priceId covers both legs
};

export type JourneyType = keyof typeof EXPECTED_COUNT | "MULTICITY";

export class PriceIdValidationError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = "PriceIdValidationError";
    }
}

/**
 * Structural checks that hold for every journey type — safe to run even when we
 * don't know which type this is.
 */
export function validatePriceIds(priceIds: unknown): string[] {
    if (!Array.isArray(priceIds) || priceIds.length === 0) {
        throw new PriceIdValidationError(
            "priceIds is required and must be a non-empty array"
        );
    }

    if (priceIds.some((id) => typeof id !== "string" || !id.trim())) {
        throw new PriceIdValidationError("Every priceId must be a non-empty string");
    }

    if (priceIds.length > MAX_PRICE_IDS) {
        throw new PriceIdValidationError(
            `At most ${MAX_PRICE_IDS} priceIds are allowed (got ${priceIds.length})`
        );
    }

    if (new Set(priceIds).size !== priceIds.length) {
        throw new PriceIdValidationError("priceIds contains duplicates");
    }

    return priceIds as string[];
}

/** Only checked when the caller tells us the journey type. */
export function validatePriceIdCount(
    priceIds: string[],
    journeyType?: JourneyType
): void {
    if (!journeyType) return;

    if (journeyType === "MULTICITY") {
        // One priceId per leg, 2–6 legs. An international multi-city comes back
        // as a single COMBO, so 1 is legitimate there too.
        if (priceIds.length < 1 || priceIds.length > MAX_PRICE_IDS) {
            throw new PriceIdValidationError(
                `Multi-city expects 1 priceId (international combo) or one per leg up to ${MAX_PRICE_IDS}; got ${priceIds.length}`
            );
        }
        return;
    }

    const expected = EXPECTED_COUNT[journeyType];
    if (expected !== undefined && priceIds.length !== expected) {
        throw new PriceIdValidationError(
            `${journeyType} expects ${expected} priceId(s), got ${priceIds.length}`
        );
    }
}

/**
 * Pull the fare objects matching `priceIds` out of a cached search response.
 * tripInfos is keyed by journey (ONWARD / RETURN / COMBO / "0","1",… for legs).
 */
export function findFares(tripInfos: any, priceIds: string[]) {
    const wanted = new Set(priceIds);
    const found: Array<{ journeyKey: string; fare: any }> = [];

    for (const journeyKey of Object.keys(tripInfos || {})) {
        for (const flight of tripInfos[journeyKey] || []) {
            for (const fare of flight?.totalPriceList || []) {
                if (wanted.has(fare?.id)) found.push({ journeyKey, fare });
            }
        }
    }

    return found;
}

/** msri may arrive as a list or a single value depending on the supplier. */
function msriContains(msri: any, sri: string | undefined): boolean {
    if (!sri) return false;
    if (Array.isArray(msri)) return msri.some((v) => String(v) === sri);
    if (msri === undefined || msri === null) return false;
    return String(msri) === sri;
}

/** A fare carries pairing identifiers only if sri or a non-empty msri is present. */
function hasPairingInfo(fare: any): boolean {
    const msri = fare?.msri;
    return Boolean(fare?.sri) || (Array.isArray(msri) ? msri.length > 0 : Boolean(msri));
}

/**
 * Doc: "When fareIdentifier is SPECIAL_RETURN, both legs must be SPECIAL_RETURN.
 * Match via sri (onward) and msri (return must contain onward sri)."
 *
 * Only applies to domestic returns, where the two legs are priced separately.
 * A COMBO is a single fare and cannot be mismatched.
 */
export function validateSpecialReturnPairing(
    fares: Array<{ journeyKey: string; fare: any }>
): void {
    const special = fares.filter(
        (f) => f.fare?.fareIdentifier === "SPECIAL_RETURN"
    );
    if (special.length === 0) return;

    if (special.length !== fares.length) {
        throw new PriceIdValidationError(
            "Special Return fares must be booked on both legs — pair this fare with a SPECIAL_RETURN fare on the other leg, or pick a regular fare for both."
        );
    }

    const onward = fares.find((f) => f.journeyKey === "ONWARD")?.fare;
    const inbound = fares.find((f) => f.journeyKey === "RETURN")?.fare;

    // Single-fare journeys (COMBO, one-way) have nothing to pair.
    if (!onward || !inbound) return;

    // Live UAT shows both legs carrying sri AND msri, each leg's msri listing the
    // other leg's sri — so the pairing is mutual and either direction confirms it.
    // It also shows plenty of SPECIAL_RETURN fares with neither field populated
    // (55 of 199 onward fares in one DEL-BOM search). Demanding an sri there would
    // reject perfectly bookable fares, so an unverifiable pair is allowed through
    // and left to TripJack, which is the authority on its own inventory.
    if (!hasPairingInfo(onward) || !hasPairingInfo(inbound)) {
        console.warn(
            "[Review] Special Return fares carry no sri/msri identifiers; " +
            "cannot verify the pairing locally."
        );
        return;
    }

    const paired =
        msriContains(inbound.msri, onward.sri) ||
        msriContains(onward.msri, inbound.sri);

    if (!paired) {
        throw new PriceIdValidationError(
            "These Special Return fares are not a matching pair. Select the return fare offered against this onward fare."
        );
    }
}
