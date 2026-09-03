import { adminDb } from "@/lib/firebase-admin";
import { getGoogleAccessToken } from "./google-auth";

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
}

export interface GSCReportResult {
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
  keywords: GSCKeywordItem[];
}

export interface TrackedKeywordDoc {
  id: string;
  keyword: string;
  category?: string;
  targetLocation?: string;
  createdAt: string;
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
      startDate.setDate(startDate.getDate() - 28);
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
  const handledQueries = new Set<string>();

  // Add tracked keywords first
  for (const tk of trackedKeywords) {
    const query = tk.keyword.toLowerCase();
    handledQueries.add(query);
    const gscData = gscQueriesMap.get(query);

    if (gscData) {
      combinedKeywords.push({
        id: tk.id,
        keyword: tk.keyword,
        lang: "EN",
        position: gscData.position,
        volume: gscData.impressions,
        trend: gscData.position <= 10 ? "↑ Top 10" : "↑ Page 2 Opportunity",
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
        trend: "Target (Pending Indexing)",
        clicks: 0,
        impressions: 0,
        ctr: "--",
      });
    }
  }

  // Add remaining GSC queries not explicitly tracked yet
  gscQueriesMap.forEach((gscData, query) => {
    if (!handledQueries.has(query)) {
      combinedKeywords.push({
        id: `gsc-${encodeURIComponent(query)}`,
        keyword: query,
        lang: "EN",
        position: gscData.position,
        volume: gscData.impressions,
        trend: gscData.position <= 10 ? "↑ Top 10" : "↑ Page 2 Opportunity",
        clicks: gscData.clicks,
        impressions: gscData.impressions,
        ctr: `${(gscData.ctr * 100).toFixed(1)}%`,
      });
    }
  });

  const total = combinedKeywords.length;
  const indexed = combinedKeywords.filter((k) => k.position > 0);
  const top10 = indexed.filter((k) => k.position <= 10).length;
  const top20 = indexed.filter((k) => k.position <= 20).length;
  const top50 = indexed.filter((k) => k.position <= 50).length;

  return {
    stats: { total, top10, top20, top50 },
    changes: { improved: top10, declined: 0, stable: Math.max(0, indexed.length - top10) },
    keywords: combinedKeywords,
  };
}
