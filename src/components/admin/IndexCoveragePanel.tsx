"use client";

import { useEffect, useState } from "react";
import type {
  IndexStatusReport,
  PageIndexStatus,
} from "@/lib/integrations/google-search-console-index";

/**
 * Google's own verdict vocabulary, so the labels match what the owner sees in
 * Search Console rather than inventing a second set of words for the same thing.
 */
const VERDICT_STYLES: Record<string, string> = {
  PASS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  FAIL: "border-rose-200 bg-rose-50 text-rose-700",
  NEUTRAL: "border-slate-200 bg-slate-50 text-slate-600",
  VERDICT_UNSPECIFIED: "border-slate-200 bg-slate-50 text-slate-600",
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CanonicalCell({ page }: { page: PageIndexStatus }) {
  if (page.canonicalMatches === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (page.canonicalMatches) {
    return <span className="text-xs font-medium text-emerald-700">Matches</span>;
  }

  // Google indexing a different canonical than the page declares is how a
  // duplicate-content problem starts, so both URLs are named rather than just
  // flagged — a bare "mismatch" cannot be acted on.
  return (
    <div className="text-xs">
      <span className="font-semibold text-rose-700">Mismatch</span>
      <p className="mt-0.5 font-mono text-[10px] leading-4 text-slate-500">
        Google: {page.googleCanonical ?? "—"}
        <br />
        Page: {page.userCanonical ?? "—"}
      </p>
    </div>
  );
}

function PageRow({ page }: { page: PageIndexStatus }) {
  const chip = VERDICT_STYLES[page.verdict] ?? VERDICT_STYLES.VERDICT_UNSPECIFIED;

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-5 py-3">
        <span className="font-mono text-xs text-slate-700">{page.path}</span>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chip}`}
        >
          {page.coverageState}
        </span>
        {page.error && (
          <p className="mt-1 text-[11px] text-rose-600">{page.error}</p>
        )}
      </td>
      <td className="px-5 py-3">
        <CanonicalCell page={page} />
      </td>
      <td className="px-5 py-3 text-xs text-slate-500">
        {formatDate(page.lastCrawlTime)}
      </td>
    </tr>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div>
      <p className={`font-heading text-2xl font-bold sm:text-3xl ${tone}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function IndexCoveragePanel() {
  const [report, setReport] = useState<IndexStatusReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/index-status")
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          throw new Error(body.error || "Failed to load index status");
        }
        setReport(body);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load index status"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pages = report?.pages ?? [];
  const indexedCount = pages.filter((page) => page.verdict === "PASS").length;
  const attentionCount = pages.length - indexedCount;
  const primarySitemap = report?.sitemaps[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          INDEX COVERAGE IN GOOGLE
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Live from the URL Inspection and Sitemaps APIs — the same data as the
          Search Console Page Indexing report.
        </p>

        {loading && <p className="mt-6 text-sm text-slate-500">Checking Google…</p>}

        {error && (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
            {error}
          </p>
        )}

        {report && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              value={indexedCount}
              label="Indexed pages"
              tone="text-emerald-600"
            />
            <Stat
              value={attentionCount}
              label="Need attention"
              tone={attentionCount > 0 ? "text-amber-500" : "text-slate-900"}
            />
            <Stat
              value={primarySitemap?.errors ?? 0}
              label="Sitemap errors"
              tone={(primarySitemap?.errors ?? 0) > 0 ? "text-rose-600" : "text-slate-900"}
            />
            <Stat
              value={primarySitemap?.warnings ?? 0}
              label="Sitemap warnings"
              tone="text-slate-900"
            />
          </div>
        )}
      </div>

      {report && pages.length > 0 && (
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5 font-bold">Page</th>
                <th className="px-5 py-2.5 font-bold">Google&apos;s status</th>
                <th className="px-5 py-2.5 font-bold">Canonical</th>
                <th className="px-5 py-2.5 font-bold">Last crawled</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <PageRow key={page.url} page={page} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-[11px] text-slate-500">
            Property <span className="font-mono">{report.property}</span>
            {primarySitemap?.lastDownloaded && (
              <> · sitemap last read by Google {formatDate(primarySitemap.lastDownloaded)}</>
            )}
            {" · "}
            <span className="font-mono">{primarySitemap?.path}</span>
          </p>
        </div>
      )}
    </div>
  );
}
