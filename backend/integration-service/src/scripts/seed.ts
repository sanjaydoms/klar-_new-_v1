/**
 * Seeds the two suppliers KLAR already runs on, plus the routing rules that
 * describe how traffic flows today.
 *
 *   npm run seed            (idempotent — safe to re-run)
 *
 * Capabilities here are not aspirational: every operation marked `supported`
 * has a real implementation in the existing services, and every one marked
 * unsupported has none. The evidence is cited per provider below, because a
 * capability matrix that quietly overstates a supplier is worse than no matrix
 * at all — the router would send it traffic it cannot serve.
 *
 * These two are seeded ACTIVE. That is not a contradiction of §52's
 * "new providers stay inert until activated": these are not new. They serve
 * production traffic right now, and a seed that recorded them as disabled
 * would describe a system that does not exist.
 */
import mongoose from "mongoose";

import { connectDB } from "../config/db.config";
import { Provider } from "../models/Provider.model";
import { RoutingRule } from "../models/RoutingRule.model";

/** Every operation a service has, with only the listed ones supported. */
const ops = (all: readonly string[], supported: readonly string[]) =>
  all.map((operation) => ({
    operation,
    supported: supported.includes(operation),
    // Supported operations start enabled: they are already being used.
    enabled: supported.includes(operation),
  }));

const HOTEL_OPS = [
  "AUTH",
  "SEARCH",
  "DETAILS",
  "AVAILABILITY",
  "BOOKING",
  "CANCELLATION",
  "MODIFICATION",
  "BOOKING_STATUS",
] as const;

const FLIGHT_OPS = [
  "AUTH",
  "SEARCH",
  "PRICING",
  "BOOKING",
  "CANCELLATION",
  "BOOKING_STATUS",
] as const;

const env = (key: string) => process.env[key] || "";

const providers = [
  {
    slug: "tripjack",
    code: "TJ",
    name: "TripJack",
    types: ["FLIGHT", "HOTEL"],
    description: "Flight and hotel aggregator. KLAR's incumbent supplier for both.",
    /**
     * Hotels — hotel-search-service/src/suppliers/tripjack (search, products)
     * and hotel-booking-service/src/providers/tripjack.api.provider.ts:
     * precheck, commit, confirmBook, getBookingDetails, cancel, getAmendCharges,
     * amend. Every hotel operation has an implementation.
     *
     * Flights — flight-service/src/services: search, review (pricing), booking,
     * cancellation, update (status).
     */
    services: [
      { service: "HOTEL", enabled: true, operations: ops(HOTEL_OPS, HOTEL_OPS) },
      { service: "FLIGHT", enabled: true, operations: ops(FLIGHT_OPS, FLIGHT_OPS) },
    ],
    /**
     * Three hosts, not one — this is what the live .env files actually hold:
     * flights on apitest.tripjack.com, hotels on apitest-hms, order management
     * on apitest-oms. Modelled as credential fields because the split is
     * TripJack's, not a shape every provider shares.
     */
    credentialSchema: [
      { key: "BASE_URL", label: "Flight API Base URL", type: "url", required: true },
      {
        key: "HOTEL_BASE_URL",
        label: "Hotel API Base URL",
        type: "url",
        required: false,
        helpText: "Hotel search and booking. Separate host from flights.",
      },
      {
        key: "OMS_BASE_URL",
        label: "Order Management Base URL",
        type: "url",
        required: false,
        helpText: "Booking status and amendments.",
      },
      { key: "API_KEY", label: "API Key", type: "secret", required: true },
      { key: "AGENCY_ID", label: "Agency ID", type: "text", required: false },
      { key: "IMAGE_BASE", label: "Image Base URL", type: "url", required: false },
    ],
    /**
     * Header names taken from the live clients (hotel-search-service's
     * clients/tripjack.client.ts), not from the documentation — which has
     * diverged from the live API every time it mattered. The path is left at
     * the base URL because no health endpoint has been verified against UAT;
     * that is metadata, so tightening it later needs no code change.
     */
    connectionTest: {
      method: "GET" as const,
      path: "",
      headers: { apikey: "{{API_KEY}}", agencyId: "{{AGENCY_ID}}" },
    },
    baseUrls: {
      production: env("TRIPJACK_PROD_BASE_URL"),
      test: env("TRIPJACK_TEST_BASE_URL") || env("TRIPJACK_BASE_URL"),
    },
  },
  {
    slug: "rategain",
    code: "RG",
    name: "RateGain",
    types: ["HOTEL"],
    description: "Hotel-only aggregator. Second source for hotel inventory.",
    /**
     * hotel-search-service/src/suppliers/rategain (search, products) and
     * hotel-booking-service/src/providers/rategain.api.provider.ts: precheck,
     * commit, cancel, getReservationDetails.
     *
     * There is NO amend method — modification is genuinely unsupported, which
     * is why §10's matrix shows it as the one capability the two suppliers do
     * not share. Routing must never offer RateGain for it.
     */
    services: [
      {
        service: "HOTEL",
        enabled: true,
        operations: ops(HOTEL_OPS, [
          "AUTH",
          "SEARCH",
          "DETAILS",
          "AVAILABILITY",
          "BOOKING",
          "CANCELLATION",
          "BOOKING_STATUS",
        ]),
      },
    ],
    credentialSchema: [
      { key: "BASE_URL", label: "Base URL", type: "url", required: true },
      { key: "API_KEY", label: "API Key", type: "secret", required: true },
      { key: "SECRET_KEY", label: "Secret Key", type: "secret", required: true },
    ],
    /** Header names from hotel-search-service's clients/rategain.client.ts. */
    connectionTest: {
      method: "GET" as const,
      path: "",
      headers: { ApiKey: "{{API_KEY}}", ApiSecret: "{{SECRET_KEY}}" },
    },
    baseUrls: {
      production: "",
      test: env("RATEGAIN_BASE_URL"),
    },
  },
] as const;

/**
 * Today's routing, stated plainly.
 *
 * Search fans out to both suppliers and merges (that is what the existing
 * hotel-search-service does), so both are listed with failover on — for search
 * "failover" costs a retry and nothing else.
 *
 * Booking, cancellation and modification list ONE provider each with failover
 * OFF. A hotel booking is held against a specific supplier's rate; there is no
 * such thing as failing it over to a different supplier mid-transaction, and
 * §21 is explicit that a timed-out booking must never be blindly reissued
 * elsewhere. Turning it on later is a decision, not a default.
 */
const routing = [
  { service: "HOTEL", operation: "SEARCH", failoverEnabled: true, providers: ["rategain", "tripjack"] },
  { service: "HOTEL", operation: "DETAILS", failoverEnabled: true, providers: ["rategain", "tripjack"] },
  { service: "HOTEL", operation: "AVAILABILITY", failoverEnabled: false, providers: ["rategain", "tripjack"] },
  { service: "HOTEL", operation: "BOOKING", failoverEnabled: false, providers: ["tripjack", "rategain"] },
  { service: "HOTEL", operation: "CANCELLATION", failoverEnabled: false, providers: ["tripjack", "rategain"] },
  { service: "HOTEL", operation: "MODIFICATION", failoverEnabled: false, providers: ["tripjack"] },
  { service: "HOTEL", operation: "BOOKING_STATUS", failoverEnabled: false, providers: ["tripjack", "rategain"] },

  { service: "FLIGHT", operation: "SEARCH", failoverEnabled: false, providers: ["tripjack"] },
  { service: "FLIGHT", operation: "PRICING", failoverEnabled: false, providers: ["tripjack"] },
  { service: "FLIGHT", operation: "BOOKING", failoverEnabled: false, providers: ["tripjack"] },
  { service: "FLIGHT", operation: "CANCELLATION", failoverEnabled: false, providers: ["tripjack"] },
  { service: "FLIGHT", operation: "BOOKING_STATUS", failoverEnabled: false, providers: ["tripjack"] },
] as const;

const seed = async (): Promise<void> => {
  await connectDB();

  for (const p of providers) {

    await Provider.findOneAndUpdate(
      { slug: p.slug },
      {
        $set: {
          code: p.code,
          name: p.name,
          types: p.types,
          description: p.description,
          services: p.services,
          credentialSchema: p.credentialSchema,
          connectionTest: p.connectionTest,
          "environments.production.baseUrl": p.baseUrls.production,
          "environments.test.baseUrl": p.baseUrls.test,
        },
        // Only on insert: never stamp over an admin's later choices by re-seeding.
        $setOnInsert: {
          slug: p.slug,
          status: "ACTIVE",
          statusReason: "Seeded — already serving traffic before the control center existed.",
          statusChangedAt: new Date(),
          statusChangedBy: "system:seed",
          activeEnvironment: "test",
          activatedAt: new Date(),
          // Enabled because these suppliers ARE being called today. The base
          // URL here may be blank: until credentials are migrated, each
          // consuming service still holds its own supplier configuration, so an
          // empty field means "not migrated yet", not "unreachable". Inferring
          // disabled from it would black out a search the moment this service
          // came up.
          "environments.test.enabled": true,
          "environments.production.enabled": true,
        },
      },
      { upsert: true },
    );

    const migrated = p.baseUrls.test || p.baseUrls.production;
    console.log(
      `  provider  ${p.slug}${migrated ? "" : "  (base URL still held by the consuming service)"}`,
    );
  }

  for (const r of routing) {
    await RoutingRule.findOneAndUpdate(
      { service: r.service, operation: r.operation },
      {
        $setOnInsert: {
          service: r.service,
          operation: r.operation,
          failoverEnabled: r.failoverEnabled,
          providers: r.providers.map((providerSlug, i) => ({
            providerSlug,
            priority: i + 1,
            enabled: true,
          })),
          updatedBy: "system:seed",
        },
      },
      { upsert: true },
    );
    console.log(`  routing   ${r.service}/${r.operation} -> ${r.providers.join(", ")}`);
  }

  await mongoose.disconnect();
  console.log("\nSeed complete.");
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
