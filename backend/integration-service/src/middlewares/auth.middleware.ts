import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { envConfig } from "../config/env.config";

/**
 * The token payload auth-service issues (see its utils/JWT.ts). Verified here,
 * never minted — this service has no login and cannot create a session.
 */
export interface TokenPayload {
  userId: string;
  email: string;
  clientType: string;
  roles: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Accepts the same token auth-service already hands the browser, from the same
 * three places, so an admin signs in once.
 *
 * Unlike auth-service's version this does NOT read `?token=` from the query
 * string. Query strings end up in access logs, proxy logs and browser history,
 * and these routes disable suppliers and write credentials — the convenience is
 * not worth putting an admin's token in a log file.
 */
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Response | void => {
  const header = req.headers.authorization;
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer || (typeof req.headers.cookie === "string"
    ? /(?:^|;\s*)token=([^;]+)/.exec(req.headers.cookie)?.[1]
    : undefined);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
      code: "TOKEN_MISSING",
    });
  }

  try {
    const decoded = jwt.verify(token, envConfig.JWT.SECRET) as TokenPayload;
    if (!decoded?.userId || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
        code: "INVALID_PAYLOAD",
      });
    }
    req.user = decoded;
    next();
  } catch (err: any) {
    const expired = err?.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: expired ? "Token has expired." : "Authentication failed.",
      code: expired ? "TOKEN_EXPIRED" : "AUTH_FAILED",
    });
  }
};
