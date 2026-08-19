import axios from "axios";

import tripjackConfig from "../config/tripjack.config";
import {
  classifyError,
  providerSlugFor,
  recordCall,
} from "../config/telemetry";
import { currentContext, newRequestId } from "./observability";

/**
 * Measure every supplier call this service makes.
 *
 * WHY THE GLOBAL AXIOS
 * --------------------
 * There is a `TripjackHttpClient` in this codebase and nothing uses it: all
 * fourteen services call the global `axios.post` directly with a full URL
 * built from TRIPJACK_URLS. Instrumenting the unused client would measure
 * nothing; migrating fourteen services to it is a refactor with real risk
 * across booking and cancellation code.
 *
 * So the interceptors go on the global instance and filter by host. One seam,
 * every call, including the ones added later by somebody who never reads this.
 *
 * ponytail: global axios interceptor filtered by host — move to a dedicated
 * client if the services are ever migrated onto one.
 *
 * FILTERING MATTERS. This service also calls auth-service, payment-service and
 * others through the same global axios. Reporting those as supplier calls
 * would put KLAR's own internal traffic into the supplier health numbers and
 * make TripJack look responsible for an outage in payments.
 */

/** Hosts that belong to the supplier, derived from the configured base URL. */
const supplierHost = (): string | null => {
  try {
    return new URL(tripjackConfig.BASE_URL).host;
  } catch {
    return null;
  }
};

const isSupplierCall = (url: string | undefined, baseURL?: string): boolean => {
  const host = supplierHost();
  if (!host || !url) return false;
  try {
    return new URL(url, baseURL || undefined).host === host;
  } catch {
    return false;
  }
};

let installed = false;

export const observeSupplierCalls = (): void => {
  // Idempotent: installing twice would double every measurement, and this is
  // the kind of call that gets added to a second entry point by accident.
  if (installed) return;
  installed = true;

  axios.interceptors.request.use((config) => {
    (config as any).__startedAt = Date.now();
    return config;
  });

  const report = (config: any, outcome: any, extra: Record<string, unknown> = {}) => {
    if (!isSupplierCall(config?.url, config?.baseURL)) return;

    const context = currentContext();
    // Outside a labelled route — a cron job, or a path nobody labelled.
    // Attributing it to the wrong operation would make the health screen blame
    // an operation that was never called.
    if (!context) return;

    let path = "";
    try {
      path = new URL(config.url, config.baseURL || undefined).pathname;
    } catch {
      path = "";
    }

    recordCall({
      providerSlug: providerSlugFor("TJ"),
      service: "FLIGHT",
      operation: context.operation,
      // What tripjack.config resolved from NODE_ENV, so the health numbers say
      // which supplier account was actually being called.
      environment: tripjackConfig.ENV === "PROD" ? "production" : "test",
      outcome,
      durationMs: Date.now() - (config?.__startedAt ?? Date.now()),
      correlationId: context.correlationId,
      requestId: newRequestId("TJ"),
      // Path only. Never the query string, never the body — a flight booking
      // body carries passenger names, dates of birth and passport numbers.
      summary: { path },
      ...extra,
    });
  };

  axios.interceptors.response.use(
    (response) => {
      report(response.config, "SUCCESS", { httpStatus: response.status });
      return response;
    },
    (error) => {
      const { outcome, reason } = classifyError(error);
      report(error?.config, outcome, {
        reason,
        httpStatus: error?.response?.status,
      });
      return Promise.reject(error);
    },
  );
};
