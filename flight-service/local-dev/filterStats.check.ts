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
import { MultiCityFlightFilter } from "../src/utils/sorter/multiFilter.utils";
import { OnewayFlightSorter } from "../src/utils/sorter/onewaySort.utils";
import { compareTimes, compareDates, dateToEpoch, durationToMinutes } from "../src/utils/sorter/time.utils";
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
    from: { city: "Delhi", airportCode: "DEL", time: depart, date: "01-Sep-26", day: "Tue" },
    to: { city: "Mumbai", airportCode: "BOM", time: "12:00", date: "01-Sep-26", day: "Tue" },
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
    to: { city: "Mumbai", airportCode: "BOM", time: "08:00", date: "02-Sep-26", day: "Wed" },
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

// ── Unreadable times ─────────────────────────────────────────────────────────
// `timeToMinutes` used to return NaN for anything it could not parse, and NaN
// compares false against everything, so both of these fell out silently and in
// the same direction: excluded, with nothing logged. They now get opposite
// answers on purpose.

// A malformed window is not a filter — it must not empty the result set.
const badWindow = FlightFilter.applyFilters(ALL, [
    { type: "departureTimeRange", start: "not-a-time", end: "10:00" },
]);
assert.strictEqual(badWindow.length, ALL.length, "an unreadable window filters nothing out");

// A malformed time on one flight excludes only that flight, and does not
// disturb the others.
const brokenTime: FlightSegment = {
    ...seg("SpiceJet", 4000, 0, "2h 00m", ""),
    from: { city: "Delhi", airportCode: "DEL", time: "", date: "01-Sep-26", day: "Tue" },
};
const withBroken = FlightFilter.applyFilters(
    [...ALL, brokenTime],
    [{ type: "departureTimeRange", start: "05:00", end: "07:00" }],
);
assert.deepStrictEqual(
    withBroken.map(f => f.airline),
    ["IndiGo"],
    "a flight with an unreadable time is excluded; the readable ones are unaffected",
);

// 24:00 and 25:61 are not times — the guard is a real parse, not a split.
assert.strictEqual(
    FlightFilter.applyFilters(ALL, [{ type: "departureTimeRange", start: "24:00", end: "25:61" }]).length,
    ALL.length,
    "out-of-range hours and minutes are rejected as a window, not silently arithmetic'd",
);

// Both filter classes agree — the multi-city panel is the same code path.
const multiBad = MultiCityFlightFilter.applyFilters(
    [seg("IndiGo", 5000, 0, "2h 10m", "06:00") as any],
    [{ type: "arrivalTimeRange", start: "bad", end: "bad" }],
);
assert.strictEqual(multiBad.length, 1, "multi-city treats an unreadable window the same way");

// ── Sorting past an unreadable time ──────────────────────────────────────────
// The sorters had the same unguarded parser, and `timeA - timeB` with a NaN
// operand returns NaN — not a valid answer to "which comes first". The spec
// leaves the result of an inconsistent comparator implementation-defined; what
// is actually observable in V8 with one bad record is that the record lands at
// an arbitrary position rather than a chosen one, splitting the sorted run.
// Both are pinned below: where the bad record goes, and that the rest stay in
// order around it.

const flight = (airline: string, depart: string, date = "01-Sep-26") => ({
    flightKey: `${airline}-${depart}`,
    airline,
    airlineCode: airline.slice(0, 2).toUpperCase(),
    flightNumber: "100",
    cabinClass: "ECONOMY",
    from: { city: "Delhi", airportCode: "DEL", time: depart, date, day: "Tue" },
    to: { city: "Mumbai", airportCode: "BOM", time: "12:00", date, day: "Tue" },
    duration: "2h 00m",
    stops: 0,
    price: 5000,
}) as any;

const sorted = OnewayFlightSorter.sortFlights(
    [flight("Late", "21:00"), flight("Broken", ""), flight("Early", "06:00"), flight("Mid", "12:30")],
    { field: "departureTime", order: "asc" },
);

// Nothing is lost, and the readable flights keep their order around the bad one.
assert.strictEqual(sorted.length, 4, "sorting drops nothing");
assert.deepStrictEqual(
    sorted.filter(f => f.airline !== "Broken").map(f => f.airline),
    ["Early", "Mid", "Late"],
    "an unreadable time does not disturb the order of everything else",
);

// ...and the unorderable record is parked at the end rather than mid-list.
assert.strictEqual(
    sorted[sorted.length - 1].airline,
    "Broken",
    "the record with no usable time sorts last",
);

// Two unreadable times are equal to each other, not indeterminate.
assert.strictEqual(compareTimes("", ""), 0, "two unreadable times compare equal");
assert.ok(compareTimes("", "06:00") > 0, "unreadable sorts after readable");
assert.ok(compareTimes("06:00", "") < 0, "and readable before unreadable");
assert.ok(!Number.isNaN(compareTimes("nope", "also-nope")), "compareTimes never returns NaN");

// ── Dates and durations ──────────────────────────────────────────────────────
// The same two failure shapes, in the two remaining parsers.

// compareDates fed `new Date(y, monthMap[m], d)` with an unvalidated month, so
// anything it did not recognise became an Invalid Date and NaN. Note "SEP":
// the old map was case-sensitive, and only "Sep" was ever a key.
assert.ok(compareDates("20-Sep-26", "21-Sep-26") < 0, "an earlier date sorts first");
assert.strictEqual(compareDates("20-Sep-26", "20-Sep-26"), 0, "the same date compares equal");
assert.ok(!Number.isNaN(compareDates("20-SEP-26", "21-Sep-26")), "a differently-cased month is not NaN");
assert.ok(compareDates("20-SEP-26", "21-Sep-26") < 0, "and is read as the date it plainly is");
assert.ok(compareDates("", "21-Sep-26") > 0, "an unreadable date sorts last");
assert.ok(!Number.isNaN(compareDates("20-Xxx-26", "nonsense")), "two unreadable dates are not NaN");
assert.strictEqual(dateToEpoch("31-Feb-26"), null, "a day the month does not have is refused, not rolled over");

// durationToMinutes returned 0 for anything unparseable, which is a real
// duration — `formatDuration` emits "0h 0m" — so a broken record read as the
// shortest flight there is.
assert.strictEqual(durationToMinutes("2h 30m"), 150, "a normal duration parses");
assert.strictEqual(durationToMinutes("0h 0m"), 0, "and a genuine zero is still zero");
assert.strictEqual(durationToMinutes("45m"), 45, "hours may be absent");
assert.strictEqual(durationToMinutes("3h"), 180, "and so may minutes");
assert.strictEqual(durationToMinutes(""), null, "but empty is unknown, not zero");
assert.strictEqual(durationToMinutes("150"), null, "and a bare number is not a duration");
assert.strictEqual(durationToMinutes(undefined as any), null, "a missing duration returns null instead of throwing");

// The distinction that was lost: unknown must not read as the shortest flight.
const shortestFirst = OnewayFlightSorter.sortFlights(
    [flight("NoDuration", "08:00"), flight("Quick", "09:00"), flight("Slow", "10:00")].map((f, i) =>
        ({ ...f, duration: ["", "1h 00m", "9h 00m"][i] })),
    { field: "duration", order: "asc" },
);
assert.strictEqual(shortestFirst[0].airline, "Quick", "a flight with no duration must not head 'shortest first'");
assert.strictEqual(shortestFirst[2].airline, "NoDuration", "it sorts last instead");

// ...and must not drag the duration facet's minimum to zero.
const durStats = FlightFilter.getFilterStats(
    [...ALL, { ...seg("Broken", 5000, 0, "", "07:00") }],
    ALL,
);
assert.deepStrictEqual(
    durStats.durationRange,
    { min: 130, max: 405 },
    "an unreadable duration is skipped, not counted as 0 minutes",
);

// Nothing readable at all still yields a usable range rather than Infinity.
const noneReadable = FlightFilter.getFilterStats([seg("Broken", 5000, 0, "", "07:00")], []);
assert.deepStrictEqual(noneReadable.durationRange, { min: 0, max: 0 }, "Infinity never escapes the stats");

console.log("OK — options and ranges survive filtering; times, dates and durations refuse unreadable input instead of reading it as NaN or zero");
