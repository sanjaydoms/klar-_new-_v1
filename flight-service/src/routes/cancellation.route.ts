import { Router } from "express";
import CancellationController from "../controllers/cancellation.controller";

const router = Router();

router.post("/charges", CancellationController.getCharges);
router.post("/submit", CancellationController.submit);
router.post("/status", CancellationController.status);

// Post-booking amendment flows sharing the submit-amendment endpoint.
router.post("/void", CancellationController.void);
router.post("/full-refund", CancellationController.fullRefund);

// Hold-only: give the PNR back without ticketing.
router.post("/release-pnr", CancellationController.releasePnr);

// Supplier account balance.
router.get("/account", CancellationController.userDetail);

export default router;