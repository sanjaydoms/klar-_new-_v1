import { Request } from "express";

import { Environment } from "../constants/status";
import { CredentialField, IProvider, Provider } from "../models/Provider.model";
import { ProviderCredential } from "../models/ProviderCredential.model";
import { decrypt, encrypt, isEncrypted, mask } from "../utils/crypto";
import * as audit from "./audit.service";
import { ProviderError } from "./provider.service";

/**
 * Credential storage (§15, §16).
 *
 * THE ONE RULE
 * ------------
 * A plaintext secret leaves this module through exactly one function —
 * `forService`, behind the internal shared secret. Every other read returns
 * masked values. There is no "include secrets" flag on the admin path, because
 * a flag is a thing that gets set by accident; the capability simply is not
 * there to reach.
 *
 * Secrets are never logged, never audited by value, and never included in an
 * error message. What IS audited is which keys changed — enough to reconstruct
 * who rotated what and when, without the audit table becoming the place the
 * secrets ended up.
 */

const load = async (slug: string): Promise<IProvider> => {
  const provider = await Provider.findOne({ slug: slug.toLowerCase() });
  if (!provider) {
    throw new ProviderError(`No provider "${slug}".`, 404, "PROVIDER_NOT_FOUND");
  }
  return provider;
};

const fieldsOf = (provider: IProvider) => {
  const bySecret = new Map<string, CredentialField>();
  for (const f of provider.credentialSchema) bySecret.set(f.key, f);
  return bySecret;
};

export interface MaskedCredential {
  key: string;
  label: string;
  type: CredentialField["type"];
  required: boolean;
  /** Has a value been stored at all? */
  configured: boolean;
  /**
   * What the browser gets. Bullets plus the last four for secrets; the actual
   * value for non-secrets, which are configuration (a base URL, an agency id)
   * and are useless to hide — masking them would only stop an admin checking
   * they typed the right host.
   */
  value: string;
}

export interface CredentialView {
  providerSlug: string;
  environment: Environment;
  configured: boolean;
  fields: MaskedCredential[];
  configuredAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  lastRotatedAt?: Date | null;
  lastTestedAt?: Date | null;
  lastTestOk?: boolean | null;
}

/** Everything the admin UI may know about one environment's credentials. */
export const view = async (
  slug: string,
  environment: Environment,
): Promise<CredentialView> => {
  const provider = await load(slug);
  const stored = await ProviderCredential.findOne({
    providerSlug: provider.slug,
    environment,
  });

  const fields: MaskedCredential[] = provider.credentialSchema.map((f) => {
    const raw = stored?.values.get(f.key);
    let value = "";
    if (raw) {
      // A secret is stored encrypted; a non-secret is stored as written. The
      // decrypt happens here and the plaintext dies with this expression —
      // only its mask is returned.
      value = f.type === "secret" ? mask(safeDecrypt(raw)) : raw;
    }
    return {
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      configured: Boolean(raw),
      value,
    };
  });

  return {
    providerSlug: provider.slug,
    environment,
    configured: Boolean(stored) && fields.some((f) => f.configured),
    fields,
    configuredAt: stored?.configuredAt,
    updatedAt: stored?.updatedAt,
    updatedBy: stored?.updatedBy,
    lastRotatedAt: stored?.lastRotatedAt,
    lastTestedAt: stored?.lastTestedAt,
    lastTestOk: stored?.lastTestOk,
  };
};

/**
 * Decrypt without letting a bad row take down the whole view.
 *
 * A value that will not decrypt means the master key changed or the row was
 * tampered with. Both are worth shouting about, but neither should make the
 * credentials page 500 — an admin who cannot open the page cannot fix the
 * credentials either.
 */
const safeDecrypt = (value: string): string => {
  try {
    return isEncrypted(value) ? decrypt(value) : value;
  } catch (err: any) {
    console.error(`[credentials] decrypt failed: ${err?.message ?? err}`);
    return "";
  }
};

export interface SaveInput {
  values: Record<string, string>;
  reason: string;
  /** True when this is a rotation of existing keys rather than first setup. */
  rotation?: boolean;
}

/**
 * Write credentials for one environment.
 *
 * Merges rather than replaces: the UI sends back masked values for fields the
 * admin did not touch, and writing those through would store the literal
 * string "••••••••91AF" as an API key. Any value that still looks masked is
 * treated as "unchanged" and dropped.
 */
export const save = async (
  req: Request,
  slug: string,
  environment: Environment,
  input: SaveInput,
): Promise<CredentialView> => {
  const provider = await load(slug);
  const schema = fieldsOf(provider);

  const reason = (input.reason ?? "").trim();
  if (!reason) {
    throw new ProviderError("A reason is required.", 400, "REASON_REQUIRED");
  }

  const doc =
    (await ProviderCredential.findOne({ providerSlug: provider.slug, environment })) ??
    new ProviderCredential({ providerSlug: provider.slug, environment });

  const changed: string[] = [];
  const rejected: string[] = [];

  for (const [key, raw] of Object.entries(input.values ?? {})) {
    const field = schema.get(key);
    if (!field) {
      // Refused rather than stored: an unknown key is either a typo that would
      // silently never be read, or an attempt to smuggle data into the store.
      rejected.push(key);
      continue;
    }

    const value = String(raw ?? "");
    if (!value) continue;
    // The mask never round-trips. Treat it as "leave this one alone".
    if (value.startsWith("••••")) continue;

    doc.values.set(key, field.type === "secret" ? encrypt(value) : value);
    changed.push(key);
  }

  if (rejected.length) {
    throw new ProviderError(
      `Unknown credential field(s): ${rejected.join(", ")}.`,
      400,
      "UNKNOWN_FIELD",
    );
  }

  if (!changed.length) {
    throw new ProviderError("No credential values to save.", 400, "NOTHING_TO_SAVE");
  }

  doc.updatedBy = (req as any).user?.email ?? "unknown";
  if (input.rotation) doc.lastRotatedAt = new Date();
  // A credential change invalidates the last test result — it says nothing
  // about the key that is now installed.
  doc.lastTestedAt = null;
  doc.lastTestOk = null;
  await doc.save();

  // Base URLs are configuration rather than a secret, and the environment
  // cannot be called without one. Keeping the provider record in step means
  // the router's view of "reachable" follows the credentials.
  const baseUrl = input.values?.BASE_URL;
  if (baseUrl && !baseUrl.startsWith("••••")) {
    provider.environments[environment].baseUrl = baseUrl;
    await provider.save();
  }

  await audit.record(req, {
    action: input.rotation ? "CREDENTIALS_ROTATED" : "CREDENTIALS_UPDATED",
    targetType: "CREDENTIAL",
    targetId: `${provider.slug}/${environment}`,
    providerSlug: provider.slug,
    environment,
    // Keys, never values. This table is built to be kept for years.
    after: { changedKeys: changed },
    reason,
  });

  return view(provider.slug, environment);
};

/** Remove one environment's credentials entirely. */
export const remove = async (
  req: Request,
  slug: string,
  environment: Environment,
  reason: string,
): Promise<void> => {
  const provider = await load(slug);
  if (!reason?.trim()) {
    throw new ProviderError("A reason is required.", 400, "REASON_REQUIRED");
  }

  const doc = await ProviderCredential.findOne({
    providerSlug: provider.slug,
    environment,
  });
  if (!doc) return;

  const keys = Array.from(doc.values.keys());
  await doc.deleteOne();

  // An environment with no credentials cannot be called. Switching it off here
  // stops the router picking a provider whose keys were just deleted.
  provider.environments[environment].enabled = false;
  await provider.save();

  await audit.record(req, {
    action: "CREDENTIALS_DELETED",
    targetType: "CREDENTIAL",
    targetId: `${provider.slug}/${environment}`,
    providerSlug: provider.slug,
    environment,
    before: { keys },
    reason,
  });
};

/**
 * Decrypted credentials. THE ONLY plaintext exit from this module.
 *
 * Reached from exactly two places: the connection tester in this service, and
 * the internal route other KLAR services call with the shared secret. Both are
 * server-side. Nothing on the admin path can reach it.
 */
export const forService = async (
  slug: string,
  environment: Environment,
): Promise<Record<string, string>> => {
  const doc = await ProviderCredential.findOne({
    providerSlug: slug.toLowerCase(),
    environment,
  });
  if (!doc) return {};

  const out: Record<string, string> = {};
  for (const [key, value] of doc.values.entries()) {
    out[key] = safeDecrypt(value);
  }
  return out;
};

/**
 * Records the outcome of a Test Connection run against these credentials.
 *
 * `timestamps: false` because a test does not CHANGE the credentials — letting
 * it bump updatedAt would make the UI report "last updated just now by
 * <whoever last saved>", which is a claim about a change that never happened.
 */
export const recordTest = async (
  slug: string,
  environment: Environment,
  ok: boolean,
): Promise<void> => {
  await ProviderCredential.updateOne(
    { providerSlug: slug.toLowerCase(), environment },
    { $set: { lastTestedAt: new Date(), lastTestOk: ok } },
    { timestamps: false },
  );
};
