import { Request, Response } from "express";
import CancellationService from "../services/cancellation.service";
import { mapToAmendmentPayload } from "../utils/mappers/cancellation.mapper";
import { validateCancellationPayload, describeAmendmentScope } from "../utils/cancellationVerifier";

/**
 * Amendment failures carry the reason that matters — "Void cannot be raised for
 * LCC booking" (2612), "Amendment already raised" (2541), "Travel date has
 * passed" (2543). getCharges throws a wrapped shape, submit throws the raw axios
 * error; both collapsed to "Request failed with status code 400" before this.
 *
 * Module-level, not a method: these handlers are registered unbound
 * (`router.post("/void", CancellationController.void)`), so `this` is undefined
 * inside them at request time.
 */
function amendmentError(res: Response, error: any, fallback: string) {
        if (error?.httpStatus) {
            return res.status(error.httpStatus).json({ success: false, ...error.raw });
        }

        const supplier = error?.response?.data;
        const first = supplier?.errors?.[0];

        return res.status(error?.response?.status || 400).json({
            success: false,
            message: first?.message || error?.message || fallback,
            errorCode: first?.errCode,
            details: first?.details,
            data: supplier,
    });
}

class CancellationController {

    async getCharges(req: Request, res: Response) {
        try {
            const payload = mapToAmendmentPayload(req.body);

            validateCancellationPayload(payload);

            const response = await CancellationService.getCharges(payload);


            return res.status(200).json({
                success: true,
                data: response,
            });

        } catch (error: any) {


            // ✅ Handle your custom thrown error from service
            if (error?.httpStatus) {
                return res.status(error.httpStatus).json({
                    success: false,
                    ...error.raw   // 🔥 send full Tripjack response
                });
            }

            // fallback
            return res.status(500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async submit(req: Request, res: Response) {
        try {
            const payload = mapToAmendmentPayload(req.body);

            validateCancellationPayload(payload);

            const response = await CancellationService.submit(payload);

            return res.status(200).json({
                success: true,
                data: response.data,
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Auto Void — same 3-step amendment flow as cancellation, type VOIDED.
     * Only valid while the booking is SUCCESS and inside the airline's void
     * window; TripJack decides that, we just scope the request.
     */
    async void(req: Request, res: Response) {
        try {
            const payload = mapToAmendmentPayload({ ...req.body, type: "VOIDED" });
            validateCancellationPayload(payload);

            console.log(`[Void] ${describeAmendmentScope(payload)}`);
            const response = await CancellationService.submit(payload);

            return res.status(200).json({ success: true, data: response.data });
        } catch (error: any) {
            return amendmentError(res, error, "Void request failed");
        }
    }

    /**
     * Auto Full Refund — type FULL_REFUND, for cases the airline owes in full
     * (cancellation, reschedule, DGCA). `remarks` drives TripJack's automation,
     * so the exact strings matter.
     */
    async fullRefund(req: Request, res: Response) {
        try {
            const payload = mapToAmendmentPayload({ ...req.body, type: "FULL_REFUND" });
            validateCancellationPayload(payload);

            console.log(`[FullRefund] ${describeAmendmentScope(payload)} — "${payload.remarks}"`);
            const response = await CancellationService.submit(payload);

            return res.status(200).json({ success: true, data: response.data });
        } catch (error: any) {
            return amendmentError(res, error, "Full refund request failed");
        }
    }

    /** Release a held PNR without confirming it. */
    async releasePnr(req: Request, res: Response) {
        try {
            const { bookingId, pnrs } = req.body;
            const data = await CancellationService.releasePnr(bookingId, pnrs);
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return res.status(error.response?.status || 400).json({
                success: false,
                message:
                    error.response?.data?.errors?.[0]?.message ||
                    error.message ||
                    "Release PNR failed",
                data: error.response?.data,
            });
        }
    }

    /** TripJack account balance. */
    async userDetail(_req: Request, res: Response) {
        try {
            const data = await CancellationService.getUserDetail();
            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return res.status(error.response?.status || 400).json({
                success: false,
                message: error.message || "Could not fetch account details",
            });
        }
    }

    async status(req: Request, res: Response) {
        try {
            const { amendmentId } = req.body;

            const response = await CancellationService.status(amendmentId);

            return res.status(200).json({
                success: true,
                data: response.data,
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
}

export default new CancellationController();