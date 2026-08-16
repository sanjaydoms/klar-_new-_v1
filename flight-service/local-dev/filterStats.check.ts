/**
 * Asserts filter options are derived from the UNFILTERED result set.
 *
 * They were derived from the filtered one, so the panel ate itself: pick IndiGo
 * and `availableAirlines` came back `["IndiGo"]`, leaving no way to widen or
 * change the selection. Price, stops and duration ranges collapsed the same way.
 * Invisible in a response that otherwise looks right — `flights` was correct,
 * only `stats` was wrong — which is how it survived.
 *
 * There is no test runner in this service; run this directly:
 *
 *   cd flight-service
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node10","ignoreDeprecations":"6.0"}' \
 *     npx ts-node local-dev/filterStats.check.ts
 */
// Loaded explicitly: unlike the other check in here, nothing in this file's
// import graph reaches a module that already pulls in the node types.
/// <reference types="node" />
import assert from "assert";
import { FlightFilter } from "../src/utils/sorter/filter.utils";
import { Filter } from "../src/types/filter.types";
import { FlightSegment } from "../src/types/returnFilter.types";

const seg = (
    airline: string,
    price: number,
    stops: number,
    duration: string,
    depart: string,
): FlightSegment => ({
    flightKey: `${airline}-${depart}`,
    isReturn: false,
    airline,
    airlineCode: airline.slice(0, 2).toUpperCase(),
    flightNumber: "100",
    cabinClass: "ECONOMY",
    from: { city: "Delhi", airportCode: "DEL", time: depart, date: "2026-09-01", day: "Tue" },
    to: { city: "Mumbai", airportCode: "BOM", time: "12:00", date: "2026-09-01", day: "Tue" },
    duration,
    stops,
    price,
});

const ALL: FlightSegment[] = [
    seg("IndiGo", 5000, 0, "2h 10m", "06:00"),
    seg("Air India", 7500, 1, "4h 30m", "09:00"),
    seg("Vistara", 9200, 2, "6h 45m", "18:00"),
];

const airlineOnly: Filter[] = [{ type: "airline", values: ["IndiGo"] }];
const filtered = FlightFilter.applyFilters(ALL, airlineOnly);
const stats = FlightFilter.getFilterStats(ALL, filtered);

// The filter itself still narrows the results.
assert.strictEqual(filtered.length, 1, "airline filter matches exactly one flight");
assert.strictEqual(filtered[0].airline, "IndiGo", "and it is the one asked for");

// ...while the panel still offers every airline, so the user can change their mind.
assert.deepStrictEqual(
    stats.availableAirlines,
    ["Air India", "IndiGo", "Vistara"],
    "availableAirlines comes from the unfiltered set",
);

// Ranges span the whole result set, not the filtered slice.
assert.deepStrictEqual(stats.priceRange, { min: 5000, max: 9200 }, "priceRange spans the unfiltered set");
assert.deepStrictEqual(stats.stopsRange, { min: 0, max: 2 }, "stopsRange spans the unfiltered set");
assert.deepStrictEqual(stats.durationRange, { min: 130, max: 405 }, "durationRange spans the unfiltered set");

// Counts are the one thing that reflects the filter.
assert.strictEqual(stats.totalFlights, 3, "totalFlights is the unfiltered count");
assert.strictEqual(stats.filteredFlights, 1, "filteredFlights is the post-filter count");

// A zero-result filter must not blank the panel either — that is exactly when
// the user needs the options back to undo what they just picked.
const noMatch = FlightFilter.applyFilters(ALL, [{ type: "airline", values: ["Nobody Air"] }]);
const emptyStats = FlightFilter.getFilterStats(ALL, noMatch);
assert.strictEqual(emptyStats.filteredFlights, 0, "nothing matches");
assert.deepStrictEqual(
    emptyStats.availableAirlines,
    ["Air India", "IndiGo", "Vistara"],
    "a zero-result filter still offers every airline",
);
assert.deepStrictEqual(emptyStats.priceRange, { min: 5000, max: 9200 }, "and still spans the real price range");

// ── Time-of-day windows ──────────────────────────────────────────────────────
// The departure/arrival filters used to branch on whether the flight landed on a
// later date and then run the identical comparison in both branches. Removing
// that is only safe if a window still behaves the same across midnight and for a
// red-eye, so both are pinned here.

const overnight: FlightSegment = {
    ...seg("IndiGo", 6000, 0, "8h 30m", "23:30"),
    // Departs 23:30, lands 08:00 the NEXT day.
    to: { city: "Mumbai", airportCode: "BOM", time: "08:00", date: "2026-09-02", day: "Wed" },
};
const midday = seg("Vistara", 6000, 0, "2h 00m", "12:00"); // 12:00 → 12:00 same day

const inWindow = (flights: FlightSegment[], f: Filter) => FlightFilter.applyFilters(flights, f ? [f] : []);

// A plain window keeps what falls inside it and drops what does not.
assert.deepStrictEqual(
    inWindow(ALL, { type: "departureTimeRange", start: "05:00", end: "07:00" }).map(f => f.airline),
    ["IndiGo"],
    "06:00 departure falls inside 05:00-07:00",
);

// A window whose start is after its end wraps past midnight.
assert.deepStrictEqual(
    inWindow([overnight, midday], { type: "departureTimeRange", start: "22:00", end: "06:00" }).map(f => f.from.time),
    ["23:30"],
    "23:30 departure falls inside the wrapping window 22:00-06:00",
);
assert.strictEqual(
    inWindow([midday], { type: "departureTimeRange", start: "22:00", end: "06:00" }).length,
    0,
    "a midday departure does not fall inside 22:00-06:00",
);

// The red-eye: arrival is matched on time of day, regardless of landing a day later.
assert.strictEqual(
    inWindow([overnight], { type: "arrivalTimeRange", start: "07:00", end: "09:00" }).length,
    1,
    "an 08:00 next-day arrival matches a 07:00-09:00 window",
);
assert.strictEqual(
    inWindow([overnight], { type: "arrivalTimeRange", start: "12:00", end: "18:00" }).length,
    0,
    "and does not match an afternoon window",
);

console.log("OK — filter options and ranges survive an applied filter; time windows wrap and handle red-eyes");
