import { Request, Response } from "express";
import BookingService from "../services/bookingLocal.service";
import { envConfig } from "../config/env.config";
import { EMAIL_REGEX } from "../constants/booking.constants";
import axios from "axios";
import TripjackBookingService from "../services/booking.service";
import { BookingVoucherPdfService } from "../services/bookingVoucherPdf.service";
import { cancellationPriceService } from "../services/cancellationRefund.service";

class BookingLocalController {

    private authServiceUrl: string;
    private paymentServiceUrl: string;
    private currentToken: string | null = null;

    constructor() {
        this.authServiceUrl = envConfig.AUTH_SERVICE;
        this.paymentServiceUrl = envConfig.PAYMENT_SERVICE;
    }

    // ----------------------------
    // ---- PRIVATE FUNCTIONS -----
    // ------- BEGINS HERE --------
    // ----------------------------

    private extractToken = (req: Request): string | null => {
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith("Bearer ")) {
            let token = authHeader.split(" ")[1];

            if (token && token.startsWith('{')) {
                try {
                    const parsed = JSON.parse(token);
                    token = parsed.value || parsed.token || token;
                } catch (e) {
                }
            }

            this.currentToken = token;
            return token;
        }

        if (req.cookies?.token) {
            let token = req.cookies.token;

            if (token && token.startsWith('{')) {
                try {
                    const parsed = JSON.parse(token);
                    token = parsed.value || parsed.token || token;
                } catch (e) {
                }
            }

            this.currentToken = token;
            return token;
        }

        return null;
    };

    private validateToken = async (token: string): Promise<any> => {
        try {
            let cleanToken = token;
            if (cleanToken && cleanToken.startsWith('{')) {
                try {
                    const parsed = JSON.parse(cleanToken);
                    cleanToken = parsed.value || parsed.token || cleanToken;
                } catch (e) {
                }
            }

            const response = await axios.post(
                `${this.authServiceUrl}/auth/validate-token`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${cleanToken}`,
                    },
                }
            );

            if (response.data.success) {
                const userId = response.data.data.userId ||
                    response.data.data.id ||
                    response.data.data._id;

                if (!userId) {
                    throw new Error("No user ID in token validation response");
                }

                return {
                    id: userId,
                    email: response.data.data.email,
                    roles: response.data.data.roles || ["user"],
                    clientType: response.data.data.clientType || "b2c",
                };
            }

            throw new Error("Token validation failed");
        } catch (error: any) {
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Token validation failed"
            );
        }
    };

    private deductWalletBalance = async (bookingId: string, totalPrice: string, userId?: string): Promise<any> => {
        try {
            const token = this.currentToken;

            if (!token) {
                throw new Error("Token missing for wallet deduction");
            }

            const response = await axios.post(
                `${this.authServiceUrl}/book/pay`,
                { bookingId, totalPrice, userId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            return response.data;
        } catch (error: any) {
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Wallet deduction failed"
            );
        }
    };

    private WalletBalanceCheck = async (bookingId: string, totalPrice: string): Promise<any> => {
        try {
            const token = this.currentToken;

            if (!token) {
                return {
                    success: false,
                    message: "Token missing for wallet balance check",
                    hasSufficientBalance: false,
                    currentBalance: 0,
                    requiredAmount: Number(totalPrice),
                    shortfallAmount: Number(totalPrice),
                    isAlreadyPaid: false
                };
            }

            const response = await axios.get(
                `${this.authServiceUrl}/book/check-balance/${bookingId}`,
                {
                    params: { totalPrice },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            const walletBalanceCheckResponse = response.data;
            return walletBalanceCheckResponse;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || "Wallet balance check failed",
                hasSufficientBalance: false,
                currentBalance: 0,
                requiredAmount: Number(totalPrice),
                shortfallAmount: Number(totalPrice),
                isAlreadyPaid: false
            };
        }
    };

    /**
     * Credit a wallet debit back after the supplier refused the booking. Never
     * throws: the caller is already on a failure path and the booking error is
     * the one worth surfacing. A failed credit is logged loudly so ops can
     * settle it by hand rather than it disappearing.
     *
     * Gives back exactly what was taken, to the wallet it was taken from.
     *
     * `userId` must be the same value handed to `deductWalletBalance`. B2C
     * debits a house account rather than the token holder, and `/wallet/credit`
     * can only ever credit the token holder — so refunding through it paid the
     * customer out of the house account's pocket on every supplier rejection.
     * An explicit target goes to the internal endpoint, which takes one.
     */
    private refundWalletBalance = async (
        bookingId: string,
        totalPrice: string,
        userId?: string
    ): Promise<void> => {
        try {
            if (userId) {
                await cancellationPriceService.creditWallet(
                    userId,
                    Number(totalPrice),
                    "REFUND",
                    "WALLET",
                    "FLIGHT_BOOKING_REFUND",
                    bookingId,
                    "Auto-refund: flight booking failed at supplier"
                );
                return;
            }

            const token = this.currentToken;
            if (!token) {
                throw new Error("Token missing for wallet refund");
            }

            await axios.post(
                `${this.authServiceUrl}/wallet/credit`,
                {
                    amount: Number(totalPrice),
                    type: "REFUND",
                    paymentMethod: "WALLET",
                    referenceType: "FLIGHT_BOOKING_REFUND",
                    referenceId: bookingId,
                    description: "Auto-refund: flight booking failed at supplier",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error: any) {
            console.error(
                `[Booking ${bookingId}] WALLET REFUND FAILED for ₹${totalPrice} — ` +
                `customer was debited but not ticketed, settle manually: ` +
                (error.response?.data?.message || error.message)
            );
        }
    };

    private PaymentStatusCheck = async (orderId: string): Promise<any> => {
        try {
            const response = await axios.get(
                `${this.paymentServiceUrl}/razorpay/razorpay-order/${orderId}`
            );

            if (!response?.data?.success === true) {
                return {
                    status: 400,
                    success: false,
                    message: "Payment status check failed",
                }
            }

            return response.data.data;
        } catch (error: any) {
            return {
                status: 400,
                success: false,
                message: error.response?.data?.message || error.message || "Wallet balance check failed",
            };
        }
    };

    private applyFilter(bookings: any[], filterType: string): any[] {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        switch (filterType) {
            case 'upcoming':
                return bookings.filter((b: any) => {
                    if (b.status === 'CANCELLED' || b.status === 'CANCEL_REQUESTED') return false;
                    if (!b.departureDate) return true;
                    const parts = b.departureDate.split('/');
                    if (parts.length !== 3) return true;
                    const dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    return dateStr >= todayStr;
                });

            case 'past':
                return bookings.filter((b: any) => {
                    if (b.status === 'CANCELLED' || b.status === 'CANCEL_REQUESTED') return false;
                    if (!b.departureDate) return true;
                    const parts = b.departureDate.split('/');
                    if (parts.length !== 3) return true;
                    const dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    return dateStr < todayStr;
                });

            case 'cancelled':
                return bookings.filter((b: any) =>
                    b.status === 'CANCELLED' ||
                    b.status === 'CANCEL_REQUESTED'
                );

            case 'all':
            default:
                return bookings;
        }
    }

    // ----------------------------
    // ---- PRIVATE FUNCTIONS -----
    // -------- ENDS HERE ---------
    // ----------------------------

    public createLocalBooking = async (req: Request, res: Response) => {
        try {
            const { source } = req.body;

            let userData = null;

            if (source === 'b2c') {
                userData = {
                    id: 'guest_user',
                    email: req.body.email || 'guest@example.com',
                    role: 'guest'
                };
            } else {
                const token = this.extractToken(req);

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: "Authorization token missing",
                    });
                }

                userData = await this.validateToken(token);

                if (!userData) {
                    return res.status(400).json({
                        success: false,
                        message: "User Data not found",
                    });
                }
            }

            const result = await BookingService.createInitialBooking(req.body, userData);

            return res.status(201).json({
                success: true,
                message: "Booking initialized successfully",
                data: result,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    };

    public updateBookingDetails = async (req: Request, res: Response) => {
        try {
            const {
                bookingId,
                travellers,
                tripjackPrice,
                markupPrice,
                totalPrice
            } = req.body;

            const missingFields = [];
            if (!bookingId) missingFields.push("bookingId");
            if (!tripjackPrice) missingFields.push("tripjackPrice");
            if (!markupPrice) missingFields.push("markupPrice");
            if (!totalPrice) missingFields.push("totalPrice");

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required fields: ${missingFields.join(", ")}`
                });
            }

            const result = await BookingService.updateBookingDetails({
                bookingId,
                travellers,
                tripjackPrice,
                markupPrice,
                totalPrice
            });

            return res.status(200).json({
                success: true,
                message: "Booking updated successfully",
                data: result
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

    public updateAndBook = async (req: Request, res: Response) => {
        try {
            const {
                bookingId,
                travellers,
                tripjackPrice,
                markupPrice,
                totalPrice,
                isHold,
                orderId,
                source,
            } = req.body;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "bookingId is required"
                });
            }

            // A guest checkout legitimately has no token — that, and only that, is
            // what `source: 'b2c'` waives. It previously also skipped the payment
            // and wallet checks below, so posting `source: 'b2c'` issued a ticket
            // with no auth AND no payment.
            const isGuest = source === 'b2c';
            let userData = null;

            if (isGuest) {
                userData = {
                    id: 'guest_user',
                    clientType: 'b2c',
                    email: req.body.email || 'guest@example.com'
                };
            } else {
                const token = this.extractToken(req);

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: "Authorization token missing",
                    });
                }

                userData = await this.validateToken(token);

                if (!userData?.clientType) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid user data",
                    });
                }
            }

            // Which settlement path applies is decided by the channel, never by
            // whether a token was presented. A guest is always B2C, so they take
            // the Razorpay path — they can no longer fall through both branches.
            const isB2B = String(userData.clientType).toLowerCase() === 'b2b';

            if (!isB2B) {
                if (!orderId) {
                    return res.status(400).json({
                        success: false,
                        message: "orderId is required for B2C payment verification",
                    });
                }

                const paymentStatus = await this.PaymentStatusCheck(orderId);

                if (paymentStatus.status != "paid") {
                    return res.status(400).json({
                        success: false,
                        message: "Payment not completed for this booking",
                        data: {
                            paymentStatus: paymentStatus.status
                        }
                    });
                }

                // A paid order proves *a* payment happened, not that it was for
                // THIS booking — without this any paid orderId, including one
                // from someone else's trip, unlocks a ticket.
                const paidForBookingId = paymentStatus?.notes?.bookingId;

                if (paidForBookingId && paidForBookingId !== 'N/A') {
                    if (String(paidForBookingId) !== String(bookingId)) {
                        return res.status(400).json({
                            success: false,
                            message: "This payment belongs to a different booking",
                        });
                    }
                } else {
                    // Orders created without a bookingId can't be bound. Logged so
                    // it's visible whether any caller still does this before the
                    // check is made mandatory.
                    console.warn(
                        `[Booking] Razorpay order ${orderId} carries no bookingId in notes; ` +
                        `cannot bind it to booking ${bookingId}.`
                    );
                }

                // "paid" says a payment settled, not that it settled for the right
                // amount — a genuine Rs.1 order for this very booking passed every
                // check above. Razorpay reports paise, we quote rupees.
                //
                // This only proves the customer paid what they were QUOTED. That the
                // quote itself covers the supplier fare is enforced separately, in
                // prepareBooking, against the server-captured reviewedFare —
                // the two together mean the captured amount can never sit below cost.
                const requiredPaise = Math.round(Number(totalPrice || 0) * 100);
                const capturedPaise = Number(
                    paymentStatus?.amount_paid ?? paymentStatus?.amount ?? 0
                );

                // 100 paise of slack absorbs rounding between the two systems.
                if (requiredPaise > 0 && capturedPaise + 100 < requiredPaise) {
                    console.warn(
                        `[Booking ${bookingId}] payment short: captured Rs.${capturedPaise / 100} ` +
                        `against a quoted Rs.${requiredPaise / 100} (order ${orderId}).`
                    );
                    return res.status(400).json({
                        success: false,
                        message: "The payment received does not cover the booking amount",
                        data: {
                            paidAmount: capturedPaise / 100,
                            requiredAmount: requiredPaise / 100,
                        },
                    });
                }
            }

            if (isB2B) {
                const balanceCheck = await this.WalletBalanceCheck(bookingId, totalPrice);

                if (
                    balanceCheck.success != true ||
                    balanceCheck.data.hasSufficientBalance != true
                ) {
                    return res.status(400).json({
                        success: false,
                        message: balanceCheck.message,
                        data: {
                            currentBalance: balanceCheck.currentBalance,
                            requiredAmount: balanceCheck.requiredAmount,
                            shortfallAmount: balanceCheck.shortfallAmount,
                            isAlreadyPaid: balanceCheck.isAlreadyPaid
                        }
                    });
                }

                if (balanceCheck.isAlreadyPaid) {
                    return res.status(400).json({
                        success: false,
                        message: "Booking already paid",
                        data: {
                            bookingId,
                            isAlreadyPaid: true
                        }
                    });
                }
            }

            // Validate first, while a rejection is still free. Everything that can
            // say no without spending — price integrity, traveller and contact
            // details — happens here, so a bad payload never reaches the wallet.
            const preparedPayload = await BookingService.prepareBooking({
                bookingId,
                travellers,
                tripjackPrice,
                markupPrice,
                totalPrice,
                isHold
            });

            // Only now take the money, and take it BEFORE issuing the ticket.
            // Deducting afterwards left a window where two concurrent bookings
            // both passed the balance check and both ticketed, and where a failed
            // debit still handed the customer a valid ticket. If the supplier
            // then rejects the booking we credit it straight back.
            //
            // Guests settle directly with Razorpay and have no wallet, so the
            // deduction stays scoped to signed-in users exactly as before.
            // One target for both directions. B2B debits the token holder
            // (undefined lets auth-service fall back to the JWT); B2C debits the
            // house account. Whatever it is, the refund below must undo it
            // against the same wallet.
            const walletUserId = isB2B ? undefined : process.env.USER_ID;
            const deductsWallet = !isGuest;

            // Refund only what this attempt actually took. The debit is
            // idempotent per bookingId — a retry answers `isDuplicate` and moves
            // no money — so refunding unconditionally credited a wallet that had
            // just been debited zero. A booking left PENDING is still editable by
            // prepareBooking, which is exactly when a client retries.
            //
            // Absent field means an older or stubbed auth-service: assume a real
            // debit and keep the refund, rather than silently stranding one.
            let debited = false;
            if (deductsWallet) {
                const debit = await this.deductWalletBalance(bookingId, totalPrice, walletUserId);
                debited = debit?.data?.isDuplicate !== true;

                if (!debited) {
                    console.warn(
                        `[Booking ${bookingId}] wallet already debited for this booking; ` +
                        `proceeding without a second charge, and no refund is owed if this attempt fails.`
                    );
                }
            }

            let result;
            try {
                result = await BookingService.submitBooking(preparedPayload);
            } catch (bookingError: any) {
                if (debited) {
                    await this.refundWalletBalance(bookingId, totalPrice, walletUserId);
                }
                throw bookingError;
            }

            if (!result) {
                if (debited) {
                    await this.refundWalletBalance(bookingId, totalPrice, walletUserId);
                }
                return res.status(400).json({
                    success: false,
                    message: "Error while perform updating or booking"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Booking updated & TripJack triggered",
                data: result
            });
        } catch (error: any) {
            if (error.response?.data) {
                return res.status(error.response.status || 400).json({
                    success: false,
                    message: error.response.data?.errors?.[0]?.message || error.response.data?.message || "Tripjack API error",
                    data: error.response.data
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || "An unexpected error occurred"
            });
        }
    };

    public getUserBookings = async (req: Request, res: Response) => {
        try {
            const { source, email, page, limit, filter } = req.query;

            const pageNum = Math.max(1, parseInt(page as string) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
            const filterType = (filter as string) || 'all';

            if (source === 'b2c') {
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: "Email is required for B2C source",
                    });
                }

                const bookings = await BookingService.getBookingsByEmail(email as string);

                const b2cBookings = bookings.filter((b: any) =>
                    b.userInfo?.clientType === 'b2c' ||
                    b.userInfo?.clientType?.toLowerCase() === 'b2c'
                );

                const filteredBookings = this.applyFilter(b2cBookings, filterType);

                const total = filteredBookings.length;
                const paginatedBookings = filteredBookings.slice((pageNum - 1) * limitNum, pageNum * limitNum);

                return res.status(200).json({
                    success: true,
                    data: paginatedBookings,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                        hasNextPage: pageNum < Math.ceil(total / limitNum),
                        hasPrevPage: pageNum > 1
                    }
                });
            }

            const token = this.extractToken(req);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Authorization token missing",
                });
            }

            const userData = await this.validateToken(token);

            if (!userData?.id) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user data",
                });
            }

            const result = await BookingService.getBookingsByUserIdPaginated(
                userData.id,
                pageNum,
                limitNum,
                filterType
            );

            const b2bBookings = result.data.filter((b: any) =>
                b.userInfo?.clientType === 'b2b' ||
                b.userInfo?.clientType?.toLowerCase() === 'b2b'
            );

            return res.status(200).json({
                success: true,
                data: b2bBookings,
                pagination: result.pagination
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    };



    public getBookingById = async (req: Request, res: Response) => {
        try {
            const { bookingId } = req.params;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "Booking ID is required",
                });
            }

            if (req.query.source === 'b2c') {
                const booking = await BookingService.getBookingDetailsBySource(
                    bookingId as string,
                    'b2c'
                );

                if (!booking) {
                    return res.status(404).json({
                        success: false,
                        message: "Booking not found",
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: booking,
                });
            }

            const token = this.extractToken(req);

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Authorization token missing",
                });
            }

            const userData = await this.validateToken(token);

            if (!userData?.id) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user data",
                });
            }

            const booking = await BookingService.getBookingDetailsByUser(
                bookingId as string,
                userData.id
            );

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found or unauthorized",
                });
            }

            return res.status(200).json({
                success: true,
                data: booking,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message || "Failed to fetch booking",
            });
        }
    };

    public checkBookingByEmail = async (req: Request, res: Response) => {
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }

            if (!EMAIL_REGEX.test(email as string)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email format"
                });
            }

            const exists = await BookingService.checkBookingExistsByEmail(email as string);

            return res.status(200).json({
                success: true,
                data: {
                    exists,
                    email
                }
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message || "Failed to check booking existence"
            });
        }
    };

    public testProcessAftermath = async (req: Request, res: Response) => {
        try {
            const bookingId = req.params.bookingId || req.query.bookingId || req.body.bookingId;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "bookingId is required"
                });
            }



            const result = await BookingService.processBookingAftermathById(bookingId);

            res.status(result.success ? 200 : 500).json(result);
        } catch (error: any) {

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    };
}

export default new BookingLocalController();