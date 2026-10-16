"use client";

import type { UntrackedQuery } from "@/lib/integrations/google-search-console";

interface UntrackedQueriesPanelProps {
  queries: UntrackedQuery[];
  onTrack: (query: string) => void;
  /** The query currently being saved, so only its own button shows progress. */
  trackingQuery: string | null;
}

/**
 * Queries Google already serves this site for that the owner has not added as
 * targets.
 *
 * These are real searches. They are better targets than phrases assembled from
 * a list of service areas and town names, which is what produces long-tail
 * keywords Google has never reported on.
 */
export function UntrackedQueriesPanel({
  queries,
  onTrack,
  trackingQuery,
}: UntrackedQueriesPanelProps) {
  if (queries.length === 0) return null;

  const isBusy = trackingQuery !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="p-6 pb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          PEOPLE ARE ALREADY SEARCHING FOR THESE
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Queries Google reported for your site that you are not tracking yet.
          Ordered by how often Google showed you.
        </p>
      </div>

      <div className="overflow-x-auto border-t border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Query</th>
              <th className="px-5 py-2.5 font-semibold text-center">Position</th>
              <th className="px-5 py-2.5 font-semibold text-center">
                Impressions (28D)
              </th>
              <th className="px-5 py-2.5 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {queries.map((item) => (
              <tr
                key={item.query}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="px-5 py-3 font-semibold text-slate-900">
                  {item.query}
                </td>
                <td className="px-5 py-3 text-center font-mono text-slate-600">
                  #{item.position}
                </td>
                <td className="px-5 py-3 text-center font-mono text-slate-600">
                  {item.impressions}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onTrack(item.query)}
                    disabled={isBusy}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {trackingQuery === item.query ? "Adding…" : "+ Track"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
