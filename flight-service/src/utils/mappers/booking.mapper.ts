import {
    FrontendBookingPayload,
    FrontendTraveller,
    TripjackBookingPayload,
    TripjackTraveller
} from "../../types/booking.types";
import { normaliseGstNumber } from "../tripjackBookingVerifier";

function mapTraveller(t: FrontendTraveller): TripjackTraveller {
    const traveller: TripjackTraveller = {
        ti: t.title,
        pt: t.paxType,
        fN: t.firstName,
        lN: t.lastName,
        ...(t.dob && { dob: t.dob })
    };

    const hasAnyPassport =
        t.passportNumber ||
        t.passportNationality ||
        t.passportIssueDate ||
        t.passportExpiryDate;

    const hasFullPassport =
        t.passportNumber &&
        t.passportNationality &&
        t.passportIssueDate &&
        t.passportExpiryDate;

    if (hasFullPassport) {
        traveller.pNum = t.passportNumber!;
        traveller.pNat = t.passportNationality!;
        traveller.pid = t.passportIssueDate!;
        traveller.eD = t.passportExpiryDate!;
    }

    // Conditional per the Review response: pan when conditions.ipa is set, di
    // when conditions.dc.idm is. Neither was mapped at all before, so a fare that
    // demanded them could not be booked no matter what the customer supplied.
    if (t.pan?.trim()) traveller.pan = t.pan.trim().toUpperCase();
    if (t.documentId?.trim()) traveller.di = t.documentId.trim();

    if (t.ssrSeatInfos?.length) traveller.ssrSeatInfos = t.ssrSeatInfos;
    if (t.ssrMealInfos?.length) traveller.ssrMealInfos = t.ssrMealInfos;
    if (t.ssrBaggageInfos?.length) traveller.ssrBaggageInfos = t.ssrBaggageInfos;

    return traveller;
}

export function mapToTripjackBooking(
    payload: FrontendBookingPayload
): TripjackBookingPayload {
    const result: TripjackBookingPayload = {
        bookingId: payload.bookingId,

        deliveryInfo: {
            emails: [payload.email],
            contacts: [payload.phone],
        },

        travellerInfo: payload.travellers.map(mapTraveller),
    };

    if (!payload.isHold) {
        result.paymentInfos = [{ amount: payload.amount }];
    }

    // Same trap as the verifier: an unset Mongoose nested path is `{}`, which is
    // truthy, so this used to send contactInfo with three undefined values. Only
    // emit it when there is an actual contact to send.
    if (payload.emergencyContact?.phone || payload.emergencyContact?.email) {
        result.contactInfo = {
            emails: [payload.emergencyContact.email],
            contacts: [payload.emergencyContact.phone],
            ecn: payload.emergencyContact.name,
        };
    }
    if (payload.gstInfo) {
        const gstInfo: any = {
            // Send the canonical form we validated, not the raw keystrokes.
            gstNumber: normaliseGstNumber(payload.gstInfo.gstNumber),
            registeredName: payload.gstInfo.registeredName?.trim(),
        };

        if (payload.gstInfo.email?.trim()) gstInfo.email = payload.gstInfo.email.trim();
        if (payload.gstInfo.mobile?.trim()) gstInfo.mobile = payload.gstInfo.mobile.trim();
        if (payload.gstInfo.address?.trim()) gstInfo.address = payload.gstInfo.address.trim();

        result.gstInfo = gstInfo;
    }

    return result;
}