import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthResult, AuthVerifier } from '../../modules/ports.js';

export interface HmacJwtVerifierOptions {
  readonly secret: string;
  readonly now?: () => number;
}

interface JwtPayload {
  readonly sub?: unknown;
  readonly exp?: unknown;
}

const BEARER_PREFIX = 'Bearer ';

const fail = (reason: string): Promise<AuthResult> => Promise.resolve({ ok: false, reason });

/**
 * The minimal HS256 check this API needs: three base64url segments, a
 * signature recomputed and compared in constant time, and an `exp` that has
 * not passed. No claim beyond `sub` and `exp` is read, and no library is
 * pulled in for it — the whole thing is one HMAC and a JSON.parse either
 * side of it.
 *
 * This verifies a token; it does not mint one. Something else — an
 * auth-service, per ADR-0008 — issues tokens signed with the same secret.
 */
export class HmacJwtVerifier implements AuthVerifier {
  readonly #secret: string;
  readonly #now: () => number;

  constructor(options: HmacJwtVerifierOptions) {
    this.#secret = options.secret;
    this.#now = options.now ?? Date.now;
  }

  verify(header: string | undefined): Promise<AuthResult> {
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      return fail('missing bearer token');
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    const parts = token.split('.');
    if (parts.length !== 3) return fail('malformed token');
    const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

    let headerJson: unknown;
    try {
      headerJson = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    } catch {
      return fail('malformed token header');
    }
    if (
      typeof headerJson !== 'object' ||
      headerJson === null ||
      (headerJson as { alg?: unknown }).alg !== 'HS256'
    ) {
      return fail('unsupported algorithm');
    }

    const expectedSig = createHmac('sha256', this.#secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const providedSig = Buffer.from(signatureB64, 'base64url');
    if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
      return fail('signature mismatch');
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as JwtPayload;
    } catch {
      return fail('malformed token payload');
    }

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= this.#now()) {
      return fail('token expired');
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return fail('token carries no subject');
    }

    return Promise.resolve({ ok: true, userId: payload.sub });
  }
}

/**
 * The default when no verifier is configured: refuses everything, loudly —
 * the same posture `refusingPaymentGateway` takes on an unconfigured charge.
 * A permissive default here is exactly OPEN-ISSUES §4's "must not reach
 * production unresolved."
 */
export const refusingAuthVerifier: AuthVerifier = {
  verify: () => fail('no auth verifier is configured'),
};
