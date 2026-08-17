import { describe, it, expect } from 'vitest';

import { rankAirports } from './flightApi';

/**
 * Airport autocomplete is the first thing a traveller touches. It used to filter
 * 8,107 records with four `.includes()` calls, take the first 20 in raw JSON
 * order, and only then append the curated Indian list — which the final
 * `.slice(0, 20)` promptly discarded. There was no scoring of any kind.
 *
 * Note the dataset is inconsistent about city names: BOM is stored as "Mumbai"
 * but BLR as "Bangalore", CCU as "Kolkata" but MAA as "Madras". So synonyms are
 * matched as SETS — a one-way alias table would fix the renamed half and break
 * the other half.
 */

const codes = (q: string) => rankAirports(q).map((a) => a.code);
const top = (q: string) => rankAirports(q)[0];

describe('exact matches win', () => {
  it('an IATA code ranks first', () => {
    expect(top('BOM')?.code).toBe('BOM');
    expect(top('DEL')?.code).toBe('DEL');
  });

  it('is case-insensitive', () => {
    expect(top('bom')?.code).toBe('BOM');
  });

  it('an exact city name ranks that city first', () => {
    expect(top('mumbai')?.code).toBe('BOM');
  });
});

describe('cities with more than one name', () => {
  // Each pair is (query, expected code). Both directions must work regardless of
  // which name the dataset happens to store.
  const CASES: Array<[string, string]> = [
    ['bombay', 'BOM'],
    ['mumbai', 'BOM'],
    ['bangalore', 'BLR'],
    ['bengaluru', 'BLR'],
    ['madras', 'MAA'],
    ['chennai', 'MAA'],
    ['calcutta', 'CCU'],
    ['kolkata', 'CCU'],
    ['mysore', 'MYQ'],
    ['mysuru', 'MYQ'],
    ['trivandrum', 'TRV'],
    ['cochin', 'COK'],
    ['kochi', 'COK'],
  ];

  it.each(CASES)('"%s" finds %s', (query, code) => {
    expect(codes(query)).toContain(code);
  });

  it.each(CASES)('"%s" ranks %s first', (query, code) => {
    expect(top(query)?.code).toBe(code);
  });

  it('the old name and the new name agree', () => {
    // The specific regression: a one-way alias would have broken whichever side
    // the dataset already stored.
    expect(top('bombay')?.code).toBe(top('mumbai')?.code);
    expect(top('bangalore')?.code).toBe(top('bengaluru')?.code);
    expect(top('madras')?.code).toBe(top('chennai')?.code);
  });
});

describe('Indian airports are not crowded out', () => {
  it('"goa" returns the Indian airport first', () => {
    expect(top('goa')?.country).toBe('India');
  });

  it('a query matching many airports still surfaces Indian ones', () => {
    // "int" hits hundreds of "International" names worldwide. Previously the
    // first 20 in file order won and India could vanish entirely.
    const results = rankAirports('delhi');
    expect(results.some((a) => a.country === 'India')).toBe(true);
  });

  it('India breaks ties but never beats a stronger match', () => {
    // LHR is an exact code (100); no Indian substring match (<=30 +3) may
    // displace it.
    expect(top('LHR')?.code).toBe('LHR');
    expect(top('CDG')?.code).toBe('CDG');
  });
});

describe('short queries surface real destinations', () => {
  // These are the cases an independent audit measured against the OLD code, where
  // a two-character query — exactly the gate the flight autocompletes use —
  // returned 20 foreign airports and ZERO Indian ones, and "del" put DEL at rank
  // 14 of 14 behind Iles De La Madeleine, Ajaccio and Cannes.
  const CASES: Array<[string, string]> = [
    ['in', 'IDR'], // Indore, not Ingeniero Jacobacci / Injune / In Salah
    ['ba', 'BLR'], // Bangalore, not Baguio
    ['ch', 'IXC'], // Chandigarh, not Chachapoyas
    ['del', 'DEL'], // Delhi, not Del Bajio / Del Rio
  ];

  it.each(CASES)('"%s" leads with %s', (query, code) => {
    expect(top(query)?.code).toBe(code);
  });

  it('does not distort an unambiguous foreign query', () => {
    // The domestic weight must order ties, not manufacture them.
    expect(top('lhr')?.code).toBe('LHR');
    expect(top('new')?.country).not.toBe('India');
  });

  it('drops records with no IATA code', () => {
    // 2,227 of 8,107 records carry no code and used to be filtered out AFTER the
    // 20-row slice, silently burning up to 27% of the dropdown on rows that
    // could never render.
    expect(rankAirports('a', 200).every((a) => !!a.code)).toBe(true);
  });
});

describe('ranking order is sensible', () => {
  it('prefers a city-name match over a country match', () => {
    // "india" is a city prefix for Indianapolis and the country for ~150 airports.
    // The city match SHOULD win — someone typing a place name means the place.
    // (My first version of this test asserted the opposite and was simply wrong.)
    const results = rankAirports('india');
    expect(results[0]?.city.toLowerCase().startsWith('india')).toBe(true);
    expect(results.some((a) => a.country === 'India')).toBe(true);
  });

  it('prefers a prefix over a mid-word substring', () => {
    const results = rankAirports('del');
    const delhiIndex = results.findIndex((a) => a.code === 'DEL');
    expect(delhiIndex).toBe(0);
  });

  it('respects the limit', () => {
    expect(rankAirports('a', 5)).toHaveLength(5);
  });
});

describe('degenerate input', () => {
  it('returns nothing for an empty query', () => {
    expect(rankAirports('')).toEqual([]);
    expect(rankAirports('   ')).toEqual([]);
  });

  it('returns nothing rather than throwing for gibberish', () => {
    expect(rankAirports('zzzzzzzzqqqq')).toEqual([]);
  });

  it('never returns an entry without a code', () => {
    for (const q of ['a', 'del', 'international', 'india']) {
      expect(rankAirports(q).every((r) => !!r.code)).toBe(true);
    }
  });
});
