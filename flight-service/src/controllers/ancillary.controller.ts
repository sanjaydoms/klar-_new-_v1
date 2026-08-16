import { Request, Response } from "express";
import AncillaryService from "../services/ancillary.service";
import PostBookingAncillaryService from "../services/postBookingAncillary.service";


/** Surface the supplier's reason instead of a bare status code. */
function ancillaryError(res: Response, error: any, fallback: string) {
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

class AncillaryController {

    async getAncillaries(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: "sessionId is required"
                });
            }

            const data = await AncillaryService.getAncillaries(sessionId as string);

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /** Catalogue of purchasable baggage/meal options for a ticketed booking. */
    async fetchSsr(req: Request, res: Response) {
        try {
            const data = await PostBookingAncillaryService.fetchSsr(req.body.bookingId);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return ancillaryError(res, error, "Could not fetch ancillaries");
        }
    }

    /** Seat map for a ticketed booking. */
    async fetchSeat(req: Request, res: Response) {
        try {
            const data = await PostBookingAncillaryService.fetchSeat(req.body.bookingId);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return ancillaryError(res, error, "Could not fetch seat map");
        }
    }

    /** Purchase selected ancillaries. Charges the TripJack account. */
    async addSsr(req: Request, res: Response) {
        try {
            const { bookingId, selections } = req.body;
            const data = await PostBookingAncillaryService.addSsr(bookingId, selections);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return ancillaryError(res, error, "Could not add ancillaries");
        }
    }

}

export default new AncillaryController();
