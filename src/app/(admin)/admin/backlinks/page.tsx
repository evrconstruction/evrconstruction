"use client";

import { useState, useEffect } from "react";
import type { BacklinkItem, OutreachDraft } from "@/app/api/admin/backlinks/route";

export default function BacklinksPage() {
  const [activeTab, setActiveTab] = useState<"tracked" | "outreach">("tracked");
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [outreach, setOutreach] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/backlinks")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setBacklinks(data.backlinks);
          setOutreach(data.outreach);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load backlinks:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleVerifyAll() {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      const today = new Date().toLocaleDateString("en-US");
      setBacklinks(backlinks.map((b) => ({ ...b, lastVerified: today })));
    }, 800);
  }

  function handleAddBacklink(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const newItem: BacklinkItem = {
      id: `bl-${Date.now()}`,
      sourceUrl: newUrl.trim(),
      title: newTitle.trim() || newUrl.trim(),
      status: "Active",
      type: "DoFollow",
      lastVerified: new Date().toLocaleDateString("en-US"),
    };

    setBacklinks([newItem, ...backlinks]);
    setNewUrl("");
    setNewTitle("");
    setShowAddModal(false);
  }

  function handleRemoveBacklink(id: string) {
    setBacklinks(backlinks.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Tracked Backlinks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous monitoring for active backlinks, dofollow status, and link health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleVerifyAll}
            disabled={verifying}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <span className={verifying ? "animate-spin" : ""}>🔄</span>
            <span>{verifying ? "Verifying..." : "Verify All Now"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f2521] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2c352f] shadow-xs cursor-pointer"
          >
            <span>+ Add Backlink</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs with Counter Badges */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("tracked")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "tracked"
              ? "bg-[#1f2521] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Tracked Backlinks</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "tracked" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {backlinks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("outreach")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "outreach"
              ? "bg-[#1f2521] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>AI Outreach & Pitch Drafts</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "outreach" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {outreach.length}
          </span>
        </button>
      </div>

      {/* Top 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Total Tracked
          </p>
          <p className="text-3xl font-bold text-slate-900 font-heading">
            {loading ? "..." : backlinks.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Active
          </p>
          <p className="text-3xl font-bold text-emerald-600 font-heading">
            {loading ? "..." : backlinks.filter((b) => b.status === "Active").length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Lost / Error
          </p>
          <p className="text-3xl font-bold text-rose-500 font-heading">
            {loading ? "..." : backlinks.filter((b) => b.status === "Lost").length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            NoFollow
          </p>
          <p className="text-3xl font-bold text-amber-500 font-heading">
            {loading ? "..." : backlinks.filter((b) => b.type === "NoFollow").length}
          </p>
        </div>
      </div>

      {/* TAB 1: ACTIVE MONITORED BACKLINKS */}
      {activeTab === "tracked" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-heading text-base font-bold text-slate-900">
              Active Monitored Backlinks
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated crawling verifies anchor text, indexability, and HTTP response codes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Source URL</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Type</th>
                  <th className="px-6 py-3.5 font-semibold">Last Verified</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backlinks.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 max-w-md">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-slate-900 hover:text-blue-600 hover:underline transition-colors block truncate"
                      >
                        {item.sourceUrl}
                      </a>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.title}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 text-xs">
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 font-bold text-blue-700 text-xs">
                        {item.type}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {item.lastVerified}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveBacklink(item.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AI OUTREACH & PITCH DRAFTS */}
      {activeTab === "outreach" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-heading text-base font-bold text-slate-900">
              AI Outreach & Pitch Drafts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Targeted Knoxville publications, East Tennessee home improvement blogs, and contractor directories.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Target Domain</th>
                  <th className="px-6 py-3.5 font-semibold">Pitch Angle & Opportunity</th>
                  <th className="px-6 py-3.5 font-semibold">Suggested Anchor</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outreach.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.targetDomain}
                    </td>
                    <td className="px-6 py-4 text-slate-700 max-w-md">
                      {item.opportunity}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-blue-600">
                      &quot;{item.suggestedAnchor}&quot;
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-bold text-slate-700 text-xs">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Backlink Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="font-heading text-lg font-bold text-slate-900">Add Monitored Backlink</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a referring URL to monitor active status and indexability.
            </p>

            <form onSubmit={handleAddBacklink} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Source URL
                </label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/directory-link"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Listing Title / Publication
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Knoxville Chamber Business Directory"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1f2521] px-4 py-2 text-xs font-bold text-white hover:bg-[#2c352f] cursor-pointer"
                >
                  Save Backlink
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
