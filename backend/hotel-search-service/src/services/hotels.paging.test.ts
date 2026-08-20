/**
 * Paging contract of searchHotels — the "20 of 7,226" QA bug.
 *
 * The frontend asks for another page only while `hasMore` is true; QA found it
 * coming back false/undefined on page 1, capping every search at one screen.
 * This exercises the real service (master list, extendMasterList, dedup,
 * finalizeResponse) against a stub supplier: 3 supplier pages × 20 hotels.
 *
 * Kept hermetic without mocks by construction: a FAKE:-prefixed destination is
 * a direct match for the stub supplier, which skips geocoding entirely (no
 * network, no Mongo) and excludes the real TJ/RG adapters; Redis-down already
 * degrades to the in-process L1 cache.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { supplierRegistry } from "../suppliers/registry";
import { hotelsService } from "./hotels.service";
import RedisConfig from "../config/redis.config";

// This test is about PAGING, so pin the supplier mode instead of inheriting
// whatever the deployment happens to run. Without this it broke the moment
// HOTEL_PROVIDER_MODE went to `tripjack` for the RateGain retirement: mode
// filtering applies to a direct-reference search too, so TJ_ONLY excluded the
// stub supplier and every assertion saw zero hotels.
process.env.HOTEL_PROVIDER_MODE = "UNIFIED";

const SUPPLIER_PAGES = 3;
const PER_PAGE = 20;

supplierRegistry.register({
  code: "FAKE",
  isDirectMatch: (d: string) => d.startsWith("FAKE:"),
  ownsPropertyId: () => false,
  async search(req: any) {
    const page = req.pageNo || 1;
    const hotels =
      page > SUPPLIER_PAGES
        ? []
        : Array.from({ length: PER_PAGE }, (_, i) => {
            const n = (page - 1) * PER_PAGE + i;
            return {
              hotelId: `FAKE:${n}`,
              source: "TJ",
              name: `Fake Hotel ${n}`,
              address: `${n} Test Street`,
              city: "Testville",
              country: "IN",
              starRating: 3,
              latitude: 15 + n * 0.01,
              longitude: 74 + n * 0.01,
              images: [],
              price: 1000 + n,
              currency: "INR",
              amenities: [],
            };
          });
    return {
      hotels,
      total: SUPPLIER_PAGES * PER_PAGE,
      hasMore: page < SUPPLIER_PAGES,
    };
  },
  async getProducts() {
    return {};
  },
} as any);

const payload = (pageNo: number) =>
  ({
    destination: "FAKE:paging",
    checkin: "2026-09-10",
    checkout: "2026-09-11",
    countryCode: "IN",
    currency: "INR",
    pageNo,
    providers: ["FAKE"],
    rooms: [{ adults: 2, children: 0, childAges: [] }],
  }) as any;

test("page 1 reports hasMore; page 2 serves the rest exactly once", async () => {
  const p1 = await hotelsService.searchHotels(payload(1), "B2C", null);
  // Page size defaults to 30; the blocking build fetches only 20, so serving
  // this page requires extendMasterList to pull supplier pages 2-3.
  assert.equal(p1.results.length, 30);
  assert.equal(p1.hasMore, true); // the QA bug: false/undefined here caps search at one page

  const p2 = await hotelsService.searchHotels(payload(2), "B2C", null);
  assert.equal(p2.results.length, 30);
  assert.equal(p2.hasMore, false); // suppliers dry AND master fully served

  const ids = new Set(
    [...p1.results, ...p2.results].map((h: any) => h.hotelId),
  );
  assert.equal(ids.size, SUPPLIER_PAGES * PER_PAGE); // no dupes across pages, none lost
});

after(() => {
  // ioredis retries forever; without this the test process never exits.
  RedisConfig.getInstance().disconnect();
});
