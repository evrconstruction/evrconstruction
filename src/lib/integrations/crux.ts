/**
 * Core Web Vitals, from the Chrome UX Report.
 *
 * CrUX reports what real Chrome users on real devices actually experienced,
 * aggregated over a rolling 28 days — not a synthetic lab score. That makes it
 * the closest thing to how Google's own ranking signals see the site.
 *
 * The API requires a Cloud API key; an OAuth token is not accepted, so this is
 * the one Google integration here that does not use the service account.
 */

const CRUX_ENDPOINT =
  "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

/**
 * The three metrics Google actually scores. Everything else CrUX can return —
 * FCP, TTFB, resource timings — is diagnostic context for these three.
 */
export const CORE_WEB_VITALS = [
  "largest_contentful_paint",
  "interaction_to_next_paint",
  "cumulative_layout_shift",
] as const;

export type CoreWebVitalName = (typeof CORE_WEB_VITALS)[number];

/**
 * Google's published thresholds, in milliseconds (or unitless for CLS). A p75
 * at or below `good` is a pass; above `poor` is a fail; between is "needs
 * improvement". Consuming the thresholds here keeps the judgement out of the
 * skill and makes it testable.
 */
const THRESHOLDS: Record<
  CoreWebVitalName,
  { good: number; poor: number; label: string; unit: string }
> = {
  largest_contentful_paint: {
    good: 2500,
    poor: 4000,
    label: "LCP",
    unit: "ms",
  },
  interaction_to_next_paint: {
    good: 200,
    poor: 500,
    label: "INP",
    unit: "ms",
  },
  cumulative_layout_shift: {
    good: 0.1,
    poor: 0.25,
    label: "CLS",
    unit: "",
  },
};

export type VitalRating = "good" | "needs-improvement" | "poor";

export interface VitalMeasurement {
  metric: CoreWebVitalName;
  /** Short name used in prose: LCP, INP, CLS. */
  label: string;
  /** Raw p75 value as Google reports it. */
  value: number;
  unit: string;
  rating: VitalRating;
  /** Share of page loads in Google's own good/needs-improvement/poor bins. */
  goodShare: number;
}

export interface CoreWebVitalsReport {
  /** False when no key is configured, with `reason` explaining how to fix it. */
  configured: boolean;
  /** False when CrUX holds no data for the origin yet. */
  hasData: boolean;
  reason?: string;
  /** The 28-day window the numbers cover. */
  collectionPeriod?: { firstDate: string; lastDate: string };
  /** One entry per metric CrUX returned. */
  measurements: VitalMeasurement[];
  /** True when every measured vital is `good`. */
  allGood: boolean;
}

/** Rate one p75 against Google's published thresholds. */
export function rateVital(
  metric: CoreWebVitalName,
  value: number
): VitalRating {
  const { good, poor } = THRESHOLDS[metric];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

interface CruxDate {
  year?: number;
  month?: number;
  day?: number;
}

interface CruxMetric {
  percentiles?: { p75?: number | string };
  histogram?: Array<{ start?: number | string; end?: number | string; density?: number }>;
}

interface CruxResponse {
  record?: {
    metrics?: Record<string, CruxMetric>;
    collectionPeriod?: { firstDate?: CruxDate; lastDate?: CruxDate };
  };
}

function formatCruxDate(date: CruxDate | undefined): string {
  if (!date?.year || !date.month || !date.day) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** Share of page loads in the fastest bin, i.e. Google's own "good" bucket. */
function goodShareOf(metric: CruxMetric): number {
  const firstBin = metric.histogram?.[0];
  return typeof firstBin?.density === "number" ? firstBin.density : 0;
}

/**
 * Core Web Vitals for one origin, aggregated across all form factors.
 *
 * Never throws for a missing, rejected or absent-data response: all three are
 * ordinary configuration states, and a weekly audit should report them rather
 * than fail. An unexpected HTTP failure is thrown, so a broken integration is
 * visible — and the caller guards it, so one such failure cannot cost the
 * whole audit.
 */
export async function fetchCoreWebVitals(
  origin: string
): Promise<CoreWebVitalsReport> {
  const apiKey = process.env.CRUX_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      hasData: false,
      measurements: [],
      allGood: false,
      reason:
        "CRUX_API_KEY is not set, so real-user performance is not being measured. " +
        "Create a Cloud API key restricted to the Chrome UX Report API and set it.",
    };
  }

  const res = await fetch(`${CRUX_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, metrics: [...CORE_WEB_VITALS] }),
    cache: "no-store",
  });

  // 404 is CrUX's way of saying "not enough real users yet" — normal for a
  // young site, and not a failure of this check.
  if (res.status === 404) {
    return {
      configured: true,
      hasData: false,
      measurements: [],
      allGood: false,
      reason:
        "Google has not published real-user data for this origin yet, which is " +
        "expected until enough Chrome users have visited over a 28-day window.",
    };
  }

  // A key Google refuses is a configuration state, not a broken integration:
  // the fix is to replace the key, and the audit should say so rather than
  // fail. CrUX answers 400 for a malformed or unknown key, and 403 when the key
  // is real but not allowed to call this API.
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return {
      configured: false,
      hasData: false,
      measurements: [],
      allGood: false,
      reason:
        `Google rejected CRUX_API_KEY (HTTP ${res.status}), so real-user performance is not being measured. ` +
        "Replace it with an API key restricted to the Chrome UX Report API.",
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Chrome UX Report returned HTTP ${res.status} for ${origin}. ${body.slice(0, 200)}`
    );
  }

  const payload = (await res.json()) as CruxResponse;
  const metrics = payload.record?.metrics ?? {};

  const measurements: VitalMeasurement[] = CORE_WEB_VITALS.flatMap((metric) => {
    const raw = metrics[metric]?.percentiles?.p75;
    if (raw === undefined) return [];

    // CLS arrives as a string because it is a decimal; the others are ints.
    const value = typeof raw === "string" ? Number.parseFloat(raw) : raw;
    if (!Number.isFinite(value)) return [];

    return [
      {
        metric,
        label: THRESHOLDS[metric].label,
        value,
        unit: THRESHOLDS[metric].unit,
        rating: rateVital(metric, value),
        goodShare: goodShareOf(metrics[metric]),
      },
    ];
  });

  const period = payload.record?.collectionPeriod;

  return {
    configured: true,
    hasData: measurements.length > 0,
    collectionPeriod: period
      ? {
          firstDate: formatCruxDate(period.firstDate),
          lastDate: formatCruxDate(period.lastDate),
        }
      : undefined,
    measurements,
    allGood: measurements.length > 0 && measurements.every((m) => m.rating === "good"),
  };
}
