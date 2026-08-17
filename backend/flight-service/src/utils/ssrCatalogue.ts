/**
 * Server-owned prices for pre-booking ancillaries.
 *
 * Same rule the reviewed fare follows: what a seat or meal costs is decided by
 * what the supplier quoted, never by a number in the request body. Review
 * carries the meal/baggage catalogue and the seat map comes from a separate
 * call, so both are captured as they arrive and priced again at booking time.
 *
 * Verified against live UAT (2026-08-13), because the doc and the API disagree
 * about shape:
 *   - Review:  tripInfos[].sI[].ssrInfo.{BAGGAGE,MEAL}[] = {code, amount, desc}
 *              SEGMENT level — `bI`/`tI` are absent here, the opposite of the
 *              post-booking response, which is per passenger.
 *   - Seat:    tripSeatMap.tripSeat[segmentKey].sInfo[] = {code, amount, isBooked}
 * Both are keyed by the segment key the Book request wants in `ssr*Infos[].key`.
 */

/** "<segmentKey>|<CATEGORY>|<code>" -> amount */
export type SsrPrices = Record<string, number>;

export type SsrCategory = "SEAT" | "MEAL" | "BAGGAGE";

/** Traveller SSR field -> the catalogue category it prices against. */
export const SSR_FIELD_CATEGORY = {
    ssrSeatInfos: "SEAT",
    ssrMealInfos: "MEAL",
    ssrBaggageInfos: "BAGGAGE",
} as const;

export const ssrPriceKey = (
    segmentKey: string | number,
    category: SsrCategory,
    code: string
) => `${segmentKey}|${category}|${code}`;

/** Meal and baggage options quoted in an AirReviewResponse. */
export function extractReviewSsrPrices(review: any): SsrPrices {
    const prices: SsrPrices = {};

    for (const trip of review?.tripInfos || []) {
        for (const segment of trip?.sI || []) {
            const ssrInfo = segment?.ssrInfo;
            if (!ssrInfo || segment.id === undefined) continue;

            for (const [category, options] of Object.entries<any>(ssrInfo)) {
                for (const option of options || []) {
                    // A blocked option carries only a message — no code, nothing
                    // to sell. Live UAT returns these on fares where the airline
                    // has SSR modification switched off.
                    if (!option?.code) continue;

                    prices[ssrPriceKey(segment.id, category as SsrCategory, option.code)] =
                        Number(option.amount) || 0;
                }
            }
        }
    }

    return prices;
}

/** Seats quoted by the pre-booking seat service. */
export function extractSeatPrices(seatResponse: any): SsrPrices {
    const prices: SsrPrices = {};
    const tripSeat = seatResponse?.tripSeatMap?.tripSeat || {};

    for (const [segmentKey, entry] of Object.entries<any>(tripSeat)) {
        for (const seat of entry?.sInfo || []) {
            if (!seat?.code || seat.isBooked) continue;
            prices[ssrPriceKey(segmentKey, "SEAT", seat.code)] = Number(seat.amount) || 0;
        }
    }

    return prices;
}

export class SsrSelectionError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = "SsrSelectionError";
    }
}

/**
 * What the selected ancillaries cost, from the catalogue rather than the client.
 *
 * An unknown code is refused rather than priced at zero — that is the case where
 * we would otherwise ticket an extra we never charged for. Called before the
 * wallet is touched, so a rejection here costs nothing.
 *
 * Baggage on connecting segments is charged once per traveller per code: the doc
 * states a null amount means the first segment's selection carries to the
 * consecutive ones, and the post-booking path already bills it that way.
 */
export function priceSsrSelections(travellers: any[], prices: SsrPrices): number {
    let total = 0;

    (travellers || []).forEach((traveller, index) => {
        const who =
            `${traveller?.firstName || ""} ${traveller?.lastName || ""}`.trim() ||
            `traveller ${index + 1}`;
        const chargedBaggage = new Set<string>();

        for (const [field, category] of Object.entries(SSR_FIELD_CATEGORY)) {
            for (const selection of traveller?.[field] || []) {
                if (!selection?.code) continue;

                if (selection.key === undefined || selection.key === null || selection.key === "") {
                    throw new SsrSelectionError(
                        `${category.toLowerCase()} "${selection.code}" for ${who} is missing its ` +
                        `segment key, so it cannot be priced.`
                    );
                }

                const priceKey = ssrPriceKey(selection.key, category, selection.code);
                const amount = prices[priceKey];

                if (amount === undefined) {
                    throw new SsrSelectionError(
                        `"${selection.code}" is not an available ${category.toLowerCase()} option ` +
                        `for ${who} on segment ${selection.key}. Re-run Review and pick again.`
                    );
                }

                if (category === "BAGGAGE") {
                    if (chargedBaggage.has(selection.code)) continue;
                    chargedBaggage.add(selection.code);
                }

                total += amount;
            }
        }
    });

    // Sub-rupee drift compounds across passengers and segments.
    return Math.round(total * 100) / 100;
}
