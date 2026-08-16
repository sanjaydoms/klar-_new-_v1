/**
 * Asserts the search normalizers forward the terminal and aircraft type that
 * TripJack sends. Both were dropped: `terminal` existed only in the
 * transformWithAllFares (PDF) paths, and `fD.eT` was mapped nowhere at all.
 *
 * There is no test runner in this service; run this directly:
 *
 *   cd flight-service
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node10","ignoreDeprecations":"6.0"}' \
 *     npx ts-node local-dev/normalizerFields.check.ts
 */
import assert from "assert";
import { OneWayNormalizer } from "../src/normalizers/oneway.normalizer";
import { ReturnNormalizer } from "../src/normalizers/return.normalizer";
import { MultiCityNormalizer } from "../src/normalizers/multicity.normalizer";
import { BaseFlightNormalizer } from "../src/normalizers/baseFlight.normalizer";

const seg = (over: any = {}) => ({
    da: { code: "DEL", city: "Delhi", name: "Indira Gandhi Intl", terminal: "3" },
    aa: { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji", terminal: "2" },
    dt: "2026-09-20T06:00",
    at: "2026-09-20T08:10",
    duration: 130,
    fD: { aI: { code: "AI", name: "Air India" }, fN: "815", eT: "320" },
    ...over,
});

const fare = {
    id: "F1",
    fareIdentifier: "PUBLISHED",
    fd: {
        ADULT: {
            cc: "ECONOMY",
            fC: { TF: 5000, BF: 4000, TAF: 1000, NF: 5000 },
            rT: 1,
            sR: 5,
            bI: { iB: "15 Kg", cB: "7 Kg" },
        },
    },
};

/** A connection: two segments, two different aircraft, second leg from T1. */
const connection = [
    seg(),
    seg({
        da: { code: "BOM", city: "Mumbai", terminal: "1" },
        aa: { code: "GOI", city: "Goa", terminal: "" },
        dt: "2026-09-20T09:30",
        at: "2026-09-20T10:40",
        fD: { aI: { code: "AI", name: "Air India" }, fN: "662", eT: "738" },
    }),
];

const trip = (segments: any[]) => ({ sI: segments, totalPriceList: [fare] });
const raw = (tripInfos: any) => ({ data: { searchResult: { tripInfos } } });

// --- the helper itself -------------------------------------------------
assert.deepStrictEqual(BaseFlightNormalizer.getAircraftTypes(connection), ["320", "738"]);
// Absent supplier data must not become a placeholder.
assert.deepStrictEqual(
    BaseFlightNormalizer.getAircraftTypes([seg({ fD: { aI: { code: "AI" }, fN: "1" } })]),
    []
);
assert.deepStrictEqual(BaseFlightNormalizer.getAircraftTypes([]), []);

// --- oneway ------------------------------------------------------------
const oneway: any = OneWayNormalizer.transform(raw({ ONWARD: [trip([seg()])] }));
const ow = oneway.flights[0];
assert.strictEqual(ow.from.terminal, "3", "oneway departure terminal");
assert.strictEqual(ow.to.terminal, "2", "oneway arrival terminal");
assert.deepStrictEqual(ow.aircraftTypes, ["320"], "oneway aircraft");

// A connection reports the terminals of the journey's ends, and one aircraft
// per leg — never one aircraft standing for the whole trip.
const owConn: any = OneWayNormalizer.transform(raw({ ONWARD: [trip(connection)] }));
assert.strictEqual(owConn.flights[0].from.terminal, "3");
assert.strictEqual(owConn.flights[0].to.terminal, "");
assert.deepStrictEqual(owConn.flights[0].aircraftTypes, ["320", "738"]);

// --- return: domestic legs and the international COMBO ------------------
const ret: any = ReturnNormalizer.transform(
    raw({ ONWARD: [trip([seg()])], RETURN: [trip([seg()])] })
);
assert.strictEqual(ret.onward[0].from.terminal, "3", "return onward terminal");
assert.deepStrictEqual(ret.onward[0].aircraftTypes, ["320"], "return onward aircraft");
assert.strictEqual(ret.return[0].to.terminal, "2", "return inbound terminal");
assert.deepStrictEqual(ret.return[0].aircraftTypes, ["320"], "return inbound aircraft");

const combo: any = ReturnNormalizer.transform(
    raw({ COMBO: [{ sI: [seg(), seg({ isRs: true })], totalPriceList: [fare] }] })
);
assert.strictEqual(combo.roundTrips[0].onward.from.terminal, "3", "combo onward terminal");
assert.deepStrictEqual(combo.roundTrips[0].onward.aircraftTypes, ["320"], "combo aircraft");

// --- multicity: domestic legs and the international itinerary ----------
const multi: any = MultiCityNormalizer.normalize({
    searchResult: { tripInfos: { 0: [trip([seg()])], 1: [trip([seg()])] } },
});
const leg0 = multi.flights[0].flights[0];
assert.strictEqual(leg0.from.terminal, "3", "multicity leg terminal");
assert.deepStrictEqual(leg0.aircraftTypes, ["320"], "multicity leg aircraft");

const multiCombo: any = MultiCityNormalizer.normalize({
    searchResult: { tripInfos: { COMBO: [trip(connection)] } },
});
const itinLeg = multiCombo.flights[0].legs[0];
assert.ok(itinLeg.from.terminal !== undefined, "multicity combo leg carries a terminal");
assert.ok(itinLeg.aircraftTypes.length > 0, "multicity combo leg carries aircraft");

console.log("OK — terminal and aircraftTypes survive all four live search mappers");
