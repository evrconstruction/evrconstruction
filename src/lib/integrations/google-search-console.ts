import { adminDb } from "@/lib/firebase-admin";
import { getGoogleAccessToken } from "./google-auth";
import {
  assignQueries,
  type KeywordMatchKind,
} from "@/lib/keyword-matching";

export interface GSCKeywordItem {
  id: string;
  keyword: string;
  lang: string;
  position: number;
  volume: number;
  trend: string;
  clicks?: number;
  impressions?: number;
  ctr?: string;
  /**
   * The query Google actually reported when it differs from `keyword`. A tracked
   * keyword can match a variant spelling, and consumers that talk about what
   * people searched should quote this rather than the tracked phrase.
   */
  matchedQuery?: string;
}

export interface GSCReportResult {
  stats: {
    total: number;
    top10: number;
    top20: number;
    top50: number;
    totalClicks: number;
    totalImpressions: number;
  };
  changes: {
    improved: number;
    declined: number;
    stable: number;
  };
  keywords: GSCKeywordItem[];
}

export interface TrackedKeywordDoc {
  id: string;
  keyword: string;
  category?: string;
  targetLocation?: string;
  createdAt: string;
}

/** Window Google is queried for. The labels below quote it, so keep in sync. */
const REPORTING_WINDOW_DAYS = 28;

/**
 * Shown for a tracked keyword Google reported no impressions for. Worded as a
 * statement about traffic rather than about indexing: a tracked keyword is a
 * target we are aiming at, and Google only reports a query once someone has
 * actually searched it.
 */
export const NO_IMPRESSIONS_TREND = `No impressions (${REPORTING_WINDOW_DAYS}d)`;

/**
 * Label for a ranking position. When the numbers came from a variant query
 * rather than the exact phrase, the query is named so an approximate match is
 * never mistaken for a precise one.
 */
function describeTrend(
  position: number,
  match?: { query: string; kind: KeywordMatchKind }
): string {
  const rank = position <= 10 ? "↑ Top 10" : "↑ Page 2 Opportunity";
  if (!match || match.kind === "exact") return rank;
  return `${rank} · "${match.query}"`;
}

export async function fetchSearchConsoleKeywords(): Promise<GSCReportResult> {
  let siteUrl = "https://evrconstructions.com";

  try {
    const configDoc = await adminDb.collection("integrations").doc("google-search-console").get();
    if (configDoc.exists) {
      const data = configDoc.data() || {};
      if (data.siteUrl) siteUrl = data.siteUrl;
    }
  } catch (err) {
    console.warn("Failed to read Search Console config:", err);
  }

  // 1. Fetch user-tracked keywords from Firestore
  let trackedKeywords: TrackedKeywordDoc[] = [];
  try {
    const trackedSnap = await adminDb.collection("tracked_keywords").orderBy("createdAt", "desc").get();
    trackedKeywords = trackedSnap.docs.map((d) => ({
      id: d.id,
      keyword: (d.data().keyword || "").toLowerCase(),
      category: d.data().category || "General",
      targetLocation: d.data().targetLocation || "East Tennessee",
      createdAt: d.data().createdAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn("Failed to read Firestore tracked_keywords:", err);
  }

  // 2. Fetch live Search Console analytics
  const gscQueriesMap = new Map<string, { position: number; clicks: number; impressions: number; ctr: number }>();

  const token = await getGoogleAccessToken([
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);

  if (token) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - REPORTING_WINDOW_DAYS);
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];

      const candidates = [
        siteUrl.startsWith("sc-domain:") ? siteUrl : `sc-domain:${siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`,
        siteUrl,
        siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`,
      ];

      for (const targetSite of candidates) {
        const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(targetSite)}/searchAnalytics/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: start,
            endDate: end,
            dimensions: ["query"],
            rowLimit: 100,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const rows = json.rows || [];
          for (const r of rows) {
            const query = (r.keys?.[0] || "").toLowerCase().trim();
            if (query) {
              gscQueriesMap.set(query, {
                position: Math.round(r.position),
                clicks: r.clicks || 0,
                impressions: r.impressions || 0,
                ctr: r.ctr || 0,
              });
            }
          }
          break;
        }
      }
    } catch (apiErr) {
      console.warn("Search Console Live API call failed:", apiErr);
    }
  }

  // 3. Build unified keyword list
  const combinedKeywords: GSCKeywordItem[] = [];
  const trackedMatches = assignQueries(trackedKeywords, [...gscQueriesMap.keys()]);
  const claimedQueries = new Set(
    [...trackedMatches.values()].map((match) => match.query)
  );

  // Add tracked keywords first
  for (const tk of trackedKeywords) {
    const match = trackedMatches.get(tk.id);
    const gscData = match ? gscQueriesMap.get(match.query) : undefined;

    if (gscData) {
      combinedKeywords.push({
        id: tk.id,
        keyword: tk.keyword,
        lang: "EN",
        position: gscData.position,
        volume: gscData.impressions,
        trend: describeTrend(gscData.position, match),
        matchedQuery: match?.query,
        clicks: gscData.clicks,
        impressions: gscData.impressions,
        ctr: `${(gscData.ctr * 100).toFixed(1)}%`,
      });
    } else {
      combinedKeywords.push({
        id: tk.id,
        keyword: tk.keyword,
        lang: "EN",
        position: 0,
        volume: 0,
        trend: NO_IMPRESSIONS_TREND,
        clicks: 0,
        impressions: 0,
        ctr: "--",
      });
    }
  }

  // Reported queries not backing a tracked keyword are listed in their own right.
  gscQueriesMap.forEach((gscData, query) => {
    if (!claimedQueries.has(query)) {
      combinedKeywords.push({
        id: `gsc-${encodeURIComponent(query)}`,
        keyword: query,
        lang: "EN",
        position: gscData.position,
        volume: gscData.impressions,
        trend: describeTrend(gscData.position),
        clicks: gscData.clicks,
        impressions: gscData.impressions,
        ctr: `${(gscData.ctr * 100).toFixed(1)}%`,
      });
    }
  });

  // 4. Sort ranked keywords first (ordered by Google ranking position #1, #2, #3...), then alphabetical for unranked target keywords
  combinedKeywords.sort((a, b) => {
    if (a.position > 0 && b.position > 0) {
      return a.position - b.position;
    }
    if (a.position > 0 && b.position === 0) {
      return -1;
    }
    if (a.position === 0 && b.position > 0) {
      return 1;
    }
    return a.keyword.localeCompare(b.keyword);
  });

  const total = combinedKeywords.length;
  const indexed = combinedKeywords.filter((k) => k.position > 0);
  const top10 = indexed.filter((k) => k.position <= 10).length;
  const top20 = indexed.filter((k) => k.position <= 20).length;
  const top50 = indexed.filter((k) => k.position <= 50).length;
  const totalClicks = indexed.reduce((acc, k) => acc + (k.clicks || 0), 0);
  const totalImpressions = indexed.reduce((acc, k) => acc + (k.impressions || 0), 0);

  return {
    stats: { total, top10, top20, top50, totalClicks, totalImpressions },
    changes: { improved: top10, declined: 0, stable: Math.max(0, indexed.length - top10) },
    keywords: combinedKeywords,
  };
}
