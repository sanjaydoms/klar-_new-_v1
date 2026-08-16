/**
 * A yes/no fact that the supplier may simply not have told us.
 *
 * The reference implementation got this right once and wrong once. Its
 * `deriveRefundable()` correctly distinguished "no signal" from "not
 * refundable" and returned `unknown: true`; but the value it carried alongside
 * that flag was `isRefundable: false`, and every call site that forgot to check
 * the flag rendered a hard "Non-Refundable" the supplier never said.
 *
 * A three-valued type makes the third case impossible to drop, because there is
 * no boolean to read past.
 */
export type Tristate = 'TRUE' | 'FALSE' | 'UNKNOWN';

export const fromBoolean = (v: boolean | null | undefined): Tristate =>
  v === true ? 'TRUE' : v === false ? 'FALSE' : 'UNKNOWN';

export const isKnown = (t: Tristate): boolean => t !== 'UNKNOWN';

/** For the legacy frontend contract, which expects `boolean | undefined`. */
export const toOptionalBoolean = (t: Tristate): boolean | undefined =>
  t === 'UNKNOWN' ? undefined : t === 'TRUE';
