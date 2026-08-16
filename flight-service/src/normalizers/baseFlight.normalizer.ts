import crypto from "crypto";
import { envConfig } from "../config";

export class BaseFlightNormalizer {

    static getFlightKey(segments: any[]): string {
        return segments.map((seg: any) => seg.id).join("-");
    }

    /**
     * Addresses one supplier trip ENTRY, not just its route.
     *
     * TripJack returns the same physical flight several times over — once per
     * fare group (PUBLISHED, ECO VALUE, PROMO…) — each a separate tripInfos
     * entry with identical segment ids but different fares. Keying on segments
     * alone therefore collides, and `fare.service`'s `.find()` would answer with
     * whichever group happened to come first: a live DEL-BOM search had a user
     * click a Rs.7,144 card and land on the Rs.10,016 fares of a different one.
     *
     * The fare ids are what actually distinguish the entries, so they go into
     * the key — hashed, because a raw priceId is ~45 characters.
     */
    static getTripKey(segments: any[], totalPriceList?: any[]): string {
        const segmentKey = this.getFlightKey(segments || []);
        const fareIds = (totalPriceList || [])
            .map((p: any) => p?.id)
            .filter(Boolean)
            .join("|");

        if (!fareIds) return segmentKey;

        const fingerprint = crypto
            .createHash("sha1")
            .update(fareIds)
            .digest("hex")
            .slice(0, 8);

        return `${segmentKey}#${fingerprint}`;
    }

    /**
     * Does `key` address this trip? Accepts the legacy segments-only key too, so
     * a search session opened before this change keeps working until it expires.
     */
    static matchesTripKey(trip: any, key: string): boolean {
        if (!key) return false;
        const segments = trip?.sI || [];
        return (
            this.getTripKey(segments, trip?.totalPriceList) === key ||
            this.getFlightKey(segments) === key
        );
    }

    static getTime(dt: string): string {
        return dt?.split("T")[1]?.slice(0, 5);
    }

    static getDateParts(dt: string) {
        const d = new Date(dt);

        const day = d.toLocaleDateString("en-US", { weekday: "long" });

        const dd = d.toLocaleDateString("en-GB", { day: "2-digit" });
        const mm = d.toLocaleDateString("en-US", { month: "short" });
        const yy = d.getFullYear().toString().slice(2);

        return {
            day,
            date: `${dd}-${mm}-${yy}`
        };
    }

    static formatDuration(min: number): string {
        if (!min && min !== 0) return "0h 0m";

        const h = Math.floor(min / 60);
        const m = min % 60;

        return `${h}h ${m}m`;
    }

    /**
     * A trip with no purchasable fare can't be shown or booked. Callers use this
     * to drop it before mapping, which is also what keeps `getCheapestFare` from
     * ever being handed an empty list downstream.
     */
    static hasBookableFare(flight: any): boolean {
        return Array.isArray(flight?.totalPriceList) && flight.totalPriceList.length > 0;
    }

    /** rT: 0 = non-refundable, 1 = refundable, 2 = partially refundable. */
    static refundableLabel(rT: number | undefined): string {
        if (rT === 1) return "Refundable";
        if (rT === 2) return "Partially Refundable";
        if (rT === 0) return "Non-Refundable";
        return "Unknown";
    }

    /**
     * Fare attributes the search card needs but the normalizers were dropping:
     * the fare type (PUBLISHED / SPECIAL_RETURN / TJ_FLEX), refundability, seats
     * left, and the sri/msri pair that Special Return legs must be matched on.
     */
    static getFareMeta(fare: any) {
        const adult = fare?.fd?.ADULT;
        return {
            fareId: fare?.id,
            fareIdentifier: fare?.fareIdentifier || "PUBLISHED",
            isSpecialReturn: fare?.fareIdentifier === "SPECIAL_RETURN",
            // Special Return legs are only bookable together: the return leg's
            // msri must contain the onward leg's sri.
            sri: fare?.sri,
            msri: fare?.msri,
            refundableType: adult?.rT,
            refundable: this.refundableLabel(adult?.rT),
            seatsRemaining: adult?.sR,
            checkInBaggage: adult?.bI?.iB,
            cabinBaggage: adult?.bI?.cB,
        };
    }

    /**
     * Finds the cheapest fare. Nothing more.
     *
     * This used to apply platform markup here too, mutating the fare in place.
     * Because normalisation runs before the response is cached, the cached copy
     * came out already marked up and every cache hit added it again (4000 ->
     * 4100 -> 4200 on a live run). It also only ever touched the cheapest fare,
     * leaving the rest at supplier price. Markup now belongs solely to
     * MarkupInterceptor, which works on a copy and covers every fare.
     */
    static getCheapestFare(totalPriceList: any[]) {
        if (!Array.isArray(totalPriceList) || totalPriceList.length === 0) {
            return null;
        }

        return totalPriceList.reduce((min, curr) => {
            return curr.fd.ADULT.fC.TF < min.fd.ADULT.fC.TF ? curr : min;
        });
    }

    static extractFares(flights: any[]) {
        return flights.map((flight: any) => {
            return {
                flightKey: this.getFlightKey(flight.sI),

                segments: flight.sI.map((seg: any) => ({
                    ...seg
                })),

                fares: (flight.totalPriceList || []).map((fare: any) => ({
                    ...fare,

                    fareId: fare.id,
                    fareIdentifier: fare.fareIdentifier,

                    passengerBreakup: {
                        ADULT: fare.fd?.ADULT || null,
                        CHILD: fare.fd?.CHILD || null,
                        INFANT: fare.fd?.INFANT || null
                    },

                    priceSummary: {
                        ADULT: {
                            total: fare.fd?.ADULT?.fC?.TF,
                            baseFare: fare.fd?.ADULT?.fC?.BF,
                            tax: fare.fd?.ADULT?.fC?.TAF,
                            netFare: fare.fd?.ADULT?.fC?.NF
                        },
                        CHILD: {
                            total: fare.fd?.CHILD?.fC?.TF,
                            baseFare: fare.fd?.CHILD?.fC?.BF,
                            tax: fare.fd?.CHILD?.fC?.TAF,
                            netFare: fare.fd?.CHILD?.fC?.NF
                        },
                        INFANT: {
                            total: fare.fd?.INFANT?.fC?.TF,
                            baseFare: fare.fd?.INFANT?.fC?.BF,
                            tax: fare.fd?.INFANT?.fC?.TAF,
                            netFare: fare.fd?.INFANT?.fC?.NF
                        }
                    },

                    baggageDetails: fare.tai?.tbi || null,

                    meta: {
                        isCreditCardApplicable: fare.icca,
                        messages: fare.messages,
                        msri: fare.msri
                    }
                }))
            };
        });
    }

    static getCheapestFareWithBreakdown(totalPriceList: any[]): {
        cheapestFare: any;
        adultPrice: number;
        childPrice: number;
        infantPrice: number;
    } {
        const cheapestFare = this.getCheapestFare(totalPriceList);

        return {
            cheapestFare,
            adultPrice: cheapestFare?.fd?.ADULT?.fC?.TF || 0,
            childPrice: cheapestFare?.fd?.CHILD?.fC?.TF || 0,
            infantPrice: cheapestFare?.fd?.INFANT?.fC?.TF || 0
        };
    }

    static extractFaresForCombo(combo: any) {
        return [{
            flightKey: null,
            segments: (combo.sI || []).map((seg: any) => ({ ...seg })),
            fares: (combo.totalPriceList || []).map((fare: any) => ({
                ...fare,
                fareId: fare.id,
                fareIdentifier: fare.fareIdentifier,
                passengerBreakup: {
                    ADULT: fare.fd?.ADULT || null,
                    CHILD: fare.fd?.CHILD || null,
                    INFANT: fare.fd?.INFANT || null
                },
                priceSummary: {
                    ADULT: {
                        total: fare.fd?.ADULT?.fC?.TF,
                        baseFare: fare.fd?.ADULT?.fC?.BF,
                        tax: fare.fd?.ADULT?.fC?.TAF,
                        netFare: fare.fd?.ADULT?.fC?.NF
                    },
                    CHILD: {
                        total: fare.fd?.CHILD?.fC?.TF,
                        baseFare: fare.fd?.CHILD?.fC?.BF,
                        tax: fare.fd?.CHILD?.fC?.TAF,
                        netFare: fare.fd?.CHILD?.fC?.NF
                    },
                    INFANT: {
                        total: fare.fd?.INFANT?.fC?.TF,
                        baseFare: fare.fd?.INFANT?.fC?.BF,
                        tax: fare.fd?.INFANT?.fC?.TAF,
                        netFare: fare.fd?.INFANT?.fC?.NF
                    }
                },
                baggageDetails: fare.tai?.tbi || null,
                meta: {
                    isCreditCardApplicable: fare.icca,
                    messages: fare.messages,
                    msri: fare.msri
                }
            }))
        }];
    }

    static extractMultiFaresForCombo(combo: any) {
        if (!combo.totalPriceList || combo.totalPriceList.length === 0) {
            return [];
        }

        return [{
            flightKey: this.getFlightKey(combo.sI || []),
            segments: (combo.sI || []).map((seg: any) => ({ ...seg })),
            fares: combo.totalPriceList.map((fare: any) => ({
                ...fare,
                fareId: fare.id,
                fareIdentifier: fare.fareIdentifier,
                passengerBreakup: {
                    ADULT: fare.fd?.ADULT || null,
                    CHILD: fare.fd?.CHILD || null,
                    INFANT: fare.fd?.INFANT || null
                },
                priceSummary: {
                    ADULT: {
                        total: fare.fd?.ADULT?.fC?.TF,
                        baseFare: fare.fd?.ADULT?.fC?.BF,
                        tax: fare.fd?.ADULT?.fC?.TAF,
                        netFare: fare.fd?.ADULT?.fC?.NF
                    },
                    CHILD: {
                        total: fare.fd?.CHILD?.fC?.TF,
                        baseFare: fare.fd?.CHILD?.fC?.BF,
                        tax: fare.fd?.CHILD?.fC?.TAF,
                        netFare: fare.fd?.CHILD?.fC?.NF
                    },
                    INFANT: {
                        total: fare.fd?.INFANT?.fC?.TF,
                        baseFare: fare.fd?.INFANT?.fC?.BF,
                        tax: fare.fd?.INFANT?.fC?.TAF,
                        netFare: fare.fd?.INFANT?.fC?.NF
                    }
                },
                baggageDetails: fare.tai?.tbi || null,
                meta: {
                    isCreditCardApplicable: fare.icca,
                    messages: fare.messages,
                    msri: fare.msri
                }
            }))
        }];
    }
}