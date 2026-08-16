import { Request, Response } from "express";
import fs from "fs";
import path from "path";

// In-memory cache for airports
let airportsCache: any[] | null = null;

// Vendored from the `airport-codes` package, which was dropped: it pulled in
// `csv` and `lodash` (1 critical + 3 high advisories, no upstream fix) purely to
// hand us this static file. Refresh from openflights if it ever goes stale.
const AIRPORTS_PATH = path.join(process.cwd(), "data", "airports.json");

const loadAirports = () => {
    if (airportsCache) return airportsCache;

    try {
        airportsCache = JSON.parse(fs.readFileSync(AIRPORTS_PATH, "utf-8"));
    } catch (error) {
        console.error("Error loading airports:", error);
        airportsCache = [];
    }
    return airportsCache!;
};

/**
 * Lower is better. Without this the endpoint substring-matched four fields and
 * blind-sliced the first 20 in file order, so "DEL" returned Iles De La Madeleine
 * and Mindelheim while Delhi sat past the cut. Returning MISS keeps the match set
 * identical to before — only the ordering changed.
 */
const MISS = Infinity;

const rank = (a: any, q: string): number => {
    const iata = a.iata && a.iata !== "\\N" ? a.iata.toLowerCase() : "";
    const city = (a.city || "").toLowerCase();
    const name = (a.name || "").toLowerCase();
    const country = (a.country || "").toLowerCase();

    if (iata === q) return 0;
    if (city === q) return 1;
    if (iata.startsWith(q)) return 2;
    if (city.startsWith(q)) return 3;
    if (name.startsWith(q)) return 4;
    if (city.includes(q)) return 5;
    if (name.includes(q)) return 6;
    if (iata.includes(q) || country.includes(q)) return 7;
    return MISS;
};

export const searchAirportsController = (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;

        if (!query || query.trim().length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const lowerQuery = query.trim().toLowerCase();
        const airports = loadAirports();

        const filtered = airports
            .map((a: any) => ({
                a,
                score: rank(a, lowerQuery),
                // The dataset carries airfields with a blank or "\N" iata. They
                // can't be booked, so they never outrank a real code on a tie —
                // without this, "delhi" returned a codeless Delhi above DEL.
                codeless: !a.iata || a.iata === "\\N" ? 1 : 0,
            }))
            .filter((m) => m.score !== MISS)
            // sort is stable, so equal scores keep their original file order
            .sort((x, y) => x.score - y.score || x.codeless - y.codeless)
            .slice(0, 20) // Top 20 results
            .map((m) => m.a);

        return res.status(200).json({
            success: true,
            data: filtered
        });
    } catch (error: any) {
        console.error("Error in searchAirportsController:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to search airports",
            error: error.message
        });
    }
};
