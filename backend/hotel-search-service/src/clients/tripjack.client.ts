import axios from "axios";
import { env } from "../config/env";

/**
 * A request TripJack refused. Distinct from a transport error so callers can
 * tell "the supplier said no" apart from "the network dropped".
 */
export class TripJackRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripJackRejectedError";
  }
}

/**
 * TripJack reports failures as HTTP 200 with an error body, so a rejected
 * request arrives looking exactly like a successful one that found nothing.
 * Read fields off a response without this and an invalid key, an expired key or
 * a rate-limit renders as "no hotels in this destination" — indistinguishable
 * from genuinely empty inventory, and silent.
 *
 * That is not hypothetical: it is how the hotel sync came to log "Sync complete."
 * over an empty database. Every TripJack response must pass through here BEFORE
 * anything is read from it — including responses that get cached, where a single
 * error body would otherwise be served for the whole TTL.
 */
export function assertTripJackOk(data: any, context: string): void {
  if (data?.status?.success === false) {
    const err = data.errors?.[0];
    throw new TripJackRejectedError(
      `TripJack rejected ${context} (${err?.errCode ?? data.status?.httpStatus ?? "no code"}): ` +
        `${err?.message ?? "unknown error"}`,
    );
  }
}

export const tripJackClient = axios.create({
  baseURL: env.tripJack.baseUrl,
  // Aligned with the 15s partial-return window in hotels.service: a supplier
  // call that outlives the window is abandoned there, and this stops the
  // underlying request from lingering long after. Configurable via env.
  timeout: Number(process.env.TJ_SEARCH_TIMEOUT_MS || 20000),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: env.tripJack.apiKey,
    apiKey: env.tripJack.apiKey,
    key: env.tripJack.apiKey,
    "x-api-key": env.tripJack.apiKey,
    Authorization: env.tripJack.apiKey,
    agencyId: env.tripJack.agencyId,
    agencyid: env.tripJack.agencyId,
    AgencyId: env.tripJack.agencyId,
    "Accept-Encoding": "gzip",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});
