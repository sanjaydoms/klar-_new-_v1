import rateLimit from "express-rate-limit";

/**
 * Rate limits (§49). Same library and response shape as the other services.
 *
 * Two limiters, because the two surfaces have opposite traffic shapes and one
 * number cannot serve both.
 */

/**
 * The admin surface.
 *
 * A handful of staff, whose screens poll every 15 seconds. Generous enough that
 * several consoles open at once never notice, tight enough that a script
 * hammering the credential endpoints is stopped.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.ADMIN_RATE_LIMIT || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

/**
 * The internal surface.
 *
 * Deliberately much higher: every KLAR service instance polls routing and
 * flushes telemetry through here, so this is normal fleet traffic rather than
 * a person clicking. Throttling it would degrade the thing it is meant to
 * protect — a service that cannot fetch routing falls back to its last known
 * snapshot, and one that cannot flush telemetry drops the observations.
 *
 * It exists as a backstop against a caller in a retry loop, not as a policy.
 */
export const internalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.INTERNAL_RATE_LIMIT || 3_000),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
