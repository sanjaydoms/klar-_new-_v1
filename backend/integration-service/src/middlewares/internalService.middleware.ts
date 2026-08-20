import { NextFunction, Request, Response } from "express";

import { envConfig } from "../config/env.config";

/**
 * Guards routes called by other KLAR services rather than by a person.
 *
 * Same shared-secret scheme and the same header as auth-service's
 * internalServiceAuth, deliberately: the services calling this one already
 * hold INTERNAL_SERVICE_KEY and already send `x-internal-key`, so routing
 * config needs no new secret distributed to no new places.
 *
 * Fails closed — an unset key makes these routes unreachable rather than open.
 */
export const internalServiceAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  const expected = envConfig.INTERNAL_SERVICE_KEY;

  if (!expected) {
    console.error(
      "[internalServiceAuth] INTERNAL_SERVICE_KEY is not configured. Rejecting internal request.",
    );
    return res.status(503).json({
      success: false,
      message: "Internal service authentication is not configured.",
    });
  }

  const provided = req.headers["x-internal-key"];

  if (typeof provided !== "string" || provided !== expected) {
    return res.status(401).json({
      success: false,
      message: "Invalid internal service key.",
    });
  }

  next();
};
