/** Mirrors integration-service's admin payloads. */

export type ProviderStatus = "ACTIVE" | "DISABLED" | "DEGRADED" | "MAINTENANCE";
export type Environment = "production" | "test";

export interface ProviderOperation {
  operation: string;
  supported: boolean;
  enabled: boolean;
}

export interface ProviderService {
  service: string;
  enabled: boolean;
  operations: ProviderOperation[];
}

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "secret" | "url";
  required: boolean;
  helpText?: string;
}

export interface Provider {
  slug: string;
  code: string;
  name: string;
  types: string[];
  description?: string;
  status: ProviderStatus;
  statusReason?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  activeEnvironment: Environment;
  environments: Record<Environment, { baseUrl: string; enabled: boolean }>;
  services: ProviderService[];
  credentialSchema: CredentialField[];
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutingDecision {
  service: string;
  operation: string;
  configured: boolean;
  failoverEnabled: boolean;
  mutating: boolean;
  providers: {
    slug: string;
    code: string;
    name: string;
    priority: number;
    environment: Environment;
    baseUrl: string;
  }[];
  excluded: { slug: string; reason: string }[];
}

export interface AuditEntry {
  _id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  providerSlug?: string;
  service?: string;
  operation?: string;
  environment?: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}
