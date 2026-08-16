import axios from "axios";
import { TRIPJACK_URLS, tripjackConfig } from "../config";
import RedisCacheService from "../cache/redisCache.service";
import {
    normalizeSsrCatalogue,
    normalizeSeatMap,
    buildAddSsrPayload,
    SsrSelection,
    SsrCategory,
    SegmentAncillaries,
} from "../utils/mappers/ancillary.mapper";

/** Catalogue prices, keyed by bookingId, so Add SSR can price itself server-side. */
const catalogueKey = (bookingId: string) => `ssrCatalogue:${bookingId}`;
/** Comfortably longer than a selection session; the supplier revalidates anyway. */
const CATALOGUE_TTL_SECONDS = 1800;

export class AncillaryPurchaseError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = "AncillaryPurchaseError";
    }
}

class PostBookingAncillaryService {

    private getConfig() {
        const config = TRIPJACK_URLS[tripjackConfig.ENV];
        return {
            baseUrl: config.BASE_URL,
            headers: {
                "Content-Type": "application/json",
                apikey: tripjackConfig.API_KEY,
            },
            endpoints: config,
        };
    }


    /** Same in-band failure convention as the rest of the OMS/FMS surface. */
    private assertSupplierOk(data: any, fallback: string): void {
        if (data?.status?.success === false) {
            const first = data?.errors?.[0];
            const error: any = new AncillaryPurchaseError(first?.message || fallback);
            error.errorCode = first?.errCode;
            throw error;
        }
    }

    /**
     * Catalogue of purchasable baggage/meal options for a ticketed booking.
     * Prices are cached so the add step never has to trust a client-sent amount —
     * the same rule the booking flow applies to the reviewed fare.
     */
    async fetchSsr(bookingId: string) {
        const { baseUrl, headers, endpoints } = this.getConfig();
        if (!bookingId) throw new AncillaryPurchaseError("bookingId is required");

        const response = await axios.post(
            `${baseUrl}${endpoints.FETCH_SSR}`,
            { bookingId },
            { headers }
        );

        this.assertSupplierOk(response.data, "Could not fetch ancillaries");

        const segments = normalizeSsrCatalogue(response.data);
        await this.cachePrices(bookingId, segments);

        return {
            bookingId,
            segments,
            // Every fare we have seen on UAT answers "SSR modification is not
            // allowed"; surfacing it beats rendering an empty picker.
            available: segments.some((s) => s.available),
        };
    }

    /** Seat map for a ticketed booking. Empty when the fare has no seat selection. */
    async fetchSeat(bookingId: string) {
        const { baseUrl, headers, endpoints } = this.getConfig();
        if (!bookingId) throw new AncillaryPurchaseError("bookingId is required");

        const response = await axios.post(
            `${baseUrl}${endpoints.FETCH_SEAT}`,
            { bookingId },
            { headers }
        );

        this.assertSupplierOk(response.data, "Could not fetch seat map");

        const seatMap = normalizeSeatMap(response.data);
        await this.cacheSeatPrices(bookingId, seatMap);

        return {
            bookingId,
            seatMap,
            available: Object.values(seatMap).some((s: any) => s.seats?.length > 0),
        };
    }

    /**
     * Purchase the selected ancillaries. Charges the agent's TripJack account, so
     * every code is validated against the cached catalogue and the total is
     * computed here — a client-supplied amount is never used.
     */
    async addSsr(bookingId: string, selections: SsrSelection[]) {
        const { baseUrl, headers, endpoints } = this.getConfig();

        if (!bookingId) throw new AncillaryPurchaseError("bookingId is required");
        if (!Array.isArray(selections) || selections.length === 0) {
            throw new AncillaryPurchaseError("At least one selection is required");
        }

        const prices = await RedisCacheService.get(catalogueKey(bookingId));
        if (!prices) {
            throw new AncillaryPurchaseError(
                "No ancillary catalogue on record for this booking. Fetch the options again before purchasing."
            );
        }

        const priceOf = (sel: SsrSelection, category: SsrCategory): number => {
            const code =
                category === "BAGGAGE" ? sel.baggageCode
                : category === "MEAL" ? sel.mealCode
                : sel.seatCode;

            // Seats are priced per segment, so they cache under a `*` pax
            // wildcard; baggage and meals are per passenger.
            const amount =
                prices[`${sel.segmentId}|${sel.paxId}|${category}|${code}`] ??
                prices[`${sel.segmentId}|*|${category}|${code}`];

            if (amount === undefined) {
                throw new AncillaryPurchaseError(
                    `"${code}" is not an available ${category.toLowerCase()} option for passenger ${sel.paxId} on segment ${sel.segmentId}.`
                );
            }
            return Number(amount);
        };

        // Total is the sum of what we are actually buying. Baggage on a connecting
        // journey is charged once, which buildAddSsrPayload enforces by zeroing
        // the repeats — so mirror that here rather than summing blindly.
        const chargedBaggage = new Set<string>();
        let total = 0;

        for (const sel of selections) {
            if (sel.baggageCode) {
                const key = `${sel.paxId}:${sel.baggageCode}`;
                if (!chargedBaggage.has(key)) {
                    total += priceOf(sel, "BAGGAGE");
                    chargedBaggage.add(key);
                }
            }
            if (sel.mealCode) total += priceOf(sel, "MEAL");
            if (sel.seatCode) total += priceOf(sel, "SEAT");
        }

        if (total <= 0) {
            throw new AncillaryPurchaseError(
                "Selected ancillaries have no chargeable amount — nothing to purchase."
            );
        }

        const payload = buildAddSsrPayload(selections, priceOf, Math.round(total * 100) / 100);

        console.log(
            `[Ancillary] ${bookingId}: purchasing ${selections.length} selection(s) for Rs.${total}`
        );

        const response = await axios.post(
            `${baseUrl}${endpoints.ADD_SSR}`,
            payload,
            { headers }
        );

        this.assertSupplierOk(response.data, "Could not add ancillaries");

        return {
            bookingId,
            amount: total,
            request: payload,
            // One amendment id per trip (doc); poll each via amendment-details.
            amendmentIds: response.data?.amendmentids || response.data?.amendmentIds || [],
            body: response.data,
        };
    }

    private async cachePrices(bookingId: string, segments: SegmentAncillaries[]) {
        const prices: Record<string, number> = {};

        for (const segment of segments) {
            for (const pax of segment.passengers) {
                for (const [category, options] of Object.entries(pax.options)) {
                    for (const option of options) {
                        prices[`${segment.segmentId}|${pax.paxId}|${category}|${option.code}`] =
                            option.amount;
                    }
                }
            }
        }

        await this.mergeCatalogue(bookingId, prices);
    }

    private async cacheSeatPrices(bookingId: string, seatMap: Record<string, any>) {
        const prices: Record<string, number> = {};

        for (const [segmentId, seat] of Object.entries<any>(seatMap)) {
            for (const s of seat.seats || []) {
                if (s.isBooked) continue;
                // A seat is priced per segment, not per passenger; the wildcard
                // lets any pax on that segment select it.
                prices[`${segmentId}|*|SEAT|${s.code}`] = s.amount;
            }
        }

        await this.mergeCatalogue(bookingId, prices);
    }

    /** Seats and baggage/meals arrive from two calls; keep one price map. */
    private async mergeCatalogue(bookingId: string, prices: Record<string, number>) {
        const existing = (await RedisCacheService.get(catalogueKey(bookingId))) || {};
        await RedisCacheService.set(
            catalogueKey(bookingId),
            { ...existing, ...prices },
            CATALOGUE_TTL_SECONDS
        );
    }
}

export default new PostBookingAncillaryService();
export { catalogueKey };
