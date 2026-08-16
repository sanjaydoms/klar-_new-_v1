/**
 * Simple in-memory token store singleton.
 * AuthContext sets the token here on login/rehydration,
 * and API services read from here in their interceptors.
 * This avoids circular dependencies and localStorage timing issues.
 */

let _token: string | null = null;

export const tokenStore = {
  setToken: (token: string | null): void => {
    _token = token;
  },
  getToken: (): string | null => {
    return _token || sessionStorage.getItem("guestToken");
  },
  isGuestToken: (): boolean => {
    return !_token && !!sessionStorage.getItem("guestToken");
  },
};
