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

interface AiSuggestion {
  keyword: string;
  category: string;
  location: string;
}

export default function KeywordsPage() {
  const [data, setData] = useState<KeywordsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [keywordsList, setKeywordsList] = useState<KeywordItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Decks");
  const [selectedLocation, setSelectedLocation] = useState("Knoxville, TN");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/keywords")
      .then((res) => res.json())
      .then((json: KeywordsResponse) => {
        if (isMounted) {
          setData(json);
          setKeywordsList(json.keywords || []);
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

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeywordInput.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeywordInput.trim(),
          category: selectedCategory,
          targetLocation: selectedLocation,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.keyword) {
          setKeywordsList((prev) => [result.keyword, ...prev]);
        }
        setNewKeywordInput("");
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Failed to add keyword:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveKeyword(id: string) {
    try {
      const res = await fetch(`/api/admin/keywords?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeywordsList((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error("Failed to remove keyword:", err);
    }
  }

  async function handleOpenAiSuggestions() {
    setShowAiModal(true);
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/keywords/suggest", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setAiSuggestions(json.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to get AI suggestions:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAddAiSuggestion(sug: AiSuggestion) {
    try {
      const res = await fetch("/api/admin/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: sug.keyword,
          category: sug.category,
          targetLocation: sug.location,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.keyword) {
          setKeywordsList((prev) => [result.keyword, ...prev]);
        }
        setAiSuggestions((prev) => prev.filter((s) => s.keyword !== sug.keyword));
      }
    } catch (err) {
      console.error("Failed to add suggested keyword:", err);
    }
  }

  const filteredKeywords = keywordsList.filter((k) =>
    k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexedCount = keywordsList.filter((k) => k.position > 0).length;
  const top10Count = keywordsList.filter((k) => k.position > 0 && k.position <= 10).length;
  const top20Count = keywordsList.filter((k) => k.position > 0 && k.position <= 20).length;
  const top50Count = keywordsList.filter((k) => k.position > 0 && k.position <= 50).length;

  return (
    <div className="space-y-6 w-full">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Keywords & Rankings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Google Search Console organic rankings & target keywords for East Tennessee.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAiSuggestions}
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
            <span>+ Add Target Keyword</span>
          </button>
        </div>
      </div>

      {/* Top 2 Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: KEYWORD STATS */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            SEARCH RANKING BREAKDOWN
          </p>
          <div className="grid grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : keywordsList.length}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Tracked</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : top10Count}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Top 10</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 font-heading">
                {loading ? "..." : top20Count}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Top 20</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : top50Count}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Top 50</p>
            </div>
          </div>
        </div>

        {/* Card 2: CRAWLER / INDEXING STATUS */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            GOOGLE SEARCH CONSOLE STATUS
          </p>
          <div className="grid grid-cols-3 gap-4 text-center sm:text-left">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>✓</span>
                <span>{loading ? "..." : indexedCount}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Indexed</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-500 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>⏱</span>
                <span>{loading ? "..." : Math.max(0, keywordsList.length - indexedCount)}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Pending Crawl</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-700 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>⚡</span>
                <span>{loading ? "..." : data?.changes.improved ?? 0}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">High Intent</p>
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
              placeholder="Search target keywords..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#f4b400] focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Target Keyword</th>
                <th className="px-6 py-3.5 font-semibold">Avg Position</th>
                <th className="px-6 py-3.5 font-semibold">Impressions (28D)</th>
                <th className="px-6 py-3.5 font-semibold">Status / Trend</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKeywords.map((item) => {
                const isRanked = item.position > 0;
                return (
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
                      {isRanked ? (
                        <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 font-mono font-bold text-emerald-700 text-xs">
                          #{item.position}
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-slate-400 text-xs">
                          --
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                      {item.volume > 0 ? item.volume : "--"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {isRanked ? (
                        <span className="text-emerald-600">{item.trend}</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tracking (Pending Index)</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredKeywords.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <p className="font-semibold text-slate-600 text-sm">No target keywords found</p>
            <p className="max-w-md mx-auto">
              Add your target East Tennessee search queries (e.g. &quot;deck builder knoxville tn&quot;, &quot;gazebo farragut&quot;) or use AI discovery to find high-intent local contractor terms.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenAiSuggestions}
                className="rounded-lg bg-[#1f2521] px-4 py-2 text-xs font-bold text-white hover:bg-[#2c352f] cursor-pointer"
              >
                ✦ Discover with AI
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                + Add Target Keyword
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Keyword Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="font-heading text-lg font-bold text-slate-900">Add Target Keyword</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a localized Knoxville / East TN search query to monitor rankings.
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
                  placeholder="e.g. screened porch builder farragut tn"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:outline-hidden"
                  >
                    <option value="Decks">Decks</option>
                    <option value="Gazebos">Gazebos</option>
                    <option value="Restoration">Restoration</option>
                    <option value="Remodeling">Remodeling</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Patios">Patios & Pergolas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:outline-hidden"
                  >
                    <option value="Knoxville, TN">Knoxville, TN</option>
                    <option value="Farragut, TN">Farragut, TN</option>
                    <option value="Hardin Valley, TN">Hardin Valley, TN</option>
                    <option value="Maryville, TN">Maryville, TN</option>
                    <option value="Oak Ridge, TN">Oak Ridge, TN</option>
                    <option value="Lenoir City, TN">Lenoir City, TN</option>
                  </select>
                </div>
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
                  disabled={submitting}
                  className="rounded-lg bg-[#1f2521] px-4 py-2 text-xs font-bold text-white hover:bg-[#2c352f] cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add to Tracked Keywords"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Suggestion Discovery Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>✦</span>
                  <span>AI Keyword Opportunities</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-intent East Tennessee search terms tailored to EVR Construction.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
              {aiLoading ? (
                <p className="text-xs text-slate-400 py-12 text-center">Analyzing local search patterns...</p>
              ) : aiSuggestions.length > 0 ? (
                aiSuggestions.map((sug) => (
                  <div
                    key={sug.keyword}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{sug.keyword}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-[#f4b400] uppercase tracking-wider">
                          {sug.category}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-500">{sug.location}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddAiSuggestion(sug)}
                      className="rounded-md bg-[#1f2521] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#2c352f] transition cursor-pointer shrink-0"
                    >
                      + Track
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  <p>All suggestions added!</p>
                  <button
                    type="button"
                    onClick={handleOpenAiSuggestions}
                    className="mt-2 text-xs font-bold text-[#1f2521] hover:underline"
                  >
                    Generate More Ideas
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenAiSuggestions}
                disabled={aiLoading}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-50"
              >
                ↻ Refresh Suggestions
              </button>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

