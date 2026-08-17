/**
 * One channel for the fare-rule payload between a fare-selection screen and
 * the fare-rules screen that renders it, in the spirit of `utils/reviewSession`.
 *
 * The rules live in sessionStorage under a key that outlives the fare they
 * belong to, so a screen could read a PREVIOUS fare's cancellation charges and
 * present them as this fare's terms — which is what happened when a fetch
 * failed (the oneway path navigated anyway) or never ran at all (the return
 * path fetched nothing). Rules are stored WITH the fare id they came from and
 * only handed back for that same fare.
 */
const RULES_KEY = 'fareRuleData';
const OWNER_KEY = 'fareRuleFareId';

/** Forget any stored rules. Call before fetching new ones. */
export function clearFareRules(): void {
  sessionStorage.removeItem(RULES_KEY);
  sessionStorage.removeItem(OWNER_KEY);
}

/** Keep a rule payload against the fare it describes. */
export function storeFareRules(fareId: string, response: unknown): void {
  sessionStorage.setItem(RULES_KEY, JSON.stringify(response));
  sessionStorage.setItem(OWNER_KEY, fareId);
}

/**
 * The stored rules, but only if they belong to `fareId` — otherwise null, and
 * the screen shows its "as per airline policy" fallback, which is honest.
 * A missing owner key means rules written by an older build; treated as stale.
 */
export function readFareRules(fareId?: string): any | null {
  if (!fareId) return null;
  if (sessionStorage.getItem(OWNER_KEY) !== fareId) return null;
  const raw = sessionStorage.getItem(RULES_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** TripJack answers 200 with `status.success === false`; that is not rules. */
export function isFareRuleResponseUsable(response: any): boolean {
  return Boolean(response?.status?.success && response?.fareRule);
}
