import { NextFunction, Response } from "express";

import { envConfig } from "../config/env.config";
import { Permission, roleHas } from "../constants/permissions";
import { AuthenticatedRequest } from "./auth.middleware";

/**
 * Gate a route on a permission rather than on a role.
 *
 * Routes name what they need; the role -> permission map decides who has it.
 * Must run after authenticateJWT.
 */
export const requirePermission =
  (permission: Permission) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!roleHas(user.roles, permission)) {
      console.warn(
        `[permission] denied ${permission} for ${user.email} (role=${user.roles})`,
      );
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };

/**
 * A second, independent factor for the actions that can take KLAR off-sale or
 * hand a supplier the wrong keys: the caller's email must also be in
 * MASTER_EMAILS.
 *
 * Same reasoning as auth-service's requireMaster, and deliberately the same
 * allowlist. A database compromise that grants someone MASTER is not enough on
 * its own, and neither is a leaked env file. Fails closed: an empty allowlist
 * locks everyone out rather than degrading to a role-only check.
 *
 * Stacks on top of requirePermission — it narrows, it never grants.
 */
export const requireMasterEmail = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const allowlist = envConfig.MASTER.EMAILS;
  if (allowlist.length === 0) {
    console.error(
      "[requireMasterEmail] MASTER_EMAILS is not configured. Rejecting.",
    );
    return res.status(503).json({
      success: false,
      message: "High-risk actions are not configured.",
      code: "MASTER_NOT_CONFIGURED",
    });
  }

  if (!allowlist.includes((user.email || "").toLowerCase())) {
    // Opaque on purpose: saying which factor failed tells an attacker which
    // half they still need.
    console.warn(`[requireMasterEmail] denied for ${user.email}`);
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  next();
};
