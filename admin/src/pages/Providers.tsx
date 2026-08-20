import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { Button, Card, EmptyState, ErrorNotice } from "@/components/Primitives";
import { StatusPill } from "@/components/StatusPill";
import { api, errorMessage } from "@/lib/api";
import { humanise, relativeTime } from "@/lib/format";
import type { Provider, RoutingDecision } from "@/lib/types";

/**
 * Every provider, with what each one is actually serving.
 *
 * The "Serving" column counts operations this provider is currently routable
 * for — the difference between "switched on" and "actually reachable by a
 * customer request", which is the gap an admin most often needs to see.
 */
export function Providers() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [routing, setRouting] = useState<RoutingDecision[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [p, r] = await Promise.all([api.get("/providers"), api.get("/routing")]);
        if (!live) return;
        setProviders(p.data.data);
        setRouting(r.data.data);
        setError(null);
      } catch (err) {
        if (live) setError(errorMessage(err));
      }
    };
    void load();
    const timer = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  const servingCount = (slug: string) =>
    routing.filter((d) => d.providers.some((p) => p.slug === slug)).length;

  const primaryCount = (slug: string) =>
    routing.filter((d) => d.providers[0]?.slug === slug).length;

  if (error && !providers) {
    return (
      <>
        <PageHeader title="Providers" />
        <ErrorNotice message={error} />
      </>
    );
  }

  const all = providers ?? [];

  return (
    <>
      <PageHeader
        title="Providers"
        description="Every external supplier KLAR buys from, and what each is currently serving."
        action={
          <Button variant="primary" onClick={() => navigate("/providers/new")}>
            <Plus className="size-3.5" />
            Add provider
          </Button>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNotice message={`${error} Showing the last successful read.`} />
        </div>
      )}

      <Card>
        {all.length === 0 ? (
          <EmptyState
            title="No providers registered"
            description="Add one above, or run the seed in integration-service to register TripJack and RateGain."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Provider</th>
                  <th className="px-5 py-2.5 font-medium">Types</th>
                  <th className="px-5 py-2.5 font-medium">Environment</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Serving</th>
                  <th className="px-5 py-2.5 font-medium">Primary for</th>
                  <th className="px-5 py-2.5 font-medium">Last change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {all.map((p) => {
                  const serving = servingCount(p.slug);
                  return (
                    <tr key={p.slug} className="hover:bg-ink-850/50">
                      <td className="px-5 py-3">
                        <Link
                          to={`/providers/${p.slug}`}
                          className="font-medium text-ink-50 hover:text-brand-400"
                        >
                          {p.name}
                        </Link>
                        {p.description && (
                          <div className="max-w-md truncate text-[12px] text-ink-600">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-400">
                        {p.types.map(humanise).join(", ")}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            p.activeEnvironment === "production"
                              ? "font-medium text-warn-500"
                              : "text-ink-400"
                          }
                        >
                          {p.activeEnvironment === "production" ? "PRODUCTION" : "Test"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={p.status} size="sm" />
                      </td>
                      <td className="tnum px-5 py-3">
                        <span
                          className={serving === 0 ? "text-ink-600" : "text-ink-200"}
                        >
                          {serving} {serving === 1 ? "operation" : "operations"}
                        </span>
                      </td>
                      <td className="tnum px-5 py-3 text-ink-400">
                        {primaryCount(p.slug)}
                      </td>
                      <td className="px-5 py-3 text-ink-400">
                        {relativeTime(p.statusChangedAt)}
                        {p.statusReason && (
                          <div className="max-w-xs truncate text-[12px] text-ink-600">
                            {p.statusReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
