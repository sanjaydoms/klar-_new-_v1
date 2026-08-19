/**
 * Imports the supplier credentials that currently live in each service's .env
 * into the encrypted store.
 *
 *   npm run import-credentials            report what would be imported
 *   npm run import-credentials -- --write actually write it
 *
 * Dry by default. This reads real secrets off disk and writes them somewhere
 * new; doing that silently on a mistyped command is not a thing to be relaxed
 * about.
 *
 * NOTHING HERE PRINTS A SECRET. Values are reported by field name and length
 * only — a migration script that echoes credentials to a terminal has put them
 * in the scrollback, the CI log, and the screenshot somebody pastes into chat.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not change where the running services READ their credentials from.
 * They still read their own .env, exactly as before. This populates the store
 * so the control center can show what is configured and test it for real;
 * switching live supplier calls over to the store is a separate change with a
 * different risk profile, and doing both at once would mean a bad import
 * takes down search.
 *
 * ponytail: import only, services still read .env — flip them over once the
 * store has been running and correct for a while.
 */
import fs from "node:fs";
import path from "node:path";

import mongoose from "mongoose";

import { connectDB } from "../config/db.config";
import { Environment } from "../constants/status";
import { Provider } from "../models/Provider.model";
import { ProviderCredential } from "../models/ProviderCredential.model";
import { encrypt } from "../utils/crypto";

const WRITE = process.argv.includes("--write");
const BACKEND = path.resolve(__dirname, "../../..");

/** Parse a dotenv file into a map. Missing file yields an empty map. */
const readEnv = (service: string): Map<string, string> => {
  const file = path.join(BACKEND, service, ".env");
  const out = new Map<string, string>();
  if (!fs.existsSync(file)) return out;

  // Split on \r?\n — several .env files in this repo have CRLF endings, and a
  // trailing \r would become part of every value.
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const value = trimmed.slice(eq + 1).trim();
    if (value) out.set(trimmed.slice(0, eq).trim(), value);
  }
  return out;
};

const flight = readEnv("flight-service");
const hotelSearch = readEnv("hotel-search-service");
const hotelBooking = readEnv("hotel-booking-service");

/** First non-empty value among the candidates. */
const pick = (...candidates: (string | undefined)[]): string | undefined =>
  candidates.find((c) => c && c.length > 0);

/**
 * Where each provider's credentials come from, per environment.
 *
 * The hotel services carry no TEST/PROD split in their variable names — they
 * point at whichever environment the deployment targets. Their values are
 * imported as `test`, which is what the checked-in .env files actually contain
 * (apitest-hms.tripjack.com). Production hotel credentials have to be entered
 * through the UI, deliberately: guessing that a variable named TRIPJACK_API_KEY
 * is a production key would be exactly the mix-up §14 exists to prevent.
 */
const SOURCES: Record<string, Partial<Record<Environment, Record<string, string | undefined>>>> = {
  tripjack: {
    test: {
      BASE_URL: pick(flight.get("TRIPJACK_TEST_BASE_URL")),
      HOTEL_BASE_URL: pick(
        hotelSearch.get("TRIPJACK_BASE_URL"),
        hotelBooking.get("TRIPJACK_BASE_URL"),
      ),
      OMS_BASE_URL: pick(hotelBooking.get("TRIPJACK_OMS_BASE_URL")),
      API_KEY: pick(
        flight.get("TRIPJACK_TEST_API_KEY"),
        hotelSearch.get("TRIPJACK_API_KEY"),
      ),
      AGENCY_ID: pick(
        hotelSearch.get("TRIPJACK_AGENCY_ID"),
        hotelBooking.get("TRIPJACK_AGENCY_ID"),
      ),
      IMAGE_BASE: pick(hotelSearch.get("TRIPJACK_IMAGE_BASE")),
    },
    production: {
      BASE_URL: pick(flight.get("TRIPJACK_PROD_BASE_URL")),
      API_KEY: pick(flight.get("TRIPJACK_PROD_API_KEY")),
    },
  },
  rategain: {
    test: {
      BASE_URL: pick(
        hotelSearch.get("RATEGAIN_BASE_URL"),
        hotelBooking.get("RATEGAIN_BASE_URL"),
      ),
      API_KEY: pick(
        hotelSearch.get("RATEGAIN_API_KEY"),
        hotelBooking.get("RATEGAIN_API_KEY"),
      ),
      SECRET_KEY: pick(
        hotelSearch.get("RATEGAIN_SECRET_KEY"),
        hotelBooking.get("RATEGAIN_SECRET_KEY"),
      ),
    },
  },
};

const run = async (): Promise<void> => {
  await connectDB();

  if (!WRITE) {
    console.log("DRY RUN — nothing will be written. Re-run with --write.\n");
  }

  for (const [slug, environments] of Object.entries(SOURCES)) {
    const provider = await Provider.findOne({ slug });
    if (!provider) {
      console.log(`  skip      ${slug} — not registered. Run the seed first.`);
      continue;
    }

    const schema = new Map(provider.credentialSchema.map((f) => [f.key, f]));

    for (const [environment, values] of Object.entries(environments) as [
      Environment,
      Record<string, string | undefined>,
    ][]) {
      const present = Object.entries(values).filter(([, v]) => Boolean(v)) as [
        string,
        string,
      ][];

      if (!present.length) {
        console.log(`  empty     ${slug}/${environment} — nothing in the .env files`);
        continue;
      }

      // Field name and length only. Never the value.
      for (const [key, value] of present) {
        const field = schema.get(key);
        const kind = field?.type === "secret" ? "secret" : "config";
        console.log(
          `  ${WRITE ? "import" : "would"}    ${slug}/${environment}  ${key} (${kind}, ${value.length} chars)`,
        );
      }

      if (!WRITE) continue;

      const doc =
        (await ProviderCredential.findOne({ providerSlug: slug, environment })) ??
        new ProviderCredential({ providerSlug: slug, environment });

      for (const [key, value] of present) {
        const field = schema.get(key);
        if (!field) continue;
        doc.values.set(key, field.type === "secret" ? encrypt(value) : value);
      }
      doc.updatedBy = "system:import";
      await doc.save();

      const baseUrl = values.BASE_URL;
      if (baseUrl) {
        provider.environments[environment].baseUrl = baseUrl;
        await provider.save();
      }
    }
  }

  await mongoose.disconnect();
  console.log(
    WRITE
      ? "\nImported. The running services still read their own .env — this store is not yet their source."
      : "\nDry run complete. Re-run with --write to import.",
  );
};

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
