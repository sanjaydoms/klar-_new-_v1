import { MultiCityFlight, MultiCityLeg } from "../../types/multiSort.types";
import { SortField, SortOption } from "../../types/sort.types";
import { compareTimes, compareDates, compareDurations } from "./time.utils";

export class MulticityFlightSorter {

    /**
     * Sort multi-city flights
     * Can sort specific leg or all legs
     */
    static sortMultiCityFlights(
        flights: MultiCityLeg[],
        sortOption: SortOption,
        legIndex?: number
    ): MultiCityLeg[] {

        const result = flights.map(leg => ({
            ...leg,
            flights: [...leg.flights]
        }));

        if (legIndex !== undefined && result[legIndex]) {
            // Sort specific leg
            result[legIndex].flights = this.sortFlights(result[legIndex].flights, sortOption);
        } else {
            // Sort all legs
            result.forEach(leg => {
                leg.flights = this.sortFlights(leg.flights, sortOption);
            });
        }

        return result;
    }

    /**
     * Sort a single array of flights
     */
    static sortFlights(flights: MultiCityFlight[], sortOption: SortOption): MultiCityFlight[] {
        const { field, order } = sortOption;

        return [...flights].sort((a, b) => {
            let comparison = 0;

            switch (field) {
                case 'price':
                    comparison = this.comparePrice(a, b);
                    break;
                case 'duration':
                    comparison = this.compareDuration(a, b);
                    break;
                case 'departureTime':
                    comparison = this.compareDepartureTime(a, b);
                    break;
                case 'arrivalTime':
                    comparison = this.compareArrivalTime(a, b);
                    break;
                case 'stops':
                    comparison = this.compareStops(a, b);
                    break;
                case 'airline':
                    comparison = this.compareAirline(a, b);
                    break;
                default:
                    comparison = 0;
            }

            return order === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Sort specific leg only
     */
    static sortSpecificLeg(
        flights: MultiCityLeg[],
        sortOption: SortOption,
        legIndex: number
    ): MultiCityLeg[] {
        return this.sortMultiCityFlights(flights, sortOption, legIndex);
    }

    /**
     * Compare by price
     */
    private static comparePrice(a: MultiCityFlight, b: MultiCityFlight): number {
        return a.price - b.price;
    }

    /**
     * Compare by duration
     */
    private static compareDuration(a: MultiCityFlight, b: MultiCityFlight): number {
        return compareDurations(a.duration, b.duration);
    }

    /**
     * Compare by departure time, falling back to the date when they match
     */
    private static compareDepartureTime(a: MultiCityFlight, b: MultiCityFlight): number {
        const byTime = compareTimes(a.from.time, b.from.time);
        return byTime !== 0 ? byTime : compareDates(a.from.date, b.from.date);
    }

    /**
     * Compare by arrival time, falling back to the date when they match
     */
    private static compareArrivalTime(a: MultiCityFlight, b: MultiCityFlight): number {
        const byTime = compareTimes(a.to.time, b.to.time);
        return byTime !== 0 ? byTime : compareDates(a.to.date, b.to.date);
    }

    /**
     * Compare by stops
     */
    private static compareStops(a: MultiCityFlight, b: MultiCityFlight): number {
        return a.stops - b.stops;
    }

    /**
     * Compare by airline
     */
    private static compareAirline(a: MultiCityFlight, b: MultiCityFlight): number {
        return a.airline.localeCompare(b.airline);
    }

    /**
     * Validate sort field
     */
    static isValidSortField(field: string): field is SortField {
        const validFields: SortField[] = [
            'price', 'duration', 'departureTime', 'arrivalTime', 'stops', 'airline'
        ];
        return validFields.includes(field as SortField);
    }

    /**
     * Validate leg index
     */
    static isValidLegIndex(legIndex: number, totalLegs: number): boolean {
        return legIndex >= 0 && legIndex < totalLegs;
    }
}