import { Router } from "express";

import { internalServiceAuth } from "../middlewares/internalService.middleware";
import { resolve, resolveAll } from "../services/router.service";

/**
 * The routing surface KLAR's own services consult.
 *
 * Read-only and deliberately small. A service asks who serves an operation and
 * gets slugs back; it never asks this service to make a supplier call for it.
 * The supplier adapters stay where they already live.
 */
const router = Router();

router.use(internalServiceAuth);

/**
 * The whole routing table in one response.
 *
 * The shape the clients actually poll: one request on a timer beats one per
 * operation, and a client holding a complete snapshot can answer synchronously
 * on the hot path instead of awaiting a lookup per search.
 */
router.get("/routing", async (_req, res) => {
  try {
    res.json({ success: true, data: await resolveAll() });
  } catch (err: any) {
    console.error("[internal] resolveAll failed:", err?.message ?? err);
    res.status(500).json({ success: false, message: "Failed to resolve routing." });
  }
});

/** One operation, for callers that want a fresh read rather than a snapshot. */
router.get("/routing/:service/:operation", async (req, res) => {
  try {
    const decision = await resolve(
      String(req.params.service).toUpperCase(),
      String(req.params.operation).toUpperCase(),
    );
    res.json({ success: true, data: decision });
  } catch (err: any) {
    console.error("[internal] resolve failed:", err?.message ?? err);
    res.status(500).json({ success: false, message: "Failed to resolve routing." });
  }
});

export default router;
