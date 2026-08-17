import axios from "axios";
import { TRIPJACK_URLS, tripjackConfig } from "../config";
import RedisCacheService from "../cache/redisCache.service";
import TripjackBookingService from "./booking.service";
import {
    buildReissueQuery,
    buildAutoReissuePayload,
    extractReissueFare,
    isCabinDowngrade,
} from "../utils/mappers/reissue.mapper";

/** Fare quoted at reissue review, so the book step prices itself server-side. */
const reissueFareKey = (bookingId: string) => `reissueFare:${bookingId}`;
const REISSUE_FARE_TTL_SECONDS = 3600;

export class ReissueError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = "ReissueError";
    }
}

class ReissueService {

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

    /**
     * Everything step 1 needs is already on the booking: PNR, pax ids, pax mix.
     * Reading them from booking-details rather than the request body means a
     * client cannot reissue someone else's passengers or a PNR it invented.
     */
    private async originalBooking(oldBookingId: string) {
        const details: any = await TripjackBookingService.getBookingDetails(oldBookingId);

        const status = details?.order?.status;
        if (status !== "SUCCESS") {
            throw new ReissueError(
                `Booking must be ticketed before it can be reissued (current status: ${status || "unknown"}).`
            );
        }

        const air = details?.itemInfos?.AIR ?? {};
        const travellers = air.TravellerInformation ?? air.travellerInfos ?? [];
        if (!travellers.length) {
            throw new ReissueError("No passengers found on the original booking.");
        }

        // pnrDetails is keyed by route (e.g. "DEL-BOM"); any of them identifies
        // the booking to the supplier.
        const pnr = Object.values(travellers[0]?.pnrDetails ?? {})[0] as string | undefined;
        if (!pnr) throw new ReissueError("Original booking has no PNR to reissue against.");

        const paxInfo = { ADULT: 0, CHILD: 0, INFANT: 0 };
        for (const t of travellers) {
            const pt = (t.PaxType ?? t.pt ?? "ADULT").toUpperCase();
            if (pt in paxInfo) (paxInfo as any)[pt] += 1;
        }

        return {
            details,
            travellers,
            pnr,
            paxInfo,
            // PaxId, not SegmentID — the field the mapper collision used to hide.
            paxIds: travellers.map((t: any) => t.PaxId ?? t.id),
            deliveryInfo: {
                emails: details?.order?.DeliveryInformation?.Emails ??
                        details?.order?.deliveryInfo?.emails ?? [],
                contacts: details?.order?.DeliveryInformation?.Contacts ??
                          details?.order?.deliveryInfo?.contacts ?? [],
            },
            cabinClass:
                travellers[0]?.FareDetails?.CabinClass ??
                travellers[0]?.fd?.cc,
        };
    }


    /**
     * TripJack signals reissue failures IN-BAND: HTTP 200 with
     * `status.success: false` and an `errors` array. Trusting the HTTP status
     * alone reported a successful search with a null requestId — the caller then
     * moved to step 2 with nothing to search on.
     */
    private assertSupplierOk(data: any, fallback: string): void {
        if (data?.status?.success === false) {
            const first = data?.errors?.[0];
            const error: any = new ReissueError(first?.message || fallback);
            error.errorCode = first?.errCode;
            error.supplierBody = data;
            throw error;
        }
    }

    /** Step 1 — returns a requestId used by the search below. */
    async searchQueryList(params: {
        oldBookingId: string;
        routeInfos: Array<{ from: string; to: string; travelDate: string }>;
        cabinClass?: string;
    }) {
        const { baseUrl, headers, endpoints } = this.getConfig();
        const original = await this.originalBooking(params.oldBookingId);

        if (isCabinDowngrade(original.cabinClass, params.cabinClass)) {
            throw new ReissueError(
                `Cannot downgrade from ${original.cabinClass} to ${params.cabinClass} on a reissue.`
            );
        }

        if (!params.routeInfos?.length) {
            throw new ReissueError("routeInfos is required — one trip is reissued at a time.");
        }
        if (params.routeInfos.length > 1) {
            // Doc: one trip at a time. Sending more silently reissues the wrong leg.
            throw new ReissueError("Only one trip can be reissued at a time.");
        }

        // The published doc nests this under `searchQuery`; the live API rejects
        // that with "paxInfo : may not be null" and wants the fields at root.
        const body = buildReissueQuery({
            paxInfo: original.paxInfo,
            routeInfos: params.routeInfos,
            pnr: original.pnr,
            oldBookingId: params.oldBookingId,
            paxIds: original.paxIds,
        });

        const response = await axios.post(
            `${baseUrl}${endpoints.REISSUE_QUERY_LIST}`,
            body,
            { headers }
        );

        this.assertSupplierOk(response.data, "Reissue search could not be started");

        return {
            requestId: response.data?.requestId,
            searchIds: response.data?.searchIds,
            request: body,
            body: response.data,
        };
    }

    /** Step 2 — available flights for the reissue. Standard search response shape. */
    async search(requestId: string) {
        const { baseUrl, headers, endpoints } = this.getConfig();
        if (!requestId) throw new ReissueError("requestId is required");

        const response = await axios.post(
            `${baseUrl}${endpoints.REISSUE_SEARCH}`,
            { requestId },
            { headers }
        );

        this.assertSupplierOk(response.data, "Reissue search failed");

        // Surface the fare DIFFERENCE breakdown alongside each option, since a
        // reissue quote is not an absolute price.
        const trips = response.data?.searchResult?.tripInfos ?? {};
        const options: any[] = [];
        for (const key of Object.keys(trips)) {
            for (const trip of trips[key] ?? []) {
                for (const fare of trip.totalPriceList ?? []) {
                    options.push({
                        priceId: fare.id,
                        journeyKey: key,
                        fareIdentifier: fare.fareIdentifier,
                        fare: extractReissueFare(fare),
                    });
                }
            }
        }

        return { requestId, options, body: response.data };
    }

    /**
     * Step 3 — revalidate and mint the reissue bookingId. The payable amount is
     * captured here so step 4 never takes it from the request body, exactly as
     * the normal booking flow treats the reviewed fare.
     */
    async review(priceId: string, oldBookingId: string) {
        const { baseUrl, headers, endpoints } = this.getConfig();
        if (!priceId) throw new ReissueError("priceId is required");
        if (!oldBookingId) throw new ReissueError("oldBookingId is required");

        const response = await axios.post(
            `${baseUrl}${endpoints.REISSUE_REVIEW}`,
            { priceIds: [priceId], oldBookingId, priceValidation: true },
            { headers }
        );

        this.assertSupplierOk(response.data, "Reissue review failed");

        const data = response.data;
        const bookingId = data?.bookingId;
        const totalFare =
            data?.totalPriceInfo?.totalFareDetail?.fC?.TF ??
            data?.totalPriceInfo?.fc?.TF;

        if (bookingId && typeof totalFare === "number") {
            await RedisCacheService.set(
                reissueFareKey(bookingId),
                { bookingId, oldBookingId, totalFare },
                REISSUE_FARE_TTL_SECONDS
            );
        } else {
            console.warn(
                `[Reissue] Could not capture payable amount (bookingId=${bookingId}, TF=${totalFare}); ` +
                "the reissue will be refused until reviewed again."
            );
        }

        return {
            bookingId,
            oldBookingId,
            amountPayable: totalFare,
            conditions: data?.conditions ?? null,
            body: data,
        };
    }

    /**
     * Step 4 — ticket the reissue. Traveller details must match the original,
     * so they are rebuilt from booking-details rather than taken from the caller.
     */
    async book(bookingId: string, oldBookingId: string, gstInfo?: any) {
        const { baseUrl, headers, endpoints } = this.getConfig();

        const quoted = await RedisCacheService.get(reissueFareKey(bookingId));
        if (!quoted) {
            throw new ReissueError(
                "No reviewed reissue fare on record. Run the reissue review again before booking."
            );
        }
        if (quoted.oldBookingId !== oldBookingId) {
            throw new ReissueError(
                "This reissue quote belongs to a different original booking."
            );
        }

        const original = await this.originalBooking(oldBookingId);

        const payload = buildAutoReissuePayload({
            bookingId,
            oldBookingId,
            amount: quoted.totalFare,
            deliveryInfo: original.deliveryInfo,
            travellers: original.travellers,
            gstInfo,
        });

        console.log(
            `[Reissue] ${oldBookingId} -> ${bookingId}, payable Rs.${quoted.totalFare}`
        );

        const response = await axios.post(
            `${baseUrl}${endpoints.AUTO_REISSUE}`,
            payload,
            { headers }
        );

        this.assertSupplierOk(response.data, "Reissue booking failed");

        return { bookingId, oldBookingId, amount: quoted.totalFare, request: payload, body: response.data };
    }
}

export default new ReissueService();
export { reissueFareKey };
