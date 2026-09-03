"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProjectPost } from "@/lib/posts-store";
import { GSCKeywordItem } from "@/lib/integrations/google-search-console";

interface OverviewState {
  visitors: string;
  trackedKeywords: number;
  healthScore: number;
  backlinksCount: number;
  timeSeries: { label: string; value: number; date: string }[];
  topKeywords: GSCKeywordItem[];
  recentPosts: ProjectPost[];
  loading: boolean;
}

export default function AdminOverviewPage() {
  const [state, setState] = useState<OverviewState>({
    visitors: "0",
    trackedKeywords: 0,
    healthScore: 100,
    backlinksCount: 0,
    timeSeries: [],
    topKeywords: [],
    recentPosts: [],
    loading: true,
  });

  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    let isMounted = true;

    async function loadOverviewData() {
      try {
        const [analyticsRes, keywordsRes, backlinksRes, seoRes, postsRes] = await Promise.allSettled([
          fetch(`/api/admin/analytics?days=${dateRange}`).then((r) => r.json()),
          fetch("/api/admin/keywords").then((r) => r.json()),
          fetch("/api/admin/backlinks").then((r) => r.json()),
          fetch("/api/admin/seo-agent").then((r) => r.json()),
          fetch("/api/admin/posts").then((r) => r.json()),
        ]);

        if (isMounted) {
          const analyticsData = analyticsRes.status === "fulfilled" ? analyticsRes.value : null;
          const keywordsData = keywordsRes.status === "fulfilled" ? keywordsRes.value : null;
          const backlinksData = backlinksRes.status === "fulfilled" ? backlinksRes.value : null;
          const seoData = seoRes.status === "fulfilled" ? seoRes.value : null;
          const postsData = postsRes.status === "fulfilled" ? postsRes.value : null;

          setState({
            visitors: analyticsData?.metrics?.visitors || "0",
            trackedKeywords: keywordsData?.stats?.total || 0,
            healthScore: seoData?.healthScore || 100,
            backlinksCount: backlinksData?.metrics?.total || 0,
            timeSeries: analyticsData?.timeSeries || [],
            topKeywords: (keywordsData?.keywords || []).slice(0, 4),
            recentPosts: (postsData?.posts || []).slice(0, 3),
            loading: false,
          });
        }
      } catch (err) {
        console.error("Failed to load overview data:", err);
        if (isMounted) setState((s) => ({ ...s, loading: false }));
      }
    }

    loadOverviewData();
    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  const maxVal = state.timeSeries.length > 0
    ? Math.max(...state.timeSeries.map((d) => d.value), 1)
    : 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#1f2521] sm:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Welcome back. Live operational telemetry for EVR Construction LLC.
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Visitors */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Visitors ({dateRange}d)
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-[#1f2521]">
            {state.loading ? "..." : state.visitors}
          </p>
          <p className="mt-1 text-xs text-slate-400">Verified GA4 Traffic</p>
        </div>

        {/* Tracked Keywords */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tracked Keywords
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </span>
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-[#1f2521]">
            {state.loading ? "..." : state.trackedKeywords}
          </p>
          <p className="mt-1 text-xs text-slate-400">Active Search Rankings</p>
        </div>

        {/* SEO Health */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Global SEO Health
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-[#1f2521]">
            {state.loading ? "..." : `${state.healthScore}%`}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Optimal Status</p>
        </div>

        {/* Backlinks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Backlinks
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-[#1f2521]">
            {state.loading ? "..." : state.backlinksCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Verified Referring Links</p>
        </div>
      </div>

      {/* Main Charts & Side Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Traffic Overview Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-base font-bold text-[#1f2521]">
                Traffic Overview
              </h2>
              <p className="text-xs text-slate-400">Real-time daily visits across East Tennessee</p>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs outline-none"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 365 Days</option>
            </select>
          </div>

          {state.timeSeries.length > 0 ? (
            <div className="h-56 w-full flex items-end gap-2 pt-4">
              {state.timeSeries.map((pt, i) => {
                const heightPct = Math.max(8, (pt.value / maxVal) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-[#f4b400]/80 group-hover:bg-[#f4b400] rounded-t transition-all"
                    />
                    <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center">
                      {pt.label.split("-").slice(1).join("/")}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-[#1f2521] text-white text-[10px] py-0.5 px-1.5 rounded shadow pointer-events-none transition">
                      {pt.value} visits
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-xl">
              <svg className="h-8 w-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xs font-semibold text-slate-600">No traffic logged for this period yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Live sessions will stream from Google Analytics 4 automatically.</p>
            </div>
          )}
        </div>

        {/* Top Keywords */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold text-[#1f2521]">
              Top Keywords
            </h2>
            <Link
              href="/admin/keywords"
              className="text-xs font-semibold text-[#f4b400] hover:underline"
            >
              View all
            </Link>
          </div>

          {state.topKeywords.length > 0 ? (
            <div className="space-y-3">
              {state.topKeywords.map((kw) => (
                <div
                  key={kw.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-xs font-semibold text-slate-700 truncate pr-2">
                    {kw.keyword}
                  </p>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 shrink-0">
                    #{kw.position}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <p className="font-medium text-slate-500">No Google queries logged yet</p>
              <p className="text-[11px] mt-1 text-slate-400">Search Console data will appear once Google indexes search terms.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Project Posts */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-base font-bold text-[#1f2521]">
              Recent Project Posts
            </h2>
            <p className="text-xs text-slate-400">Real projects stored in Cloud Firestore</p>
          </div>
          <Link
            href="/admin/posts"
            className="rounded-xl bg-[#f4b400] px-4 py-2 text-xs font-bold text-[#1f2521] transition hover:bg-[#e0a500]"
          >
            + Add Post
          </Link>
        </div>

        {state.recentPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.recentPosts.map((post, index) => (
              <div key={post.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 overflow-hidden">
                <div className="relative h-32 w-full rounded-lg overflow-hidden bg-slate-200 mb-2">
                  <Image
                    src={post.src || "/images/hero.jpg"}
                    alt={post.alt || post.caption || "Project photo"}
                    fill
                    unoptimized
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-[#f4b400]">{post.category}</span>
                  <span className="text-slate-400 font-mono">{post.createdAt}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {post.caption}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <p className="font-medium text-slate-600">No project posts uploaded yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Upload photos in the Posts Manager to publish to the site gallery.</p>
          </div>
        )}
      </div>
    </div>
  );
}
