/**
 * Auto Reissue fare arithmetic and payload shapes.
 *
 * A reissue search does not quote a new ticket price — it quotes the DIFFERENCE.
 * `BF` and `TAF` are new-minus-old, and `TF` is what is actually payable:
 *
 *   TF = (new BF - old BF) + (new tax - old tax) + ARF + ARFT + AFS - RSSR
 *
 * Reading `TF` as an absolute fare, or summing the components by hand, is the
 * easy way to charge the wrong amount here — so the supplier's `TF` is always
 * what gets paid, and the breakdown below exists to explain it, not to compute it.
 */

export interface ReissueFareBreakdown {
    /** What the customer pays. Straight from the supplier — never recomputed. */
    totalPayable: number;
    baseFareDifference: number;
    taxDifference: number;
    airlineReissueFee: number;
    airlineReissueFeeTax: number;
    tripjackReissueFee: number;
    /** Ancillaries from the original booking that come back as credit. */
    refundableAncillaries: number;
    originalTotalFare: number;
    /** Sum of the parts, for display reconciliation against totalPayable. */
    computedTotal: number;
}

export function extractReissueFare(fare: any, paxType = "ADULT"): ReissueFareBreakdown | null {
    const fc = fare?.fd?.[paxType]?.fC;
    if (!fc) return null;

    const afc = fare?.fd?.[paxType]?.afc ?? {};

    const baseFareDifference = Number(fc.BF ?? 0);
    const taxDifference = Number(fc.TAF ?? 0);
    const airlineReissueFee = Number(afc.ARF ?? fc.ARF ?? 0);
    const airlineReissueFeeTax = Number(afc.ARFT ?? fc.ARFT ?? 0);
    const tripjackReissueFee = Number(fc.AFS ?? 0);
    const refundableAncillaries = Number(fc.RSSR ?? 0);

    return {
        totalPayable: Number(fc.TF ?? 0),
        baseFareDifference,
        taxDifference,
        airlineReissueFee,
        airlineReissueFeeTax,
        tripjackReissueFee,
        refundableAncillaries,
        originalTotalFare: Number(fc.OTF ?? 0),
        computedTotal:
            Math.round(
                (baseFareDifference +
                    taxDifference +
                    airlineReissueFee +
                    airlineReissueFeeTax +
                    tripjackReissueFee -
                    refundableAncillaries) * 100
            ) / 100,
    };
}

/**
 * Step 1 request.
 *
 * The published doc nests these under `searchQuery`; the live API rejects that
 * with "paxInfo : may not be null" and wants them flat at the root. Probed
 * against UAT — see the reissue service for the observed responses.
 */
export function buildReissueQuery(params: {
    paxInfo: { ADULT: number; CHILD?: number; INFANT?: number };
    routeInfos: Array<{ from: string; to: string; travelDate: string }>;
    pnr: string;
    oldBookingId: string;
    paxIds: Array<string | number>;
}) {
    return {
        paxInfo: {
            ADULT: params.paxInfo.ADULT,
            CHILD: params.paxInfo.CHILD ?? 0,
            INFANT: params.paxInfo.INFANT ?? 0,
        },
        routeInfos: params.routeInfos.map((r) => ({
            fromCityOrAirport: { code: r.from },
            toCityOrAirport: { code: r.to },
            travelDate: r.travelDate,
        })),
        pnr: params.pnr,
        oldBookingId: params.oldBookingId,
        paxIds: params.paxIds.map(String),
    };
}

/**
 * Step 4 request. Traveller details must match the original booking exactly
 * (doc), so callers pass what booking-details returned rather than anything a
 * client supplied.
 */
export function buildAutoReissuePayload(params: {
    bookingId: string;
    oldBookingId: string;
    amount: number;
    deliveryInfo: { emails: string[]; contacts: string[] };
    travellers: Array<any>;
    gstInfo?: any;
}) {
    const payload: any = {
        bookingId: params.bookingId,
        oldBookingId: params.oldBookingId,
        paymentInfos: [{ amount: params.amount, bookingId: params.bookingId }],
        deliveryInfo: params.deliveryInfo,
        travellerInfo: params.travellers.map((t) => {
            const mapped: any = {
                ti: t.ti ?? t.title,
                pt: t.pt ?? t.paxType,
                fN: t.fN ?? t.firstName,
                lN: t.lN ?? t.lastName,
            };
            if (t.dob) mapped.dob = t.dob;
            if (t.pNum ?? t.passportNumber) mapped.pNum = t.pNum ?? t.passportNumber;
            if (t.eD ?? t.passportExpiryDate) mapped.eD = t.eD ?? t.passportExpiryDate;
            if (t.pNat ?? t.passportNationality) mapped.pNat = t.pNat ?? t.passportNationality;
            if (t.pan) mapped.pan = t.pan;
            return mapped;
        }),
    };

    if (params.gstInfo?.gstNumber) payload.gstInfo = params.gstInfo;

    return payload;
}

/** Cabin ranking — the doc permits upgrades but never downgrades. */
const CABIN_RANK: Record<string, number> = {
    ECONOMY: 1,
    PREMIUM_ECONOMY: 2,
    BUSINESS: 3,
    FIRST: 4,
};

export function isCabinDowngrade(original?: string, requested?: string): boolean {
    const a = CABIN_RANK[String(original || "").toUpperCase()];
    const b = CABIN_RANK[String(requested || "").toUpperCase()];
    if (!a || !b) return false;
    return b < a;
}
