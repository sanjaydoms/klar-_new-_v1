import { Router } from "express";

import { observing } from "../utils/observability";
import searchRoutes from "./search.routes";
import fareRoutes from "./fare.routes";
import reviewRoutes from "./review.route";
import ancillaryRoutes from "./ancillary.routes";
import seatRoutes from "./seat.routes";
import bookingRoutes from "./booking.routes";
import bookingLocalRoute from "./bookingLocal.routes";
import cancelRoute from "./cancellation.route";
import updateRoute from "./update.route";
import voucherRoutes from "./voucher.routes";
import reissueRoutes from "./reissue.routes";


const router = Router();

/**
 * `observing(...)` labels every supplier call a route causes, so health is
 * reported per OPERATION rather than lumped into one number for the service.
 * The labels are operations from integration-service's catalogue.
 *
 * Mounts with no label — seat, ancillary, reissue, book-local, voucher — are
 * deliberately NOT counted. They are real supplier work, but the catalogue has
 * no operation for them, and filing them under PRICING or BOOKING would make
 * the health screen blame an operation that was never called. Adding them is
 * one line in that catalogue when somebody wants them measured.
 */
router.use("/fare", observing("PRICING"), fareRoutes);
router.use("/seat", seatRoutes);
router.use("/book", observing("BOOKING"), bookingRoutes);
router.use("/cancel", observing("CANCELLATION"), cancelRoute);
router.use("/update", observing("BOOKING_STATUS"), updateRoute);
router.use("/search", observing("SEARCH"), searchRoutes);
router.use("/review", observing("PRICING"), reviewRoutes);
router.use("/ancillary", ancillaryRoutes);
router.use("/book-local", bookingLocalRoute);
router.use("/voucher", voucherRoutes);
router.use("/reissue", reissueRoutes);


export default router;  