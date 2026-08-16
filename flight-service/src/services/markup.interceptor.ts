import MarkupConfiguration from "../config/markup.config";

const PAX_TYPES = ["ADULT", "CHILD", "INFANT"] as const;

/**
 * The single place platform markup is applied to a flight search response.
 *
 * Three things were wrong before:
 *
 *  1. It read `price.fD.ADULT`. On a totalPriceList entry the field is `fd`
 *     (lowercase) — `fD` is the SEGMENT's flight-details field. Guarded by
 *     `if (price.fD)`, so it silently applied no markup at all, ever.
 *  2. `BaseFlightNormalizer.getCheapestFare` applied markup as well, in place,
 *     to the cheapest fare only. Normalisation runs before the response is
 *     cached, so the cached copy already carried markup and a cache hit added
 *     it a second time — a live run showed 4000 -> 4100 -> 4200.
 *  3. Only ONWARD/RETURN/COMBO were walked, so domestic multi-city (indexed
 *     leg keys "0","1","2") was skipped, and the return and multi-city search
 *     paths never called this at all.
 *
 * Markup now happens here and nowhere else: every fare, every pax type, every
 * journey key, on a deep copy so the supplier response is never mutated.
 */
class MarkupInterceptorService {

    applyMarkupToFlightSearch(response: any): any {
        if (!response || !MarkupConfiguration.isEnabled()) {
            return response;
        }

        // Deep copy — callers cache what we return, and mutating the supplier
        // response in place is what made the double-application possible.
        const clonedResponse = JSON.parse(JSON.stringify(response));
        const tripInfos = clonedResponse?.searchResult?.tripInfos;

        if (!tripInfos) {
            return clonedResponse;
        }

        // Every journey key, whatever it is called: ONWARD, RETURN, COMBO, or a
        // numeric multi-city leg. Enumerating them by name is how multi-city got
        // missed, so match on shape instead.
        for (const key of Object.keys(tripInfos)) {
            if (Array.isArray(tripInfos[key])) {
                this.processFlightTripInfos(tripInfos[key]);
            }
        }

        return clonedResponse;
    }

    /**
     * Apply markup to every fare option, not just the cheapest. Marking up only
     * the cheapest left the rest at supplier price, so the "cheapest" fare could
     * end up dearer than its neighbours and priceRange.min went with it.
     */
    private processFlightTripInfos(trips: any[]): void {
        for (const trip of trips) {
            if (!Array.isArray(trip?.totalPriceList)) continue;

            for (const price of trip.totalPriceList) {
                // `fd`, not `fD` — see the note above.
                const fareDetails = price?.fd;
                if (!fareDetails) continue;

                for (const paxType of PAX_TYPES) {
                    const fareComponents = fareDetails[paxType]?.fC;
                    const originalPrice = fareComponents?.TF;

                    if (typeof originalPrice !== "number" || originalPrice <= 0) {
                        continue;
                    }

                    // Guard against a response that somehow reaches us twice.
                    if (fareComponents.originalTF !== undefined) continue;

                    const markupAmount =
                        MarkupConfiguration.getMarkupValue(originalPrice);

                    fareComponents.originalTF = originalPrice;
                    fareComponents.TF = originalPrice + markupAmount;
                    fareComponents.markup = markupAmount;
                }
            }
        }
    }
}

export default new MarkupInterceptorService();
