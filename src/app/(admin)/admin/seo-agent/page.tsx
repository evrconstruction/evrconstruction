"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AgentDirective,
  AgentSkill,
  AgentRunLog,
  SeoAgentDashboardData,
} from "@/lib/seo-agent/types";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function SeoAgentPage() {
  const [data, setData] = useState<SeoAgentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();
  const [runningAll, setRunningAll] = useState(false);
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/seo-agent");
      if (res.ok) {
        const json: SeoAgentDashboardData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load SEO agent data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await fetch("/api/admin/seo-agent");
        if (res.ok && isMounted) {
          const json: SeoAgentDashboardData = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load SEO agent data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleKillSwitch = async () => {
    if (!data) return;
    const newActive = !data.config.autonomousActive;
    try {
      const res = await fetch("/api/admin/seo-agent/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      if (res.ok) {
        setData({
          ...data,
          config: {
            ...data.config,
            autonomousActive: newActive,
          },
        });
        showToast(
          newActive
            ? "Autonomous SEO Engine activated."
            : "Autonomous SEO Engine paused (Kill Switch engaged)."
        );
      }
    } catch (err) {
      console.error("Failed to toggle autonomous mode:", err);
    }
  };

  const handleRunAllSkills = async () => {
    setRunningAll(true);
    try {
      const res = await fetch("/api/admin/seo-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(result.message || "All 7 SEO skills executed successfully.");
        await fetchDashboardData();
      } else {
        showToast(result.message || "Execution failed or lock acquired.");
      }
    } catch (err) {
      console.error("Failed to run skills:", err);
      showToast("Error running skills.");
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunSingleSkill = async (skillId: string, skillName: string) => {
    setRunningSkillId(skillId);
    try {
      const res = await fetch("/api/admin/seo-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(`Executed ${skillName} successfully.`);
        await fetchDashboardData();
      } else {
        showToast(result.message || "Execution failed.");
      }
    } catch (err) {
      console.error("Failed to run skill:", err);
      showToast(`Error running ${skillName}.`);
    } finally {
      setRunningSkillId(null);
    }
  };

  const handleUpdateDirective = async (
    id: string,
    status: "Resolved" | "Dismissed"
  ) => {
    try {
      const res = await fetch("/api/admin/seo-agent/directives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            directives: prev.directives.map((d) =>
              d.id === id ? { ...d, status } : d
            ),
          };
        });
        showToast(`Directive marked as ${status.toLowerCase()}.`);
      }
    } catch (err) {
      console.error("Failed to update directive:", err);
    }
  };

  const openDirectives = (data?.directives || []).filter(
    (d) => d.status === "Open"
  );
  const filteredDirectives =
    activeCategoryFilter === "All"
      ? openDirectives
      : openDirectives.filter((d) => d.category === activeCategoryFilter);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-xl transition-all duration-300 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header & Master Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-2xl font-bold text-slate-900">
              SEO & GEO Agent
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                data?.config?.autonomousActive ?? true
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  data?.config?.autonomousActive ?? true
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              {data?.config?.autonomousActive ?? true ? "Engine Active" : "Paused (Kill Switch)"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Autonomous East Tennessee search intelligence, 48h citation crawler, and project geo-tagging engine.
          </p>
        </div>

        {/* Master Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleKillSwitch}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
              data?.config?.autonomousActive ?? true
                ? "border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-100/60"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <span>{data?.config?.autonomousActive ?? true ? "Pause Autonomous" : "Enable Autonomous"}</span>
          </button>

          <button
            type="button"
            disabled={runningAll || (mounted && data ? !data.config?.autonomousActive : false)}
            onClick={handleRunAllSkills}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f2521] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#2c352f] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {runningAll ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Auditing All Skills...</span>
              </>
            ) : (
              <>
                <span>⚡ Run All 7 Skills Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                SEO / GEO Health
              </p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-900">
                {loading ? "..." : `${data?.healthScore ?? 100}%`}
              </p>
            </div>
            <div className="rounded-lg p-2.5 bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-600 font-medium">
            Optimal East TN Local Indexing
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tracked Queries
              </p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-900">
                {loading ? "..." : (data?.stats?.trackedKeywords ?? 0)}
              </p>
            </div>
            <div className="rounded-lg p-2.5 bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 font-medium">
            Knoxville & Regional GSC Queries
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Citations
              </p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-900">
                {loading ? "..." : (data?.stats?.activeBacklinks ?? 0)}
              </p>
            </div>
            <div className="rounded-lg p-2.5 bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-600 font-medium">
            100% NAP Consistency Verified
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Open Directives
              </p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-900">
                {loading ? "..." : openDirectives.length}
              </p>
            </div>
            <div className="rounded-lg p-2.5 bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600 font-medium">
            High Impact Growth Actions
          </p>
        </div>
      </div>

      {/* 7-Day Skills Status Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">
              7-Day Autonomous Skills Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled tasks running weekly with lock isolation and automated finding synthesis.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Next Run: {mounted && data?.config?.nextScheduledRun ? new Date(data.config.nextScheduledRun).toLocaleDateString() : "Tomorrow @ 08:00 UTC"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(data?.skills || []).map((skill: AgentSkill) => {
            const isSkillRunning = runningSkillId === skill.id || runningAll;
            return (
              <div
                key={skill.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
                      {skill.day}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        skill.status === "Passed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : skill.status === "Action Needed"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          skill.status === "Passed" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {skill.status}
                    </span>
                  </div>

                  <h4 className="font-heading text-sm font-bold text-slate-900 mb-1">
                    {skill.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mounted && skill.lastRun ? `Last: ${new Date(skill.lastRun).toLocaleDateString()}` : "Pending"}
                  </span>
                  <button
                    type="button"
                    disabled={isSkillRunning || (mounted && data ? !data.config.autonomousActive : false)}
                    onClick={() => handleRunSingleSkill(skill.id, skill.name)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 shadow-2xs transition"
                  >
                    {isSkillRunning ? (
                      <svg className="animate-spin h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <span>Run</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Directives Center */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">
              Prioritized Action Directives
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Targeted local actions identified across keywords, citations, and project posts.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["All", "Keywords", "AIO_GEO", "Technical", "Citations", "Posts"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategoryFilter === cat
                    ? "bg-[#1f2521] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "AIO_GEO" ? "AI Search" : cat}
              </button>
            ))}
          </div>
        </div>

        {filteredDirectives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No open directives in this category.</p>
            <p className="text-xs text-slate-400 mt-1">All audit items are optimized and up to date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDirectives.map((dir: AgentDirective) => (
              <div
                key={dir.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/40 p-5 hover:bg-slate-50/80 transition"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        dir.priority === "High"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : dir.priority === "Medium"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {dir.priority} Priority
                    </span>
                    <span className="rounded bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {dir.category === "AIO_GEO" ? "AI Search & GEO" : dir.category}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {dir.impact}
                    </span>
                  </div>

                  <h4 className="font-heading text-sm font-bold text-slate-900">
                    {dir.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {dir.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    href={dir.actionHref}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f2521] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#2c352f] shadow-2xs"
                  >
                    <span>{dir.actionLabel}</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleUpdateDirective(dir.id, "Resolved")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
                  >
                    <span>Mark Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateDirective(dir.id, "Dismissed")}
                    className="p-2 text-slate-400 hover:text-slate-600 transition"
                    title="Dismiss"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Run History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <h3 className="font-heading text-base font-bold text-slate-900 mb-1">
          Execution Activity History
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Immutable audit record of all scheduled & manual agent runs.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Skill</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Output Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentRuns || []).map((run: AgentRunLog) => (
                <tr key={run.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 font-mono text-slate-500 whitespace-nowrap">
                    {mounted
                      ? new Date(run.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recently"}
                  </td>
                  <td className="py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                    {run.skillName}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        run.status === "Success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          run.status === "Success" ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-slate-500 whitespace-nowrap">
                    {run.durationMs}ms
                  </td>
                  <td className="py-3.5 text-slate-600 max-w-md truncate">
                    {run.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
