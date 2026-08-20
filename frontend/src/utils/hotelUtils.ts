/**
 * Neutral "No photo" placeholder shown when a supplier returns no image.
 * We deliberately do NOT substitute a generic stock (Unsplash) hotel photo,
 * which would misrepresent the property. Inline SVG => no network request.
 */
export const NO_HOTEL_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#eef0f4"/>
      <g fill="#b6bdca" transform="translate(200 130)">
        <rect x="-34" y="-24" width="68" height="52" rx="6" fill="none" stroke="#b6bdca" stroke-width="4"/>
        <circle cx="-12" cy="-6" r="7"/>
        <path d="M-30 22 L-6 -2 L10 14 L20 4 L30 22 Z"/>
      </g>
      <text x="200" y="196" font-family="Inter,Arial,sans-serif" font-size="16" fill="#9aa3b2" text-anchor="middle">No photo available</text>
    </svg>`,
  );

/**
 * Formats a string of rate comments into an array of strings.
 * Splits by semicolons, newlines, and other common delimiters.
 */
export const formatRateComments = (comments: string | null | undefined): string[] => {
  if (!comments) return [];

  // 1. Decode standard HTML entities
  let clean = comments
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 2. Replace structural tags with appropriate line breaks and bullets
  clean = clean
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // 3. Strip any remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, '');

  // 4. Split cleanly by newlines or multiple spaces
  const splitPattern = /[\n]|\s{4,}/;

  return clean
    .split(splitPattern)
    .map((comment) => {
      // Clean up leading/trailing semicolons or hyphens if any
      return comment
        .trim()
        .replace(/^;+|;+$/g, '')
        .trim();
    })
    .filter((comment) => comment.length > 1 && comment !== '-' && comment !== '•');
};

/**
 * Extracts a usable image URL from any image format returned by TripJack or RateGain.
 * - TripJack static-detail: { links: { original: { href: "..." }, "1000px": { href: "..." } } }
 * - TripJack pricing/rooms: { links: { XXL: { href: "..." } } }
 * - RateGain: plain strings or partial filenames like "014216a_hb_f_003.jpg"
 */
export const formatHotelImageUrl = (imagePath: any): string => {
  if (!imagePath) return '';

  let pathStr = '';

  if (typeof imagePath === 'string') {
    pathStr = imagePath;
  } else if (typeof imagePath === 'object') {
    if (imagePath instanceof String) {
      pathStr = imagePath.toString();
    } else {
      // Try to extract URL from common object structures
      const links = imagePath.links || {};
      const firstLink = Object.values(links)[0] as any;
      pathStr =
        imagePath.href ||
        imagePath.url ||
        imagePath.src ||
        imagePath.link ||
        links['1000px']?.href ||
        links['XXL']?.href ||
        links['XL']?.href ||
        links['L']?.href ||
        links['original']?.href ||
        links['default']?.href ||
        firstLink?.href ||
        '';
    }
  } else {
    // Number, boolean, etc.
    pathStr = String(imagePath);
  }

  // Trim whitespace
  const trimmed = pathStr.trim();
  if (!trimmed) return '';

  // If it's already a full URL, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  // If it's a TripJack property ID (e.g., "TJ:" or just numeric), it's not an image URL
  if (trimmed.startsWith('TJ:') || trimmed.startsWith('RG:') || /^\d+$/.test(trimmed)) return '';

  // RateGain/Hotelbeds partial identifier (e.g., "014216a_hb_f_003.jpg").
  // `_hb_` is positive evidence of a Hotelbeds path, so this rewrite is safe
  // regardless of which supplier handed us the string.
  if (trimmed.includes('_hb_')) {
    return `https://photos.hotelbeds.com/giata/${trimmed}`;
  }

  // A bare filename with an image extension is NOT enough to conclude it lives
  // on the Hotelbeds CDN. This previously rewrote every relative path to
  // photos.hotelbeds.com/giata/, which is right for RateGain and wrong for
  // TripJack — TJ paths were pointed at a CDN that never had them, so a hotel
  // reported "19 Photos" and rendered nineteen 404s.
  //
  // The supplier is known upstream, so relative paths are qualified in
  // hotel-search-service now (see qualifyImageUrl in the adapters) and arrive
  // here absolute. Anything still relative is unresolvable: return '' so the
  // caller's .filter(Boolean) drops it rather than manufacturing a dead URL.
  if (/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(trimmed)) {
    return '';
  }

  return trimmed;
};

/**
 * Calculates the number of nights between two dates.
 * Returns 1 if dates are missing, same, or invalid.
 */
export const calculateNights = (
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): number => {
  if (!checkIn || !checkOut) return 1;

  try {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // Reset time to midnight for accurate day comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 1;
  } catch (error) {
    return 1;
  }
};

/**
 * Single currency formatter for the whole hotel funnel.
 *
 * The funnel previously mixed three conventions on the same journey — `₹2,516`
 * on the search card (bare `toLocaleString()`, so grouping followed the browser
 * locale, not India's), `INR 1850.28` on the detail and review pages, and
 * `₹ 2,670` elsewhere. Seeing the currency change shape between the card you
 * clicked and the page you pay on reads as a different price, not a different
 * format.
 *
 * Always `₹` + en-IN grouping (1,23,456 — lakh/crore, not thousands).
 * `decimals` defaults to 0: whole rupees on cards and summaries. Pass 2 only
 * where an exact payable amount matters (final totals, tax breakdowns).
 */
export const formatINR = (amount: number | null | undefined, decimals: 0 | 2 = 0): string => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Formats a Date as a LOCAL `YYYY-MM-DD` string.
 *
 * Use this instead of `date.toISOString().split('T')[0]`, which converts to UTC
 * first. In IST (UTC+5:30) any local time before 05:30 falls on the previous UTC
 * day, so between midnight and 05:30 `new Date().toISOString()` yields
 * YESTERDAY. That made `min=` attributes on the date pickers accept a check-in
 * in the past, and made "tomorrow" defaults resolve to today — both of which the
 * supplier rejects at booking time rather than at selection time.
 */
export const toLocalDateStr = (date: Date): string => {
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Today as a local `YYYY-MM-DD` — the correct `min` for any check-in picker. */
export const todayLocalStr = (): string => toLocalDateStr(new Date());

/** `YYYY-MM-DD` for `days` from now, in local time. */
export const addDaysLocalStr = (days: number, from: Date = new Date()): string => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
};

/**
 * Serializes rooms array to a URL string format.
 */
export const encodeRoomsToUrl = (rooms: any[]): string => {
  try {
    return encodeURIComponent(JSON.stringify(rooms));
  } catch (e) {
    return encodeURIComponent(
      JSON.stringify([{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }]),
    );
  }
};

/**
 * Deserializes rooms from URL string format back to array.
 */
export const decodeRoomsFromUrl = (roomsStr: string | null): any[] => {
  if (!roomsStr) return [{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }];
  try {
    return JSON.parse(decodeURIComponent(roomsStr));
  } catch (e) {
    return [{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }];
  }
};

const RECENT_SEARCHES_KEY = 'klar_hotel_recent_searches';

export const saveRecentSearch = (search: {
  name: string;
  type: 'city' | 'hotel';
  checkIn: string;
  checkOut: string;
  rooms: any[];
  destCode?: string;
  hotelId?: string | undefined;
}) => {
  try {
    const existing = getRecentSearches();
    // Remove duplicates (same name and type)
    const filtered = existing.filter((s) => !(s.name === search.name && s.type === search.type));
    // Add new search to the beginning
    const updated = [search, ...filtered].slice(0, 5);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent search:', e);
  }
};

export const getRecentSearches = (): any[] => {
  try {
    const data = localStorage.getItem(RECENT_SEARCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (e) {
    console.error('Failed to clear recent searches:', e);
  }
};

/**
 * Safely converts the bed_config (which can be a string or an object) into a clean, human-readable string.
 */
export const formatBedConfig = (bed: any): string => {
  if (!bed) return '';

  // Helper to resolve nested type objects (e.g. { name: 'Single' })
  const formatSingleBedType = (type: any): string => {
    if (!type) return 'Bed';
    if (typeof type === 'string') {
      return type.includes('[object Object]') ? 'Bed' : type;
    }
    if (typeof type === 'object') {
      const name = type.name || type.type || type.code || type.title;
      if (name && typeof name === 'string' && !name.includes('[object Object]')) {
        return name;
      }
      try {
        const str = JSON.stringify(type);
        return str.includes('[object Object]') ? 'Bed' : str;
      } catch (e) {
        return 'Bed';
      }
    }
    return String(type);
  };

  // If already string
  if (typeof bed === 'string') {
    if (bed.trim().startsWith('{')) {
      try {
        bed = JSON.parse(bed);
      } catch (e) {
        // Fall through
      }
    } else {
      return bed.includes('[object Object]') ? '' : bed;
    }
  }

  if (typeof bed === 'object') {
    // 1. If configuration is an array
    if (Array.isArray(bed.configuration)) {
      const formatted = bed.configuration
        .map((c: any) => {
          if (!c) return '';
          if (typeof c === 'string') return c.includes('[object Object]') ? '' : c;
          if (typeof c === 'object') {
            const count = c.count || 1;
            const bedType = formatSingleBedType(c.type || c.bed_type);
            return `${count} ${bedType}`;
          }
          return String(c);
        })
        .filter(Boolean)
        .join(', ');

      if (formatted && !formatted.includes('[object Object]')) {
        return formatted;
      }
    }

    // 2. If configuration is an object
    if (bed.configuration && typeof bed.configuration === 'object') {
      const isNumericKeys = Object.keys(bed.configuration).some((k) => !isNaN(Number(k)));
      if (isNumericKeys) {
        const keys = Object.keys(bed.configuration).filter((k) => !isNaN(Number(k)));
        const formatted = keys
          .map((k) => {
            const c = bed.configuration[k];
            if (!c) return '';
            const count = c.quantity || c.count || 1;
            const bedType = formatSingleBedType(c.type || c.bed_type);
            return `${count} ${bedType}`;
          })
          .filter(Boolean)
          .join(', ');

        if (formatted && !formatted.includes('[object Object]')) {
          return formatted;
        }
      }

      // Fallback for single object structure
      const c = bed.configuration;
      const count = c.count || c.bed_count || 1;
      const bedType = formatSingleBedType(c.type || c.bed_type);
      const formatted = `${count} ${bedType}`;
      if (!formatted.includes('[object Object]')) {
        return formatted;
      }
    }

    // 3. If configuration is a string
    if (typeof bed.configuration === 'string' && !bed.configuration.includes('[object Object]')) {
      return bed.configuration;
    }

    // 4. Fallback if configuration is present but primitive
    if (
      bed.configuration !== undefined &&
      bed.configuration !== null &&
      typeof bed.configuration !== 'object'
    ) {
      const formatted = String(bed.configuration);
      if (!formatted.includes('[object Object]')) {
        return formatted;
      }
    }

    // 5. Fallback using bed_count / bedroom_count
    if (bed.bed_count !== undefined || bed.bedroom_count !== undefined) {
      const parts = [];
      const bedCount = Number(bed.bed_count);
      const bedroomCount = Number(bed.bedroom_count);

      if (!isNaN(bedCount) && bedCount > 0) {
        parts.push(`${bedCount} Bed${bedCount > 1 ? 's' : ''}`);
      }
      if (!isNaN(bedroomCount) && bedroomCount > 0) {
        parts.push(`${bedroomCount} Bedroom${bedroomCount > 1 ? 's' : ''}`);
      }

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    // 6. Last resort JSON stringification
    try {
      const str = JSON.stringify(bed);
      return str.includes('[object Object]') ? '' : str;
    } catch (e) {
      return '';
    }
  }

  return String(bed).includes('[object Object]') ? '' : String(bed);
};

const WISHLIST_HOTELS_KEY = 'wishlistHotels';

export const getWishlistHotels = (): any[] => {
  try {
    const data = localStorage.getItem(WISHLIST_HOTELS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const toggleWishlistHotel = (hotel: any): boolean => {
  try {
    const existing = getWishlistHotels();
    const isAlreadyWishlisted = existing.some((h) => h.id === hotel.id);
    let updated;
    if (isAlreadyWishlisted) {
      updated = existing.filter((h) => h.id !== hotel.id);
    } else {
      updated = [hotel, ...existing];
    }
    localStorage.setItem(WISHLIST_HOTELS_KEY, JSON.stringify(updated));
    return !isAlreadyWishlisted;
  } catch (e) {
    console.error('Failed to toggle wishlist hotel:', e);
    return false;
  }
};

export const isHotelWishlisted = (id: string): boolean => {
  try {
    const existing = getWishlistHotels();
    return existing.some((h) => h.id === id);
  } catch (e) {
    return false;
  }
};

/**
 * Supplier address strings arrive semicolon-delimited and frequently repeat the
 * same line twice, e.g. "Cavellosim, Beach, Salcete - Goa;Cavellosim, Beach,
 * Salcete - Goa;". Split on the delimiter, drop blanks and case-insensitive
 * duplicates, and rejoin as a single readable line.
 */
/**
 * Refundability, decided from data alone.
 *
 * Three values, because "the supplier did not say" is not "non-refundable".
 * TripJack's listing call returns no cancellation block at all and RateGain's
 * search returns no rate, so UNKNOWN is the common case on a search card, not
 * an edge one — and every caller must be able to render nothing for it.
 *
 * The display label is NOT an input. Callers used to re-derive this by
 * uppercasing the label this codebase had just generated and looking for
 * "FREE CANCELLATION" inside it, which turns a piece of copy into a
 * contractual claim: any supplier note containing the word "REFUNDABLE"
 * manufactured a promise. See docs/UX-CAPABILITY-CONTRACT.md D-3.
 *
 * One function so every surface answers this the same way. The card, the detail
 * page and the review-and-pay screen each had their own version, and they
 * disagreed: the card required an explicit `false` before saying
 * "Non-Refundable", while the other two derived it from the mere absence of a
 * positive and so said it for every UNKNOWN rate — through to the payment step.
 */
export type Refundability = 'REFUNDABLE' | 'NON_REFUNDABLE' | 'UNKNOWN';

export const resolveRefundability = (source: {
  // `| undefined` is explicit because the project runs with
  // `exactOptionalPropertyTypes`, and every caller passes a value that may be
  // undefined rather than omitting the key.
  isRefundable?: boolean | null | undefined;
  refundable?: boolean | null | undefined;
  cancellationPolicies?: Array<{ amount?: number | string | null }> | null | undefined;
}): Refundability => {
  // An explicit supplier flag wins over anything we could infer.
  const flag = source.isRefundable ?? source.refundable;
  if (flag === true) return 'REFUNDABLE';
  if (flag === false) return 'NON_REFUNDABLE';

  const policies = source.cancellationPolicies;
  if (Array.isArray(policies) && policies.length > 0) {
    const amounts = policies
      .map((p) => Number(p?.amount))
      .filter((n) => Number.isFinite(n));
    // Policies whose amounts we cannot read tell us nothing. Reading them as a
    // charge is how an unparseable payload became a hard "Non-Refundable".
    if (amounts.length === 0) return 'UNKNOWN';
    return amounts.some((a) => a === 0) ? 'REFUNDABLE' : 'NON_REFUNDABLE';
  }

  return 'UNKNOWN';
};

export const formatHotelAddress = (address?: string | null): string => {
  if (!address) return '';
  const seen = new Set<string>();
  return address
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
};
