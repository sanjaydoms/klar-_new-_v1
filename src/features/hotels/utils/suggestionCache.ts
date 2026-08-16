import type { HotelSuggestion } from '../types/hotelTypes';

/**
 * Per-session cache of autocomplete results, keyed on the normalized query.
 *
 * Typing "goa" and backspacing to "go" should redraw instantly from what we
 * already fetched, not spin a loader while a request repeats work the server
 * has already done.
 */
const MAX_ENTRIES = 100;
const cache = new Map<string, HotelSuggestion[]>();

export const normalizeQuery = (query: string): string => query.trim().toLowerCase();

export function getCachedSuggestions(query: string): HotelSuggestion[] | undefined {
  const key = normalizeQuery(query);
  const hit = cache.get(key);
  if (!hit) return undefined;

  // Refresh recency so hot prefixes survive eviction.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

export function setCachedSuggestions(query: string, results: HotelSuggestion[]): void {
  const key = normalizeQuery(query);
  if (cache.has(key)) cache.delete(key);
  else if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, results);
}
