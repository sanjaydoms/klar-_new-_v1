import { describe, expect, it } from 'vitest';
import { supplierCode } from '../../domain/shared/brand.js';
import { supplierError, countsAgainstBreaker } from '../contract/errors.js';
import { deadlineAt, deadlineIn } from '../contract/context.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { callSupplier } from './call.js';
import { createImageResolver } from './images.js';
import { readNumber, readString, readStringList, readGeoPoint } from './parse.js';
import { frozenClock, instantSleep, stubTransport, testContext } from '../testing/harness.js';

const TJ = supplierCode('TJ');

describe('Deadline', () => {
  it('is absolute, so sub-budgets can only move it nearer', () => {
    // A per-call duration would let each step grant itself a fresh budget; the
    // search would then routinely outlive the deadline it was given.
    const d = deadlineAt(1_010_000);
    expect(d.withBudget(20_000, 1_000_000).at).toBe(1_010_000);
    expect(d.withBudget(5_000, 1_000_000).at).toBe(1_005_000);
  });

  it('reports remaining time and expiry against a supplied clock', () => {
    const d = deadlineIn(15_000, 1_000_000);
    expect(d.remainingMs(1_005_000)).toBe(10_000);
    expect(d.hasPassed(1_014_999)).toBe(false);
    expect(d.hasPassed(1_015_000)).toBe(true);
    expect(d.remainingMs(1_099_999)).toBe(0);
  });
});

describe('CircuitBreaker', () => {
  const build = (at = { now: 1_000 }) =>
    new CircuitBreaker({ failureThreshold: 3, openMs: 30_000, now: () => at.now });

  it('opens only after the threshold is reached', () => {
    const clock = { now: 1_000 };
    const b = build(clock);
    b.recordFailure();
    b.recordFailure();
    expect(b.canAttempt()).toBe(true);
    b.recordFailure();
    expect(b.state()).toBe('OPEN');
    expect(b.canAttempt()).toBe(false);
  });

  it('admits exactly one probe when half open', () => {
    // Letting the queued burst through the instant the window elapses is how a
    // recovering supplier gets knocked over again.
    const clock = { now: 1_000 };
    const b = build(clock);
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    clock.now += 30_000;
    expect(b.state()).toBe('HALF_OPEN');
    expect(b.canAttempt()).toBe(true);
    expect(b.canAttempt()).toBe(false);
  });

  /**
   * The probe is what the breaker exists for: it decides whether the supplier
   * is back. A failed one used to leave the breaker half open — `openedAt` had
   * not moved, so `state()` still read HALF_OPEN and the *next* call was
   * admitted, and the next, until a whole fresh threshold of failures piled up.
   * "Exactly one probe" became one probe per call for as long as the supplier
   * stayed down, and on the booking path those calls are commits.
   */
  it('re-opens immediately when the probe fails', () => {
    const clock = { now: 1_000 };
    const b = build(clock);
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    clock.now += 30_000;

    expect(b.canAttempt()).toBe(true);
    b.recordFailure();

    expect(b.state()).toBe('OPEN');
    expect(b.canAttempt()).toBe(false);

    // And the new window is measured from the failed probe, not from the
    // original opening.
    clock.now += 29_999;
    expect(b.state()).toBe('OPEN');
    clock.now += 1;
    expect(b.state()).toBe('HALF_OPEN');
  });

  it('is closed at a clock reading of zero', () => {
    // `openedAt` used to be a number with 0 meaning "never opened", so a
    // breaker that opened at time 0 read as closed for ever.
    const clock = { now: 0 };
    const b = build(clock);
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    expect(b.state()).toBe('OPEN');
  });

  it('closes again after a successful probe', () => {
    const clock = { now: 1_000 };
    const b = build(clock);
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    clock.now += 30_000;
    b.canAttempt();
    b.recordSuccess();
    expect(b.state()).toBe('CLOSED');
  });

  it('does not count our own cancellations against a supplier', () => {
    expect(countsAgainstBreaker('SUPPLIER_CANCELLED')).toBe(false);
    expect(countsAgainstBreaker('SUPPLIER_SOLD_OUT')).toBe(false);
    expect(countsAgainstBreaker('SUPPLIER_RATE_EXPIRED')).toBe(false);
    expect(countsAgainstBreaker('SUPPLIER_TIMEOUT')).toBe(true);
    expect(countsAgainstBreaker('SUPPLIER_UNAVAILABLE')).toBe(true);
  });
});

describe('callSupplier', () => {
  const deps = (transport: ReturnType<typeof stubTransport>, maxRetries = 1) => ({
    transport,
    breaker: new CircuitBreaker({ failureThreshold: 5, openMs: 30_000, now: frozenClock() }),
    timeoutMs: 10_000,
    maxRetries,
    now: frozenClock(),
    sleep: instantSleep,
  });

  it('returns a failure value rather than throwing', async () => {
    const t = stubTransport([{ path: '/x', throws: 'NETWORK' }]);
    const out = await callSupplier(testContext(TJ), deps(t), { method: 'GET', path: '/x' }, (r) => ({
      ok: true as const,
      value: r.body,
    }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('SUPPLIER_UNAVAILABLE');
  });

  it('retries a retryable failure and stops at the limit', async () => {
    const t = stubTransport([{ path: '/x', status: 500, body: {} }]);
    const out = await callSupplier(
      testContext(TJ),
      deps(t, 2),
      { method: 'GET', path: '/x' },
      (r) => ({ ok: true as const, value: r.body }),
      { repeatable: true },
    );
    expect(out.ok).toBe(false);
    expect(t.calls).toHaveLength(3); // initial + 2 retries
  });

  /**
   * The default, and the reason it is the default.
   *
   * A retry is worth one extra call on a search and is worth a second hotel
   * reservation on a commit. So repeating is opt-in: an author who forgets it
   * on a read loses a retry, and one who forgets it on a write loses nothing,
   * because there was nothing to forget.
   */
  it('does not repeat a call that was not declared repeatable', async () => {
    const t = stubTransport([{ path: '/x', status: 500, body: {} }]);
    const out = await callSupplier(testContext(TJ), deps(t, 2), { method: 'POST', path: '/x' }, (r) => ({
      ok: true as const,
      value: r.body,
    }));
    expect(out.ok).toBe(false);
    expect(t.calls).toHaveLength(1);
  });

  it('does not retry a failure that cannot succeed on a retry', async () => {
    const t = stubTransport([{ path: '/x', status: 401, body: {} }]);
    await callSupplier(testContext(TJ), deps(t, 3), { method: 'GET', path: '/x' }, (r) => ({
      ok: true as const,
      value: r.body,
    }));
    expect(t.calls).toHaveLength(1);
  });

  it('refuses to call at all once the deadline has passed', async () => {
    const t = stubTransport([{ path: '/x', status: 200, body: {} }]);
    const ctx = testContext(TJ, { now: 1_000_000, deadlineAtMs: 999_000 });
    const out = await callSupplier(ctx, deps(t), { method: 'GET', path: '/x' }, (r) => ({
      ok: true as const,
      value: r.body,
    }));
    expect(t.calls).toHaveLength(0);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('SUPPLIER_CANCELLED');
  });

  it('reports an open breaker as such rather than as slowness', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, openMs: 30_000, now: frozenClock() });
    breaker.recordFailure();
    const t = stubTransport([{ path: '/x', status: 200, body: {} }]);
    const out = await callSupplier(
      testContext(TJ),
      { ...deps(t), breaker },
      { method: 'GET', path: '/x' },
      (r) => ({ ok: true as const, value: r.body }),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.code).toBe('SUPPLIER_CIRCUIT_OPEN');
    expect(t.calls).toHaveLength(0);
  });

  it('keeps the supplier body out of the normalised error', async () => {
    const t = stubTransport([
      { path: '/x', status: 500, body: { description: 'upstream pool exhausted', stack: 'secret' } },
    ]);
    const out = await callSupplier(testContext(TJ), deps(t, 0), { method: 'GET', path: '/x' }, (r) => ({
      ok: true as const,
      value: r.body,
    }));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.message).toContain('upstream pool exhausted');
      expect(JSON.stringify(out.error)).not.toContain('secret');
    }
  });
});

describe('image resolution', () => {
  const resolve = createImageResolver('https://cdn.example/img');

  it('passes absolute URLs through', () => {
    expect(resolve('https://other.example/a.jpg')).toEqual(['https://other.example/a.jpg']);
  });

  it('resolves bare filenames against the supplier base', () => {
    expect(resolve('a.jpg')).toEqual(['https://cdn.example/img/a.jpg']);
  });

  it('drops relative paths when no base is configured', () => {
    // Better an empty gallery than a guessed host. The reference inferred a CDN
    // from the file extension and pointed TripJack images at Hotelbeds.
    expect(createImageResolver(undefined)('a.jpg')).toEqual([]);
    expect(createImageResolver(undefined)('https://ok.example/a.jpg')).toHaveLength(1);
  });

  it('upgrades protocol-relative URLs', () => {
    expect(resolve('//cdn.example/a.jpg')).toEqual(['https://cdn.example/a.jpg']);
  });

  it('reads a links map, preferring the largest rendition', () => {
    expect(
      resolve([{ links: { thumb: { href: 'https://x.example/s.jpg' }, '1000px': { href: 'https://x.example/l.jpg' } } }]),
    ).toEqual(['https://x.example/l.jpg']);
  });

  it('de-duplicates', () => {
    expect(resolve(['a.jpg', 'a.jpg'])).toHaveLength(1);
  });
});

describe('payload readers', () => {
  it('accepts zero instead of falling through to the next candidate', () => {
    // The `a || b || c` chains this replaces skipped a legitimate zero tax and
    // silently used whatever came next.
    expect(readNumber({ taxes: 0, fallback: 999 }, 'taxes', 'fallback')).toBe(0);
  });

  it('parses comma-grouped numeric strings', () => {
    expect(readNumber({ amount: '1,180.50' }, 'amount')).toBe(1180.5);
  });

  it('returns undefined rather than an empty string', () => {
    expect(readString({ name: '   ' }, 'name')).toBeUndefined();
    expect(readString({}, 'name')).toBeUndefined();
  });

  it('reads the four shapes a supplier list arrives in', () => {
    expect(readStringList(['Pool', 'Spa'])).toEqual(['Pool', 'Spa']);
    expect(readStringList([{ name: 'Pool' }, { facilityName: 'Spa' }])).toEqual(['Pool', 'Spa']);
    expect(readStringList({ '1': { name: 'Pool' } })).toEqual(['Pool']);
    expect(readStringList('["Pool","Spa"]')).toEqual(['Pool', 'Spa']);
  });

  it('rejects out-of-range coordinates', () => {
    expect(readGeoPoint({ lat: 15.2, lng: 73.9 }, ['lat'], ['lng'])).toEqual({ lat: 15.2, lng: 73.9 });
    expect(readGeoPoint({ lat: 991, lng: 73.9 }, ['lat'], ['lng'])).toBeUndefined();
    expect(readGeoPoint({ lat: '15.2', lng: '73.9' }, ['lat'], ['lng'])).toEqual({ lat: 15.2, lng: 73.9 });
  });
});

describe('error taxonomy', () => {
  it('marks transient failures retryable and permanent ones not', () => {
    expect(supplierError('SUPPLIER_TIMEOUT', 'x').retryable).toBe(true);
    expect(supplierError('SUPPLIER_RATE_LIMITED', 'x').retryable).toBe(true);
    expect(supplierError('SUPPLIER_AUTH_FAILED', 'x').retryable).toBe(false);
    expect(supplierError('SUPPLIER_SOLD_OUT', 'x').retryable).toBe(false);
  });
});
