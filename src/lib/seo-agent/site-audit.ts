import { PUBLISHED_ROUTES, SITE_URL } from "@/lib/site-urls";

/**
 * What a single crawled page reported about itself.
 *
 * Kept as plain data so the analysis below is a pure function of the crawl and
 * can be tested against realistic HTML without touching the network.
 */
export interface PageFacts {
  path: string;
  url: string;
  status: number;
  /** `<title>` text, trimmed. Empty when the page carries none. */
  title: string;
  /** The page's declared canonical, or null when it declares none. */
  canonical: string | null;
  /** How many <h1> elements the page has. Exactly one is correct. */
  h1Count: number;
  /** Whether the page carries a meta description. */
  hasDescription: boolean;
  /** Internal links found on the page, as absolute URLs. */
  internalLinks: string[];
  /** Set when the page could not be fetched at all. */
  error?: string;
}

export interface AuditFinding {
  /** Stable id so the same problem does not raise a new directive each run. */
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}

const MAX_TITLE_LENGTH = 60;
const MIN_TITLE_LENGTH = 15;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Every tag of one kind, with its attributes read into a lowercase-keyed map.
 *
 * Attributes are read separately rather than matched in one pattern so a result
 * never depends on the order they were written in. A regex such as
 * /<link[^>]+rel="canonical"[^>]*href="…"/ only matches when rel comes first,
 * and `href` before `rel` is equally valid markup — the page then looked as
 * though it declared no canonical at all.
 */
function tagsWithAttributes(html: string, tagName: string): Array<Map<string, string>> {
  const tags: Array<Map<string, string>> = [];
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, "gi");

  for (const match of html.matchAll(pattern)) {
    const attributes = new Map<string, string>();
    for (const attribute of match[1].matchAll(
      /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*["']([^"']*)["']/g
    )) {
      attributes.set(attribute[1].toLowerCase(), attribute[2]);
    }
    tags.push(attributes);
  }

  return tags;
}

/** True when a rel attribute lists this token, e.g. "canonical" or "canonical alternate". */
function hasRelToken(attributes: Map<string, string>, token: string): boolean {
  return (attributes.get("rel") ?? "")
    .toLowerCase()
    .split(/\s+/)
    .includes(token);
}

/**
 * Extract the facts an SEO audit needs from one page's HTML.
 *
 * Written against the raw HTML rather than a DOM library: this runs inside the
 * audit and a parser dependency would be a large addition for a handful of
 * extractions on markup this site generates itself.
 */
export function extractPageFacts(path: string, url: string, status: number, html: string): PageFacts {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  const canonicalTag = tagsWithAttributes(html, "link").find((attributes) =>
    hasRelToken(attributes, "canonical")
  );
  const canonical = canonicalTag?.get("href")?.trim() || null;

  const hasDescription = tagsWithAttributes(html, "meta").some(
    (attributes) =>
      (attributes.get("name") ?? "").toLowerCase() === "description" &&
      Boolean(attributes.get("content")?.trim())
  );

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;

  // Only same-host hrefs are collected: an external link going down is not
  // something this site controls, and checking them would make the audit slow
  // and its findings unactionable.
  const internalLinks: string[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    try {
      const resolved = new URL(href, url);
      if (resolved.host === new URL(SITE_URL).host && !internalLinks.includes(resolved.href)) {
        internalLinks.push(resolved.href);
      }
    } catch {
      // A malformed href is reported as a broken link by the caller.
    }
  }

  return {
    path,
    url,
    status,
    title: titleMatch ? decodeEntities(titleMatch[1].replace(/\s+/g, " ")) : "",
    canonical,
    h1Count,
    hasDescription,
    internalLinks,
  };
}

/** Trailing slashes are not a different page, as the canonical check learned. */
function sameUrl(a: string, b: string): boolean {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

/**
 * Turn a path into the tail of a directive id.
 *
 * Separators collapse and the ends are trimmed, so `/projects/decks` becomes
 * `projects-decks` rather than `-projects-decks`. The id has to be stable
 * across runs — an id that shifts would raise a new directive every week
 * instead of updating the one that is already open.
 */
export function directiveSlug(path: string): string {
  const slug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return slug || "home";
}

/**
 * Turn a crawl into findings.
 *
 * Pure, so every rule below can be tested against hand-built page facts rather
 * than a live site whose state changes between runs.
 */
export function analyzeCrawl(
  pages: PageFacts[],
  /** Status of every URL the site links to, keyed by absolute URL. */
  linkStatuses: Map<string, number>
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const titleOwners = new Map<string, string[]>();

  for (const page of pages) {
    const slug = directiveSlug(page.path);

    if (page.error || page.status !== 200) {
      findings.push({
        id: `dir-audit-unreachable-${slug}`,
        title: `Unreachable page: ${page.path || "/"}`,
        description: page.error
          ? `${page.path || "/"} could not be fetched (${page.error}).`
          : `${page.path || "/"} returned HTTP ${page.status}.`,
        priority: "High",
      });
      continue;
    }

    if (!page.title) {
      findings.push({
        id: `dir-audit-title-missing-${slug}`,
        title: `Page has no title: ${page.path || "/"}`,
        description: `${page.path || "/"} has no <title>, so Google has to invent one for the search result.`,
        priority: "High",
      });
    } else {
      if (page.title.length > MAX_TITLE_LENGTH) {
        findings.push({
          id: `dir-audit-title-long-${slug}`,
          title: `Title is too long: ${page.path || "/"}`,
          description: `The title is ${page.title.length} characters, so Google will truncate it around ${MAX_TITLE_LENGTH}. Current title: "${page.title}".`,
          priority: "Low",
        });
      }
      if (page.title.length < MIN_TITLE_LENGTH) {
        findings.push({
          id: `dir-audit-title-short-${slug}`,
          title: `Title says too little: ${page.path || "/"}`,
          description: `The title is only ${page.title.length} characters ("${page.title}"), which gives Google little to match a search against.`,
          priority: "Medium",
        });
      }
      const owners = titleOwners.get(page.title) ?? [];
      owners.push(page.path || "/");
      titleOwners.set(page.title, owners);
    }

    if (!page.canonical) {
      findings.push({
        id: `dir-audit-canonical-missing-${slug}`,
        title: `Page declares no canonical: ${page.path || "/"}`,
        description: `${page.path || "/"} declares no canonical URL, so Google has to choose one and may pick a variant.`,
        priority: "Medium",
      });
    } else if (!sameUrl(page.canonical, page.url)) {
      findings.push({
        id: `dir-audit-canonical-mismatch-${slug}`,
        title: `Canonical points elsewhere: ${page.path || "/"}`,
        description: `${page.path || "/"} declares its canonical as ${page.canonical}, which is not this page. If that is unintended, the page is asking not to be indexed.`,
        priority: "High",
      });
    }

    if (page.h1Count === 0) {
      findings.push({
        id: `dir-audit-h1-missing-${slug}`,
        title: `No H1 heading: ${page.path || "/"}`,
        description: `${page.path || "/"} has no <h1>, so its main subject is unstated in the markup.`,
        priority: "Medium",
      });
    } else if (page.h1Count > 1) {
      findings.push({
        id: `dir-audit-h1-multiple-${slug}`,
        title: `More than one H1 heading: ${page.path || "/"}`,
        description: `${page.path || "/"} has ${page.h1Count} <h1> elements. One per page keeps the main subject unambiguous.`,
        priority: "Low",
      });
    }

    if (!page.hasDescription) {
      findings.push({
        id: `dir-audit-description-missing-${slug}`,
        title: `No meta description: ${page.path || "/"}`,
        description: `${page.path || "/"} has no meta description, so Google writes the snippet from page text instead.`,
        priority: "Low",
      });
    }
  }

  // A title repeated across pages splits their relevance: Google cannot tell
  // which page answers a query when two claim the same subject.
  for (const [title, paths] of titleOwners) {
    if (paths.length < 2) continue;
    findings.push({
      id: `dir-audit-title-duplicate-${paths.map((p) => directiveSlug(p)).join("-")}`,
      title: `Same title on ${paths.length} pages`,
      description: `${paths.join(" and ")} both use the title "${title}". Distinct titles let Google match each page to its own searches.`,
      priority: "Medium",
    });
  }

  // Broken internal links waste crawl budget and strand visitors.
  //
  // A link that could not be reached records status 0 rather than an HTTP code,
  // so testing >= 400 alone would silently ignore every link that timed out or
  // refused the connection — the failures most likely to be real.
  const broken = [...linkStatuses.entries()].filter(
    ([, status]) => status === 0 || status >= 400
  );
  if (broken.length > 0) {
    const listed = broken
      .slice(0, 5)
      .map(([url, status]) => `${url} (HTTP ${status})`)
      .join(", ");
    findings.push({
      id: "dir-audit-broken-links",
      title: `${broken.length} broken internal link${broken.length === 1 ? "" : "s"}`,
      description: `These links lead nowhere: ${listed}${
        broken.length > 5 ? `, and ${broken.length - 5} more` : ""
      }. Each one wastes crawl budget and loses a visitor.`,
      priority: "High",
    });
  }

  return findings;
}

export interface CrawlResult {
  pages: PageFacts[];
  findings: AuditFinding[];
  /** Every page returned HTTP 200 and no finding was raised. */
  clean: boolean;
}

/** How long any single fetch may take before it is treated as unreachable. */
const FETCH_TIMEOUT_MS = 8000;

function requestHeaders(): HeadersInit {
  return { "User-Agent": "EVR-SEO-Audit-Agent/1.0 (+https://evrconstructions.com)" };
}

async function fetchPage(path: string): Promise<PageFacts> {
  const url = `${SITE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: requestHeaders(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    const html = await res.text();
    return extractPageFacts(path, url, res.status, html);
  } catch (err) {
    return {
      path,
      url,
      status: 0,
      title: "",
      canonical: null,
      h1Count: 0,
      hasDescription: false,
      internalLinks: [],
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

/**
 * Crawl every published page and check that the links it makes still resolve.
 *
 * Only URLs this site links to are checked, and each is checked once however
 * many pages link to it, so the cost is bounded by the number of distinct
 * internal links rather than by pages multiplied by links per page.
 */
export async function crawlAndAudit(): Promise<CrawlResult> {
  const pages = await Promise.all(PUBLISHED_ROUTES.map((route) => fetchPage(route.path)));

  const uniqueLinks = new Set<string>();
  for (const page of pages) {
    for (const link of page.internalLinks) uniqueLinks.add(link);
  }

  // Pages already fetched are reused rather than requested twice.
  const known = new Map<string, number>();
  for (const page of pages) known.set(page.url, page.status);

  const toCheck = [...uniqueLinks].filter((link) => !known.has(link));

  const linkStatuses = new Map<string, number>(known);
  const results = await Promise.all(
    toCheck.map(async (link) => {
      try {
        const res = await fetch(link, {
          method: "GET",
          headers: requestHeaders(),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          cache: "no-store",
        });
        return [link, res.status] as const;
      } catch {
        // 0 is not a valid HTTP status, so an unreachable link is never
        // mistaken for a working one.
        return [link, 0] as const;
      }
    })
  );

  for (const [link, status] of results) linkStatuses.set(link, status);

  const findings = analyzeCrawl(pages, linkStatuses);

  return { pages, findings, clean: findings.length === 0 };
}
