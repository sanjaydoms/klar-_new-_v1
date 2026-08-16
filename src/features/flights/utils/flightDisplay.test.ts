import { describe, it, expect } from 'vitest';
import { formatTerminal, formatAircraft } from './flightDisplay';

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
