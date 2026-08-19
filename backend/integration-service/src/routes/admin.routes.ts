import { Router } from "express";

import { PERMISSIONS } from "../constants/permissions";
import * as providers from "../controllers/provider.controller";
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

router.get("/routing", view, providers.routing);
router.get("/audit-logs", requirePermission(PERMISSIONS.AUDIT), providers.auditLog);

export default router;
