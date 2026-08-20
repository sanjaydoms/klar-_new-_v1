import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { authApi } from "./api";

/**
 * Who is signed in.
 *
 * The token is an httpOnly cookie this app cannot read, so "am I signed in?"
 * is answered by asking auth-service rather than by inspecting storage. That
 * costs one request at boot and removes every opportunity for the app to hold
 * a credential it could leak.
 */
export interface SessionUser {
  email: string;
  roles: string;
  firstName?: string;
}

interface Session {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.get("/auth/me");
      const data = res.data?.data?.user ?? res.data?.data ?? null;
      setUser(data ? { email: data.email, roles: data.roles, firstName: data.firstName } : null);
    } catch {
      // Any failure means "not usable as a session" — an expired token, a
      // signed-out browser and an unreachable auth service all land the user
      // on the sign-in screen, which is the one place they can act.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.post("/auth/logout");
    } catch {
      // Clearing the local view of the session matters more than the round trip.
    }
    setUser(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
