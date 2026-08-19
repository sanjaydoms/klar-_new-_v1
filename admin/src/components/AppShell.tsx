import {
  Activity,
  Boxes,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Route,
  ScrollText,
  Siren,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useSession } from "@/lib/session";

/**
 * The console shell.
 *
 * Desktop-first and dense (§39): this is read on a 1440 monitor by someone
 * comparing rows, so the sidebar is fixed and the content area is given the
 * rest. It stays usable narrower, but nothing is sacrificed to make it phone-
 * shaped.
 */

interface NavItem {
  to: string;
  label: string;
  icon: typeof Activity;
  /** Present when the section is not built yet — said plainly, never faked. */
  pending?: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/providers", label: "Providers", icon: Boxes },
  { to: "/routing", label: "Service Routing", icon: Route },
  { to: "/credentials", label: "Credentials", icon: KeyRound },
  { to: "/health", label: "Health Monitor", icon: Activity },
  { to: "/logs", label: "API Logs", icon: ScrollText },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/audit", label: "Audit Logs", icon: FileClock },
];

export function AppShell() {
  const { user, signOut } = useSession();

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
        <div className="border-b border-ink-800 px-5 py-4">
          <div className="text-[15px] font-semibold tracking-tight text-ink-50">
            KLAR Operations
          </div>
          <div className="text-[12px] text-ink-400">Integration Control Center</div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon, pending }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-brand-500/15 text-brand-400"
                    : "text-ink-400 hover:bg-ink-850 hover:text-ink-200"
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {pending && (
                <span className="rounded bg-ink-850 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-800 p-3">
          <div className="px-2 pb-2">
            <div className="truncate text-[13px] font-medium text-ink-200">
              {user?.email}
            </div>
            <div className="text-[11px] text-ink-600">{user?.roles}</div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
