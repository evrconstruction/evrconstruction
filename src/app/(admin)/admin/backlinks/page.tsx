"use client";

import { useState, useEffect } from "react";
import type {
  BacklinkItem,
  BacklinkStatus,
} from "@/app/api/admin/backlinks/route";

/**
 * Status → badge styling.
 *
 * `Blocked` is deliberately not a success tone: the directory refused the check,
 * so the listing's state is genuinely unknown. A single fixed colour previously
 * made every status render as a green success, which hid missing citations.
 */
const STATUS_BADGE: Record<BacklinkStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Missing: "bg-rose-50 text-rose-700",
  Unreachable: "bg-amber-50 text-amber-700",
  Blocked: "bg-slate-200 text-slate-800",
  Pending: "bg-slate-100 text-slate-500",
};

const TYPE_BADGE: Record<BacklinkItem["type"], string> = {
  DoFollow: "bg-blue-50 text-blue-700",
  NoFollow: "bg-slate-100 text-slate-600",
};

export default function BacklinksPage() {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
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

  async function handleVerifyAll() {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/backlinks/verify", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.backlinks) {
          setBacklinks(data.backlinks);
        }
      }
    } catch (err) {
      console.error("Failed to verify backlinks:", err);
    } finally {
      setVerifying(false);
    }
  }

  async function handleAddBacklink(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      const res = await fetch("/api/admin/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: newUrl.trim(),
          title: newTitle.trim() || newUrl.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.backlink) {
          setBacklinks((prev) => [data.backlink, ...prev]);
        }
        setNewUrl("");
        setNewTitle("");
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Failed to add backlink:", err);
    }
  }

  async function handleRemoveBacklink(id: string) {
    try {
      const res = await fetch(`/api/admin/backlinks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBacklinks((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete backlink:", err);
    }
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
            Needs Attention
          </p>
          <p className="text-3xl font-bold text-rose-500 font-heading">
            {loading
              ? "..."
              : backlinks.filter((b) => b.status === "Missing" || b.status === "Unreachable").length}
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

      {/* Monitored backlinks */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-heading text-base font-bold text-slate-900">
              Active Monitored Backlinks
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each check fetches the page and records its HTTP response, then looks for your
              business name and reads the link back to your site. Directories that refuse
              automated access are reported as Blocked rather than assumed live.
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
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 font-bold text-xs ${
                          STATUS_BADGE[item.status] ?? STATUS_BADGE.Pending
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 font-bold text-xs ${
                          TYPE_BADGE[item.type] ?? TYPE_BADGE.NoFollow
                        }`}
                      >
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

          {backlinks.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400 space-y-3">
              <p className="font-semibold text-slate-600 text-sm">No monitored backlinks yet</p>
              <p className="max-w-md mx-auto">
                Add referring directory listings (BBB, Yelp, Nextdoor, local chambers, supplier profiles) to monitor active status and link health.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-lg bg-[#1f2521] px-4 py-2 text-xs font-bold text-white hover:bg-[#2c352f] cursor-pointer"
              >
                + Add Backlink
              </button>
            </div>
          )}
      </div>

      {/* Add Backlink Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="font-heading text-lg font-bold text-slate-900">Add Monitored Backlink</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a referring URL to monitor its HTTP status and whether the link back to your
              site is followed.
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
