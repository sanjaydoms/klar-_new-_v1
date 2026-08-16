import { Router } from "express";
import AncillaryController from "../controllers/ancillary.controller";

const router = Router();

router.get("/:sessionId", AncillaryController.getAncillaries);

// Post-booking ancillaries (booking must be ticketed).
router.post("/fetch-ssr", AncillaryController.fetchSsr);
router.post("/fetch-seat", AncillaryController.fetchSeat);
router.post("/add", AncillaryController.addSsr);

export default router;
