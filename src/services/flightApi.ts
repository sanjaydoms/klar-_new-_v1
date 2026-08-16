import airportData from 'airport-codes/airports.json';

export interface Airport {
  city: string;
  code: string;
  country: string;
  name: string;
  airport_name?: string;
  iata_code?: string;
  city_name?: string;
}

export interface FlightSearchParams {
  from: string;
  to: string;
  date: string;
  passengers?: number;
  cabin_class?: string;
}

export interface Flight {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  // stopDetails?: {
  //   count: number;
  //   stopNames?: string[];
  //   stopCodes?: string[];
  //   stopCities?: string[];
  //   stopoverDurations?: string[];
  //   details?: any[];
  //   displayString?: string;
  // };
}

/**
 * Cities that answer to more than one name.
 *
 * These are SETS, not redirects, because the dataset is inconsistent about which
 * name it stores: BOM is "Mumbai" but BLR is "Bangalore", CCU is "Kolkata" but
 * MAA is "Madras". A one-way alias table (bangalore -> bengaluru) would fix the
 * renamed half and BREAK the half that is still stored under the old name. Every
 * term in a group matches every airport in that group, so it does not matter
 * which one the data happens to use — or which one the traveller happens to know.
 */
const CITY_SYNONYMS: string[][] = [
  ['mumbai', 'bombay'],
  ['bengaluru', 'bangalore'],
  ['chennai', 'madras'],
  ['kolkata', 'calcutta'],
  ['mysuru', 'mysore'],
  ['thiruvananthapuram', 'trivandrum'],
  ['kochi', 'cochin'],
  ['pune', 'poona'],
  ['puducherry', 'pondicherry'],
  ['varanasi', 'banaras', 'benares'],
  ['vadodara', 'baroda'],
  ['gurugram', 'gurgaon'],
  ['prayagraj', 'allahabad'],
  ['visakhapatnam', 'vizag'],
  ['tiruchirappalli', 'trichy'],
  ['shimla', 'simla'],
  ['hubballi', 'hubli'],
  ['belagavi', 'belgaum'],
  ['kalaburagi', 'gulbarga'],
  ['shivamogga', 'shimoga'],
  ['ballari', 'bellary'],
];

const SYNONYM_LOOKUP: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const group of CITY_SYNONYMS) {
    for (const term of group) m.set(term, group);
  }
  return m;
})();

/** The query plus any other name the same city is known by. */
function expandQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const group = SYNONYM_LOOKUP.get(q);
  return group ? Array.from(new Set([q, ...group])) : [q];
}

interface IndexedAirport extends Airport {
  _code: string;
  _city: string;
  _name: string;
  _country: string;
  _india: boolean;
  /** In the hand-picked list below — a usable proxy for "somewhere people fly". */
  _curated: boolean;
}

/**
 * How much domestic and major-airport preference can bend the ranking.
 *
 * The score tiers are 10 apart, so INDIA_BONUS is deliberately just over one
 * tier: an Indian match may overtake the next-stronger kind of foreign match,
 * and no more. The dataset is the 2012 OpenFlights dump with no traffic or
 * significance data, so without this a two-letter query is decided by airports
 * nobody flies to — "in" led with Ingeniero Jacobacci (Argentina).
 */
const INDIA_BONUS = 12;
const CURATED_BONUS = 8;

/**
 * The searchable set, lowercased once.
 *
 * Built lazily and kept, because the previous code re-scanned all 8,107 records
 * on every cache miss — and every new keystroke is a new query string, so every
 * keystroke was a fresh full scan of a 1.9 MB import.
 *
 * `localAirports` is folded in first so its curated names win on a code clash;
 * the raw dataset abbreviates ("Chhatrapati Shivaji Intl").
 */
let airportIndex: IndexedAirport[] | null = null;

function getAirportIndex(): IndexedAirport[] {
  if (airportIndex) return airportIndex;

  const byCode = new Map<string, Airport>();

  for (const a of airportData as any[]) {
    const code = (a.iata || '').toUpperCase();
    if (!code) continue;
    byCode.set(code, {
      city: a.city || '',
      code,
      country: a.country || '',
      name: a.name || '',
    });
  }

  // Curated entries override the dataset's abbreviations for the same code.
  for (const a of localAirports) {
    if (a.code) byCode.set(a.code.toUpperCase(), a);
  }

  const curatedCodes = new Set(localAirports.map((a) => a.code.toUpperCase()));

  airportIndex = Array.from(byCode.values()).map((a) => ({
    ...a,
    _code: a.code.toLowerCase(),
    _city: a.city.toLowerCase(),
    _name: a.name.toLowerCase(),
    _country: a.country.toLowerCase(),
    _india: a.country.toLowerCase() === 'india',
    _curated: curatedCodes.has(a.code.toUpperCase()),
  }));

  return airportIndex;
}

/** True when `q` starts a word in `text` — "chandigarh" in "Chandigarh Intl". */
function startsWord(text: string, q: string): boolean {
  const i = text.indexOf(q);
  return i === 0 || (i > 0 && /[\s-]/.test(text.charAt(i - 1)));
}

/**
 * How well one airport answers one term. Higher is better; 0 means no match.
 *
 * The tiers are spaced at least 5 apart so the India bonus below can order
 * equally-good matches without ever promoting a weaker kind of match over a
 * stronger one — a substring hit must never outrank an exact code.
 */
function scoreTerm(a: IndexedAirport, q: string): number {
  // Naming an airport outright — by its code OR by its city — is one tier, so
  // the India tiebreak can settle a collision between them. "goa" is both Goa
  // (city, India) and GOA (Genoa's code, Italy); on an Indian OTA the traveller
  // means the state. Ranking code strictly above city put Italy first.
  if (a._code === q || a._city === q) return 100;
  // City prefix outranks code prefix. Travellers type place names; anyone who
  // knows a three-letter code types all three of it, which the exact tier above
  // already catches. With this the other way round, two characters of a city
  // name lost to obscure code prefixes — "in" returned Ingeniero Jacobacci,
  // Injune and In Salah ahead of Indore.
  if (a._city.startsWith(q)) return 80;
  if (a._code.startsWith(q)) return 70;
  if (startsWord(a._city, q)) return 60;
  if (a._name.startsWith(q)) return 50;
  if (startsWord(a._name, q)) return 45;
  if (a._city.includes(q)) return 30;
  if (a._name.includes(q)) return 20;
  if (a._country === q) return 15;
  if (a._country.startsWith(q)) return 10;
  if (a._country.includes(q)) return 5;
  return 0;
}

/**
 * Rank airports for a query. Pure and synchronous, so it can be tested directly.
 *
 * Replaces a plain `.includes()` filter that took the FIRST 20 records in raw
 * JSON order — no scoring at all — and then merged the curated Indian list in
 * behind them, where the final slice discarded it.
 */
export function rankAirports(query: string, limit = 20): Airport[] {
  const terms = expandQuery(query);
  if (!terms.length) return [];

  const scored: Array<{ airport: IndexedAirport; score: number }> = [];

  for (const airport of getAirportIndex()) {
    let best = 0;
    for (const term of terms) {
      const s = scoreTerm(airport, term);
      if (s > best) best = s;
    }
    if (best > 0) {
      scored.push({
        airport,
        score:
          best +
          (airport._india ? INDIA_BONUS : 0) +
          (airport._curated ? CURATED_BONUS : 0),
      });
    }
  }

  scored.sort((x, y) => y.score - x.score || x.airport.city.localeCompare(y.airport.city));

  return scored.slice(0, limit).map(({ airport }) => ({
    city: airport.city,
    code: airport.code,
    country: airport.country,
    name: airport.name,
  }));
}

// Local airport data as fallback
const localAirports: Airport[] = [
  {
    city: 'Mumbai',
    code: 'BOM',
    country: 'India',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
  },
  { city: 'Delhi', code: 'DEL', country: 'India', name: 'Indira Gandhi International Airport' },
  { city: 'Bangalore', code: 'BLR', country: 'India', name: 'Kempegowda International Airport' },
  { city: 'Hyderabad', code: 'HYD', country: 'India', name: 'Rajiv Gandhi International Airport' },
  { city: 'Chennai', code: 'MAA', country: 'India', name: 'Chennai International Airport' },
  {
    city: 'Kolkata',
    code: 'CCU',
    country: 'India',
    name: 'Netaji Subhas Chandra Bose International Airport',
  },
  { city: 'Pune', code: 'PNQ', country: 'India', name: 'Pune Airport' },
  {
    city: 'Ahmedabad',
    code: 'AMD',
    country: 'India',
    name: 'Sardar Vallabhbhai Patel International Airport',
  },
  { city: 'Goa', code: 'GOI', country: 'India', name: 'Goa International Airport' },
  { city: 'Jaipur', code: 'JAI', country: 'India', name: 'Jaipur International Airport' },
  { city: 'Chandigarh', code: 'IXC', country: 'India', name: 'Chandigarh International Airport' },
  {
    city: 'Lucknow',
    code: 'LKO',
    country: 'India',
    name: 'Chaudhary Charan Singh International Airport',
  },
  { city: 'Kochi', code: 'COK', country: 'India', name: 'Cochin International Airport' },
  {
    city: 'Guwahati',
    code: 'GAU',
    country: 'India',
    name: 'Lokpriya Gopinath Bordoloi International Airport',
  },
  { city: 'Varanasi', code: 'VNS', country: 'India', name: 'Lal Bahadur Shastri Airport' },
  { city: 'Srinagar', code: 'SXR', country: 'India', name: 'Sheikh ul-Alam International Airport' },
  {
    city: 'Amritsar',
    code: 'ATQ',
    country: 'India',
    name: 'Sri Guru Ram Dass Jee International Airport',
  },
  {
    city: 'Bhubaneswar',
    code: 'BBI',
    country: 'India',
    name: 'Biju Patnaik International Airport',
  },
  { city: 'Indore', code: 'IDR', country: 'India', name: 'Devi Ahilyabai Holkar Airport' },
  { city: 'Coimbatore', code: 'CJB', country: 'India', name: 'Coimbatore International Airport' },
  { city: 'Trivandrum', code: 'TRV', country: 'India', name: 'Trivandrum International Airport' },
  {
    city: 'Nagpur',
    code: 'NAG',
    country: 'India',
    name: 'Dr. Babasaheb Ambedkar International Airport',
  },
  { city: 'Visakhapatnam', code: 'VTZ', country: 'India', name: 'Visakhapatnam Airport' },
  {
    city: 'Patna',
    code: 'PAT',
    country: 'India',
    name: 'Jay Prakash Narayan International Airport',
  },
  { city: 'Ranchi', code: 'IXR', country: 'India', name: 'Birsa Munda Airport' },
  // International airports
  { city: 'Dubai', code: 'DXB', country: 'UAE', name: 'Dubai International Airport' },
  { city: 'Abu Dhabi', code: 'AUH', country: 'UAE', name: 'Abu Dhabi International Airport' },
  { city: 'Singapore', code: 'SIN', country: 'Singapore', name: 'Singapore Changi Airport' },
  { city: 'Bangkok', code: 'BKK', country: 'Thailand', name: 'Suvarnabhumi Airport' },
  {
    city: 'Kuala Lumpur',
    code: 'KUL',
    country: 'Malaysia',
    name: 'Kuala Lumpur International Airport',
  },
  { city: 'London', code: 'LHR', country: 'UK', name: 'London Heathrow Airport' },
  { city: 'New York', code: 'JFK', country: 'USA', name: 'John F. Kennedy International Airport' },
  { city: 'Paris', code: 'CDG', country: 'France', name: 'Charles de Gaulle Airport' },
  { city: 'Sydney', code: 'SYD', country: 'Australia', name: 'Sydney Kingsford Smith Airport' },
  { city: 'Tokyo', code: 'NRT', country: 'Japan', name: 'Narita International Airport' },
  { city: 'Hong Kong', code: 'HKG', country: 'Hong Kong', name: 'Hong Kong International Airport' },
  { city: 'Doha', code: 'DOH', country: 'Qatar', name: 'Hamad International Airport' },
];

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Search airports by query string
 * Falls back to local data if API fails or is not configured
 */
export async function searchAirports(query: string): Promise<Airport[]> {
  if (!query || query.trim().length === 0) {
    return localAirports.slice(0, 10);
  }

  const cacheKey = `airports:${query.toLowerCase()}`;
  const cached = getCachedData<Airport[]>(cacheKey);
  if (cached) return cached;

  // One ranked pass over one deduplicated index. The curated list is folded into
  // that index rather than merged in afterwards — appending it after a global
  // set that had already been capped at 20 meant the final slice threw it away.
  const results = rankAirports(query);

  setCachedData(cacheKey, results);
  return results;
}

/**
 * Get airport details by code
 */
export function getAirportByCode(code: string): Airport | undefined {
  return localAirports.find((airport) => airport.code === code);
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}
