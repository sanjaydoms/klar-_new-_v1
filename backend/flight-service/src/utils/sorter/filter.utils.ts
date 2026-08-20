import { Filter, FilterStats } from '../../types/filter.types';
import { FlightSegment } from '../../types/returnFilter.types';
import { timeToMinutes, durationToMinutes } from './time.utils';

export class FlightFilter {

    /**
     * Apply filters to return flights (onward and return arrays)
     */
    static applyFiltersToReturnFlights(
        flights: { onward: FlightSegment[]; return: FlightSegment[] },
        filters: Filter[],
        applyTo: 'onward' | 'return' | 'both' = 'both'
    ): { onward: FlightSegment[]; return: FlightSegment[] } {

        if (!filters || filters.length === 0) {
            return {
                onward: [...flights.onward],
                return: [...flights.return]
            };
        }

        const result = {
            onward: [...flights.onward],
            return: [...flights.return]
        };

        if (applyTo === 'onward' || applyTo === 'both') {
            result.onward = this.applyFilters(result.onward, filters);
        }

        if (applyTo === 'return' || applyTo === 'both') {
            result.return = this.applyFilters(result.return, filters);
        }

        return result;
    }

    /**
     * Apply filters to a single array of flights
     */
    static applyFilters(flights: FlightSegment[], filters: Filter[]): FlightSegment[] {
        if (!filters || filters.length === 0) {
            return [...flights];
        }

        return flights.filter(flight => {
            return filters.every(filter => this.applyFilter(flight, filter));
        });
    }

    /**
     * Apply a single filter to a flight
     */
    private static applyFilter(flight: FlightSegment, filter: Filter): boolean {
        switch (filter.type) {
            case 'airline':
                return this.filterByAirline(flight, filter.values);
            case 'cabinClass':
                return this.filterByCabinClass(flight, filter.values);
            case 'stops':
                return this.filterByStops(flight, filter.values);
            case 'priceRange':
                return this.filterByPriceRange(flight, filter.min, filter.max);
            case 'departureTimeRange':
                return this.filterByDepartureTimeRange(flight, filter.start, filter.end);
            case 'arrivalTimeRange':
                return this.filterByArrivalTimeRange(flight, filter.start, filter.end);
            case 'durationRange':
                return this.filterByDurationRange(flight, filter.min, filter.max);
            case 'refundable':
                return this.filterByRefundable(flight, filter.values);
            case 'fareType':
                return this.filterByFareType(flight, filter.values);
            default:
                return true;
        }
    }

    /**
     * Filter by airline (include only selected airlines)
     */
    private static filterByAirline(flight: FlightSegment, airlines: string[]): boolean {
        if (!airlines || airlines.length === 0) return true;
        return airlines.includes(flight.airline);
    }

    /**
     * Filter by cabin class
     */
    private static filterByCabinClass(flight: FlightSegment, cabinClasses: string[]): boolean {
        if (!cabinClasses || cabinClasses.length === 0) return true;
        return cabinClasses.includes(flight.cabinClass);
    }

    /**
     * Filter by number of stops
     */
    private static filterByStops(flight: FlightSegment, stops: number[]): boolean {
        if (!stops || stops.length === 0) return true;

        return stops.some(stop => {
            if (stop === 2) {
                return flight.stops >= 2;
            }

            return flight.stops === stop;
        });
    }

    /**
     * Filter by price range
     */
    private static filterByPriceRange(flight: FlightSegment, min: number, max: number): boolean {
        return flight.price >= min && flight.price <= max;
    }

    /**
     * Filter by departure time range.
     *
     * Whether the flight lands the next day, or three days later, does not
     * change what time it departs — so no day offset is consulted here. An
     * earlier version branched on `isNextDay`/`isMultiDay` and then ran the same
     * comparison in both branches; the offset was never actually needed.
     */
    private static filterByDepartureTimeRange(flight: FlightSegment, start: string, end: string): boolean {
        return this.isTimeInRange(flight.from.time, start, end);
    }

    /**
     * Filter by arrival time range.
     *
     * Arrival is matched on time of day, so a red-eye landing at 06:00 matches a
     * 05:00–07:00 window whichever calendar day it lands on. Same as above: no
     * day offset is involved.
     */
    private static filterByArrivalTimeRange(flight: FlightSegment, start: string, end: string): boolean {
        return this.isTimeInRange(flight.to.time, start, end);
    }

    /**
     * Is a time of day within [start, end]?
     *
     * A window whose start is after its end wraps past midnight — 22:00–06:00 is
     * "late evening or early morning", not an empty range.
     *
     * The two unreadable cases get opposite answers, deliberately:
     *
     *  - **An unreadable window is not a filter.** One malformed query parameter
     *    would otherwise exclude every flight and return an empty result set that
     *    looks exactly like "nothing flies that day". Matching the convention the
     *    airline and cabin filters already use, a criterion that says nothing
     *    keeps everything.
     *  - **An unreadable time on a flight excludes that flight**, because it
     *    cannot be shown to fall inside the window the customer asked for — but
     *    it is logged, which is the part that was missing. It used to drop out
     *    through `NaN` comparing false against everything, silently.
     */
    private static isTimeInRange(time: string, start: string, end: string): boolean {
        const startTime = timeToMinutes(start);
        const endTime = timeToMinutes(end);
        if (startTime === null || endTime === null) {
            console.warn(
                `[FlightFilter] unreadable time window ${JSON.stringify(start)}-${JSON.stringify(end)}; not filtering on it`
            );
            return true;
        }

        const flightTime = timeToMinutes(time);
        if (flightTime === null) {
            console.warn(`[FlightFilter] unreadable time ${JSON.stringify(time)} on a flight; excluded from the time filter`);
            return false;
        }

        if (startTime <= endTime) {
            return flightTime >= startTime && flightTime <= endTime;
        }
        return flightTime >= startTime || flightTime <= endTime;
    }

    /**
     * Filter by duration range (in minutes).
     *
     * An unreadable duration excludes the flight, the same call the time filter
     * makes and for the same reason: it cannot be shown to fall in the range the
     * customer asked for. It used to read as 0 minutes, which is inside every
     * range starting at 0 — so a broken record was silently *kept*.
     */
    private static filterByDurationRange(flight: FlightSegment, min: number, max: number): boolean {
        const durationMinutes = durationToMinutes(flight.duration);
        if (durationMinutes === null) {
            console.warn(
                `[FlightFilter] unreadable duration ${JSON.stringify(flight.duration)} on a flight; excluded from the duration filter`
            );
            return false;
        }
        return durationMinutes >= min && durationMinutes <= max;
    }

    /**
     * Match a supplier-supplied label against the selected values.
     *
     * Compared case- and whitespace-insensitively because these strings arrive
     * from the supplier untouched and are not stable in case — the same search
     * returns "15 Kg", "15 kg" and "15 KG" for baggage, so a fare type or
     * refundable label is no safer to compare with ===.
     *
     * Follows the same two rules as the time and duration filters: an empty
     * criterion keeps everything, and a flight whose own label is missing is
     * excluded, because it cannot be shown to be what the customer asked for.
     */
    private static matchesLabel(
        actual: string | undefined,
        selected: string[],
        field: string,
        flight: FlightSegment
    ): boolean {
        if (!selected || selected.length === 0) return true;

        const normalise = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

        if (actual === undefined || actual === null || actual.trim() === '') {
            console.warn(
                `[FlightFilter] missing ${field} on flight ${flight.flightKey}; excluded from the ${field} filter`
            );
            return false;
        }

        return selected.map(normalise).includes(normalise(actual));
    }

    /**
     * Filter by refundability ('Refundable' | 'Non-Refundable' | 'Unknown').
     *
     * 'Unknown' is a real value the transformer emits when the supplier omits
     * rT, so it is selectable rather than silently treated as non-refundable —
     * telling a customer a fare is non-refundable when the supplier never said
     * so is the more expensive mistake.
     */
    private static filterByRefundable(flight: FlightSegment, values: string[]): boolean {
        return this.matchesLabel(flight.refundable, values, 'refundable', flight);
    }

    /**
     * Filter by fare type (the supplier's fareIdentifier).
     */
    private static filterByFareType(flight: FlightSegment, values: string[]): boolean {
        return this.matchesLabel(flight.fareIdentifier, values, 'fareType', flight);
    }

    /**
     * Get filter statistics from flights.
     *
     * `allFlights` is the UNFILTERED result set and drives every option list and
     * range; `filteredFlights` only supplies the count. Deriving the options from
     * the filtered set instead collapses the panel the moment a filter is applied
     * — pick one airline and that airline becomes the only one on offer, so the
     * selection can never be widened or changed. Both arguments are required so
     * that mistake cannot be made by passing one array.
     */
    static getFilterStats(allFlights: FlightSegment[], filteredFlights: FlightSegment[]): FilterStats {
        const stats: FilterStats = {
            availableAirlines: [],
            availableCabinClasses: [],
            availableRefundableTypes: [],
            availableFareTypes: [],
            priceRange: { min: Infinity, max: -Infinity },
            stopsRange: { min: Infinity, max: -Infinity },
            durationRange: { min: Infinity, max: -Infinity },
            totalFlights: allFlights.length,
            filteredFlights: filteredFlights.length
        };

        const airlines = new Set<string>();
        const cabinClasses = new Set<string>();
        const refundableTypes = new Set<string>();
        const fareTypes = new Set<string>();

        allFlights.forEach(flight => {
            // Collect airlines
            airlines.add(flight.airline);

            // Collect cabin classes
            cabinClasses.add(flight.cabinClass);

            // Collect refundability and fare type. Only labels that are actually
            // present become options: offering a value no flight carries gives the
            // customer a filter that can only ever return nothing.
            if (flight.refundable) refundableTypes.add(flight.refundable);
            if (flight.fareIdentifier) fareTypes.add(flight.fareIdentifier);

            // Update price range
            stats.priceRange.min = Math.min(stats.priceRange.min, flight.price);
            stats.priceRange.max = Math.max(stats.priceRange.max, flight.price);

            // Update stops range
            stats.stopsRange.min = Math.min(stats.stopsRange.min, flight.stops);
            stats.stopsRange.max = Math.max(stats.stopsRange.max, flight.stops);

            // Update duration range. A flight whose duration cannot be read is
            // skipped rather than counted as zero — reading it as 0 pulled the
            // facet's minimum to zero and offered the customer a slider bound no
            // flight actually has.
            const duration = durationToMinutes(flight.duration);
            if (duration !== null) {
                stats.durationRange.min = Math.min(stats.durationRange.min, duration);
                stats.durationRange.max = Math.max(stats.durationRange.max, duration);
            }
        });

        stats.availableAirlines = Array.from(airlines).sort();
        stats.availableCabinClasses = Array.from(cabinClasses).sort();
        stats.availableRefundableTypes = Array.from(refundableTypes).sort();
        stats.availableFareTypes = Array.from(fareTypes).sort();

        // Reset any range nothing contributed to, so Infinity never leaves this
        // function. That is no flights at all — and now also the case where no
        // flight had a readable duration, since those are skipped above.
        if (!Number.isFinite(stats.priceRange.min)) stats.priceRange = { min: 0, max: 0 };
        if (!Number.isFinite(stats.stopsRange.min)) stats.stopsRange = { min: 0, max: 0 };
        if (!Number.isFinite(stats.durationRange.min)) stats.durationRange = { min: 0, max: 0 };

        return stats;
    }

    /**
     * Validate filters
     */
    static validateFilters(filters: Filter[]): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        filters.forEach(filter => {
            switch (filter.type) {
                case 'priceRange':
                    if (filter.min < 0) errors.push('Price minimum cannot be negative');
                    if (filter.max < filter.min) errors.push('Price maximum must be greater than or equal to minimum');
                    break;

                case 'departureTimeRange':
                case 'arrivalTimeRange':
                    if (!this.isValidTimeFormat(filter.start)) {
                        errors.push(`Invalid time format for ${filter.type}.start: ${filter.start}. Use HH:MM format`);
                    }
                    if (!this.isValidTimeFormat(filter.end)) {
                        errors.push(`Invalid time format for ${filter.type}.end: ${filter.end}. Use HH:MM format`);
                    }
                    break;

                case 'durationRange':
                    if (filter.min < 0) errors.push('Duration minimum cannot be negative');
                    if (filter.max < filter.min) errors.push('Duration maximum must be greater than or equal to minimum');
                    break;

                case 'stops':
                    if (filter.values.some(stop => stop < 0)) {
                        errors.push('Stop count cannot be negative');
                    }
                    break;

                case 'airline':
                    if (!filter.values || filter.values.length === 0) {
                        errors.push('Airlines filter must have at least one value');
                    }
                    break;

                case 'cabinClass':
                    if (!filter.values || filter.values.length === 0) {
                        errors.push('Cabin class filter must have at least one value');
                    }
                    break;

                case 'refundable':
                    if (!filter.values || filter.values.length === 0) {
                        errors.push('Refundable filter must have at least one value');
                    }
                    break;

                case 'fareType':
                    if (!filter.values || filter.values.length === 0) {
                        errors.push('Fare type filter must have at least one value');
                    }
                    break;
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate time format (HH:MM)
     */
    private static isValidTimeFormat(time: string): boolean {
        return timeToMinutes(time) !== null;
    }
}