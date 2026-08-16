import { FrontendBookingPayload } from "../types/booking.types";
import { formatPhoneNumber } from "./helper/phoneFormater.helper";
import {
    NAME_REGEX,
    PHONE_REGEX,
    EMAIL_REGEX,
    GST_REGEX,
    isValidGstin,
    GST_REGISTERED_NAME_MAX,
    GST_ADDRESS_MAX,
    PASSPORT_REGEX,
    PAX_TITLES
} from "../constants/booking.constants";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Users type GSTINs with spaces and in mixed case; the supplier wants neither. */
export function normaliseGstNumber(gstNumber: string): string {
    return (gstNumber || "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Every address that ends up in the TripJack request: deliveryInfo.emails,
 * contactInfo.emails, gstInfo.email.
 *
 * Split out from validateBookingPayload because the booking path that is
 * actually used — book-local/update-and-book — never calls that function, so a
 * check living only there would never run. Both routes call this one.
 */
export function validateBookingEmails(source: {
    email?: string;
    emergencyContact?: { email?: string } | null;
    gstInfo?: { email?: string } | null;
}) {
    if (!source.email) throw new Error("Email is required");

    if (!EMAIL_REGEX.test(source.email.trim())) {
        throw new Error("Invalid email format");
    }

    const emergency = source.emergencyContact?.email;
    if (emergency?.trim() && !EMAIL_REGEX.test(emergency.trim())) {
        throw new Error("Invalid emergency contact email");
    }

    const gst = source.gstInfo?.email;
    if (gst?.trim() && !EMAIL_REGEX.test(gst.trim())) {
        throw new Error("Invalid GST email");
    }
}

export function validateBookingPayload(payload: FrontendBookingPayload) {
    
    if (!payload.bookingId) throw new Error("bookingId is required");

    if (!PHONE_REGEX.test(formatPhoneNumber(payload.phone || ""))) {
        // Normalise first: bookings stored before this validation ran hold bare
        // numbers, and formatPhoneNumber is what the emergency contact already
        // goes through. Rejecting "9000000000" outright would break them.
        throw new Error("Invalid phone format");
    }

    validateBookingEmails(payload);

    let adultCount = 0;
    let infantCount = 0;

    payload.travellers.forEach((t, index) => {
        if (!NAME_REGEX.test(t.firstName)) {
            throw new Error(`Invalid firstName at traveller ${index}`);
        }

        if (!NAME_REGEX.test(t.lastName)) {
            throw new Error(`Invalid lastName at traveller ${index}`);
        }

        // Indexing PAX_TITLES directly threw a TypeError on an unknown or missing
        // paxType, surfacing as a 500 instead of a validation message.
        const allowedTitles = PAX_TITLES[t.paxType];
        if (!allowedTitles) {
            throw new Error(
                `Invalid paxType "${t.paxType}" at traveller ${index} (expected ADULT, CHILD or INFANT)`
            );
        }

        if (!allowedTitles.includes(t.title as any)) {
            throw new Error(
                `Invalid title "${t.title}" at traveller ${index} (expected ${allowedTitles.join(", ")})`
            );
        }

        if (t.dob && !DATE_REGEX.test(t.dob)) {
            throw new Error(
                `Invalid DOB at traveller ${index} — expected YYYY-MM-DD, got "${t.dob}"`
            );
        }

        if (t.paxType === "ADULT") adultCount++;
        if (t.paxType === "INFANT") infantCount++;

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

        if (hasAnyPassport && !hasFullPassport) {
            throw new Error(`Incomplete passport at traveller ${index}`);
        }

        if (hasFullPassport) {
            if (!PASSPORT_REGEX.test(t.passportNumber!)) {
                throw new Error(`Invalid passport number at traveller ${index}`);
            }

            if (!DATE_REGEX.test(t.passportExpiryDate!)) {
                throw new Error(`Invalid passport expiry at traveller ${index}`);
            }
        }
    });

    if (infantCount > adultCount) {
        throw new Error("Infants cannot exceed adults");
    }

    if (payload.gstInfo?.gstNumber) {
        // Normalise before testing, then apply the supplier's own rule: 15
        // characters AND a valid check digit (errCode 805).
        const gstNumber = normaliseGstNumber(payload.gstInfo.gstNumber);

        if (!GST_REGEX.test(gstNumber)) {
            throw new Error(
                `Invalid GST number "${payload.gstInfo.gstNumber}" — must be 15 letters/digits`
            );
        }

        // TripJack verifies the check digit too ("...and valid GST", errCode
        // 805). Catching it here saves a debit-then-refund round trip.
        if (!isValidGstin(gstNumber)) {
            throw new Error(
                `Invalid GST number "${gstNumber}" — the check digit does not match, please re-enter it`
            );
        }

        if (!payload.gstInfo.registeredName?.trim()) {
            throw new Error("GST registered name is required when a GST number is supplied");
        }

        // IATA limits per the docs; exceeding them is rejected downstream.
        if (payload.gstInfo.registeredName.trim().length > GST_REGISTERED_NAME_MAX) {
            throw new Error(
                `GST registered name must be ${GST_REGISTERED_NAME_MAX} characters or fewer`
            );
        }

        if ((payload.gstInfo.address?.trim().length ?? 0) > GST_ADDRESS_MAX) {
            throw new Error(`GST address must be ${GST_ADDRESS_MAX} characters or fewer`);
        }
    }

    // Mongoose hands back `{}` for an unset nested path, so testing the object
    // itself rejected every booking that simply has no emergency contact.
    // Validate the value, not the container.
    if (payload.emergencyContact?.phone) {
        if (!PHONE_REGEX.test(formatPhoneNumber(payload.emergencyContact.phone))) {
            throw new Error("Invalid emergency phone");
        }
    }
}