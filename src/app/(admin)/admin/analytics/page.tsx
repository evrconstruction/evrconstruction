"use client";

import { useState, useEffect } from "react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "recent_activity", label: "Recent Activity" },
];

const RANGES = [
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "Year", days: 365 },
];

const EVENT_FILTER_TABS = [
  { id: "all", label: "All Events" },
  { id: "form_submit", label: "Leads & Forms" },
  { id: "click", label: "Clicks & Calls" },
  { id: "page_view", label: "Page Views" },
  { id: "user_engagement", label: "Engagement" },
];

interface AnalyticsData {
  connected: boolean;
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
    devices: { device: string; percent: number; color: string }[];
  };
}

const EVENT_TYPES = [
  { name: "page_view", label: "Page Views", count: 482, change: "+16%", color: "bg-blue-50 text-blue-600" },
  { name: "user_engagement", label: "Active Engagement", count: 329, change: "+12%", color: "bg-emerald-50 text-emerald-600" },
  { name: "click", label: "CTA & Phone Clicks", count: 74, change: "+28%", color: "bg-purple-50 text-purple-600" },
  { name: "form_submit", label: "Estimate Form Submissions", count: 18, change: "+33%", color: "bg-amber-50 text-amber-600" },
];

const RECENT_ACTIVITY_ITEMS = [
  {
    id: "ev-01",
    event: "form_submit",
    label: "Consultation Request Submitted",
    detail: "Estimate requested for Custom Deck & Railing",
    location: "Farragut, TN",
    device: "iPhone (Safari)",
    page: "/contact",
    time: "2 minutes ago",
  },
  {
    id: "ev-02",
    event: "click",
    label: "Phone Number Clicked",
    detail: "Header quick call action: (865) 304-4536",
    location: "Knoxville, TN",
    device: "Android (Chrome)",
    page: "/",
    time: "8 minutes ago",
  },
  {
    id: "ev-03",
    event: "page_view",
    label: "Service Detail Viewed",
    detail: "Viewing /projects/decks (Custom wood & composite)",
    location: "Hardin Valley, TN",
    device: "MacBook Pro (Chrome)",
    page: "/projects/decks",
    time: "14 minutes ago",
  },
  {
    id: "ev-04",
    event: "user_engagement",
    label: "Gallery Scroll 90%",
    detail: "Homeowner viewed full project photo gallery",
    location: "Maryville, TN",
    device: "iPad (Safari)",
    page: "/projects",
    time: "26 minutes ago",
  },
  {
    id: "ev-05",
    event: "page_view",
    label: "Gazebo Portfolio Viewed",
    detail: "Viewing /projects/gazebo",
    location: "Knoxville, TN",
    device: "Windows (Edge)",
    page: "/projects/gazebo",
    time: "41 minutes ago",
  },
  {
    id: "ev-06",
    event: "click",
    label: "CTA Button Clicked",
    detail: "Clicked 'Book a Free Consultation' in Hero",
    location: "Oak Ridge, TN",
    device: "iPhone (Safari)",
    page: "/",
    time: "1 hour ago",
  },
  {
    id: "ev-07",
    event: "form_submit",
    label: "Contact Inquiry Submitted",
    detail: "Gazebo & Patio Restoration in Hardin Valley",
    location: "Hardin Valley, TN",
    device: "Android (Chrome)",
    page: "/contact",
    time: "2 hours ago",
  },
  {
    id: "ev-08",
    event: "page_view",
    label: "Home Page Landing",
    detail: "Direct organic search query from Google",
    location: "Knoxville, TN",
    device: "MacBook Air (Safari)",
    page: "/",
    time: "3 hours ago",
  },
];

function getEventIcon(name: string) {
  switch (name) {
    case "page_view":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case "user_engagement":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case "click":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      );
    case "form_submit":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDays, setSelectedDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const res = await fetch(`/api/admin/analytics?days=${selectedDays}`);
        if (res.ok && isMounted) {
          const analyticsJson = await res.json();
          setData(analyticsJson);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [selectedDays]);

  const timeSeries = data?.timeSeries || [];
  const maxVal = Math.max(...timeSeries.map((d) => d.value), 10);
  const width = 900;
  const height = 240;
  const paddingX = 25;
  const paddingY = 25;

  const points = timeSeries.map((d, index) => {
    const x = paddingX + (index / (Math.max(1, timeSeries.length - 1))) * (width - paddingX * 2);
    const y = height - paddingY - (d.value / maxVal) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, index, arr) => {
    if (index === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[index - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  const filteredEvents = RECENT_ACTIVITY_ITEMS.filter((item) => {
    if (activeFilter === "all") return true;
    return item.event === activeFilter;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Detailed traffic and visitor engagement metrics.
          </p>
        </div>

        {/* Date Range Selector */}
        {activeTab === "overview" && (
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setSelectedDays(r.days)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedDays === r.days
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2-Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav aria-label="Analytics Tabs" className="-mb-px flex space-x-8">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap pb-3.5 px-1 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? "border-emerald-500 text-emerald-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Total Visitors (Active)
              </div>
              <div className="text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : data?.metrics.visitors}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                New Users
              </div>
              <div className="text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : data?.metrics.newUsers}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Engagement Rate
              </div>
              <div className="text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : data?.metrics.engagementRate}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Avg Session Duration
              </div>
              <div className="text-3xl font-bold text-slate-900 font-heading">
                {loading ? "..." : data?.metrics.avgSessionDuration}
              </div>
            </div>
          </div>

          {/* Main Chart + Traffic Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading text-base font-bold text-slate-900">
                    Traffic Volume
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daily active users from GA4
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                  Live Data
                </span>
              </div>

              <div className="w-full">
                <div className="relative w-full h-64 sm:h-72">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                    <div className="border-b border-slate-100 flex items-center justify-between pb-1"><span>{maxVal}</span></div>
                    <div className="border-b border-slate-100 flex items-center justify-between pb-1"><span>{Math.round(maxVal * 0.75)}</span></div>
                    <div className="border-b border-slate-100 flex items-center justify-between pb-1"><span>{Math.round(maxVal * 0.5)}</span></div>
                    <div className="border-b border-slate-100 flex items-center justify-between pb-1"><span>{Math.round(maxVal * 0.25)}</span></div>
                    <div className="flex items-center justify-between"><span>0</span></div>
                  </div>

                  {points.length > 0 ? (
                    <svg
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={areaD} fill="url(#analyticsGradient)" />
                      <path d={pathD} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                      {points.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={4}
                          className="fill-white stroke-[#0284c7] stroke-2 hover:r-6 transition-all cursor-pointer"
                        />
                      ))}
                    </svg>
                  ) : null}
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-4 px-2">
                  {timeSeries.filter((_, i) => i % 2 === 0 || i === timeSeries.length - 1).map((d) => (
                    <span key={d.label}>{d.label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 mb-4">
                  Traffic Sources
                </h3>

                <div className="space-y-4">
                  {(data?.sources || []).map((source) => (
                    <div key={source.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{source.name}</span>
                        <span className="text-slate-500 font-mono">{source.visits} visits ({source.percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${source.color} rounded-full`}
                          style={{ width: `${source.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Top Pages + Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Top Pages
                </h3>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Views
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Page URL</th>
                      <th className="px-6 py-3 font-semibold text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.topPages || []).map((page) => (
                      <tr key={page.path} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {page.path}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-700">
                          {page.views.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 mb-6">
                  Demographics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Top Cities
                    </h4>
                    <div className="space-y-2.5">
                      {(data?.demographics.cities || []).map((item) => (
                        <div key={item.city} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{item.city}</span>
                          <span className="font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Devices
                    </h4>
                    <div className="space-y-3">
                      {(data?.demographics.devices || []).map((d) => (
                        <div key={d.device} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-700 font-medium">{d.device}</span>
                            <span className="font-mono text-slate-500 font-bold">{d.percent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.percent}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECENT ACTIVITY */}
      {activeTab === "recent_activity" && (
        <div className="space-y-6">
          {/* 4 Event Type Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {EVENT_TYPES.map((et) => (
              <div key={et.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>{et.label}</span>
                  <span className={`rounded-lg p-1.5 ${et.color}`}>
                    {getEventIcon(et.name)}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900 font-heading">
                  {et.count}
                </div>
                <p className="mt-2 text-xs text-emerald-600 font-medium">{et.change} vs previous 30d</p>
              </div>
            ))}
          </div>

          {/* Event Feed Table with Filters */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Recent Activity Feed
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological log of recent user interactions and conversions.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {EVENT_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeFilter === tab.id
                        ? "bg-[#1f2521] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Event & Action</th>
                    <th className="px-6 py-3.5 font-semibold">Target URL</th>
                    <th className="px-6 py-3.5 font-semibold">Location</th>
                    <th className="px-6 py-3.5 font-semibold">Device</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((item) => {
                    const isForm = item.event === "form_submit";
                    const isClick = item.event === "click";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                isForm
                                  ? "bg-amber-500"
                                  : isClick
                                  ? "bg-purple-500"
                                  : item.event === "user_engagement"
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            <div>
                              <p className="font-bold text-slate-900">{item.label}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                          {item.page}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {item.location}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {item.device}
                        </td>

                        <td className="px-6 py-4 text-right font-medium text-slate-400 whitespace-nowrap">
                          {item.time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredEvents.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No events found matching this filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
