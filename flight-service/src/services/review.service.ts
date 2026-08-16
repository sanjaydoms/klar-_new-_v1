import axios from "axios";
import tripjackConfig from "../config/tripjack.config";
import { TRIPJACK_URLS } from "../config";
import TripjackFieldMapper from "../utils/mappers/tripjackField.mapper";
import RedisCacheService from "../cache/redisCache.service";
import { v4 as uuidv4 } from "uuid";
import { FlightReviewDataService } from "./flightReviewData.service";
import { envConfig } from "../config";
import { extractReviewSsrPrices, extractSeatPrices } from "../utils/ssrCatalogue";

export const SERVICE_TYPES = {
    FLIGHTS: "FLIGHTS",
    HOTELS: "hotel",
    BUS: "bus",
    TRAIN: "train",
    INSURANCE: "insurance"
} as const;

/** Redis key holding the supplier fare quoted at Review, keyed by bookingId. */
export const reviewedFareKey = (bookingId: string) => `reviewedFare:${bookingId}`;

/**
 * Fallback when the supplier does not state a session length. A stale entry can
 * only ever cause a Book that TripJack rejects — never a silent underpayment.
 */
const REVIEWED_FARE_TTL_SECONDS = 3600;

/**
 * The supplier tells us how long the fare lives, in `conditions.st` — 840s (14
 * min) on live UAT, against the hour we used to cache for. Holding it ~4× longer
 * than the session meant a late booking passed our price check and then failed
 * at TripJack with an opaque session error.
 *
 * A minute of grace keeps the supplier the authority on expiry: better to send a
 * borderline request and let TripJack answer than to refuse locally something it
 * would still have honoured.
 */
const SESSION_GRACE_SECONDS = 60;

function cacheTtlFor(conditions: any): number {
    const sessionSeconds = conditions?.st;
    return typeof sessionSeconds === "number" && sessionSeconds > 0
        ? sessionSeconds + SESSION_GRACE_SECONDS
        : REVIEWED_FARE_TTL_SECONDS;
}

export class ReviewService {

    /** Pull the Total Fare out of a raw AirReviewResponse. */
    static extractTotalFare(rawData: any): number | null {
        const candidates = [
            rawData?.totalPriceInfo?.totalFareDetail?.fC?.TF,
            rawData?.totalPriceInfo?.fc?.TF,
            rawData?.totalPriceInfo?.totalFareDetail?.fc?.TF,
        ];
        const tf = candidates.find((v) => typeof v === "number" && v > 0);
        return tf === undefined ? null : tf;
    }

    /**
     * Store the reviewed fare so the booking step can price itself server-side,
     * along with the `conditions` block from the same response.
     *
     * conditions is the supplier stating, per fare, what the Book request must
     * carry — passport, PAN, DOB, GST, emergency contact — and whether a hold is
     * even permitted. It was previously read into a Mongo model and never used,
     * so those requirements only surfaced as opaque errCodes from TripJack.
     */
    static async cacheReviewedFare(rawData: any): Promise<void> {
        const bookingId = rawData?.bookingId;
        const totalFare = ReviewService.extractTotalFare(rawData);

        if (!bookingId || totalFare === null) {
            console.warn(
                "[Review] Could not capture supplier fare " +
                `(bookingId=${bookingId}, TF=${totalFare}); booking will be rejected until re-reviewed.`
            );
            return;
        }

        // Meal and baggage are quoted here too, per segment. Capture them with
        // the fare so a selection can be priced from what the supplier said
        // rather than from the request body — the seat map arrives from its own
        // call and merges into this same entry.
        await RedisCacheService.set(
            reviewedFareKey(bookingId),
            {
                bookingId,
                totalFare,
                conditions: rawData?.conditions ?? null,
                ssr: extractReviewSsrPrices(rawData),
            },
            cacheTtlFor(rawData?.conditions)
        );
    }

    /**
     * Fold seat prices into the reviewed-fare entry.
     *
     * Seats come from `/fms/v1/seat`, after Review, so they cannot be captured
     * in the same write. Merging keeps one catalogue per bookingId that expires
     * with the fare it belongs to.
     */
    static async cacheSeatPrices(bookingId: string, seatResponse: any): Promise<void> {
        if (!bookingId) return;

        const seatPrices = extractSeatPrices(seatResponse);
        if (!Object.keys(seatPrices).length) return;

        const existing = await RedisCacheService.get(reviewedFareKey(bookingId));
        if (!existing) {
            // No fare on record means the session has already lapsed; a seat
            // catalogue on its own would outlive the fare it belongs to.
            console.warn(
                `[Review] No reviewed fare cached for ${bookingId}; not caching seat prices.`
            );
            return;
        }

        // Reuse the fare's own session length; the seat map belongs to the same
        // session, and re-writing must not quietly extend the entry's life.
        await RedisCacheService.set(
            reviewedFareKey(bookingId),
            { ...existing, ssr: { ...(existing.ssr || {}), ...seatPrices } },
            cacheTtlFor(existing.conditions)
        );
    }

    private applyMarkupToFare(mappedData: any, markup: any): any {
        const finalData = JSON.parse(JSON.stringify(mappedData));
        const percentageMarkup = markup.services?.[0]?.percentageMarkup || 0;
        const fixedMarkup = markup.services?.[0]?.fixedMarkup || 0;

        if (percentageMarkup === 0 && fixedMarkup === 0) {
            return finalData;
        }

        const appliedTo = markup.appliedTo || 'BASE_FARE';

        if (finalData.TripInformation && Array.isArray(finalData.TripInformation)) {
            finalData.TripInformation = finalData.TripInformation.map((trip: any) => {
                if (trip.TotalPriceList && Array.isArray(trip.TotalPriceList)) {
                    trip.TotalPriceList = trip.TotalPriceList.map((priceItem: any) => {
                        if (priceItem.FareDetails?.AdultFare?.FareComponents) {
                            const fareComponents = priceItem.FareDetails.AdultFare.FareComponents;

                            if (fareComponents.AdditionalFareComponents?.TotalAdditionalFare) {
                                const taxComponents = fareComponents.AdditionalFareComponents.TotalAdditionalFare;

                                let taxAmount = 0;

                                if (appliedTo === 'BASE_FARE') {
                                    taxAmount = fareComponents.BaseFare || 0;
                                } else {
                                    taxAmount = fareComponents.TotalFare || fareComponents.NetFare || 0;
                                }

                                const markupAmount = (taxAmount * percentageMarkup / 100) + fixedMarkup;

                                if (taxComponents.CarrierMiscFee) {
                                    taxComponents.CarrierMiscFee += markupAmount;
                                } else {
                                    taxComponents.MarkupAmount = (taxComponents.MarkupAmount || 0) + markupAmount;
                                }

                                fareComponents.MarkupAmount = markupAmount;
                                fareComponents.TotalFare = (fareComponents.TotalFare || fareComponents.NetFare || 0) + markupAmount;
                                fareComponents.NetFare = (fareComponents.NetFare || 0) + markupAmount;

                                if (finalData.totalPriceInfo?.totalFareDetail?.FareComponents) {
                                    const totalFareComp = finalData.totalPriceInfo.totalFareDetail.FareComponents;
                                    totalFareComp.MarkupAmount = (totalFareComp.MarkupAmount || 0) + markupAmount;
                                    totalFareComp.TotalFare = (totalFareComp.TotalFare || 0) + markupAmount;
                                    totalFareComp.NetFare = (totalFareComp.NetFare || 0) + markupAmount;
                                }
                            }
                        }
                        return priceItem;
                    });
                }
                return trip;
            });
        }

        finalData.markupApplied = {
            percentage: percentageMarkup,
            fixed: fixedMarkup,
            appliedTo: appliedTo,
            markupId: markup._id
        };

        return finalData;
    }

    async reviewFare(priceIds: string[]) {
        const sessionId = uuidv4();
        const env = tripjackConfig.ENV;
        const config = TRIPJACK_URLS[env];
        const url = `${config.BASE_URL}${config.REVIEW}`;

        try {
            const response = await axios.post(
                url,
                { priceIds },
                {
                    headers: {
                        "Content-Type": "application/json",
                        apikey: tripjackConfig.API_KEY,
                    }
                }
            );

            const rawData = response.data;

            // Capture the supplier's Total Fare BEFORE any markup or field
            // renaming touches it. This is the only number TripJack will accept
            // in the Book request (doc: "Amount in Book request must equal TF
            // from AirReviewResponse"), and the only price in the whole flow the
            // client has never had a chance to alter.
            await ReviewService.cacheReviewedFare(rawData);

            const mappedData = TripjackFieldMapper.map(rawData);

            await RedisCacheService.set(sessionId, {
                raw: mappedData,
            }, 1800);

            const markupData = await this.getMarkupByServiceType(SERVICE_TYPES.FLIGHTS);

            let finalData = mappedData;
            if (markupData?.success && markupData?.data) {
                finalData = this.applyMarkupToFare(mappedData, markupData.data);
            }

            console.log("[FINAL FARE WITH MARKUP]", JSON.stringify({
                originalBaseFare: mappedData.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.AdultFare?.FareComponents?.BaseFare,
                originalTaxes: mappedData.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.AdultFare?.FareComponents?.AdditionalFareComponents?.TotalAdditionalFare,
                finalTotalFare: finalData.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.AdultFare?.FareComponents?.TotalFare,
                markupApplied: finalData.markupApplied
            }, null, 2));

            await RedisCacheService.set(sessionId, {
                raw: finalData,
            }, 1800);

            return {
                mappedData: finalData,
                // Raw, deliberately: the field mapper renames `dob` to
                // `DateOfBirth` and would mangle the conditions block.
                conditions: rawData?.conditions ?? null,
                sessionId
            };

        } catch (error: any) {
            console.error("Review Fare ERROR >>>", {
                status: error.response?.status,
                data: JSON.stringify(error.response?.data, null, 2),
                message: error.message
            });

            const tripjackError = error.response?.data;

            if (tripjackError && tripjackError.errors && tripjackError.errors.length > 0) {
                const firstError = tripjackError.errors[0];
                const customError = new Error(firstError.message);
                (customError as any).statusCode = error.response?.status || 400;
                (customError as any).errorCode = firstError.errCode;
                (customError as any).details = firstError.details;
                (customError as any).referenceId = firstError.id;
                throw customError;
            }

            throw error;
        }
    }

    async getMarkupByServiceType(serviceType: string) {
        try {


            const response = await axios.post(
                `${envConfig.AUTH_SERVICE}/markup/${serviceType}`,
                {
                    userId: process.env.USER_ID || "default-user-id"
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            return response.data;
        } catch (error: any) {
            console.warn("Get Markup API Warning >>>", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            // Return null instead of throwing so reviewFare can continue without markup
            return null;
        }
    }

    async beforeBookVerify(bookingId: string) {

        const env = tripjackConfig.ENV;
        const config = TRIPJACK_URLS[env];
        const url = `${config.BASE_URL}${config.FARE_VALIDATE}`;

        try {
            const response = await axios.post(
                url,
                { bookingId },
                {
                    headers: {
                        "Content-Type": "application/json",
                        apikey: tripjackConfig.API_KEY,
                    }
                }
            );

            const rawData = response.data;

            const mappedData = TripjackFieldMapper.map(rawData);

            return {
                mappedData
            };

        } catch (error: any) {
            console.error("Before Book Verify ERROR >>>", {
                status: error.response?.status,
                data: JSON.stringify(error.response?.data, null, 2),
                message: error.message
            });

            throw error;
        }
    }
}

export default new ReviewService();