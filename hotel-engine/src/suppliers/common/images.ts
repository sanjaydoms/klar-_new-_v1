import { isRecord, readString } from './parse.js';

/**
 * Turn whatever a supplier calls an image into an absolute URL, or drop it.
 *
 * Suppliers send full URLs, protocol-relative URLs, absolute paths and bare
 * CDN filenames, sometimes within one response. The reference resolved these by
 * guessing a CDN from the file extension, which is how TripJack images ended up
 * pointed at Hotelbeds and produced galleries of 404s.
 *
 * Each supplier declares its own image base. Anything that cannot be resolved
 * against it is dropped at the adapter boundary, so a dead URL never reaches a
 * gallery. An empty list is an honest answer; a broken image is not.
 */
export interface ImageResolver {
  (raw: unknown): string[];
}

const looksAbsolute = (s: string): boolean => /^https?:\/\//i.test(s);
const looksProtocolRelative = (s: string): boolean => s.startsWith('//');

/**
 * Pull candidate strings out of the shapes the two feeds actually use:
 * a string, an array of strings, an array of `{url|href|imageUrl}`, or
 * TripJack's static-detail `{ links: { "1000px": { href } } }`.
 */
function candidates(raw: unknown): string[] {
  const out: string[] = [];

  const visit = (value: unknown, depth: number): void => {
    if (depth > 3 || value === null || value === undefined) return;
    if (typeof value === 'string') {
      out.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!isRecord(value)) return;

    const direct = readString(value, 'url', 'href', 'imageUrl', 'imageURL', 'image', 'path');
    if (direct !== undefined) {
      out.push(direct);
      return;
    }
    // Prefer the largest rendition a links map offers.
    if (isRecord(value['links'])) {
      const links = value['links'];
      const preferred = ['1000px', 'original', 'large', 'default'];
      for (const key of preferred) {
        const href = readString(links[key], 'href', 'url');
        if (href !== undefined) {
          out.push(href);
          return;
        }
      }
      for (const link of Object.values(links)) {
        const href = readString(link, 'href', 'url');
        if (href !== undefined) {
          out.push(href);
          return;
        }
      }
    }
  };

  visit(raw, 0);
  return out;
}

export function createImageResolver(baseUrl: string | undefined): ImageResolver {
  const base = baseUrl?.replace(/\/+$/, '');

  return (raw: unknown): string[] => {
    const out: string[] = [];
    for (const candidate of candidates(raw)) {
      const value = candidate.trim();
      if (value.length === 0) continue;

      if (looksAbsolute(value)) {
        out.push(value);
        continue;
      }
      if (looksProtocolRelative(value)) {
        out.push(`https:${value}`);
        continue;
      }
      // Relative path or bare filename: resolvable only if this supplier
      // declared where its images live. If it did not, drop it rather than
      // inventing a host.
      if (base !== undefined && base.length > 0) {
        out.push(`${base}/${value.replace(/^\/+/, '')}`);
      }
    }
    return [...new Set(out)];
  };
}
