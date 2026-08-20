import { Fragment, useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Card, EmptyState, ErrorNotice } from "@/components/Primitives";
import { api, errorMessage } from "@/lib/api";
import { absoluteTime, humanise } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

/**
 * Every administrative change, newest first (§28).
 *
 * Read-only by construction — there is no endpoint to edit or delete an entry,
 * so there is nothing here to offer.
 */
export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/audit-logs", { params: { limit: 100 } })
      .then((res) => setEntries(res.data.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Audit Logs" />
        <ErrorNotice message={error} />
      </>
    );
  }

  const all = entries ?? [];

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Who changed what, and why. Append-only."
      />

      <Card>
        {all.length === 0 ? (
          <EmptyState
            title="No changes recorded"
            description="Every provider, routing and credential change will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[12px] text-ink-400">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 font-medium">Who</th>
                  <th className="px-5 py-2.5 font-medium">Action</th>
                  <th className="px-5 py-2.5 font-medium">Target</th>
                  <th className="px-5 py-2.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {all.map((e) => (
                  // A Fragment so one entry can render its own detail row; the
                  // key belongs on the Fragment, not on the rows inside it.
                  <Fragment key={e._id}>
                    <tr
                      onClick={() => setExpanded(expanded === e._id ? null : e._id)}
                      className="cursor-pointer hover:bg-ink-850/50"
                    >
                      <td className="tnum px-5 py-3 whitespace-nowrap text-ink-400">
                        {absoluteTime(e.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-ink-200">{e.actorEmail}</div>
                        <div className="text-[12px] text-ink-600">{e.actorRole}</div>
                      </td>
                      <td className="px-5 py-3 font-medium text-ink-50">
                        {humanise(e.action)}
                      </td>
                      <td className="px-5 py-3 text-ink-400">{e.targetId}</td>
                      <td className="max-w-sm px-5 py-3 text-ink-400">{e.reason}</td>
                    </tr>
                    {expanded === e._id && (
                      <tr className="bg-ink-950/60">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="mb-1.5 text-[12px] font-medium text-ink-400">
                                Before
                              </div>
                              <pre className="overflow-x-auto rounded-lg bg-ink-900 p-3 text-[12px] text-ink-200">
                                {JSON.stringify(e.before ?? null, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="mb-1.5 text-[12px] font-medium text-ink-400">
                                After
                              </div>
                              <pre className="overflow-x-auto rounded-lg bg-ink-900 p-3 text-[12px] text-ink-200">
                                {JSON.stringify(e.after ?? null, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
