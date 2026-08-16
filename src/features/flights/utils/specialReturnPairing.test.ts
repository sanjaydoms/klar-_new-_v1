import { describe, it, expect } from 'vitest';
import {
  specialReturnPairingError,
  msriContains,
  PAIRING_MESSAGES,
} from './specialReturnPairing';

const special = (over: any = {}) => ({ fareIdentifier: 'SPECIAL_RETURN', ...over });
const published = (over: any = {}) => ({ fareIdentifier: 'PUBLISHED', ...over });

describe('specialReturnPairingError', () => {
  it('judges nothing until both legs are chosen', () => {
    expect(specialReturnPairingError(special({ sri: 'A' }), null)).toBeNull();
    expect(specialReturnPairingError(null, null)).toBeNull();
  });

  it('leaves regular fares alone', () => {
    expect(specialReturnPairingError(published(), published())).toBeNull();
  });

  it('rejects a Special Return paired with a regular fare, either way round', () => {
    expect(specialReturnPairingError(special({ sri: 'A' }), published())).toBe(
      PAIRING_MESSAGES.bothLegs,
    );
    expect(specialReturnPairingError(published(), special({ sri: 'A' }))).toBe(
      PAIRING_MESSAGES.bothLegs,
    );
  });

  it('accepts a pair the airline offered together', () => {
    const onward = special({ sri: 'A', msri: ['B'] });
    const inbound = special({ sri: 'B', msri: ['A'] });
    expect(specialReturnPairingError(onward, inbound)).toBeNull();
  });

  it('accepts when only one direction confirms it', () => {
    expect(
      specialReturnPairingError(special({ sri: 'A' }), special({ sri: 'B', msri: ['A'] })),
    ).toBeNull();
  });

  it('rejects two Special Return fares that are not each other’s match', () => {
    expect(
      specialReturnPairingError(special({ sri: 'A', msri: ['X'] }), special({ sri: 'B', msri: ['Y'] })),
    ).toBe(PAIRING_MESSAGES.notAPair);
  });

  it('allows an unverifiable pair through — the supplier is the authority', () => {
    // 55 of 199 onward fares in one live search carried neither identifier.
    expect(specialReturnPairingError(special(), special())).toBeNull();
    expect(specialReturnPairingError(special({ msri: [] }), special({ sri: 'B' }))).toBeNull();
  });

  it('reads msri off meta, where the fare-details response also carries it', () => {
    const onward = special({ sri: 'A' });
    const inbound = special({ sri: 'B', meta: { msri: ['A'] } });
    expect(specialReturnPairingError(onward, inbound)).toBeNull();
  });
});

describe('msriContains', () => {
  it('takes a list or a bare value, and never matches a missing sri', () => {
    expect(msriContains(['A', 'B'], 'B')).toBe(true);
    expect(msriContains('A', 'A')).toBe(true);
    expect(msriContains(123, '123')).toBe(true);
    expect(msriContains(['A'], undefined)).toBe(false);
    expect(msriContains(null, 'A')).toBe(false);
  });
});
