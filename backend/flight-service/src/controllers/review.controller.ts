import { Request, Response } from "express";
import ReviewService from "../services/review.service";
import RedisCacheService from "../cache/redisCache.service";
import { describeRequirements } from "../utils/reviewConditions";
import {
    validatePriceIds,
    validatePriceIdCount,
    findFares,
    validateSpecialReturnPairing,
    PriceIdValidationError,
} from "../utils/priceIdValidator";

class ReviewController {

    async review(req: Request, res: Response) {

        try {
            const { priceIds, sessionId, journeyType } = req.body;

            const ids = validatePriceIds(priceIds);
            validatePriceIdCount(ids, journeyType);

            // sessionId is optional so existing callers keep working. When it is
            // supplied we can see the actual fares and enforce the rules that
            // need them — chiefly Special Return leg pairing.
            if (sessionId) {
                const cached = await RedisCacheService.get(sessionId);
                if (cached?.raw) {
                    const fares = findFares(cached.raw, ids);
                    if (fares.length !== ids.length) {
                        throw new PriceIdValidationError(
                            "Some selected fares are no longer in this search session. Please search again."
                        );
                    }
                    validateSpecialReturnPairing(fares);
                }
            }

            const data = await ReviewService.reviewFare(ids);

            return res.status(200).json({
                success: true,
                // What this fare actually requires, read straight off the Review
                // conditions. Booking enforces the same flags, so the passenger
                // form and the guard cannot drift apart.
                requirements: describeRequirements(data?.conditions),
                data
            });

        } catch (error: any) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    errorCode: error.errorCode,
                    details: error.details,
                    referenceId: error.referenceId
                });
            }

            if (error.response?.status === 400) {
                const errorData = error.response?.data;

                if (errorData?.errors && errorData.errors.length > 0) {
                    const errorDetail = errorData.errors[0];

                    return res.status(400).json({
                        success: false,
                        message: errorDetail.message || "Flight is no longer available",
                        errorCode: errorDetail.errCode,
                        details: errorDetail.details,
                        referenceId: errorDetail.id,
                        httpStatus: errorData.status?.httpStatus
                    });
                }
            }

            return res.status(500).json({
                success: false,
                message: error.message || "Review API failed"
            });
        }
    }

    async reviewVerify(req: Request, res: Response) {
        try {
            const { bookingId } = req.body;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "bookingId is required"
                });
            }

            const data = await ReviewService.beforeBookVerify(bookingId);

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "Verify API failed"
            });
        }
    }
}

export default new ReviewController();