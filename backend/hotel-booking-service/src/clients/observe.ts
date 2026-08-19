import { AxiosInstance } from "axios";

import {
  classifyError,
  providerSlugFor,
  recordCall,
} from "../config/telemetry";
import { currentContext, newRequestId } from "../utils/observability";

/**
 * Measure every call an axios instance makes.
 *
 * ONE seam per supplier client, rather than an edit at each of the dozen
 * places that call a provider. Every request through these instances is timed
 * and reported, including the ones somebody adds next year without reading
 * this comment — which is the point.
 *
 * The operation comes from the request context the route established, so this
 * knows a commit from a cancel without the client learning anything about
 * booking.
 */
export const observe = (client: AxiosInstance, providerCode: string): AxiosInstance => {
  client.interceptors.request.use((config) => {
    (config as any).__startedAt = Date.now();
    return config;
  });

  const report = (config: any, outcome: any, extra: Record<string, unknown> = {}) => {
    const context = currentContext();
    // No context means this call came from outside a route the service labels
    // — a worker, or a path nobody has instrumented. Counting it under the
    // wrong operation would be worse than not counting it.
    if (!context) return;

    recordCall({
      providerSlug: providerSlugFor(providerCode),
      service: "HOTEL",
      operation: context.operation,
      environment: process.env.SUPPLIER_ENVIRONMENT || "test",
      outcome,
      durationMs: Date.now() - (config?.__startedAt ?? Date.now()),
      correlationId: context.correlationId,
      requestId: newRequestId(providerCode),
      // The URL PATH only — never the query string, which can carry
      // identifiers, and never the body, which carries the guest.
      summary: { path: String(config?.url ?? "").split("?")[0] },
      ...extra,
    });
  };

  client.interceptors.response.use(
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

  return client;
};
