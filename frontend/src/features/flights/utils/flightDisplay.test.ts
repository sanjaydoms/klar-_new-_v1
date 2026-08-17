import { describe, it, expect } from 'vitest';
import {
  formatTerminal,
  formatAircraft,
  refundableLabelFromType,
  cabinBaggageOf,
} from './flightDisplay';

describe('formatTerminal', () => {
  it('prefixes a bare number but leaves a stated terminal alone', () => {
    expect(formatTerminal('3')).toBe('T3');
    expect(formatTerminal('2A')).toBe('T2A');
    expect(formatTerminal('T2')).toBe('T2');
    expect(formatTerminal('Terminal 1')).toBe('Terminal 1');
  });

  it('renders nothing when the supplier states no terminal', () => {
    expect(formatTerminal('')).toBe('');
    expect(formatTerminal('   ')).toBe('');
    expect(formatTerminal(undefined)).toBe('');
  });
});

describe('formatAircraft', () => {
  it('lists one aircraft per segment', () => {
    expect(formatAircraft(['320'])).toBe('320');
    expect(formatAircraft(['320', '738'])).toBe('320 · 738');
  });

  it('renders nothing rather than a placeholder', () => {
    expect(formatAircraft([])).toBe('');
    expect(formatAircraft(undefined)).toBe('');
    // The backend filters these out, but the card must not print "undefined"
    // if an older service version is deployed behind this build.
    expect(formatAircraft([undefined as any, ''])).toBe('');
  });
});

describe('refundableLabelFromType', () => {
  it('matches the normalizer wording, including partial', () => {
    expect(refundableLabelFromType(1)).toBe('Refundable');
    expect(refundableLabelFromType(2)).toBe('Partially Refundable');
    expect(refundableLabelFromType(0)).toBe('Non-Refundable');
  });

  it('claims nothing when the fare states no type', () => {
    expect(refundableLabelFromType(undefined)).toBe('');
    expect(refundableLabelFromType(9)).toBe('');
  });
});

describe('cabinBaggageOf', () => {
  it('prefers the corrected name over the legacy alias', () => {
    expect(cabinBaggageOf({ CabinBaggage: '7 Kg', ClassCode: '7 Kg' })).toBe('7 Kg');
    expect(cabinBaggageOf({ ClassCode: '7 Kg' })).toBe('7 Kg');
    expect(cabinBaggageOf({})).toBe('');
    expect(cabinBaggageOf(undefined)).toBe('');
  });
});
