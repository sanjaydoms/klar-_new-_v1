/**
 * Defensive readers for supplier payloads.
 *
 * Supplier responses are untyped by definition: what arrives is whatever the
 * remote system sent today. The reference mappers coped with that by chaining
 * `||` across a dozen candidate field names, which quietly turned a legitimate
 * `0` into the next fallback and a missing field into whatever the last term
 * happened to be. These readers are explicit about absence instead.
 */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function asRecord(v: unknown): Record<string, unknown> {
  return isRecord(v) ? v : {};
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function readRecord(source: unknown, key: string): Record<string, unknown> {
  return asRecord(asRecord(source)[key]);
}

export function readArray(source: unknown, key: string): unknown[] {
  return asArray(asRecord(source)[key]);
}

/**
 * First key that holds a non-empty string.
 *
 * `undefined` rather than `''`, so callers must decide what an absent value
 * means instead of inheriting an empty string that reads as data.
 */
export function readString(source: unknown, ...keys: string[]): string | undefined {
  const rec = asRecord(source);
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

/**
 * First key that holds a finite number.
 *
 * Accepts numeric strings, including the comma-grouped forms suppliers send
 * ("1,180.50"). Crucially it accepts `0`: a zero tax amount is a fact, and the
 * `||` chains it replaces would have skipped past it.
 */
export function readNumber(source: unknown, ...keys: string[]): number | undefined {
  const rec = asRecord(source);
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.length === 0) continue;
      const parsed = Number(trimmed.replace(/,/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/** Only a real boolean, or the strings and 0/1 suppliers use for one. */
export function readBoolean(source: unknown, ...keys: string[]): boolean | undefined {
  const rec = asRecord(source);
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1) return true;
    if (v === 'false' || v === 0) return false;
  }
  return undefined;
}

/**
 * Strings from a field that may be a string, an array of strings, an array of
 * objects with a name-ish field, or a JSON-encoded array of strings — all four
 * of which appear in the two live feeds.
 */
export function readStringList(value: unknown): string[] {
  const out: string[] = [];
  const push = (v: unknown): void => {
    if (typeof v !== 'string') return;
    const trimmed = v.trim();
    if (trimmed.length === 0) return;
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const p of parsed) push(p);
          return;
        }
      } catch {
        // Not JSON after all — fall through and keep the literal string.
      }
    }
    out.push(trimmed);
  };

  if (typeof value === 'string') push(value);
  else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') push(item);
      else if (isRecord(item)) {
        const name = readString(item, 'name', 'facilityName', 'description', 'label');
        if (name !== undefined) push(name);
      }
    }
  } else if (isRecord(value)) {
    // TripJack's static-detail amenities arrive keyed by id, not as an array.
    for (const item of Object.values(value)) {
      if (typeof item === 'string') push(item);
      else if (isRecord(item)) {
        const name = readString(item, 'name', 'facilityName', 'description', 'label');
        if (name !== undefined) push(name);
      }
    }
  }

  return [...new Set(out)];
}

/**
 * Map a list of supplier records, dropping the ones that cannot be mapped.
 *
 * The readers above return `undefined` rather than throwing, but what they feed
 * does not: `money()` rejects a value that is not a safe integer, brand
 * constructors reject malformed ids. Those guards are correct — the mistake was
 * running them where a single bad record could unwind the whole call. One
 * unusable hotel is one hotel; the mapping loop must not turn it into a failed
 * search.
 *
 * `onSkip` exists so a dropped record is counted rather than silently lost:
 * "we mapped 39 of 40" is diagnosable, "we returned 39" is not.
 */
export function mapDefensively<T>(
  raws: readonly unknown[],
  map: (raw: unknown) => T | null,
  onSkip?: (error: unknown, index: number) => void,
): T[] {
  const out: T[] = [];
  for (let i = 0; i < raws.length; i++) {
    try {
      const mapped = map(raws[i]);
      if (mapped !== null) out.push(mapped);
    } catch (error) {
      onSkip?.(error, i);
    }
  }
  return out;
}

/** Latitude/longitude that may arrive as numbers or as strings. */
export function readGeoPoint(
  source: unknown,
  latKeys: string[],
  lngKeys: string[],
): { lat: number; lng: number } | undefined {
  const lat = readNumber(source, ...latKeys);
  const lng = readNumber(source, ...lngKeys);
  if (lat === undefined || lng === undefined) return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}
