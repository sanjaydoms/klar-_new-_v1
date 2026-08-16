/**
 * Read-only audit: which past vouchers stated the wrong refund terms?
 *
 * Until this was fixed, bookingVoucherPdf.service read the refundability badge
 * from `IsRefundableSegment` — the renamed `isRs`, which actually means "is
 * RETURN segment". So the badge tracked leg direction, not fare rules:
 *
 *     outbound leg (isRs=false) -> printed "Non-Refundable"
 *     return leg   (isRs=true)  -> printed "Refundable"
 *
 * The truth is per-fare, in `fd.rT` (0 non, 1 refundable, 2 partial). This
 * script recomputes both and reports where they disagree.
 *
 *   UNDERSTATED — voucher said Non-Refundable, fare was refundable.
 *                 The customer may not have claimed a refund they were owed.
 *   OVERSTATED  — voucher said Refundable, fare was not.
 *                 The customer may have expected a refund they were never due.
 *
 * Vouchers are generated on demand and emailed as attachments, never stored, so
 * nothing can be corrected in place — this identifies who to contact.
 *
 * LOCAL ONLY. Refuses to run against a non-local database or the production
 * TripJack host. Nothing is written to Mongo; TripJack is only read.
 *
 * Usage:
 *   npm run build
 *   MONGODB_URI=mongodb://127.0.0.1:27017/klar_flight_local \
 *   TRIPJACK_TEST_BASE_URL=https://apitest.tripjack.com TRIPJACK_TEST_API_KEY=... \
 *     node dist/scripts/auditVoucherRefundability.js [--limit=500] [--csv=out.csv]
 */
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";

const arg = (name: string, fallback?: string) =>
    process.argv.find((a: string) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;

const LIMIT = Number(arg("limit", "500"));
const CSV = arg("csv");
/** TripJack rate-limits (429). One booking at a time, with a pause. */
const DELAY_MS = Number(arg("delayMs", "400"));

const BASE = process.env.TRIPJACK_TEST_BASE_URL || process.env.TRIPJACK_PROD_BASE_URL;
const KEY = process.env.TRIPJACK_TEST_API_KEY || process.env.TRIPJACK_PROD_API_KEY;

type Verdict = "UNDERSTATED" | "OVERSTATED" | "INDETERMINATE" | "OK (by luck)" | "OK";

const label = (rT: number | undefined) =>
    rT === 1 ? "Refundable" : rT === 2 ? "Partially Refundable" : rT === 0 ? "Non-Refundable" : "Unknown";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * This tool exists to size a historical data problem, which makes production the
 * tempting place to point it. That is exactly what must not happen by accident,
 * so both the database and the supplier host are checked before anything opens a
 * connection.
 */
function assertLocalOnly(uri: string, base: string) {
    const localDb = /(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(uri);
    if (!localDb) {
        throw new Error(
            `Refusing to run: MONGODB_URI is not local (${uri.replace(/\/\/[^@]*@/, "//<credentials>@")}). ` +
            "This audit is local-only."
        );
    }
    if (!/apitest/.test(base)) {
        throw new Error(
            `Refusing to run: ${base} is not the TripJack UAT host. Use https://apitest.tripjack.com.`
        );
    }
}

async function main() {
    if (!BASE || !KEY) throw new Error("TripJack base URL / API key not set");
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set");

    assertLocalOnly(process.env.MONGODB_URI, BASE);

    await mongoose.connect(process.env.MONGODB_URI);
    const bookings = await mongoose.connection
        .collection("bookings")
        .find(
            { status: { $in: ["SUCCESS", "CANCELLED", "CANCEL_REQUESTED"] } },
            { projection: { bookingId: 1, email: 1, status: 1, createdAt: 1 } }
        )
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .toArray();

    console.log(`Auditing ${bookings.length} booking(s) that could have produced a voucher.\n`);

    const rows: string[] = ["bookingId,email,status,leg,isReturnLeg,voucherSaid,actual,verdict"];
    const tally: Record<Verdict, number> = {
        UNDERSTATED: 0, OVERSTATED: 0, INDETERMINATE: 0, "OK (by luck)": 0, OK: 0,
    };
    const affected = new Set<string>();
    const indeterminate = new Set<string>();
    let unreadable = 0;
    let noSegments = 0;

    for (const b of bookings) {
        let details: any;
        try {
            const res = await axios.post(
                `${BASE}/oms/v1/booking-details`,
                { bookingId: b.bookingId, requirePaxPricing: true },
                { headers: { "Content-Type": "application/json", apikey: KEY }, timeout: 20000 }
            );
            details = res.data;
        } catch {
            unreadable++;
            await sleep(DELAY_MS);
            continue;
        }

        const air = details?.itemInfos?.AIR ?? {};
        const trips = air.tripInfos ?? air.TripInformation ?? [];
        // Refundability is per fare, carried on the traveller's fare detail.
        const rT = (air.travellerInfos ?? [])[0]?.fd?.rT;

        if (!trips.length) noSegments++;

        trips.forEach((trip: any, ti: number) => {
            (trip.sI ?? []).forEach((seg: any, si: number) => {
                const isReturnLeg = seg.isRs === true;
                const voucherSaid = isReturnLeg ? "Refundable" : "Non-Refundable";
                const actual = label(rT);

                let verdict: Verdict;
                if (actual === "Unknown") {
                    // rT absent from booking-details: we cannot say what the fare
                    // allowed, so this is unresolved rather than fine. Counting it
                    // as OK would quietly shrink the reported blast radius.
                    verdict = "INDETERMINATE";
                } else if (voucherSaid === actual) {
                    verdict = "OK (by luck)";
                } else if (actual === "Non-Refundable") {
                    verdict = "OVERSTATED";
                } else {
                    verdict = "UNDERSTATED";
                }

                tally[verdict]++;
                if (verdict === "UNDERSTATED" || verdict === "OVERSTATED") affected.add(b.bookingId);
                if (verdict === "INDETERMINATE") indeterminate.add(b.bookingId);

                rows.push(
                    [b.bookingId, b.email ?? "", b.status, `${ti + 1}.${si + 1}`,
                     isReturnLeg, voucherSaid, actual, verdict].join(",")
                );
            });
        });

        await sleep(DELAY_MS);
    }

    console.log("Segments by verdict:");
    for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(14)} ${v}`);
    console.log(`\nBookings with at least one wrong badge: ${affected.size} / ${bookings.length}`);
    if (indeterminate.size)
        console.log(`Refundability could not be determined for ${indeterminate.size} booking(s) — check these by hand.`);
    if (unreadable) console.log(`Could not read booking-details for ${unreadable} booking(s).`);
    if (noSegments) console.log(`${noSegments} booking(s) returned no segments (no voucher would have rendered).`);
    if (affected.size) {
        console.log("\nAffected bookingIds:");
        console.log("  " + [...affected].join("\n  "));
    }
    if (CSV) {
        fs.writeFileSync(CSV, rows.join("\n"));
        console.log(`\nPer-segment detail written to ${CSV}`);
    }

    await mongoose.disconnect();
}

main().catch((e) => {
    console.error("audit failed:", e.message);
    process.exit(1);
});
