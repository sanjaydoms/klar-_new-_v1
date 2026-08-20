/**
 * Single storage channel for the flight review-API response.
 *
 * History: the desktop funnel stored `response.data` under 'onewayReviewData'
 * (a misnomer — return and multicity write it too) while the mobile funnel
 * stored the whole `response` under 'reviewData'. Same API, two keys, one
 * wrapping level apart — which is why /before/booking went blank whenever a
 * session crossed the desktop/mobile fork: each screen read only its own key.
 *
 * Canonical form: ONE key ('onewayReviewData', kept to avoid churning every
 * desktop reader), holding the UNWRAPPED level — the object that has
 * `mappedData` / `sessionId` on it. Readers must go through readReviewData(),
 * which unwraps either historical shape and falls back to the legacy
 * 'reviewData' key so sessions in flight at deploy time still resolve.
 */

const CANONICAL_KEY = 'onewayReviewData';
const LEGACY_KEY = 'reviewData';

function unwrap(parsed: any): any {
  // Wrapped responses carry the payload under .data; detect by where mappedData lives.
  if (parsed?.data?.mappedData || parsed?.data?.sessionId) return parsed.data;
  return parsed;
}

export function storeReviewData(response: unknown): void {
  sessionStorage.setItem(CANONICAL_KEY, JSON.stringify(unwrap(response)));
  sessionStorage.removeItem(LEGACY_KEY);
  // A new Review starts a new supplier fare session — the booking countdown
  // must restart with it, or an abandoned attempt's leftover timer shortens
  // (or outlives) the next booking's real session.
  sessionStorage.removeItem('bookingTimer');
  sessionStorage.removeItem('timerStartTime');
}

export function readReviewData(): any | null {
  for (const key of [CANONICAL_KEY, LEGACY_KEY]) {
    const raw = sessionStorage.getItem(key);
    if (!raw) continue;
    try {
      return unwrap(JSON.parse(raw));
    } catch {
      continue;
    }
  }
  return null;
}
