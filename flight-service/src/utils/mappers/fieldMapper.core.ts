/**
 * TripJack reuses short keys with different meanings depending on where they sit:
 * `fN` is a flight number under `fD` but a first name under `travellerInfos`;
 * `id` is a segment id under `sI` but a pax id under `travellerInfos` and a
 * price id under `totalPriceList`; `code` is an airline, an airport or an SSR
 * code depending on its parent.
 *
 * The old mappers renamed keys by name alone, at every depth, so whichever entry
 * happened to win produced things like a flight number under `FirstName`, a pax
 * id under `SegmentID`, and cabin baggage under `ClassCode`.
 *
 * Renaming is decided by (parent, key) here. Because templates, the review Mongo
 * model and the frontend already read the old names, the previous name is also
 * emitted as an alias — nothing breaks, and the correct name becomes available.
 */

/** Correct name for a key, given the object it appears in. */
const CONTEXT_RENAMES: Record<string, Record<string, string>> = {
    // Segment flight details: fN here is the flight number, not a first name.
    fD: { fN: "FlightNumber" },
    // Airline identity.
    aI: { code: "AirlineCode", name: "AirlineName" },
    // Departure / arrival airports.
    da: { code: "AirportCode" },
    aa: { code: "AirportCode" },
    // Baggage allowance: cB is cabin baggage, not a booking class code.
    bI: { iB: "CheckInBaggage", cB: "CabinBaggage" },
    // The pax identifier Auto Reissue needs.
    travellerInfos: { id: "PaxId" },
    travellerInfo: { id: "PaxId" },
    // The priceId passed to Review.
    totalPriceList: { id: "PriceId" },
};

/** Wrong regardless of context — isRs is "is RETURN segment" per the API docs. */
const GLOBAL_RENAMES: Record<string, string> = {
    isRs: "IsReturnSegment",
};

/**
 * Name each corrected field also used to be emitted under. Kept so existing
 * consumers keep resolving; drop an entry once nothing reads it.
 *
 * IsRefundableSegment is deliberately absent: it carried return-segment truth
 * under a refundability label, and the voucher was rendering it as fare terms.
 */
const LEGACY_ALIASES: Record<string, string> = {
    FlightNumber: "FirstName",
    AirlineCode: "SSRCode",
    AirportCode: "SSRCode",
    CabinBaggage: "ClassCode",
    PaxId: "SegmentID",
    PriceId: "SegmentID",
};

/**
 * Blocks that must never be renamed. `conditions` is read by name downstream
 * (`dob`, `isBA`, `ipa`), and the flat maps would rewrite `dob` to `DateOfBirth`.
 */
const PASSTHROUGH_KEYS = new Set(["conditions"]);

export type FieldMap = Record<string, string>;

/**
 * Rename keys through `baseMaps` (first match wins), with (parent, key) context
 * taking precedence, and legacy aliases emitted alongside corrected names.
 */
export function mapFields(
    data: any,
    baseMaps: FieldMap[],
    parentKey?: string
): any {
    if (Array.isArray(data)) {
        // An array's entries belong to the array's own key, not the array.
        return data.map((item) => mapFields(item, baseMaps, parentKey));
    }

    if (data === null || typeof data !== "object") return data;

    return Object.keys(data).reduce((acc: Record<string, any>, key: string) => {
        if (PASSTHROUGH_KEYS.has(key)) {
            acc[key] = data[key];
            return acc;
        }

        const contextual = parentKey ? CONTEXT_RENAMES[parentKey]?.[key] : undefined;
        const mappedKey =
            contextual ??
            GLOBAL_RENAMES[key] ??
            baseMaps.reduce<string | undefined>(
                (found, m) => found ?? m[key],
                undefined
            ) ??
            key;

        const value = mapFields(data[key], baseMaps, key);
        acc[mappedKey] = value;

        // Keep the name this field used to arrive under, so nothing that reads
        // the old shape breaks. Never clobber a real field of that name.
        const legacy = LEGACY_ALIASES[mappedKey];
        if (legacy && legacy !== mappedKey && !(legacy in acc)) {
            acc[legacy] = value;
        }

        return acc;
    }, {});
}
