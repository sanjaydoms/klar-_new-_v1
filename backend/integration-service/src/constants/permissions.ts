/**
 * What each role may do in the Integration Control Center (§29).
 *
 * A MAP, not a scatter of role checks: adding a role means adding an entry
 * here, and every route states the permission it needs rather than the roles
 * it happens to trust today. Moving this map into the database later changes
 * this file and nothing else.
 *
 * A NOTE ON THE ROLES THAT EXIST
 * ------------------------------
 * §29 describes three tiers — Super Admin, Admin, Operations. KLAR's auth
 * service has five roles (USER, B2B_ADMIN, AGENT, RM, MASTER) and only one of
 * them is KLAR staff: MASTER. B2B_ADMIN is the admin OF A CUSTOMER AGENCY, not
 * a KLAR administrator, so granting it "view provider health" would show a
 * travel agency which suppliers KLAR buys from and how they are performing.
 *
 * So today MASTER holds everything and no other role holds anything. The
 * Admin and Operations tiers are described below and left unassigned: when
 * KLAR creates internal staff roles, they become entries in ROLE_PERMISSIONS
 * rather than a new permission system.
 */

export const PERMISSIONS = {
  /** See providers, services, capabilities, health and logs. */
  VIEW: "integrations:view",
  /** Turn providers, services and operations on and off. */
  CONTROL: "integrations:control",
  /** Change routing priority and failover. */
  ROUTE: "integrations:route",
  /** Add, edit and remove providers. */
  MANAGE: "integrations:manage",
  /** Write credentials. Never grants the ability to READ one back. */
  CREDENTIALS: "integrations:credentials",
  /** Read the audit trail. */
  AUDIT: "integrations:audit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL: Permission[] = Object.values(PERMISSIONS);

/**
 * Role -> permissions.
 *
 * Roles absent from this map hold nothing, which is every customer-facing role
 * in the platform. Failing closed by omission means a role added to
 * auth-service does not silently acquire access here.
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  MASTER: ALL,
};

/**
 * The tiers §29 asks for, ready to attach to KLAR staff roles when they exist.
 * Deliberately not wired to any current role — see the note above.
 */
export const TIER_TEMPLATES = {
  SUPER_ADMIN: ALL,
  ADMIN: [PERMISSIONS.VIEW, PERMISSIONS.CONTROL, PERMISSIONS.AUDIT],
  OPERATIONS: [PERMISSIONS.VIEW],
} as const;

export const permissionsFor = (role: string): Permission[] =>
  ROLE_PERMISSIONS[role] ?? [];

export const roleHas = (role: string, permission: Permission): boolean =>
  permissionsFor(role).includes(permission);
