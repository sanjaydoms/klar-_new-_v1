import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { AuditLog } from "@/pages/AuditLog";
import { Credentials } from "@/pages/Credentials";
import { Login } from "@/pages/Login";
import { Overview } from "@/pages/Overview";
import { Pending } from "@/pages/Pending";
import { ProviderDetail } from "@/pages/ProviderDetail";
import { Providers } from "@/pages/Providers";
import { Routing } from "@/pages/Routing";
import { SessionProvider, useSession } from "@/lib/session";

/**
 * Gate the whole console on a session.
 *
 * The backend enforces every permission on its own — this is a courtesy so an
 * unauthenticated visitor lands somewhere useful, not a security boundary. A
 * frontend route guard has never stopped anyone who can open a terminal.
 */
function Gate() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-ink-400">
        Loading…
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="providers" element={<Providers />} />
        <Route path="providers/:slug" element={<ProviderDetail />} />
        <Route path="routing" element={<Routing />} />
        <Route path="credentials" element={<Credentials />} />
        <Route
          path="health"
          element={
            <Pending
              title="Health Monitor"
              phase="Phase 8"
              description="Availability, response times and error rates per provider, service and operation."
            />
          }
        />
        <Route
          path="logs"
          element={
            <Pending
              title="API Logs"
              phase="Phase 9"
              description="Every request KLAR makes to a supplier, with request ids that trace one customer action across retries and failover."
            />
          }
        />
        <Route
          path="incidents"
          element={
            <Pending
              title="Incidents"
              phase="Phase 11"
              description="Raised automatically when a provider or operation crosses a threshold, with the timeline of what the system did about it."
            />
          }
        />
        <Route path="audit" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </BrowserRouter>
  );
}
