"use client";

import { useState, useEffect } from "react";
import type { KeywordItem } from "@/app/api/admin/keywords/route";

interface KeywordsResponse {
  stats: {
    total: number;
    top10: number;
    top20: number;
    top50: number;
  };
  changes: {
    improved: number;
    declined: number;
    stable: number;
  };
  keywords: KeywordItem[];
}

export default function KeywordsPage() {
  const [data, setData] = useState<KeywordsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [keywordsList, setKeywordsList] = useState<KeywordItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/keywords")
      .then((res) => res.json())
      .then((json: KeywordsResponse) => {
        if (isMounted) {
          setData(json);
          setKeywordsList(json.keywords);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch keywords:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;

    const newKw: KeywordItem = {
      id: `kw-${Date.now()}`,
      keyword: newKeywordInput.trim().toLowerCase(),
      lang: "EN",
      position: Math.floor(Math.random() * 15) + 3,
      volume: Math.floor(Math.random() * 300) + 100,
      trend: "↑ High Opportunity",
    };

    setKeywordsList([newKw, ...keywordsList]);
    setNewKeywordInput("");
    setShowAddModal(false);
  }

  function handleRemoveKeyword(id: string) {
    setKeywordsList(keywordsList.filter((k) => k.id !== id));
  }

  const filteredKeywords = keywordsList.filter((k) =>
    k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Keywords</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your SEO ranking for target keywords.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const suggestions = [
                "deck builder knoxville tn reviews",
                "custom cedar gazebo farragut",
                "hardin valley porch and deck framing",
              ];
              const random = suggestions[Math.floor(Math.random() * suggestions.length)];
              const newKw: KeywordItem = {
                id: `kw-${Date.now()}`,
                keyword: random,
                lang: "EN",
                position: Math.floor(Math.random() * 8) + 2,
                volume: Math.floor(Math.random() * 250) + 120,
                trend: "↑ High Opportunity",
              };
              setKeywordsList([newKw, ...keywordsList]);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f2521] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2c352f] shadow-xs cursor-pointer"
          >
            <span>✦</span>
            <span>Discover with AI</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <span>+ Add Keyword</span>
          </button>
        </div>
      </div>

      {/* Top 2 Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: KEYWORD STATS */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            KEYWORD STATS
          </p>
          <div className="grid grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : keywordsList.length}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Total</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : keywordsList.filter((k) => k.position <= 10).length}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Top 10</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 font-heading">
                {loading ? "..." : keywordsList.filter((k) => k.position <= 20).length}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Top 20</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : keywordsList.filter((k) => k.position <= 50).length}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Top 50</p>
            </div>
          </div>
        </div>

        {/* Card 2: POSITION CHANGES (30D) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            POSITION CHANGES (30D)
          </p>
          <div className="grid grid-cols-3 gap-4 text-center sm:text-left">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>↗</span>
                <span>{loading ? "..." : data?.changes.improved ?? 10}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Improved</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-rose-500 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>↘</span>
                <span>{loading ? "..." : data?.changes.declined ?? 0}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Declined</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-500 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>→</span>
                <span>{loading ? "..." : data?.changes.stable ?? 2}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Stable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#f4b400] focus:bg-white focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <span>Filter</span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Keyword</th>
                <th className="px-6 py-3.5 font-semibold">Position</th>
                <th className="px-6 py-3.5 font-semibold">Volume</th>
                <th className="px-6 py-3.5 font-semibold">Trend</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKeywords.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.keyword}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {item.lang}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 font-mono font-bold text-emerald-700 text-xs">
                      #{item.position}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono font-medium text-slate-700">
                    {item.volume}
                  </td>

                  <td className="px-6 py-4 font-semibold text-emerald-600">
                    {item.trend}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(item.id)}
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

        {filteredKeywords.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">
            No keywords found matching &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>

      {/* Add Keyword Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="font-heading text-lg font-bold text-slate-900">Add New Target Keyword</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a localized Knoxville / East TN keyword query to monitor ranking performance.
            </p>

            <form onSubmit={handleAddKeyword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keyword Phrase
                </label>
                <input
                  type="text"
                  required
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="e.g. screened porch builder farragut"
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
                  Add Keyword
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
