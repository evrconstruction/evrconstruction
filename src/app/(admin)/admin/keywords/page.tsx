"use client";

import { useState, useEffect } from "react";
import type { KeywordItem } from "@/app/api/admin/keywords/route";
import { SERVICE_AREA_TAGS } from "@/lib/site";

interface KeywordsResponse {
  stats: {
    total: number;
    top10: number;
    top20: number;
    top50: number;
    totalClicks?: number;
    totalImpressions?: number;
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
  /** One sentence from the model explaining why this term is worth targeting. */
  rationale?: string;
}

export default function KeywordsPage() {
  const [data, setData] = useState<KeywordsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "ranked" | "unranked">("all");
  const [keywordsList, setKeywordsList] = useState<KeywordItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
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
    setAiError(null);
    try {
      const res = await fetch("/api/admin/keywords/suggest", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        // Surface the real reason instead of an empty list, so a failed AI call
        // is never mistaken for "no suggestions available".
        setAiSuggestions([]);
        setAiError(json.error || `Request failed with HTTP ${res.status}.`);
        return;
      }

      setAiSuggestions(json.suggestions || []);
      setAiModel(json.model || null);
    } catch (err) {
      console.error("Failed to get AI suggestions:", err);
      setAiSuggestions([]);
      setAiError("Could not reach the AI service. Check your connection and try again.");
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

  const indexedCount = keywordsList.filter((k) => k.position > 0).length;
  const noImpressionsCount = Math.max(0, keywordsList.length - indexedCount);
  const top10Count = keywordsList.filter((k) => k.position > 0 && k.position <= 10).length;
  const top20Count = keywordsList.filter((k) => k.position > 0 && k.position <= 20).length;
  const top50Count = keywordsList.filter((k) => k.position > 0 && k.position <= 50).length;
  const totalClicks = data?.stats?.totalClicks ?? keywordsList.filter((k) => k.position > 0).reduce((acc, k) => acc + (k.clicks || 0), 0);

  const filteredKeywords = keywordsList
    .filter((k) => {
      if (filterTab === "ranked") return k.position > 0;
      if (filterTab === "unranked") return k.position === 0;
      return true;
    })
    .filter((k) =>
      k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
              <p className="text-xs font-medium text-slate-500 mt-1">Ranking on Google</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-500 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>⏱</span>
                <span>{loading ? "..." : noImpressionsCount}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">No Impressions (28D)</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                <span>⚡</span>
                <span>{loading ? "..." : totalClicks}</span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Total Clicks (28D)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Filter Tabs & Search Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterTab === "all"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({keywordsList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ranked")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === "ranked"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              <span>Ranking on Google</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filterTab === "ranked" ? "bg-white/25 text-white" : "bg-emerald-200/70 text-emerald-800"
              }`}>
                {indexedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("unranked")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === "unranked"
                  ? "bg-amber-600 text-white font-bold"
                  : "text-amber-700 bg-amber-50 hover:bg-amber-100"
              }`}
            >
              <span>No Impressions</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filterTab === "unranked" ? "bg-white/25 text-white" : "bg-amber-200/70 text-amber-800"
              }`}>
                {noImpressionsCount}
              </span>
            </button>
          </div>

          <div className="relative w-full md:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search queries..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#f4b400] focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Search Query / Keyword</th>
                <th className="px-6 py-3.5 font-semibold">Google Rank</th>
                <th className="px-6 py-3.5 font-semibold text-center">Impressions (28D)</th>
                <th className="px-6 py-3.5 font-semibold text-center">Clicks (28D)</th>
                <th className="px-6 py-3.5 font-semibold text-center">CTR</th>
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
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 font-mono font-bold text-emerald-700 text-xs">
                          <span>#{item.position}</span>
                          {item.position <= 3 && <span className="text-amber-500">★</span>}
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-slate-400 text-xs">
                          --
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono font-medium text-slate-700 text-center">
                      {item.volume > 0 ? item.volume.toLocaleString() : "--"}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-center">
                      {(item.clicks ?? 0) > 0 ? (
                        <span className="inline-block rounded bg-blue-50 text-blue-600 px-2 py-0.5 font-bold">
                          {item.clicks}
                        </span>
                      ) : isRanked ? (
                        <span className="text-slate-400">0</span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono font-medium text-slate-600 text-center">
                      {item.ctr && item.ctr !== "--" ? item.ctr : "--"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-600">
                      <span
                        className={
                          isRanked ? "text-emerald-600" : "text-slate-400 text-[11px]"
                        }
                      >
                        {item.trend}
                      </span>
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
                    {SERVICE_AREA_TAGS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
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
                  {aiModel
                    ? `Reasoned by ${aiModel} from your live Search Console data.`
                    : "Reasons over your live Search Console data to find terms worth targeting."}
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
                <p className="text-xs text-slate-400 py-12 text-center">
                  Reasoning over your Search Console data...
                </p>
              ) : aiError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-800">
                    AI suggestions unavailable
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">{aiError}</p>
                  <button
                    type="button"
                    onClick={handleOpenAiSuggestions}
                    className="text-[11px] font-bold text-rose-800 hover:underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : aiSuggestions.length > 0 ? (
                aiSuggestions.map((sug) => (
                  <div
                    key={sug.keyword}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{sug.keyword}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-[#f4b400] uppercase tracking-wider">
                            {sug.category}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] text-slate-500">{sug.location}</span>
                        </div>
                        {sug.rationale && (
                          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                            {sug.rationale}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddAiSuggestion(sug)}
                        className="rounded-md bg-[#1f2521] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#2c352f] transition cursor-pointer shrink-0"
                      >
                        + Track
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  <p>Every suggestion is already tracked.</p>
                  <button
                    type="button"
                    onClick={handleOpenAiSuggestions}
                    className="mt-2 text-xs font-bold text-[#1f2521] hover:underline cursor-pointer"
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

