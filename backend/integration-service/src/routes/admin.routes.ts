import { Router } from "express";

import { PERMISSIONS } from "../constants/permissions";
import * as apilog from "../controllers/apilog.controller";
import * as credentials from "../controllers/credential.controller";
import * as healthController from "../controllers/health.controller";
import * as incidents from "../controllers/incident.controller";
import * as providers from "../controllers/provider.controller";
import * as routing from "../controllers/routing.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import {
  requireMasterEmail,
  requirePermission,
} from "../middlewares/permission.middleware";

/**
 * The Super Admin surface.
 *
 * Every route is authenticated and states the permission it needs. The routes
 * that can take KLAR off-sale carry requireMasterEmail on top — a second,
 * independent factor, so neither a stolen token nor a database compromise is
 * enough on its own.
 */
const router = Router();

router.use(authenticateJWT);

const view = requirePermission(PERMISSIONS.VIEW);
const control = requirePermission(PERMISSIONS.CONTROL);
const manage = requirePermission(PERMISSIONS.MANAGE);

router.get("/providers", view, providers.list);
router.post("/providers", manage, requireMasterEmail, providers.create);
router.get("/providers/:slug", view, providers.get);

/** Read-only preview of what a disable would do. Safe, so it needs only VIEW. */
router.get("/providers/:slug/disable-impact", view, providers.disableImpact);

/**
 * Status, service and operation toggles all change what customers can buy, so
 * all three carry the second factor — not just the provider-wide switch. A
 * disabled Hotel Booking operation stops sales just as completely as a
 * disabled provider does.
 */
router.patch("/providers/:slug/status", control, requireMasterEmail, providers.setStatus);
router.patch(
  "/providers/:slug/services/:service",
  control,
  requireMasterEmail,
  providers.setServiceEnabled,
);
router.patch(
  "/providers/:slug/services/:service/operations/:operation",
  control,
  requireMasterEmail,
  providers.setOperationEnabled,
);
router.patch(
  "/providers/:slug/environment",
  control,
  requireMasterEmail,
  providers.setEnvironment,
);

/**
 * Credentials.
 *
 * The read is masked and needs only VIEW; every write needs the CREDENTIALS
 * permission AND the email allowlist. Test Connection writes nothing to the
 * supplier but does spend a real request against KLAR's account, so it sits
 * with the writes rather than the reads.
 */
const credentialWrite = [
  requirePermission(PERMISSIONS.CREDENTIALS),
  requireMasterEmail,
];

router.get("/providers/:slug/credentials/:environment", view, credentials.view);
router.put(
  "/providers/:slug/credentials/:environment",
  credentialWrite,
  credentials.save,
);
router.delete(
  "/providers/:slug/credentials/:environment",
  credentialWrite,
  credentials.remove,
);
router.post(
  "/providers/:slug/credentials/:environment/test",
  credentialWrite,
  credentials.test,
);

/**
 * Routing.
 *
 * Reading needs VIEW. Writing needs the ROUTE permission and the email
 * allowlist — changing routing changes which supplier a customer's money goes
 * to, which is as consequential as switching a provider off.
 */
/**
 * Health. Reading needs VIEW; changing the thresholds needs CONTROL and the
 * allowlist — widening the critical band silences an alarm as effectively as
 * turning monitoring off.
 */
router.get("/health", view, healthController.snapshot);
router.get("/health/thresholds", view, healthController.thresholds);
router.put(
  "/health/thresholds",
  control,
  requireMasterEmail,
  healthController.setThresholds,
);
router.get("/providers/:slug/health/timeline", view, healthController.timeline);

/**
 * API logs. VIEW only — they carry no secret and no payload by construction,
 * so an operator who may see health may see these.
 */
/**
 * Incidents. Reading and acknowledging need only VIEW — an operator who can
 * see an outage should be able to say they are on it, and neither action
 * changes what customers can buy. Resolving needs CONTROL: closing an incident
 * is a claim that the problem is over.
 */
router.get("/incidents", view, incidents.list);
router.get("/incidents/:reference", view, incidents.get);
router.post("/incidents/:reference/acknowledge", view, incidents.acknowledge);
router.post("/incidents/:reference/notes", view, incidents.addNote);
router.post("/incidents/:reference/resolve", control, incidents.resolve);
router.post("/incidents/detect", control, incidents.runDetector);

router.get("/logs", view, apilog.list);
router.get("/logs/:id", view, apilog.correlation);

router.get("/catalogue", view, routing.catalogue);
router.get("/routing", view, routing.list);
router.get("/routing/:service/:operation", view, routing.get);
router.put(
  "/routing/:service/:operation",
  requirePermission(PERMISSIONS.ROUTE),
  requireMasterEmail,
  routing.set,
);
router.get("/audit-logs", requirePermission(PERMISSIONS.AUDIT), providers.auditLog);

export default router;
