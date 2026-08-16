import { Request, Response } from "express";
import ReissueService from "../services/reissue.service";

/** Surface the supplier's own reason — 1157 (supplier not configured), 2543, 2541. */
function reissueError(res: Response, error: any, fallback: string) {
    if (error?.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    const supplier = error?.response?.data;
    const first = supplier?.errors?.[0];
    return res.status(error?.response?.status || 400).json({
        success: false,
        message: first?.message || error?.message || fallback,
        errorCode: first?.errCode,
        data: supplier,
    });
}

class ReissueController {

    /** Step 1 — start a reissue search for a new date on an existing booking. */
    async searchQuery(req: Request, res: Response) {
        try {
            const { oldBookingId, routeInfos, cabinClass } = req.body;
            const data = await ReissueService.searchQueryList({ oldBookingId, routeInfos, cabinClass });
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return reissueError(res, error, "Reissue search could not be started");
        }
    }

    /** Step 2 — available flights, each with its fare-difference breakdown. */
    async search(req: Request, res: Response) {
        try {
            const data = await ReissueService.search(req.body.requestId);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return reissueError(res, error, "Reissue search failed");
        }
    }

    /** Step 3 — revalidate and mint the reissue bookingId. */
    async review(req: Request, res: Response) {
        try {
            const { priceId, oldBookingId } = req.body;
            const data = await ReissueService.review(priceId, oldBookingId);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return reissueError(res, error, "Reissue review failed");
        }
    }

    /** Step 4 — ticket the reissue. */
    async book(req: Request, res: Response) {
        try {
            const { bookingId, oldBookingId, gstInfo } = req.body;
            const data = await ReissueService.book(bookingId, oldBookingId, gstInfo);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return reissueError(res, error, "Reissue booking failed");
        }
    }
}

export default new ReissueController();
