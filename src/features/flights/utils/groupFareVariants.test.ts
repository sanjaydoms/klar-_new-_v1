import { describe, it, expect } from 'vitest';
import { groupFareVariants, durationToMinutes } from './groupFareVariants';

const mk = (over: any) => ({
  flightNumber: 'SG-476',
  from: { time: '16:30' },
  to: { time: '18:40' },
  stops: 0,
  price: 7932.5,
  fareIdentifier: 'PUBLISHED',
  ...over,
});

describe('groupFareVariants', () => {
  it('collapses fare variants of one physical flight into one group', () => {
    const flights = [
      mk({ price: 8100, fareIdentifier: 'ECO VALUE' }),
      mk({ price: 7932.5, fareIdentifier: 'PUBLISHED' }),
      mk({ flightNumber: '6E-123', from: { time: '09:00' }, to: { time: '11:00' }, price: 5000 }),
    ];
    const groups = groupFareVariants(flights);

    expect(groups.length).toBe(2);
    const sg = groups.find((g) => g.cheapest.flightNumber === 'SG-476')!;
    expect(sg.variants.length).toBe(2);
    expect(sg.cheapest.fareIdentifier).toBe('PUBLISHED'); // cheapest first
    expect(sg.variants[1]!.fareIdentifier).toBe('ECO VALUE');
  });

  it('does not merge same flight number at different times', () => {
    const groups = groupFareVariants([
      mk({}),
      mk({ from: { time: '21:00' }, to: { time: '23:10' } }),
    ]);
    expect(groups.length).toBe(2);
  });
});

describe('durationToMinutes', () => {
  it('parses the normalizer format', () => {
    expect(durationToMinutes('2h 10m')).toBe(130);
    expect(durationToMinutes('45m')).toBe(45);
    expect(durationToMinutes('3h')).toBe(180);
    expect(durationToMinutes(undefined)).toBe(Infinity);
    expect(durationToMinutes('N/A')).toBe(Infinity);
  });
});
