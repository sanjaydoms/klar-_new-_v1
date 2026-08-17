import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HmacJwtVerifier, refusingAuthVerifier } from './jwt-verifier.js';

const SECRET = 'test-secret';

const b64url = (input: unknown): string =>
  Buffer.from(JSON.stringify(input)).toString('base64url');

function sign(
  payload: Record<string, unknown>,
  secret = SECRET,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
): string {
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

describe('HmacJwtVerifier', () => {
  it('accepts a validly signed, unexpired token and reports its subject', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET, now: () => 1_000_000 });
    const token = sign({ sub: 'user-42', exp: 2_000 });

    const result = await verifier.verify(`Bearer ${token}`);

    expect(result).toEqual({ ok: true, userId: 'user-42' });
  });

  it('accepts a token with no exp claim', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    const token = sign({ sub: 'user-1' });

    expect(await verifier.verify(`Bearer ${token}`)).toEqual({ ok: true, userId: 'user-1' });
  });

  it('refuses a missing header', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    expect((await verifier.verify(undefined)).ok).toBe(false);
  });

  it('refuses a header with no Bearer prefix', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    expect((await verifier.verify('Basic abc123')).ok).toBe(false);
  });

  it('refuses a token signed with a different secret', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET, now: () => 0 });
    const token = sign({ sub: 'user-1', exp: 1_000 }, 'wrong-secret');

    expect((await verifier.verify(`Bearer ${token}`)).ok).toBe(false);
  });

  it('refuses an expired token', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET, now: () => 5_000_000 });
    const token = sign({ sub: 'user-1', exp: 1_000 });

    const result = await verifier.verify(`Bearer ${token}`);
    expect(result).toEqual({ ok: false, reason: 'token expired' });
  });

  it('refuses a token whose alg is not HS256', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    const token = sign({ sub: 'user-1' }, SECRET, { alg: 'none' });

    expect((await verifier.verify(`Bearer ${token}`)).ok).toBe(false);
  });

  it('refuses a token with no subject', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    const token = sign({ exp: 99_999_999_999 });

    expect((await verifier.verify(`Bearer ${token}`)).ok).toBe(false);
  });

  it('refuses a malformed token', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    expect((await verifier.verify('Bearer not-a-jwt')).ok).toBe(false);
  });

  it('refuses a token whose signature was tampered with a shorter value', async () => {
    const verifier = new HmacJwtVerifier({ secret: SECRET });
    const token = sign({ sub: 'user-1' });
    const [h, p] = token.split('.');

    expect((await verifier.verify(`Bearer ${h}.${p}.x`)).ok).toBe(false);
  });
});

describe('refusingAuthVerifier', () => {
  it('refuses every request', async () => {
    const result = await refusingAuthVerifier.verify('Bearer whatever');
    expect(result).toEqual({ ok: false, reason: 'no auth verifier is configured' });
  });
});
