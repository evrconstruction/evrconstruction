import { adminDb } from "@/lib/firebase-admin";
import { getGoogleAccessToken } from "./google-auth";

export interface GA4ReportResult {
  connected: boolean;
  error?: string;
  propertyId: string;
  days: number;
  metrics: {
    visitors: string;
    newUsers: string;
    engagementRate: string;
    avgSessionDuration: string;
    conversions: string;
  };
  timeSeries: { label: string; value: number; date: string }[];
  sources: { name: string; percent: number; visits: number; color: string }[];
  topPages: { path: string; title: string; views: number; percent: string }[];
  demographics: {
    cities: { city: string; count: string; users: number }[];
    devices: { device: string; type: string; percent: number; color: string }[];
  };
}

export async function fetchGA4Analytics(days = 30): Promise<GA4ReportResult> {
  let propertyId = "552222580";

  try {
    const configDoc = await adminDb.collection("integrations").doc("google-analytics").get();
    if (configDoc.exists) {
      const data = configDoc.data() || {};
      if (data.propertyId) propertyId = data.propertyId;
    }
  } catch (err) {
    console.warn("Failed to read GA4 integration config:", err);
  }

  // Mint scoped access token for GA4 Data API
  const token = await getGoogleAccessToken([
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);

  if (!token) {
    return {
      connected: false,
      error: "Google Analytics 4 access token could not be acquired.",
      propertyId,
      days,
      metrics: {
        visitors: "0",
        newUsers: "0",
        engagementRate: "0.0%",
        avgSessionDuration: "0m 0s",
        conversions: "0",
      },
      timeSeries: [],
      sources: [],
      topPages: [],
      demographics: {
        cities: [],
        devices: [],
      },
    };
  }

  try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const start = startDate.toISOString().split("T")[0];
      const end = endDate.toISOString().split("T")[0];

      const cleanPropId = propertyId.replace(/^properties\//, "").replace(/^G-/, "");
      // 1. Fetch Realtime Active Users & Views from GA4
      let realtimeActiveUsers = 0;
      try {
        const rtRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runRealtimeReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metrics: [
              { name: "activeUsers" },
              { name: "screenPageViews" },
            ],
          }),
        });
        if (rtRes.ok) {
          const rtJson = await rtRes.json();
          const rtTotals = rtJson.rows?.[0]?.metricValues || [];
          realtimeActiveUsers = parseInt(rtTotals[0]?.value || "0", 10);
        }
      } catch (rtErr) {
        console.warn("GA4 Realtime API error:", rtErr);
      }

      // 2. Fetch Live Reports from GA4 Data API in parallel
      const [mainRes, sourcesRes, pagesRes, citiesRes, devicesRes] = await Promise.allSettled([
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: start, endDate: end }],
            metrics: [
              { name: "activeUsers" },
              { name: "newUsers" },
              { name: "engagementRate" },
              { name: "sessions" },
              { name: "screenPageViews" },
              { name: "averageSessionDuration" },
              { name: "conversions" },
            ],
            dimensions: [{ name: "date" }],
            orderBys: [{ dimension: { dimensionName: "date" } }],
            metricAggregations: ["TOTAL"],
          }),
        }),
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: start, endDate: end }],
            metrics: [{ name: "sessions" }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 10,
          }),
        }),
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: start, endDate: end }],
            metrics: [{ name: "screenPageViews" }],
            dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: 10,
          }),
        }),
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: start, endDate: end }],
            metrics: [{ name: "activeUsers" }],
            dimensions: [{ name: "city" }],
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
            limit: 10,
          }),
        }),
        fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: start, endDate: end }],
            metrics: [{ name: "activeUsers" }],
            dimensions: [{ name: "deviceCategory" }],
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
            limit: 5,
          }),
        }),
      ]);

      if (mainRes.status === "fulfilled" && mainRes.value.ok) {
        const json = await mainRes.value.json();
        const totals = json.totals?.[0]?.metricValues || [];
        const visitors = Math.max(parseInt(totals[0]?.value || "0", 10), realtimeActiveUsers);
        const newUsersCount = Math.max(parseInt(totals[1]?.value || "0", 10), realtimeActiveUsers);
        const engRateVal = parseFloat(totals[2]?.value || "0") * 100;
        const avgDurationSecs = Math.round(parseFloat(totals[5]?.value || "0"));
        const conversions = parseInt(totals[6]?.value || "0", 10);

        const rows = json.rows || [];
        const dateMap = new Map<string, number>();
        for (const r of rows) {
          const rawDate = r.dimensionValues?.[0]?.value || "";
          const val = parseInt(r.metricValues?.[0]?.value || "0", 10);
          const formattedDate = rawDate.length === 8
            ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
            : rawDate;
          if (formattedDate) dateMap.set(formattedDate, val);
        }

        const todayStr = new Date().toISOString().split("T")[0];
        if (realtimeActiveUsers > 0) {
          dateMap.set(todayStr, Math.max(dateMap.get(todayStr) || 0, realtimeActiveUsers));
        }

        const timeSeries = [];
        const timelineDays = Math.min(Math.max(days, 14), 30);
        for (let i = timelineDays - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split("T")[0];
          const val = dateMap.get(dStr) || 0;
          timeSeries.push({
            date: dStr,
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            value: val,
          });
        }

        // Parse Real Traffic Sources from GA4
        let sources: { name: string; percent: number; visits: number; color: string }[] = [];
        if (sourcesRes.status === "fulfilled" && sourcesRes.value.ok) {
          try {
            const sJson = await sourcesRes.value.json();
            const sRows = sJson.rows || [];
            const totalSourceVisits = sRows.reduce(
              (sum: number, r: { metricValues?: { value?: string }[] }) =>
                sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
              0
            );

            sources = sRows.map((r: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => {
              const name = r.dimensionValues?.[0]?.value || "Direct";
              const visits = parseInt(r.metricValues?.[0]?.value || "0", 10);
              const percent = totalSourceVisits > 0 ? Math.round((visits / totalSourceVisits) * 100) : 0;

              let color = "bg-blue-500";
              const lower = name.toLowerCase();
              if (lower.includes("search")) color = "bg-emerald-500";
              else if (lower.includes("referral")) color = "bg-purple-500";
              else if (lower.includes("social")) color = "bg-pink-500";
              else if (lower.includes("paid")) color = "bg-amber-500";
              else if (lower.includes("direct")) color = "bg-blue-500";
              else color = "bg-slate-500";

              return { name, percent, visits, color };
            });
          } catch (sErr) {
            console.warn("Error parsing GA4 sources report:", sErr);
          }
        }

        // Parse Real Top Pages from GA4
        let topPages: { path: string; title: string; views: number; percent: string }[] = [];
        if (pagesRes.status === "fulfilled" && pagesRes.value.ok) {
          try {
            const pJson = await pagesRes.value.json();
            const pRows = pJson.rows || [];
            const totalReportViews = pRows.reduce(
              (sum: number, r: { metricValues?: { value?: string }[] }) =>
                sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
              0
            );

            topPages = pRows.map((r: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => {
              const path = r.dimensionValues?.[0]?.value || "/";
              const title = r.dimensionValues?.[1]?.value || path;
              const views = parseInt(r.metricValues?.[0]?.value || "0", 10);
              const pct = totalReportViews > 0 ? Math.round((views / totalReportViews) * 100) : 0;
              return {
                path,
                title,
                views,
                percent: `${pct}%`,
              };
            });
          } catch (pErr) {
            console.warn("Error parsing GA4 pages report:", pErr);
          }
        }

        // Parse Real Demographics (Cities & Devices) from GA4
        let cities: { city: string; count: string; users: number }[] = [];
        if (citiesRes.status === "fulfilled" && citiesRes.value.ok) {
          try {
            const cJson = await citiesRes.value.json();
            const cRows = cJson.rows || [];
            cities = cRows.map((r: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => {
              const rawCity = r.dimensionValues?.[0]?.value || "(not set)";
              const city = rawCity === "(not set)" ? "(Not Set)" : rawCity;
              const users = parseInt(r.metricValues?.[0]?.value || "0", 10);
              return {
                city,
                count: users.toLocaleString(),
                users,
              };
            });
          } catch (cErr) {
            console.warn("Error parsing GA4 cities report:", cErr);
          }
        }

        let devices: { device: string; type: string; percent: number; color: string }[] = [];
        if (devicesRes.status === "fulfilled" && devicesRes.value.ok) {
          try {
            const dJson = await devicesRes.value.json();
            const dRows = dJson.rows || [];
            const totalDevUsers = dRows.reduce(
              (sum: number, r: { metricValues?: { value?: string }[] }) =>
                sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
              0
            );

            devices = dRows.map((r: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => {
              const raw = (r.dimensionValues?.[0]?.value || "desktop").toLowerCase();
              const device = raw.charAt(0).toUpperCase() + raw.slice(1);
              const users = parseInt(r.metricValues?.[0]?.value || "0", 10);
              const percent = totalDevUsers > 0 ? Math.round((users / totalDevUsers) * 100) : 0;
              const color = device === "Desktop" ? "bg-blue-500" : device === "Mobile" ? "bg-emerald-500" : "bg-purple-500";
              return {
                device,
                type: device,
                percent,
                color,
              };
            });
          } catch (dErr) {
            console.warn("Error parsing GA4 devices report:", dErr);
          }
        }

        return {
          connected: true,
          propertyId,
          days,
          metrics: {
            visitors: visitors.toLocaleString(),
            newUsers: newUsersCount.toLocaleString(),
            engagementRate: engRateVal > 0 ? `${engRateVal.toFixed(1)}%` : "0.0%",
            avgSessionDuration: avgDurationSecs > 0 ? `${Math.floor(avgDurationSecs / 60)}m ${avgDurationSecs % 60}s` : "0m 0s",
            conversions: conversions.toString(),
          },
          timeSeries,
          sources,
          topPages,
          demographics: {
            cities,
            devices,
          },
        };
      } else {
        const errorDetail = mainRes.status === "fulfilled" ? `HTTP ${mainRes.value.status}` : String(mainRes.reason);
        console.warn("GA4 runReport error:", errorDetail);
        return {
          connected: false,
          error: `GA4 Data API error (${errorDetail})`,
          propertyId,
          days,
          metrics: {
            visitors: "0",
            newUsers: "0",
            engagementRate: "0.0%",
            avgSessionDuration: "0m 0s",
            conversions: "0",
          },
          timeSeries: [],
          sources: [],
          topPages: [],
          demographics: {
            cities: [],
            devices: [],
          },
        };
      }
    } catch (apiErr) {
      console.warn("GA4 Live API call error:", apiErr);
      return {
        connected: false,
        error: apiErr instanceof Error ? apiErr.message : "GA4 Live API call error",
        propertyId,
        days,
        metrics: {
          visitors: "0",
          newUsers: "0",
          engagementRate: "0.0%",
          avgSessionDuration: "0m 0s",
          conversions: "0",
        },
        timeSeries: [],
        sources: [],
        topPages: [],
        demographics: {
          cities: [],
          devices: [],
        },
      };
    }

  // Fallback Zero-State
  return {
    connected: false,
    error: "GA4 reporting unavailable",
    propertyId,
    days,
    metrics: {
      visitors: "0",
      newUsers: "0",
      engagementRate: "0.0%",
      avgSessionDuration: "0m 0s",
      conversions: "0",
    },
    timeSeries: [],
    sources: [],
    topPages: [],
    demographics: {
      cities: [],
      devices: [],
    },
  };
}
