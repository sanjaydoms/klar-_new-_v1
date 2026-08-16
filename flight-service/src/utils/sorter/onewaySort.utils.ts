import { Flight, SortField, SortOption } from "../../types/sort.types";
import { compareTimes, compareDates, compareDurations } from "./time.utils";

export class OnewayFlightSorter {

    /**
     * Main sorting function for one-way flights
     */
    static sortFlights(flights: Flight[], sortOption: SortOption): Flight[] {

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
     * Compare by price (numeric)
     */
    private static comparePrice(a: Flight, b: Flight): number {
        return a.price - b.price;
    }

    /**
     * Compare by duration (convert "2h 30m" to minutes)
     */
    private static compareDuration(a: Flight, b: Flight): number {
        return compareDurations(a.duration, b.duration);
    }

    /**
     * Compare by departure time, falling back to the date when they match
     */
    private static compareDepartureTime(a: Flight, b: Flight): number {
        const byTime = compareTimes(a.from.time, b.from.time);
        return byTime !== 0 ? byTime : compareDates(a.from.date, b.from.date);
    }

    /**
     * Compare by arrival time, falling back to the date when they match
     */
    private static compareArrivalTime(a: Flight, b: Flight): number {
        const byTime = compareTimes(a.to.time, b.to.time);
        return byTime !== 0 ? byTime : compareDates(a.to.date, b.to.date);
    }

    /**
     * Compare by number of stops
     */
    private static compareStops(a: Flight, b: Flight): number {
        return a.stops - b.stops;
    }

    /**
     * Compare by airline name (alphabetical)
     */
    private static compareAirline(a: Flight, b: Flight): number {
        return a.airline.localeCompare(b.airline);
    }

    /**
     * Helper to validate sort option
     */
    static isValidSortField(field: string): field is SortField {
        const validFields: SortField[] = [
            'price', 'duration', 'departureTime', 'arrivalTime', 'stops', 'airline'
        ];
        return validFields.includes(field as SortField);
    }
    
}