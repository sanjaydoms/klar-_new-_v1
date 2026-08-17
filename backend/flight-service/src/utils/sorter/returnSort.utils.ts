import { FlightSegment } from "../../types/returnSort.types";
import { SortField, SortOption } from "../../types/sort.types";
import { compareTimes, compareDates, compareDurations } from "./time.utils";

export class ReturnFlightSorter {

    /**
     * Main sorting function for return flights
     */
    static sortReturnFlights(
        flights: { onward: FlightSegment[]; return: FlightSegment[] },
        sortOption: SortOption,
        applyTo: 'onward' | 'return' | 'both' = 'both'
    ): { onward: FlightSegment[]; return: FlightSegment[] } {
        
        const result = {
            onward: [...flights.onward],
            return: [...flights.return]
        };

        if (applyTo === 'onward' || applyTo === 'both') {
            result.onward = this.sortFlights(result.onward, sortOption);
        }

        if (applyTo === 'return' || applyTo === 'both') {
            result.return = this.sortFlights(result.return, sortOption);
        }

        return result;
    }

    /**
     * Sort a single array of flights
     */
    static sortFlights(flights: FlightSegment[], sortOption: SortOption): FlightSegment[] {
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
     * Compare by price
     */
    private static comparePrice(a: FlightSegment, b: FlightSegment): number {
        return a.price - b.price;
    }

    /**
     * Compare by duration
     */
    private static compareDuration(a: FlightSegment, b: FlightSegment): number {
        return compareDurations(a.duration, b.duration);
    }

    /**
     * Compare by departure time, falling back to the date when they match
     */
    private static compareDepartureTime(a: FlightSegment, b: FlightSegment): number {
        const byTime = compareTimes(a.from.time, b.from.time);
        return byTime !== 0 ? byTime : compareDates(a.from.date, b.from.date);
    }

    /**
     * Compare by arrival time, falling back to the date when they match
     */
    private static compareArrivalTime(a: FlightSegment, b: FlightSegment): number {
        const byTime = compareTimes(a.to.time, b.to.time);
        return byTime !== 0 ? byTime : compareDates(a.to.date, b.to.date);
    }

    /**
     * Compare by stops
     */
    private static compareStops(a: FlightSegment, b: FlightSegment): number {
        return a.stops - b.stops;
    }

    /**
     * Compare by airline
     */
    private static compareAirline(a: FlightSegment, b: FlightSegment): number {
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
}