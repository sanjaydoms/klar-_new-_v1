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

/** Health (§22-24). Nulls mean "not measured", never zero. */
export interface Metrics {
  requests: number;
  successes: number;
  failures: number;
  timeouts: number;
  authFailures: number;
  supplierErrors: number;
  errorRate: number | null;
  averageMs: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  status: "HEALTHY" | "WARNING" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
  belowSampleSize: boolean;
}

export interface OperationHealth extends Metrics {
  operation: string;
}
export interface ServiceHealth extends Metrics {
  service: string;
  operations: OperationHealth[];
}
export interface ProviderHealth extends Metrics {
  providerSlug: string;
  name: string;
  environment: string;
  services: ServiceHealth[];
}

export interface CircuitState {
  providerSlug: string;
  service: string;
  operation: string;
  state: "OPEN" | "HALF_OPEN" | "CLOSED";
  since: string;
  reportedBy: string;
  reportedAt: string;
  consecutiveFailures: number;
  lastReason?: string;
}

export interface HealthSnapshot {
  windowMinutes: number;
  since: string;
  providers: ProviderHealth[];
  overall: Metrics;
  circuits: CircuitState[];
}

export interface Thresholds {
  breakerEnabled: boolean;
  breakerFailureThreshold: number;
  breakerCooldownSeconds: number;
  breakerProbeSuccesses: number;
  warningErrorRate: number;
  degradedErrorRate: number;
  criticalErrorRate: number;
  warningP95Ms: number;
  degradedP95Ms: number;
  criticalP95Ms: number;
  minimumSampleSize: number;
  windowMinutes: number;
  updatedBy?: string;
  updatedAt?: string;
}

/** One supplier call (§25). Carries no payload and no header by construction. */
export interface ApiLogEntry {
  _id: string;
  correlationId: string;
  requestId: string;
  providerSlug: string;
  service: string;
  operation: string;
  environment: string;
  startedAt: string;
  durationMs: number;
  outcome: string;
  success: boolean;
  httpStatus?: number;
  errorReason?: string;
  attempt: number;
  isFailover: boolean;
  failedOverFrom?: string;
  summary?: Record<string, string | number | boolean>;
}

/** One customer action and every attempt it caused (§42). */
export interface CorrelationView {
  correlationId: string;
  attempts: ApiLogEntry[];
  startedAt: string;
  totalMs: number;
  providersTried: string[];
  succeeded: boolean;
  servedBy: string | null;
}

/** An incident and its timeline (§27). */
export interface IncidentEvent {
  at: string;
  kind:
    | "OPENED"
    | "DEGRADED"
    | "RECOVERED"
    | "CIRCUIT_OPENED"
    | "CIRCUIT_CLOSED"
    | "ACKNOWLEDGED"
    | "NOTE"
    | "RESOLVED";
  message: string;
  actorEmail?: string;
}

export interface Incident {
  _id: string;
  reference: string;
  providerSlug: string;
  service: string;
  operation: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  startedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  autoResolved: boolean;
  openedWith?: { errorRate: number | null; p95Ms: number | null; requests: number };
  events: IncidentEvent[];
}

/** Alerting (§44). */
export interface ChannelField {
  key: string;
  label: string;
  type: "text" | "secret";
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ChannelOption {
  type: string;
  label: string;
  description: string;
  fields: ChannelField[];
}

export interface NotificationTarget {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, string>;
  events: string[];
  minSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  minIntervalSeconds: number;
  lastDeliveryAt?: string | null;
  lastDeliveryOk?: boolean | null;
  lastDeliveryError?: string;
  updatedBy?: string;
  updatedAt?: string;
  /** The channel it names is not in this build. */
  unknownChannel: boolean;
}

export interface AlertDelivery {
  _id: string;
  event: string;
  severity: string;
  title: string;
  targetName: string;
  targetType: string;
  status: "SENT" | "FAILED" | "SUPPRESSED";
  detail?: string;
  durationMs?: number;
  incidentReference?: string;
  createdAt: string;
}
