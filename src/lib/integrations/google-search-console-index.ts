import { getGoogleAccessToken } from "./google-auth";
import {
  getSearchConsoleSiteUrl,
  searchConsolePropertyCandidates,
  SEARCH_CONSOLE_SCOPE,
  WEBMASTERS_API_BASE,
} from "./google-search-console";

/** Google's verdict for a single URL. */
export type IndexVerdict =
  | "PASS"
  | "PARTIAL"
  | "FAIL"
  | "NEUTRAL"
  | "VERDICT_UNSPECIFIED";

export interface PageIndexStatus {
  /** Display path, e.g. `/projects/decks`. */
  path: string;
  url: string;
  verdict: IndexVerdict;
  /** Google's own wording, e.g. "Submitted and indexed". */
  coverageState: string;
  /** The canonical URL Google chose for this page. */
  googleCanonical: string | null;
  /** The canonical URL the page declares in its markup. */
  userCanonical: string | null;
  /**
   * Whether those two agree, ignoring trailing slashes. `null` when the page
   * declares no canonical, so there is nothing to compare.
   */
  canonicalMatches: boolean | null;
  lastCrawlTime: string | null;
  /** Set when this one URL could not be inspected; the other rows still render. */
  error?: string;
}

export interface SitemapStatus {
  path: string;
  lastDownloaded: string | null;
  errors: number;
  warnings: number;
}

export interface IndexStatusReport {
  /** The Search Console property that answered. */
  property: string;
  sitemaps: SitemapStatus[];
  pages: PageIndexStatus[];
}

const URL_INSPECTION_ENDPOINT =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

interface RawSitemap {
  path?: string;
  lastDownloaded?: string;
  errors?: number;
  warnings?: number;
}

interface RawIndexStatus {
  verdict?: IndexVerdict;
  coverageState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
}

function toDisplayPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * A trailing slash is not a different page. Google reports the homepage
 * canonical as `https://example.com/` while the sitemap lists
 * `https://example.com`, so comparing the raw strings would flag a page that
 * is indexed exactly as intended.
 */
function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Whether the canonical Google chose agrees with the one the page declares.
 *
 * Returns `null` when either side is missing, so "no mismatch" is never claimed
 * for a page that declares no canonical at all.
 */
export function canonicalsAgree(
  googleCanonical: string | null,
  userCanonical: string | null
): boolean | null {
  if (!googleCanonical || !userCanonical) return null;

  return (
    withoutTrailingSlash(googleCanonical) ===
    withoutTrailingSlash(userCanonical)
  );
}

function toSitemapStatus(raw: RawSitemap): SitemapStatus {
  return {
    path: raw.path ?? "",
    lastDownloaded: raw.lastDownloaded ?? null,
    errors: raw.errors ?? 0,
    warnings: raw.warnings ?? 0,
  };
}

/**
 * Sitemaps Google holds for one property form. Doubles as the probe that tells
 * us which property form answers for this site, so discovering the property
 * costs no request beyond the one we needed anyway.
 *
 * Returns `null` when this form is not a property this account can read.
 */
async function listSitemaps(
  token: string,
  property: string
): Promise<SitemapStatus[] | null> {
  const res = await fetch(
    `${WEBMASTERS_API_BASE}/sites/${encodeURIComponent(property)}/sitemaps`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!res.ok) return null;

  const body = await res.json();
  const sitemaps: RawSitemap[] = body.sitemap ?? [];
  return sitemaps.map(toSitemapStatus);
}

interface ResolvedProperty {
  property: string;
  sitemaps: SitemapStatus[];
}

async function resolveProperty(
  token: string,
  siteUrl: string
): Promise<ResolvedProperty | null> {
  for (const candidate of searchConsolePropertyCandidates(siteUrl)) {
    const sitemaps = await listSitemaps(token, candidate);
    if (sitemaps) return { property: candidate, sitemaps };
  }

  return null;
}

/**
 * Ask Google how one URL is indexed.
 *
 * The URL Inspection API is read-only: it reports status and cannot request
 * indexing. Only the Search Console UI can do that.
 */
async function inspectUrl(
  token: string,
  property: string,
  url: string
): Promise<PageIndexStatus> {
  const base: PageIndexStatus = {
    path: toDisplayPath(url),
    url,
    verdict: "VERDICT_UNSPECIFIED",
    coverageState: "Unknown",
    googleCanonical: null,
    userCanonical: null,
    canonicalMatches: null,
    lastCrawlTime: null,
  };

  try {
    const res = await fetch(URL_INSPECTION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: url,
        siteUrl: property,
        languageCode: "en-US",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ...base,
        error: `Google returned HTTP ${res.status} inspecting this URL.`,
      };
    }

    const body = await res.json();
    const status: RawIndexStatus =
      body?.inspectionResult?.indexStatusResult ?? {};

    const googleCanonical = status.googleCanonical ?? null;
    const userCanonical = status.userCanonical ?? null;

    return {
      ...base,
      verdict: status.verdict ?? "VERDICT_UNSPECIFIED",
      coverageState: status.coverageState ?? "Unknown",
      googleCanonical,
      userCanonical,
      lastCrawlTime: status.lastCrawlTime ?? null,
      canonicalMatches: canonicalsAgree(googleCanonical, userCanonical),
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Inspection failed.",
    };
  }
}

/**
 * Live index coverage for every supplied URL, plus the sitemaps Google holds.
 *
 * A single URL failing is reported on its own row rather than thrown, so one
 * bad URL cannot blank the whole panel. Resolving no property at all *is*
 * thrown — that means the Search Console connection is broken, which the
 * dashboard should say out loud rather than render as an empty table.
 */
export async function fetchIndexStatusReport(
  urls: string[]
): Promise<IndexStatusReport> {
  const token = await getGoogleAccessToken([SEARCH_CONSOLE_SCOPE]);
  if (!token) {
    throw new Error(
      "Could not authenticate with Google. Check FIREBASE_SERVICE_ACCOUNT_KEY."
    );
  }

  const siteUrl = await getSearchConsoleSiteUrl();
  const resolved = await resolveProperty(token, siteUrl);

  if (!resolved) {
    throw new Error(
      `Search Console did not answer for ${siteUrl}. The service account may ` +
        "no longer have access to the property."
    );
  }

  const pages = await Promise.all(
    urls.map((url) => inspectUrl(token, resolved.property, url))
  );

  return {
    property: resolved.property,
    sitemaps: resolved.sitemaps,
    pages,
  };
}
