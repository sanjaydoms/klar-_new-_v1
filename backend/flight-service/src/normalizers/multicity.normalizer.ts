import { BaseFlightNormalizer } from "./baseFlight.normalizer";
import { envConfig } from "../config/env.config";

type AnyObj = Record<string, any>;

export class MultiCityNormalizer extends BaseFlightNormalizer {

    static normalize(searchResult: AnyObj) {
        const tripInfos = searchResult?.searchResult?.tripInfos;
        if (!tripInfos) {
            return {
                flights: [],
                airlineStats: []
            };
        }

        const hasCombo = tripInfos.COMBO && Array.isArray(tripInfos.COMBO);
        const hasLegs = Object.keys(tripInfos).some(key => !isNaN(Number(key)));

        if (hasCombo && !hasLegs) {
            return this.normalizeComboStructure(tripInfos.COMBO);
        }

        return this.normalizeDomesticStructure(tripInfos);
    }

    /**
     * Transform with all fares (for PDF generation)
     * Includes all fare options for each flight
     */
    static transformWithAllFares(searchResult: AnyObj) {
        const tripInfos = searchResult?.searchResult?.tripInfos;
        if (!tripInfos) {
            return {
                flights: [],
                type: 'none'
            };
        }

        const hasCombo = tripInfos.COMBO && Array.isArray(tripInfos.COMBO);
        const hasLegs = Object.keys(tripInfos).some(key => !isNaN(Number(key)));

        if (hasCombo && !hasLegs) {
            return this.transformComboWithAllFares(tripInfos.COMBO);
        }

        return this.transformDomesticWithAllFares(tripInfos);
    }

    private static normalizeDomesticStructure(tripInfos: AnyObj) {
        const legKeys = Object.keys(tripInfos)
            .filter(key => !isNaN(Number(key)))
            .sort((a, b) => Number(a) - Number(b));

        const legs = legKeys.map((key) => {
            const flights = tripInfos[key] || [];
            return this.mapLegToFlights(Number(key), flights);
        });

        const allFlights = legs.flatMap((leg: any) => leg.flights);

        return {
            flights: legs,
            airlineStats: this.buildAirlineStats(allFlights)
        };
    }

    /**
     * Transform domestic multicity with all fares
     */
    private static transformDomesticWithAllFares(tripInfos: AnyObj) {
        const legKeys = Object.keys(tripInfos)
            .filter(key => !isNaN(Number(key)))
            .sort((a, b) => Number(a) - Number(b));

        const legs = legKeys.map((key) => {
            const flights = tripInfos[key] || [];
            return this.mapLegToFlightsWithAllFares(Number(key), flights);
        });

        return {
            flights: legs,
            type: 'domestic'
        };
    }

    /**
     * Split a COMBO's segments into the journey legs that were actually searched.
     *
     * This used to advance the leg on `isRs === true`. `isRs` means "is RETURN
     * segment" and, verified against a live 3-leg DEL-DXB-BKK-DEL search, is
     * false on EVERY segment of an international multi-city — so all four
     * segments collapsed into a single leg.
     *
     * `cT` (connecting time, minutes) is the real signal: it is present only on a
     * segment whose successor continues the same leg. On that same response:
     *
     *   DEL->DXB cT=null  | DXB->BKK cT=null  | BKK->DXB cT=180 | DXB->DEL cT=null
     *   leg 0             | leg 1             | leg 2 -------------------------->
     *
     * Airport continuity is checked too — a segment departing somewhere other
     * than where the previous one landed cannot be a connection, whatever cT says.
     */
    private static splitComboIntoLegs(segments: any[]): any[][] {
        const legs: any[][] = [];
        let current: any[] = [];

        segments.forEach((segment: any, i: number) => {
            current.push(segment);

            const next = segments[i + 1];
            const connects =
                next !== undefined &&
                Number(segment?.cT) > 0 &&
                segment?.aa?.code === next?.da?.code;

            if (!connects) {
                legs.push(current);
                current = [];
            }
        });

        if (current.length) legs.push(current);
        return legs;
    }

    private static normalizeComboStructure(comboFlights: any[]) {
        const result: any[] = [];

        comboFlights.filter((c: any) => this.hasBookableFare(c)).forEach((combo: any) => {
            const segments = combo.sI || [];
            const legs: Map<number, any[]> = new Map(
                this.splitComboIntoLegs(segments).map((l, i) => [i, l])
            );

            const itinerary: any = {
                itineraryKey: this.getFlightKey(segments),
                totalPrice: this.getCheapestFare(combo.totalPriceList)?.fd?.ADULT?.fC?.TF || 0,
                legs: []
            };

            legs.forEach((legSegments, legIndex) => {
                const legFlight = this.mapSegmentsToLeg(legSegments, combo.totalPriceList, legIndex);
                itinerary.legs.push(legFlight);
            });

            result.push(itinerary);
        });

        // Build airline stats with airline code
        const airlineMap: Record<string, { name: string; code: string; count: number }> = {};

        result.forEach((itinerary: any) => {
            itinerary.legs?.forEach((leg: any) => {
                if (!leg?.airline) return;

                const airlineName = leg.airline;
                const airlineCode = leg.airlineCode || '';

                if (!airlineMap[airlineName]) {
                    airlineMap[airlineName] = {
                        name: airlineName,
                        code: airlineCode,
                        count: 0
                    };
                }
                airlineMap[airlineName].count += 1;
            });
        });

        const airlineStats = Object.values(airlineMap)
            .map(({ name, code, count }) => ({
                airline: name,
                airlineCode: code,
                flights: count
            }))
            .sort((a, b) => b.flights - a.flights);

        return {
            flights: result,
            airlineStats
        };
    }

    /**
     * Transform international multicity (combo) with all fares
     */
    private static transformComboWithAllFares(comboFlights: any[]) {
        const result: any[] = [];

        comboFlights.filter((c: any) => this.hasBookableFare(c)).forEach((combo: any) => {
            const segments = combo.sI || [];
            const legs: Map<number, any[]> = new Map(
                this.splitComboIntoLegs(segments).map((l, i) => [i, l])
            );


            const allFares = (combo.totalPriceList || []).map((fare: any) => ({
                fareName: fare.fareIdentifier || "UNKNOWN",
                totalPrice: fare.fd?.ADULT?.fC?.TF || 0,
                cabinClass: fare.fd?.ADULT?.cc || "UNKNOWN",
                baseFare: fare.fd?.ADULT?.fC?.BF || 0,
                tax: fare.fd?.ADULT?.fC?.TAF || 0,
                netFare: fare.fd?.ADULT?.fC?.NF || 0,
                ...BaseFlightNormalizer.getFareMeta(fare)
            }));

            const cheapestFare = this.getCheapestFare(combo.totalPriceList);
            const totalPrice = cheapestFare?.fd?.ADULT?.fC?.TF || 0;

            const itinerary: any = {
                itineraryKey: this.getFlightKey(segments),
                totalPrice: totalPrice,
                cheapestFare: {
                    price: cheapestFare?.fd?.ADULT?.fC?.TF || 0,
                    cabinClass: cheapestFare?.fd?.ADULT?.cc || "UNKNOWN",
                    fareName: cheapestFare?.fareIdentifier || "UNKNOWN"
                },
                allFares: allFares,
                fareSummary: {
                    totalFares: allFares.length,
                    fareNames: allFares.map((f: any) => f.fareName),
                    priceRange: {
                        min: Math.min(...allFares.map((f: any) => f.totalPrice)),
                        max: Math.max(...allFares.map((f: any) => f.totalPrice))
                    }
                },
                legs: []
            };

            legs.forEach((legSegments, legIndex) => {
                const legFlight = this.mapSegmentsToLegWithAllFares(
                    legSegments,
                    combo.totalPriceList,
                    legIndex,
                    cheapestFare,
                    allFares
                );
                itinerary.legs.push(legFlight);
            });

            result.push(itinerary);
        });

        return {
            flights: result,
            type: 'international'
        };
    }

    private static mapSegmentsToLeg(segments: any[], totalPriceList: any[], legIndex: number) {
        const first = segments[0];
        const last = segments[segments.length - 1];
        const cheapestFare = this.getCheapestFare(totalPriceList || []);

        const fromDate = this.getDateParts(first.dt);
        const toDate = this.getDateParts(last.at);

        return {
            legIndex: legIndex,
            flightKey: this.getTripKey(segments, totalPriceList),
            airline: first?.fD?.aI?.name,
            airlineCode: first?.fD?.aI?.code,
            flightNumber: `${first?.fD?.aI?.code}-${first?.fD?.fN}`,
            cabinClass: cheapestFare?.fd?.ADULT?.cc,
            from: {
                city: first?.da?.city,
                airportCode: first?.da?.code,
                terminal: first?.da?.terminal,
                time: this.getTime(first?.dt),
                date: fromDate.date,
                day: fromDate.day
            },
            to: {
                city: last?.aa?.city,
                airportCode: last?.aa?.code,
                terminal: last?.aa?.terminal,
                time: this.getTime(last?.at),
                date: toDate.date,
                day: toDate.day
            },
            stops: segments.length - 1,
            duration: this.formatDuration(
                segments.reduce((sum: number, seg: any) => sum + (seg.duration || 0), 0)
            ),
            price: cheapestFare?.fd?.ADULT?.fC?.TF ?? 0,
            aircraftTypes: BaseFlightNormalizer.getAircraftTypes(segments),
            ...this.getFareMeta(cheapestFare)
        };
    }

    /**
     * Map segments to leg with all fares (for PDF)
     */
    private static mapSegmentsToLegWithAllFares(
        segments: any[],
        totalPriceList: any[],
        legIndex: number,
        cheapestFare: any,
        allFares: any[]
    ) {
        const first = segments[0];
        const last = segments[segments.length - 1];

        const fromDate = this.getDateParts(first.dt);
        const toDate = this.getDateParts(last.at);

        const flightData: any = {
            legIndex: legIndex,
            flightKey: this.getTripKey(segments, totalPriceList),
            airline: first?.fD?.aI?.name,
            airlineCode: first?.fD?.aI?.code,
            flightNumber: `${first?.fD?.aI?.code}-${first?.fD?.fN}`,
            from: {
                city: first?.da?.city,
                airportCode: first?.da?.code,
                airportName: first?.da?.name,
                terminal: first?.da?.terminal,
                time: this.getTime(first?.dt),
                date: fromDate.date,
                day: fromDate.day
            },
            to: {
                city: last?.aa?.city,
                airportCode: last?.aa?.code,
                airportName: last?.aa?.name,
                terminal: last?.aa?.terminal,
                time: this.getTime(last?.at),
                date: toDate.date,
                day: toDate.day
            },
            stops: segments.length - 1,
            duration: this.formatDuration(
                segments.reduce((sum: number, seg: any) => sum + (seg.duration || 0), 0)
            ),
            cheapestFare: {
                price: cheapestFare?.fd?.ADULT?.fC?.TF || 0,
                cabinClass: cheapestFare?.fd?.ADULT?.cc || "UNKNOWN",
                fareName: cheapestFare?.fareIdentifier || "UNKNOWN"
            },
            allFares: allFares,
            price: cheapestFare?.fd?.ADULT?.fC?.TF ?? 0,
            ...this.getFareMeta(cheapestFare)
        };


        if (cheapestFare?.fd?.ADULT?.fC?.originalTF && envConfig.PLATFORM_MARKUP.ENABLED) {
            flightData.original_price = cheapestFare.fd.ADULT.fC.originalTF;
            flightData.markup = cheapestFare.fd.ADULT.fC.markup;
        }

        return flightData;
    }

    private static mapLegToFlights(legIndex: number, flights: any[]) {
        return {
            legIndex: legIndex,
            flights: flights
                .filter((f: AnyObj) => this.hasBookableFare(f))
                .map((flight: AnyObj) => {
                const segments = flight.sI || [];
                const first = segments[0];
                const last = segments[segments.length - 1];
                const cheapestFare = this.getCheapestFare(flight.totalPriceList || []);

                const fromDate = this.getDateParts(first.dt);
                const toDate = this.getDateParts(last.at);

                return {
                    flightKey: this.getTripKey(segments, flight.totalPriceList),
                    airline: first?.fD?.aI?.name,
                    airlineCode: first?.fD?.aI?.code,
                    flightNumber: `${first?.fD?.aI?.code}-${first?.fD?.fN}`,
                    cabinClass: cheapestFare?.fd?.ADULT?.cc,
                    from: {
                        city: first?.da?.city,
                        airportCode: first?.da?.code,
                        terminal: first?.da?.terminal,
                        time: this.getTime(first?.dt),
                        date: fromDate.date,
                        day: fromDate.day
                    },
                    to: {
                        city: last?.aa?.city,
                        airportCode: last?.aa?.code,
                        terminal: last?.aa?.terminal,
                        time: this.getTime(last?.at),
                        date: toDate.date,
                        day: toDate.day
                    },
                    stops: Math.max(segments.length - 1, 0),
                    duration: this.formatDuration(
                        segments.reduce(
                            (sum: number, seg: any) => sum + (seg.duration || 0),
                            0
                        )
                    ),
                    price: cheapestFare?.fd?.ADULT?.fC?.TF ?? 0,
                    aircraftTypes: BaseFlightNormalizer.getAircraftTypes(segments),
                    // The other card builders expose these; this one didn't, so
                    // multi-city legs priced correctly but showed no markup
                    // breakdown. originalTF is set by MarkupInterceptor.
                    ...(cheapestFare?.fd?.ADULT?.fC?.originalTF !== undefined
                        ? {
                              original_price: cheapestFare.fd.ADULT.fC.originalTF,
                              markup: cheapestFare.fd.ADULT.fC.markup,
                          }
                        : {}),
                    ...this.getFareMeta(cheapestFare)
                };
            })
        };
    }

    /**
     * Map leg to flights with all fares (for PDF)
     */
    private static mapLegToFlightsWithAllFares(legIndex: number, flights: any[]) {
        return {
            legIndex: legIndex,
            flights: flights
                .filter((f: AnyObj) => this.hasBookableFare(f))
                .map((flight: AnyObj) => {
                const segments = flight.sI || [];
                const first = segments[0];
                const last = segments[segments.length - 1];
                const cheapestFare = this.getCheapestFare(flight.totalPriceList || []);

                const fromDate = this.getDateParts(first.dt);
                const toDate = this.getDateParts(last.at);


                const allFares = (flight.totalPriceList || []).map((fare: any) => ({
                    fareName: fare.fareIdentifier || "UNKNOWN",
                    totalPrice: fare.fd?.ADULT?.fC?.TF || 0,
                    cabinClass: fare.fd?.ADULT?.cc || "UNKNOWN",
                    baseFare: fare.fd?.ADULT?.fC?.BF || 0,
                    tax: fare.fd?.ADULT?.fC?.TAF || 0,
                    netFare: fare.fd?.ADULT?.fC?.NF || 0,
                    ...BaseFlightNormalizer.getFareMeta(fare)
                }));

                const flightData: any = {
                    flightKey: this.getTripKey(segments, flight.totalPriceList),
                    airline: first?.fD?.aI?.name,
                    airlineCode: first?.fD?.aI?.code,
                    flightNumber: `${first?.fD?.aI?.code}-${first?.fD?.fN}`,
                    from: {
                        city: first?.da?.city,
                        airportCode: first?.da?.code,
                        airportName: first?.da?.name,
                        terminal: first?.da?.terminal,
                        time: this.getTime(first?.dt),
                        date: fromDate.date,
                        day: fromDate.day
                    },
                    to: {
                        city: last?.aa?.city,
                        airportCode: last?.aa?.code,
                        airportName: last?.aa?.name,
                        terminal: last?.aa?.terminal,
                        time: this.getTime(last?.at),
                        date: toDate.date,
                        day: toDate.day
                    },
                    stops: Math.max(segments.length - 1, 0),
                    duration: this.formatDuration(
                        segments.reduce(
                            (sum: number, seg: any) => sum + (seg.duration || 0),
                            0
                        )
                    ),
                    cheapestFare: {
                        price: cheapestFare?.fd?.ADULT?.fC?.TF || 0,
                        cabinClass: cheapestFare?.fd?.ADULT?.cc || "UNKNOWN",
                        fareName: cheapestFare?.fareIdentifier || "UNKNOWN"
                    },
                    allFares: allFares,
                    fareSummary: {
                        totalFares: allFares.length,
                        fareNames: allFares.map((f: any) => f.fareName),
                        priceRange: {
                            min: Math.min(...allFares.map((f: any) => f.totalPrice)),
                            max: Math.max(...allFares.map((f: any) => f.totalPrice))
                        }
                    }
                };

                if (cheapestFare?.fd?.ADULT?.fC?.originalTF && envConfig.PLATFORM_MARKUP.ENABLED) {
                    flightData.original_price = cheapestFare.fd.ADULT.fC.originalTF;
                    flightData.markup = cheapestFare.fd.ADULT.fC.markup;
                }

                return flightData;
            })
        };
    }

    private static buildAirlineStats(flights: any[]) {
        const airlineMap: Record<string, { name: string; code: string; count: number }> = {};

        flights.forEach((flight: any) => {
            if (!flight?.airline) return;

            const airlineName = flight.airline;
            const airlineCode = flight.airlineCode || '';

            if (!airlineMap[airlineName]) {
                airlineMap[airlineName] = {
                    name: airlineName,
                    code: airlineCode,
                    count: 0
                };
            }
            airlineMap[airlineName].count += 1;
        });

        return Object.values(airlineMap)
            .map(({ name, code, count }) => ({
                airline: name,
                airlineCode: code,
                flights: count
            }))
            .sort((a, b) => b.flights - a.flights);
    }
}