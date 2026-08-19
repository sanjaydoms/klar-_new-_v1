/**
 * Provider routing, resolved from integration-service.
 *
 * WHY A SNAPSHOT AND NOT AN AWAIT
 * -------------------------------
 * Same reason as markup-config.ts next door: the decision is read on the
 * search hot path, and it is global rather than per-request. One background
 * refresh on a timer, every reader downstream sees a consistent snapshot.
 * A search must never wait on an admin-plane service to find out who to call.
 *
 * FAILURE SEMANTICS
 * -----------------
 * This value decides whether KLAR sells anything at all, so it degrades
 * towards SELLING, never towards silence:
 *
 *   fresh snapshot  ->  STALE snapshot  ->  HOTEL_PROVIDER_MODE (today's behaviour)
 *
 * The stale step is the important one. An admin disables RateGain, the
 * snapshot records it, and then integration-service falls over — the kill
 * switch must stay killed. Holding the last known good answer indefinitely is
 * what makes that true; expiring to "everything on" would quietly resurrect a
 * supplier somebody switched off for a reason.
 *
 * The env fallback applies only when this process has NEVER had an answer.
 * That is a cold start with the admin plane down, and behaving exactly as the
 * service did before this file existed is the right thing to do.
 *
 * WHAT THIS FILE DOES NOT DO
 * --------------------------
 * It does not call suppliers and it does not know what a supplier is. It
 * returns the adapter codes the existing supplierRegistry already speaks, and
 * the registry keeps making every actual decision about how to call them.
 */

import axios from "axios";

import * as breaker from "./breaker";
import { env } from "./env";

/** One provider the router says may serve an operation, in priority order. */
interface ResolvedProvider {
  slug: string;
  code: string;
  priority: number;
  /** Which supplier account this provider is pointed at, for telemetry labels. */
  environment: string;
}

interface RoutingDecision {
  service: string;
  operation: string;
  /**
   * False means nobody has configured this operation — fall back to local
   * behaviour. It is NOT the same as an empty provider list, which means an
   * admin deliberately left nothing routable. Treating the two alike would
   * either ignore a kill switch or black out an unconfigured operation.
   */
  configured: boolean;
  failoverEnabled: boolean;
  providers: ResolvedProvider[];
  excluded: { slug: string; reason: string }[];
  mutating: boolean;
}

const TTL_MS = Number(process.env.INTEGRATION_CONFIG_TTL_MS || 15_000);
const TIMEOUT_MS = Number(process.env.INTEGRATION_CONFIG_TIMEOUT_MS || 3_000);

/** Keyed "SERVICE:OPERATION". Empty until the first successful fetch. */
let snapshot = new Map<string, RoutingDecision>();
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;
/** Logged once per outage rather than per search. */
let warnedThisOutage = false;

const key = (service: string, operation: string) => `${service}:${operation}`;

async function fetchRouting(): Promise<void> {
  const internalKey = process.env.INTERNAL_SERVICE_KEY;

  if (!internalKey) {
    // Without the shared secret the routing endpoint is unreachable, and env
    // behaviour is the intended result — not worth a log line per search.
    return;
  }

  const res = await axios.get(`${env.integrationServiceUrl}/internal/routing`, {
    headers: { "x-internal-key": internalKey },
    timeout: TIMEOUT_MS,
  });

  if (!res.data?.success || !Array.isArray(res.data.data)) {
    throw new Error("routing returned an unexpected shape");
  }

  const next = new Map<string, RoutingDecision>();
  for (const d of res.data.data as RoutingDecision[]) {
    next.set(key(d.service, d.operation), d);
  }

  // The breaker runs in this process but its numbers are admin-owned, and they
  // arrive on the snapshot this client already polls rather than needing a
  // second fetch on a second timer.
  if (res.data.breaker) breaker.configure(res.data.breaker);

  // Swapped whole, never mutated in place: a search reading mid-update would
  // otherwise see half of one configuration and half of another.
  snapshot = next;
  fetchedAt = Date.now();
  warnedThisOutage = false;
}

/**
 * Refresh if stale. Never throws — a routing fetch must not be able to fail a
 * search, which is the whole reason the snapshot exists.
 */
export async function refreshRouting(): Promise<void> {
  if (fetchedAt > 0 && Date.now() - fetchedAt < TTL_MS) return;

  if (!inFlight) {
    inFlight = fetchRouting()
      .catch((err: any) => {
        // Do NOT advance fetchedAt: the next search retries rather than
        // caching the failure for a full TTL.
        if (!warnedThisOutage) {
          warnedThisOutage = true;
          console.warn(
            `[integration-config] routing fetch failed, serving ${
              snapshot.size ? "the last known good snapshot" : "HOTEL_PROVIDER_MODE"
            }: ${err?.message ?? err}`,
          );
        }
      })
      .finally(() => {
        inFlight = null;
      });
  }

  await inFlight;
}

/**
 * Which adapter codes may serve this operation, primary first.
 *
 * `null` means "no opinion" — this process has never had an answer, so the
 * caller should do whatever it did before. Any array, INCLUDING an empty one,
 * is an answer and must be obeyed.
 */
export function routableCodes(service: string, operation: string): string[] | null {
  const decision = snapshot.get(key(service, operation));
  if (!decision || !decision.configured) return null;
  return decision.providers
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((p) => p.code);
}

/** The full decision, for callers that need failover policy or exclusions. */
export function routingFor(service: string, operation: string): RoutingDecision | null {
  return snapshot.get(key(service, operation)) ?? null;
}

/** Test seam — drops the snapshot back to "no opinion". */
export function __resetRoutingForTests(): void {
  snapshot = new Map();
  fetchedAt = 0;
  inFlight = null;
  warnedThisOutage = false;
}
