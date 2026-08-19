import { ALERT_EVENTS } from "../constants/alerts";
import { Environment } from "../constants/status";
import { ConnectionTest, IProvider, Provider } from "../models/Provider.model";
import * as credentials from "./credential.service";
import { dispatch } from "./notification.service";
import { ProviderError } from "./provider.service";

/**
 * Test Connection (§17).
 *
 * Makes a REAL request to the supplier with the REAL stored credentials. There
 * is no simulated success anywhere in this file: if the credentials are absent
 * the answer is "not configured", and if the supplier refuses the answer is the
 * refusal. A green tick that did not come from the supplier is worse than no
 * button at all, because it is the one an admin will trust during an incident.
 *
 * The request itself is described by the provider's `connectionTest` metadata,
 * so this service never learns what any particular supplier is.
 */

export type TestCategory =
  | "SUCCESS"
  | "NOT_CONFIGURED"
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "CONNECTION_FAILED"
  | "SUPPLIER_ERROR"
  | "UNEXPECTED_RESPONSE";

export interface TestResult {
  ok: boolean;
  category: TestCategory;
  /** Safe for display. Never contains a credential or a raw stack trace. */
  message: string;
  httpStatus?: number;
  durationMs: number;
  environment: Environment;
  baseUrl?: string;
  testedAt: Date;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Header names are arbitrary, so mongoose stores them as a Map — but the
 * fallback probe builds a plain object. Both shapes reach here; normalise
 * rather than assuming whichever one the last caller happened to use.
 */
const headerEntries = (
  headers: ConnectionTest["headers"],
): [string, string][] => {
  if (!headers) return [];
  if (headers instanceof Map) return Array.from(headers.entries());
  return Object.entries(headers);
};

/**
 * Fill {{KEY}} placeholders from the credentials.
 *
 * An unresolved placeholder becomes an empty string rather than being left
 * literal — sending the text "{{API_KEY}}" as an API key produces a confusing
 * 401 that looks like a bad key rather than a missing one.
 */
const render = (template: string, values: Record<string, string>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");

/**
 * The probe to send when a provider declares none: an authenticated request at
 * the base URL. It cannot confirm a specific endpoint works, but it reliably
 * separates a dead host from a rejected key, which is what the button is for.
 */
const fallbackTest = (values: Record<string, string>): ConnectionTest => ({
  method: "GET",
  path: "",
  headers: Object.fromEntries(
    Object.entries(values)
      .filter(([k]) => k !== "BASE_URL")
      .map(([k, v]) => [k, v]),
  ),
});

/**
 * Classify what came back.
 *
 * The categories exist so the UI can say something true and specific — "the
 * key was rejected" is a different job from "the host did not answer", and
 * collapsing both into "failed" sends an admin to rotate credentials that were
 * never the problem.
 */
const classify = (status: number, okStatuses: number[]): TestCategory => {
  if (okStatuses.includes(status)) return "SUCCESS";
  if (status >= 200 && status < 300) return "SUCCESS";
  if (status === 401 || status === 403) return "AUTHENTICATION_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SUPPLIER_ERROR";
  return "UNEXPECTED_RESPONSE";
};

const MESSAGES: Record<TestCategory, string> = {
  SUCCESS: "Connection successful.",
  NOT_CONFIGURED: "No credentials are configured for this environment.",
  AUTHENTICATION_FAILED: "The supplier rejected these credentials.",
  RATE_LIMITED: "The supplier is rate limiting this account.",
  TIMEOUT: "The supplier did not respond in time.",
  CONNECTION_FAILED: "Could not reach the supplier.",
  SUPPLIER_ERROR: "The supplier returned an error.",
  UNEXPECTED_RESPONSE: "The supplier answered, but not as expected.",
};

export const test = async (
  slug: string,
  environment: Environment,
): Promise<TestResult> => {
  const provider = await Provider.findOne({ slug: slug.toLowerCase() });
  if (!provider) {
    throw new ProviderError(`No provider "${slug}".`, 404, "PROVIDER_NOT_FOUND");
  }

  const startedAt = Date.now();
  const finish = (
    category: TestCategory,
    extra: Partial<TestResult> = {},
  ): TestResult => ({
    ok: category === "SUCCESS",
    category,
    message: MESSAGES[category],
    durationMs: Date.now() - startedAt,
    environment,
    baseUrl: provider.environments[environment].baseUrl || undefined,
    testedAt: new Date(),
    ...extra,
  });

  const values = await credentials.forService(provider.slug, environment);
  const baseUrl = provider.environments[environment].baseUrl || values.BASE_URL;

  // Honest state rather than a fabricated result: nothing has been configured,
  // so there is nothing to test.
  if (!baseUrl || Object.keys(values).length === 0) {
    return finish("NOT_CONFIGURED");
  }

  const spec = provider.connectionTest ?? fallbackTest(values);
  const headers: Record<string, string> = {};
  for (const [key, template] of headerEntries(spec.headers)) {
    headers[key] = render(template, values);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    spec.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${spec.path ?? ""}`, {
      method: spec.method ?? "GET",
      headers,
      body: spec.body ? render(spec.body, values) : undefined,
      signal: controller.signal,
    });

    const category = classify(res.status, spec.okStatuses ?? []);
    const result = finish(category, { httpStatus: res.status });
    await credentials.recordTest(provider.slug, environment, result.ok);

    if (category === "AUTHENTICATION_FAILED") {
      await dispatch({
        event: ALERT_EVENTS.AUTH_FAILURE,
        // Production is louder: a rejected sandbox key costs a test, a
        // rejected live key means KLAR cannot buy from this supplier at all.
        severity: environment === "production" ? "CRITICAL" : "MEDIUM",
        title: `${provider.name} rejected KLAR's ${environment} credentials`,
        body:
          "A connection test was refused by the supplier. An expired or rotated " +
          "key will not recover on its own, and no amount of traffic will reveal it.",
        facts: [
          { label: "Provider", value: provider.name },
          { label: "Environment", value: environment },
          { label: "HTTP status", value: String(res.status) },
        ],
        providerSlug: provider.slug,
        at: new Date(),
      });
    }

    return result;
  } catch (err: any) {
    // Nothing from `err` reaches the caller. A fetch error can carry the
    // request options — headers included — and those headers are the API key.
    console.error(
      `[connection-test] ${provider.slug}/${environment} failed: ${err?.name ?? "Error"}`,
    );
    const category: TestCategory =
      err?.name === "AbortError" ? "TIMEOUT" : "CONNECTION_FAILED";
    const result = finish(category);
    await credentials.recordTest(provider.slug, environment, false);
    return result;
  } finally {
    clearTimeout(timer);
  }
};
