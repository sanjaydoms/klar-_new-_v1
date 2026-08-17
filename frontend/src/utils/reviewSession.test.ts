import { describe, it, expect, beforeEach } from 'vitest';
import { storeReviewData, readReviewData } from './reviewSession';

const payload = { sessionId: 'S1', mappedData: { bookingId: 'B1' } };

beforeEach(() => sessionStorage.clear());

describe('storeReviewData', () => {
  it('unwraps a full API response to the canonical level', () => {
    storeReviewData({ success: true, data: payload });
    expect(JSON.parse(sessionStorage.getItem('onewayReviewData')!)).toEqual(payload);
  });

  it('stores an already-unwrapped payload as-is', () => {
    storeReviewData(payload);
    expect(JSON.parse(sessionStorage.getItem('onewayReviewData')!)).toEqual(payload);
  });

  it('retires the legacy mobile key', () => {
    sessionStorage.setItem('reviewData', JSON.stringify({ data: payload }));
    storeReviewData({ data: payload });
    expect(sessionStorage.getItem('reviewData')).toBeNull();
  });
});

describe('readReviewData', () => {
  it('reads the canonical key', () => {
    storeReviewData({ data: payload });
    expect(readReviewData()).toEqual(payload);
  });

  it('falls back to a legacy wrapped mobile session', () => {
    sessionStorage.setItem('reviewData', JSON.stringify({ success: true, data: payload }));
    expect(readReviewData()).toEqual(payload);
  });

  it('unwraps a legacy desktop shape stored unwrapped', () => {
    sessionStorage.setItem('onewayReviewData', JSON.stringify(payload));
    expect(readReviewData()).toEqual(payload);
  });

  it('returns null when nothing is stored, skipping corrupt entries', () => {
    expect(readReviewData()).toBeNull();
    sessionStorage.setItem('onewayReviewData', 'not json');
    expect(readReviewData()).toBeNull();
  });
});
