import type { AgentDirective } from "./types";
import type { GSCKeywordItem } from "@/lib/integrations/google-search-console";
import { compactPhrase } from "@/lib/keyword-matching";
import { SERVICE_AREA_TAGS } from "@/lib/site";

/** Window the keywords dashboard quotes, kept in step with the integration. */
const REPORTING_WINDOW_DAYS = 28;

/** First position of page 2 — the earliest point a ranking becomes reachable. */
const FIRST_OPPORTUNITY_POSITION = 11;

/** Beyond roughly page 5 a ranking is not close enough to act on. */
const LAST_OPPORTUNITY_POSITION = 50;

/** Below this many impressions a cluster is too small to justify a directive. */
const MIN_CLUSTER_IMPRESSIONS = 3;

/** Positions at or better than these set the urgency of an opportunity. */
const PAGE_ONE_BOUNDARY = 10;
const STRONG_OPPORTUNITY_POSITION = 20;
const MODERATE_OPPORTUNITY_POSITION = 35;

/** A page-1 ranking below this click-through rate is usually a title problem. */
const LOW_CTR_PERCENT = 2;
const MIN_IMPRESSIONS_FOR_CTR = 10;

/**
 * Service vocabulary used to group reported queries.
 *
 * Order matters: restoration is matched before decks so that "deck repair" is
 * treated as restoration work, matching how the post-tagging logic in
 * geo-enhancements.ts already classifies it.
 */
const SERVICE_TRIGGERS: ReadonlyArray<{ category: string; words: readonly string[] }> = [
  { category: "Gazebos", words: ["gazebo", "pergola", "pavilion"] },
  { category: "Patios", words: ["patio", "porch", "screened"] },
  { category: "Remodeling", words: ["remodel", "renovation", "addition"] },
  { category: "Restoration", words: ["restor", "stain", "sand", "repair", "rebuild", "replacement"] },
  { category: "Carpentry", words: ["carpentry", "carpenter", "framing", "trim", "corbel", "header"] },
  { category: "Decks", words: ["deck", "decking"] },
];

/** The brand written as Google reports it, used to recognise branded queries. */
const BRAND_MARKER = compactPhrase("evr construction");

interface ReportedQuery {
  query: string;
  position: number;
  clicks: number;
  impressions: number;
  ctrPercent: number;
}

/**
 * A query is branded when it contains the brand once spacing and plurals are
 * folded, so "evrconstructions", "evr construction" and "evr construction llc"
 * all count while "ever construction" and "evs construction" do not.
 */
export function isBrandQuery(query: string): boolean {
  return compactPhrase(query).includes(BRAND_MARKER);
}

/** The service a query is about, or null when nothing matches confidently. */
export function classifyService(query: string): string | null {
  const text = query.toLowerCase();
  const match = SERVICE_TRIGGERS.find((trigger) =>
    trigger.words.some((word) => text.includes(word))
  );
  return match ? match.category : null;
}

/** The advertised service area named in a query, if any. */
export function detectCity(query: string): string | null {
  const text = query.toLowerCase();
  const tag = SERVICE_AREA_TAGS.find((area) =>
    text.includes(area.replace(", TN", "").toLowerCase())
  );
  return tag ? tag.replace(", TN", "") : null;
}

function toReportedQuery(item: GSCKeywordItem): ReportedQuery {
  const ctrPercent = Number.parseFloat(item.ctr ?? "");
  return {
    query: item.matchedQuery ?? item.keyword,
    position: item.position,
    clicks: item.clicks ?? 0,
    impressions: item.impressions ?? 0,
    ctrPercent: Number.isFinite(ctrPercent) ? ctrPercent : 0,
  };
}

function describeQueries(queries: ReportedQuery[], limit = 4): string {
  return queries
    .slice(0, limit)
    .map((q) => `"${q.query}" (#${q.position})`)
    .join(", ");
}

function priorityForPosition(position: number): AgentDirective["priority"] {
  if (position <= STRONG_OPPORTUNITY_POSITION) return "High";
  if (position <= MODERATE_OPPORTUNITY_POSITION) return "Medium";
  return "Low";
}

/**
 * Build a directive for one service whose reported queries sit just outside
 * page 1, where publishing a project post is the realistic way to move them.
 *
 * The title is deliberately stable — it names only the service — because the
 * orchestrator de-duplicates directives by title and positions shift daily.
 * The changing detail belongs in the description.
 */
function buildOpportunityDirective(
  category: string,
  queries: ReportedQuery[],
  timestamp: string
): AgentDirective {
  const sorted = [...queries].sort((a, b) => a.position - b.position);
  const best = sorted[0].position;
  const impressions = queries.reduce((sum, q) => sum + q.impressions, 0);
  const clicks = queries.reduce((sum, q) => sum + q.clicks, 0);
  const cities = [
    ...new Set(queries.map((q) => detectCity(q.query)).filter((city): city is string => !!city)),
  ];

  const where = cities.length > 0 ? ` in ${cities.join(", ")}` : "";

  return {
    id: `dir-kw-opportunity-${timestamp}-${category.toLowerCase()}`,
    skillId: "skill-monday",
    title: `Improve ${category} rankings just outside page 1`,
    description:
      `${queries.length} reported ${category.toLowerCase()} ${queries.length === 1 ? "query sits" : "queries sit"} ` +
      `on pages 2–5${where}, the best at #${best}. Over ${REPORTING_WINDOW_DAYS} days they earned ` +
      `${impressions} impressions and ${clicks} clicks. Publishing project posts that name the service and city ` +
      `is the realistic way to move them: ${describeQueries(sorted)}.`,
    impact: `Best position #${best} → target top 10`,
    priority: priorityForPosition(best),
    category: "Keywords",
    actionLabel: "Create Project Post",
    actionHref: "/admin/posts",
    status: "Open",
    createdAt: timestamp,
  };
}

/**
 * Build a directive for a page-1 ranking that rarely gets clicked, which is
 * almost always a title and meta description problem rather than a ranking one.
 */
function buildLowCtrDirective(query: ReportedQuery, timestamp: string): AgentDirective {
  return {
    id: `dir-kw-ctr-${timestamp}`,
    skillId: "skill-monday",
    title: "Improve click-through rate on a page-1 ranking",
    description:
      `"${query.query}" ranks #${query.position} yet only ${query.ctrPercent.toFixed(1)}% of its ` +
      `${query.impressions} impressions were clicked. The ranking is already there, so restating the ` +
      `service and city in the page title and meta description is usually what recovers the clicks.`,
    impact: `${query.ctrPercent.toFixed(1)}% CTR at #${query.position}`,
    priority: "Medium",
    category: "Keywords",
    actionLabel: "View in Keywords",
    actionHref: "/admin/keywords",
    status: "Open",
    createdAt: timestamp,
  };
}

/**
 * One standing reminder that tracked targets Google has never reported are
 * unsearched rather than unindexed, so nobody goes looking for a crawl problem
 * that does not exist.
 */
function buildNoDemandDirective(targetCount: number, timestamp: string): AgentDirective {
  return {
    id: `dir-kw-no-demand-${timestamp}`,
    skillId: "skill-monday",
    title: "Review targets Google reports no searches for",
    description:
      `${targetCount} tracked ${targetCount === 1 ? "target had" : "targets had"} no impressions in the last ` +
      `${REPORTING_WINDOW_DAYS} days. This is not an indexing problem — Search Console only reports a query once ` +
      `people actually search it, so these phrases are unlikely to be typed as written. Consider retargeting the ` +
      `terms Google does report, or broader service-and-city phrases.`,
    impact: "Keeps targets aligned with real search demand",
    priority: "Low",
    category: "Keywords",
    actionLabel: "Review Targets",
    actionHref: "/admin/keywords",
    status: "Open",
    createdAt: timestamp,
  };
}

/**
 * Turn Search Console data into directives worth acting on.
 *
 * Everything here is derived from queries Google actually reported. Targets
 * with no reported traffic are counted, never presented as a ranking problem,
 * because a tracked keyword is an aim rather than a measurement.
 */
export function analyzeKeywordOpportunities(keywords: GSCKeywordItem[]): {
  directives: AgentDirective[];
  findings: string[];
} {
  const timestamp = new Date().toISOString();
  const reported = keywords.filter((item) => item.position > 0).map(toReportedQuery);
  const targetsWithoutDemand = keywords.filter((item) => item.position === 0);

  const brandQueries = reported.filter((item) => isBrandQuery(item.query));
  const nonBrand = reported.filter((item) => !isBrandQuery(item.query));

  const opportunities = nonBrand.filter(
    (item) =>
      item.position >= FIRST_OPPORTUNITY_POSITION &&
      item.position <= LAST_OPPORTUNITY_POSITION
  );

  // Group by service so four spellings of the same intent produce one directive.
  const byService = new Map<string, ReportedQuery[]>();
  for (const item of opportunities) {
    const category = classifyService(item.query);
    if (!category) continue;
    const existing = byService.get(category) ?? [];
    existing.push(item);
    byService.set(category, existing);
  }

  const directives: AgentDirective[] = [];
  for (const [category, queries] of byService) {
    const impressions = queries.reduce((sum, q) => sum + q.impressions, 0);
    if (impressions < MIN_CLUSTER_IMPRESSIONS) continue;
    directives.push(buildOpportunityDirective(category, queries, timestamp));
  }
  directives.sort((a, b) => a.title.localeCompare(b.title));

  const lowCtr = nonBrand.find(
    (item) =>
      item.position <= PAGE_ONE_BOUNDARY &&
      item.impressions >= MIN_IMPRESSIONS_FOR_CTR &&
      item.ctrPercent < LOW_CTR_PERCENT
  );
  if (lowCtr) directives.push(buildLowCtrDirective(lowCtr, timestamp));

  if (targetsWithoutDemand.length > 0) {
    directives.push(buildNoDemandDirective(targetsWithoutDemand.length, timestamp));
  }

  const findings: string[] = [];

  // Queries naming another company still rank for us, but counting them as our
  // own page-1 results would overstate performance, so they only ever appear in
  // the unmatched finding below.
  const relevant = reported.filter(
    (item) => isBrandQuery(item.query) || classifyService(item.query) !== null
  );

  const pageOne = relevant.filter((item) => item.position <= PAGE_ONE_BOUNDARY);
  if (pageOne.length > 0) {
    const noun = pageOne.length === 1 ? "query" : "queries";
    findings.push(`Page-1 rankings: ${pageOne.length} ${noun} ranking in the top 10.`);
  }

  const relevantOpportunities = relevant.filter(
    (item) =>
      item.position >= FIRST_OPPORTUNITY_POSITION &&
      item.position <= LAST_OPPORTUNITY_POSITION
  );
  if (relevantOpportunities.length > 0) {
    findings.push(
      `Striking distance: ${relevantOpportunities.length} queries on pages 2–5, worth ${relevantOpportunities.reduce(
        (sum, q) => sum + q.impressions,
        0
      )} impressions.`
    );
  }

  const bestBrand = [...brandQueries].sort((a, b) => a.position - b.position)[0];
  if (bestBrand) {
    findings.push(
      `Branded search: "${bestBrand.query}" ranks #${bestBrand.position} with ${bestBrand.clicks} clicks from ${bestBrand.impressions} impressions.`
    );
  }

  const unmatched = nonBrand.filter((item) => !classifyService(item.query));
  if (unmatched.length > 0) {
    findings.push(
      `Unmatched queries: ${unmatched.length} named no service we offer, often another company or a misspelling (${describeQueries(unmatched, 3)}).`
    );
  }

  if (targetsWithoutDemand.length > 0) {
    findings.push(
      `Tracked targets with no reported demand: ${targetsWithoutDemand.length} in the last ${REPORTING_WINDOW_DAYS} days.`
    );
  }

  if (findings.length === 0) {
    findings.push("Search Console reported no queries for this period.");
  }

  return { directives, findings };
}
