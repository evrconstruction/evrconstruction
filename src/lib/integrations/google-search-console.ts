import { adminDb } from "@/lib/firebase-admin";
import { getGoogleAccessToken } from "./google-auth";
import {
  assignQueries,
  type KeywordMatchKind,
} from "@/lib/keyword-matching";

/** Property-scoped Search Console data — analytics, sitemaps — lives under this base. */
export const WEBMASTERS_API_BASE = "https://www.googleapis.com/webmasters/v3";

/** Read-only access to Search Console properties, sitemaps and index status. */
export const SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";

const DEFAULT_SITE_URL = "https://evrconstructions.com";

/**
 * The Search Console property to report on. Defaults to the live site, but the
 * admin can point this at another property from Firestore without a deploy.
 */
export async function getSearchConsoleSiteUrl(): Promise<string> {
  try {
    const configDoc = await adminDb
      .collection("integrations")
      .doc("google-search-console")
      .get();

    const configured = configDoc.exists ? configDoc.data()?.siteUrl : undefined;
    if (configured) return configured;
  } catch (err) {
    console.warn("Failed to read Search Console config:", err);
  }

  return DEFAULT_SITE_URL;
}

/**
 * Google identifies a property either as a URL prefix (`https://example.com/`)
 * or as a domain property (`sc-domain:example.com`). Which one a site is
 * registered as is a Search Console setting we cannot read, so the likely forms
 * are offered in order and the first that answers is used.
 */
export function searchConsolePropertyCandidates(siteUrl: string): string[] {
  const asDomainProperty = siteUrl.startsWith("sc-domain:")
    ? siteUrl
    : `sc-domain:${siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return [
    asDomainProperty,
    siteUrl,
    siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`,
  ];
}

/**
 * How much evidence a reported position rests on.
 *
 * Search Console reports the average position for the window, so one search on
 * one day can read as "#1". Presenting that beside a well-evidenced rank
 * without saying so invites a decision based on noise.
 */
export type RankConfidence = "solid" | "thin" | "none";

/**
 * Below this many impressions in the window an average position is dominated by
 * a handful of searches and must not be read as a ranking.
 */
const MIN_IMPRESSIONS_FOR_CONFIDENT_RANK = 10;

export function rankConfidence(impressions: number): RankConfidence {
  return impressions >= MIN_IMPRESSIONS_FOR_CONFIDENT_RANK ? "solid" : "thin";
}

/** A query Google served this site for that no tracked keyword covers. */
export interface UntrackedQuery {
  query: string;
  position: number;
  impressions: number;
  clicks: number;
}

export interface GSCKeywordItem {
  id: string;
  /**
   * Where the row came from. `tracked` rows are targets the owner added and can
   * be removed; `reported` rows are queries Google returned that were never
   * added as targets, so they are read-only views of Search Console data.
   */
  source: "tracked" | "reported";
  keyword: string;
  lang: string;
  position: number;
  volume: number;
  trend: string;
  clicks?: number;
  impressions?: number;
  ctr?: string;
  /** How much evidence `position` rests on. */
  confidence: RankConfidence;
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
  keywords: GSCKeywordItem[];
  /**
   * Queries Google served us for that no tracked keyword covers. These are what
   * people actually type, which makes them better targets than phrases
   * assembled from a list of service areas and town names.
   */
  untrackedQueries: UntrackedQuery[];
}

export interface TrackedKeywordDoc {
  id: string;
  keyword: string;
  category?: string;
  targetLocation?: string;
  createdAt: string;
}

/** What Search Console reported for one query in the window. */
export interface ReportedQueryMetrics {
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

/**
 * Combine the keywords the owner tracks with the queries Google reported into
 * the rows the dashboard shows.
 *
 * Pure by design: pairing a target to a reported query decides what numbers
 * appear in front of someone making a decision, so it has to be testable
 * against real Search Console data without a Firestore or network stub.
 */
export function buildKeywordReport(
  trackedKeywords: TrackedKeywordDoc[],
  reportedQueries: Map<string, ReportedQueryMetrics>
): GSCReportResult {
  const combinedKeywords: GSCKeywordItem[] = [];
  const trackedMatches = assignQueries(trackedKeywords, [...reportedQueries.keys()]);
  const claimedQueries = new Set(
    [...trackedMatches.values()].map((match) => match.query)
  );

  for (const tk of trackedKeywords) {
    const match = trackedMatches.get(tk.id);
    const metrics = match ? reportedQueries.get(match.query) : undefined;

    if (!metrics) {
      combinedKeywords.push({
        id: tk.id,
        source: "tracked",
        keyword: tk.keyword,
        lang: "EN",
        position: 0,
        volume: 0,
        trend: NO_IMPRESSIONS_TREND,
        clicks: 0,
        impressions: 0,
        ctr: "--",
        confidence: "none",
      });
      continue;
    }

    combinedKeywords.push({
      id: tk.id,
      source: "tracked",
      keyword: tk.keyword,
      lang: "EN",
      position: metrics.position,
      volume: metrics.impressions,
      trend: describeTrend(metrics.position, match),
      matchedQuery: match?.query,
      clicks: metrics.clicks,
      impressions: metrics.impressions,
      ctr: `${(metrics.ctr * 100).toFixed(1)}%`,
      confidence: rankConfidence(metrics.impressions),
    });
  }

  // Reported queries no tracked keyword covers are listed in their own right.
  reportedQueries.forEach((metrics, query) => {
    if (claimedQueries.has(query)) return;

    combinedKeywords.push({
      id: `gsc-${encodeURIComponent(query)}`,
      source: "reported",
      keyword: query,
      lang: "EN",
      position: metrics.position,
      volume: metrics.impressions,
      trend: describeTrend(metrics.position),
      clicks: metrics.clicks,
      impressions: metrics.impressions,
      ctr: `${(metrics.ctr * 100).toFixed(1)}%`,
      confidence: rankConfidence(metrics.impressions),
    });
  });

  combinedKeywords.sort((a, b) => {
    if (a.position > 0 && b.position > 0) return a.position - b.position;
    if (a.position > 0) return -1;
    if (b.position > 0) return 1;
    return a.keyword.localeCompare(b.keyword);
  });

  const ranked = combinedKeywords.filter((k) => k.position > 0);

  return {
    stats: {
      total: combinedKeywords.length,
      top10: ranked.filter((k) => k.position <= 10).length,
      top20: ranked.filter((k) => k.position <= 20).length,
      top50: ranked.filter((k) => k.position <= 50).length,
      totalClicks: ranked.reduce((acc, k) => acc + (k.clicks || 0), 0),
      totalImpressions: ranked.reduce((acc, k) => acc + (k.impressions || 0), 0),
    },
    keywords: combinedKeywords,
    // Only unclaimed queries: adopting one as a target removes it from here,
    // and a query backing two rows would double-count its impressions.
    untrackedQueries: [...reportedQueries.entries()]
      .filter(([query]) => !claimedQueries.has(query))
      .map(([query, metrics]) => ({
        query,
        position: metrics.position,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
      }))
      .sort((a, b) => b.impressions - a.impressions || a.position - b.position),
  };
}

/** Window Google is queried for. The labels below quote it, so keep in sync. */
const REPORTING_WINDOW_DAYS = 28;

/**
 * Rows per Search Analytics request. The API caps how many it returns at once,
 * so the rows are paged through rather than fetched in one call.
 */
const QUERY_PAGE_SIZE = 1000;

/** Bound on paging, so an API that keeps returning full pages cannot loop. */
const MAX_QUERY_PAGES = 20;

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

interface RawQueryRow {
  keys?: string[];
  position?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
}

/**
 * Every query Google reported, paged through to the end.
 *
 * A single request returns only the first page of rows, so treating one page as
 * everything silently hides the lower-traffic queries. Those then appear as
 * keywords Google has no data for, which is the opposite of the truth and is
 * exactly the wrong conclusion to hand someone deciding what to target.
 *
 * The property is the first candidate form that answers, matching how the rest
 * of this module resolves it.
 */
async function fetchReportedQueryRows(
  token: string,
  propertyCandidates: string[],
  startDate: string,
  endDate: string
): Promise<RawQueryRow[]> {
  for (const property of propertyCandidates) {
    const rows: RawQueryRow[] = [];

    for (let page = 0; page < MAX_QUERY_PAGES; page += 1) {
      const res = await fetch(
        `${WEBMASTERS_API_BASE}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ["query"],
            rowLimit: QUERY_PAGE_SIZE,
            startRow: page * QUERY_PAGE_SIZE,
          }),
          cache: "no-store",
        }
      );

      // A form that does not answer is the wrong property, not an empty result.
      if (!res.ok) break;

      const body = await res.json();
      const batch: RawQueryRow[] = body.rows ?? [];
      rows.push(...batch);

      if (batch.length < QUERY_PAGE_SIZE) return rows;
    }

    if (rows.length > 0) return rows;
  }

  return [];
}

export async function fetchSearchConsoleKeywords(): Promise<GSCReportResult> {
  const siteUrl = await getSearchConsoleSiteUrl();

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

  const token = await getGoogleAccessToken([SEARCH_CONSOLE_SCOPE]);

  if (token) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - REPORTING_WINDOW_DAYS);
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];

      const rows = await fetchReportedQueryRows(
        token,
        searchConsolePropertyCandidates(siteUrl),
        start,
        end
      );

      for (const row of rows) {
        const query = (row.keys?.[0] || "").toLowerCase().trim();
        if (!query) continue;

        gscQueriesMap.set(query, {
          position: Math.round(row.position ?? 0),
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
        });
      }
    } catch (apiErr) {
      console.warn("Search Console Live API call failed:", apiErr);
    }
  }

  return buildKeywordReport(trackedKeywords, gscQueriesMap);
}
