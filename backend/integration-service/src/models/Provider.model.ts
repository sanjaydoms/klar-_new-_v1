import mongoose, { Document, Schema } from "mongoose";

import { ServiceCode } from "../constants/catalogue";
import { Environment, ProviderStatus } from "../constants/status";

/**
 * One external travel supplier.
 *
 * The document embeds the whole provider -> service -> operation hierarchy
 * (§57) rather than splitting it across three collections. The router needs
 * all three levels on every single request, so embedding makes the hot path
 * one indexed read of one document; splitting it would buy referential
 * tidiness and cost three lookups per search.
 *
 * `slug` — not `_id` — is the key everything else references. It is what the
 * supplier adapters already call themselves in the existing services
 * (hotel-search-service/src/suppliers/*), so routing rules, credentials, logs
 * and health records all key on it and stay readable in the database.
 */

/** §53 — one credential field a provider needs, described rather than assumed. */
export interface CredentialField {
  key: string;
  label: string;
  /**
   * `secret` values are encrypted at rest and never leave the backend in
   * plaintext; `text` and `url` are readable by an authorised admin.
   */
  type: "text" | "secret" | "url";
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ProviderOperation {
  operation: string;
  /** Does the supplier's API offer this at all? Hard fact about the supplier. */
  supported: boolean;
  /** Does KLAR currently want to use it? Admin's choice, §13. */
  enabled: boolean;
}

export interface ProviderService {
  service: ServiceCode;
  enabled: boolean;
  operations: ProviderOperation[];
}

/**
 * How to prove this provider's credentials work (§17).
 *
 * Described as data rather than written as code per supplier, for the same
 * reason credentialSchema is: integration-service must not learn what a
 * TripJack is. Header and body values may contain {{KEY}} placeholders, filled
 * from the environment's credentials at call time.
 *
 * Absent means Test Connection falls back to a plain authenticated request at
 * the base URL — enough to tell a dead host from a rejected key, which is most
 * of what the button is for.
 */
export interface ConnectionTest {
  method: "GET" | "POST";
  /** Appended to the environment's base URL. */
  path: string;
  headers?: Record<string, string>;
  /** JSON string, same {{KEY}} templating as headers. */
  body?: string;
  /**
   * Statuses that mean "the credentials are good", beyond the default of any
   * 2xx. Some supplier health endpoints answer a probe with 400 because the
   * probe body is deliberately empty — that still proves authentication.
   */
  okStatuses?: number[];
  timeoutMs?: number;
}

export interface ProviderEnvironment {
  /**
   * The provider's primary endpoint for this environment — what Test
   * Connection probes and what the router reports.
   *
   * NOT necessarily the only host the provider answers on. TripJack alone
   * serves flights, hotels and order management from three different
   * subdomains, so suppliers whose services live on separate hosts declare
   * those as credential fields (HOTEL_BASE_URL, OMS_BASE_URL, ...). A fixed
   * per-service URL column here would be wrong for every provider that does
   * not split the same way, which is most of them; credentialSchema already
   * exists to express exactly this kind of per-provider shape.
   */
  baseUrl: string;
  enabled: boolean;
}

export interface IProvider extends Document {
  slug: string;
  /**
   * The short code the supplier adapters already call themselves — "TJ", "RG"
   * (each `suppliers/<name>/index.ts` in hotel-search-service and
   * hotel-booking-service declares one).
   *
   * Carried as data rather than mapped in code, so wiring a new supplier to
   * the router is a field on its provider record instead of an edit to a
   * translation table in every consuming service.
   */
  code: string;
  name: string;
  types: ServiceCode[];
  description?: string;
  logoUrl?: string;

  status: ProviderStatus;
  statusReason?: string;
  statusChangedAt?: Date;
  statusChangedBy?: string;

  environments: Record<Environment, ProviderEnvironment>;
  /** Which environment live traffic uses. Never inferred from NODE_ENV. */
  activeEnvironment: Environment;

  services: ProviderService[];
  credentialSchema: CredentialField[];
  connectionTest?: ConnectionTest;

  /**
   * When an admin first activated it. Null means the provider was created but
   * never switched on — §52 requires a new provider to stay inert until
   * someone explicitly activates it.
   */
  activatedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;

  /**
   * Can this provider serve (service, operation) right now?
   *
   * All four levels must agree: the provider is ACTIVE, the environment it is
   * pointed at is enabled, the service is on, and the operation is both
   * supported by the supplier and enabled by KLAR. §33 steps 1-4.
   */
  canServe(service: string, operation: string): boolean;
}

const operationSchema = new Schema<ProviderOperation>(
  {
    operation: { type: String, required: true },
    supported: { type: Boolean, required: true, default: false },
    enabled: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const serviceSchema = new Schema<ProviderService>(
  {
    service: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: false },
    operations: { type: [operationSchema], default: [] },
  },
  { _id: false },
);

const environmentSchema = new Schema<ProviderEnvironment>(
  {
    baseUrl: { type: String, default: "" },
    enabled: { type: Boolean, default: false },
  },
  { _id: false },
);

const connectionTestSchema = new Schema<ConnectionTest>(
  {
    method: { type: String, enum: ["GET", "POST"], default: "GET" },
    path: { type: String, default: "" },
    headers: { type: Map, of: String, default: {} },
    body: { type: String },
    okStatuses: { type: [Number], default: [] },
    timeoutMs: { type: Number },
  },
  { _id: false },
);

const credentialFieldSchema = new Schema<CredentialField>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["text", "secret", "url"], default: "text" },
    required: { type: Boolean, default: true },
    placeholder: { type: String },
    helpText: { type: String },
  },
  { _id: false },
);

const providerSchema = new Schema<IProvider>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    types: { type: [String], required: true, default: [] },
    description: { type: String },
    logoUrl: { type: String },

    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED", "DEGRADED", "MAINTENANCE"],
      // Created disabled on purpose: a provider becomes live only when an
      // admin activates it (§52 step 8), never as a side effect of being added.
      default: "DISABLED",
      required: true,
    },
    statusReason: { type: String },
    statusChangedAt: { type: Date },
    statusChangedBy: { type: String },

    environments: {
      production: { type: environmentSchema, default: () => ({}) },
      test: { type: environmentSchema, default: () => ({}) },
    },
    activeEnvironment: {
      type: String,
      enum: ["production", "test"],
      default: "test",
      required: true,
    },

    services: { type: [serviceSchema], default: [] },
    credentialSchema: { type: [credentialFieldSchema], default: [] },
    connectionTest: { type: connectionTestSchema, default: undefined },

    activatedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "providers" },
);

// The router filters on status before anything else; every admin list sorts by name.
providerSchema.index({ status: 1 });
providerSchema.index({ "services.service": 1, "services.operations.operation": 1 });

providerSchema.methods.canServe = function (
  this: IProvider,
  service: string,
  operation: string,
): boolean {
  if (this.status !== "ACTIVE") return false;
  if (!this.environments[this.activeEnvironment]?.enabled) return false;

  const svc = this.services.find((s) => s.service === service);
  if (!svc || !svc.enabled) return false;

  const op = svc.operations.find((o) => o.operation === operation);
  return Boolean(op?.supported && op.enabled);
};

export const Provider = mongoose.model<IProvider>("Provider", providerSchema);
