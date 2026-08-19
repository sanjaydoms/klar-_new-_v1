import axios from "axios";

/**
 * The two backends this app talks to.
 *
 * Both with `withCredentials`, because auth-service issues an httpOnly cookie
 * rather than a token in the response body — the browser holds the session and
 * this app never sees the JWT. That is the right shape here: an admin console
 * that could read its own token could also leak it.
 *
 * Cookies ignore ports, so a cookie set by auth-service on localhost is sent to
 * integration-service on localhost too. In production both must sit under one
 * cookie domain.
 */
const integrationBaseUrl =
  import.meta.env.VITE_INTEGRATION_URL || "http://localhost:5022";

export const api = axios.create({
  baseURL: `${integrationBaseUrl}/admin/integrations`,
  withCredentials: true,
  timeout: 20_000,
});

export const authApi = axios.create({
  baseURL: `${import.meta.env.VITE_AUTH_URL || "http://localhost:5010"}/user`,
  withCredentials: true,
  timeout: 20_000,
});

/**
 * Turn any failure into one sentence a human can act on (§40).
 *
 * Never surfaces a stack trace or a raw axios message. The backend already
 * sends a safe `message` for the errors it knows about; everything else is
 * classified by what actually went wrong rather than echoed.
 */
export const errorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (err.code === "ECONNABORTED") return "The request timed out.";
    if (!err.response) return "Cannot reach the Integration service.";
    if (err.response.status === 401) return "Your session has expired.";
    if (err.response.status === 403)
      return "You do not have permission to do that.";
    if (err.response.status >= 500) return "The Integration service failed.";
    return `Request failed (${err.response.status}).`;
  }
  return "Something went wrong.";
};

/** True when the failure is "you are not signed in", which the shell handles. */
export const isUnauthenticated = (err: unknown): boolean =>
  axios.isAxiosError(err) && err.response?.status === 401;
