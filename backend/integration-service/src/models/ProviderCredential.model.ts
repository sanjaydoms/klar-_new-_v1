import mongoose, { Document, Schema } from "mongoose";

import { Environment } from "../constants/status";

/**
 * One provider's credentials for one environment.
 *
 * Split from the provider document on purpose. Provider records are read on
 * every routing decision and returned to the admin UI constantly; credentials
 * are read only when a service is about to call the supplier. Keeping them
 * apart means the document the browser sees has no secret in it to leak —
 * the safe default is structural rather than a field-stripping step somebody
 * has to remember on every new endpoint.
 *
 * Secret-typed values are stored as AES-256-GCM ciphertext (see utils/crypto).
 * Non-secret values (base URLs, agency ids) are stored as written — they are
 * configuration, not credentials, and masking them would only make the UI lie.
 *
 * Production and test are separate documents, so there is no code path that
 * can read one while meaning the other (§14).
 */
export interface IProviderCredential extends Document {
  providerSlug: string;
  environment: Environment;
  /**
   * Keyed by CredentialField.key from the provider's credentialSchema.
   * Secret values hold ciphertext; everything else holds plaintext.
   */
  values: Map<string, string>;
  configuredAt: Date;
  updatedBy?: string;
  lastRotatedAt?: Date | null;
  /** Result of the last Test Connection run against these credentials (§17). */
  lastTestedAt?: Date | null;
  lastTestOk?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

const credentialSchema = new Schema<IProviderCredential>(
  {
    providerSlug: { type: String, required: true, lowercase: true, trim: true },
    environment: { type: String, enum: ["production", "test"], required: true },
    values: { type: Map, of: String, default: {} },
    configuredAt: { type: Date, default: Date.now },
    updatedBy: { type: String },
    lastRotatedAt: { type: Date, default: null },
    lastTestedAt: { type: Date, default: null },
    lastTestOk: { type: Boolean, default: null },
  },
  { timestamps: true, collection: "provider_credentials" },
);

credentialSchema.index({ providerSlug: 1, environment: 1 }, { unique: true });

export const ProviderCredential = mongoose.model<IProviderCredential>(
  "ProviderCredential",
  credentialSchema,
);
