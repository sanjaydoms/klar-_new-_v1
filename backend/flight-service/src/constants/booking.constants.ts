export const PAX_TITLES = {
    ADULT: ['Mr', 'Mrs', 'Ms'],
    CHILD: ['Ms', 'Master'],
    INFANT: ['Ms', 'Master']
} as const;

/**
 * Letters-only rejected real passengers — "Mary Jane", "Jean-Luc", "O'Brien".
 * A UAT probe showed TripJack itself accepts all of those (and even digits), so
 * being stricter than the supplier here only blocks valid bookings. Still
 * requires a leading letter and bars digits, which are always a data error.
 */
export const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{0,49}$/;
export const PHONE_REGEX = /^\+\d{10,15}$/;
/**
 * TripJack validates delivery emails itself and rejects a malformed one with
 * errCode 800 — after the fare has been held. Catching it here keeps that
 * round-trip out of the booking path.
 *
 * Deliberately stricter than the `[^\s@]+\.[^\s@]+` version this replaces: that
 * one accepted `x@y.z`, which is exactly the address TripJack turned down. A
 * real TLD is at least two letters, so that is what we require. Anything beyond
 * this is the supplier's call, not ours.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
export const PASSPORT_REGEX = /^[A-Z0-9]{6,9}$/;
/**
 * TripJack's own rule is length: errCode 805 is "Invalid GSTIN (must be 15
 * chars)". Callers must normalise (trim + uppercase) before testing — this
 * demanding uppercase against un-normalised input is why the check was
 * commented out rather than fixed.
 */
export const GST_REGEX = /^[0-9A-Z]{15}$/;

/** Structure of an Indian GSTIN: state(2) + PAN(10) + entity(1) + Z + checksum(1). */
export const GSTIN_STRUCTURE_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * GSTIN check digit (the standard mod-36 scheme).
 *
 * TripJack does verify this — errCode 805 reads "should be 15 characters only
 * and valid GST", and it rejected the GSTIN printed in its own documentation
 * (29ABBCR4749R3ZF, whose check digit should be D, not F). So checking here
 * matches the supplier rather than out-guessing it, and catches the error before
 * the wallet is debited instead of after.
 */
export function isValidGstin(gstNumber: string): boolean {
    if (!GSTIN_STRUCTURE_REGEX.test(gstNumber)) return false;

    let total = 0;
    for (let i = 0; i < 14; i++) {
        const value = GSTIN_CHARSET.indexOf(gstNumber[i]);
        if (value < 0) return false;
        const product = value * (i % 2 === 0 ? 1 : 2);
        total += Math.floor(product / 36) + (product % 36);
    }

    return GSTIN_CHARSET[(36 - (total % 36)) % 36] === gstNumber[14];
}

/** IATA field limits carried in the TripJack docs. */
export const GST_REGISTERED_NAME_MAX = 35;
export const GST_ADDRESS_MAX = 70;

export const ERROR_CODES = {
    INVALID_TITLE: 'INVALID_TITLE',
    INVALID_NAME: 'INVALID_NAME',
    INVALID_PHONE: 'INVALID_PHONE',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_PASSPORT: 'INVALID_PASSPORT',
    INVALID_GST: 'INVALID_GST',
    INFANT_MORE_THAN_ADULT: 'INFANT_MORE_THAN_ADULT'
} as const;