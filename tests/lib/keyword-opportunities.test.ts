import { describe, it, expect } from "vitest";
import {
  analyzeKeywordOpportunities,
  classifyService,
  detectCity,
  isBrandQuery,
} from "@/lib/seo-agent/keyword-opportunities";
import type { GSCKeywordItem } from "@/lib/integrations/google-search-console";

/**
 * Built from the real 28-day Search Console data for evrconstructions.com plus
 * the tracked targets, so these tests describe the actual behaviour the skill
 * has to get right rather than invented cases.
 */
const reportedQuery = (
  query: string,
  position: number,
  impressions: number,
  clicks: number,
  ctrPercent: number
): GSCKeywordItem => ({
  id: `gsc-${query}`,
  keyword: query,
  lang: "EN",
  position,
  volume: impressions,
  trend: "↑ Page 2 Opportunity",
  clicks,
  impressions,
  ctr: `${ctrPercent.toFixed(1)}%`,
});

/** A tracked target Google never reported, i.e. no impressions. */
const trackedTarget = (keyword: string): GSCKeywordItem => ({
  id: `t-${keyword}`,
  keyword,
  lang: "EN",
  position: 0,
  volume: 0,
  trend: "No impressions (28d)",
  clicks: 0,
  impressions: 0,
  ctr: "--",
});

const REAL_DATA: GSCKeywordItem[] = [
  // The brand, reported with a space while the target is written without one.
  {
    ...reportedQuery("evr construction", 3, 87, 23, 26.4),
    id: "t-evr",
    keyword: "evrconstructions",
    matchedQuery: "evr construction",
  },
  {
    ...reportedQuery("gazebo builder knoxville tn", 36, 3, 0, 0),
    id: "t-gazebo",
    keyword: "gazebo knoxville",
    matchedQuery: "gazebo builder knoxville tn",
  },
  reportedQuery("gazebo contractor knoxville tn", 27, 7, 0, 0),
  reportedQuery("gazebo contractors knoxville tn", 39, 6, 0, 0),
  reportedQuery("gazebo builders knoxville tn", 44, 1, 0, 0),
  reportedQuery("deck repair lenoir city tn", 66, 1, 0, 0),
  reportedQuery("rough carpentry knoxville", 45, 1, 0, 0),
  reportedQuery("ever construction", 6, 2, 0, 0),
  reportedQuery("evs construction", 76, 1, 0, 0),
  reportedQuery("evers construction lawrenceburg tn", 52, 1, 0, 0),
  // Targets with no reported demand at all.
  trackedTarget("custom finish carpentry hardin valley tn"),
  trackedTarget("attached pergola construction bearden tn"),
  trackedTarget("deck contractor powell tn"),
];

describe("classifyService", () => {
  it("recognises the services the site actually offers", () => {
    expect(classifyService("gazebo contractor knoxville tn")).toBe("Gazebos");
    expect(classifyService("deck contractor knoxville")).toBe("Decks");
    expect(classifyService("rough carpentry knoxville")).toBe("Carpentry");
    expect(classifyService("pergola installation maryville")).toBe("Gazebos");
  });

  it("treats deck repair as restoration, matching the post-tagging convention", () => {
    expect(classifyService("deck repair lenoir city tn")).toBe("Restoration");
    expect(classifyService("deck restoration and staining powell")).toBe("Restoration");
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(classifyService("ever construction")).toBeNull();
    expect(classifyService("evs construction")).toBeNull();
    expect(classifyService("evers construction lawrenceburg tn")).toBeNull();
  });
});

describe("detectCity", () => {
  it("finds an advertised service area named in a query", () => {
    expect(detectCity("gazebo contractor knoxville tn")).toBe("Knoxville");
    expect(detectCity("wood deck board replacement lenoir city tn")).toBe("Lenoir City");
    expect(detectCity("deck contractor oak ridge tn")).toBe("Oak Ridge");
  });

  it("returns null for a place the site does not advertise", () => {
    expect(detectCity("evers construction lawrenceburg tn")).toBeNull();
    expect(detectCity("custom deck builder bearden")).toBeNull();
  });
});

describe("isBrandQuery", () => {
  it("recognises our own name however it is spaced or spelled out", () => {
    expect(isBrandQuery("evr construction")).toBe(true);
    expect(isBrandQuery("evrconstructions")).toBe(true);
    expect(isBrandQuery("evr construction llc")).toBe(true);
  });

  it("does not claim a competitor or a similar-looking name", () => {
    expect(isBrandQuery("ever construction")).toBe(false);
    expect(isBrandQuery("evs construction")).toBe(false);
    expect(isBrandQuery("evers construction lawrenceburg tn")).toBe(false);
    expect(isBrandQuery("ev construction")).toBe(false);
  });
});

describe("analyzeKeywordOpportunities — real data", () => {
  const { directives, findings } = analyzeKeywordOpportunities(REAL_DATA);
  const titles = directives.map((d) => d.title);
  const find = (fragment: string) => directives.find((d) => d.title.includes(fragment));

  it("never tells the user a target is waiting to be indexed", () => {
    for (const directive of directives) {
      const text = `${directive.title} ${directive.description} ${directive.impact}`.toLowerCase();

      // The previous version claimed content would "accelerate indexation" for
      // targets that simply are not searched, which sent the user looking for a
      // crawl problem that did not exist. Saying a target is NOT an indexing
      // problem is the whole point, so only the misleading claims are banned.
      expect(text).not.toContain("awaiting");
      expect(text).not.toContain("accelerate index");
      expect(text).not.toContain("pending index");
      expect(text).not.toContain("crawler indexing");
      expect(text).not.toContain("will accelerate");
    }
  });

  it("raises one gazebo opportunity rather than one per spelling", () => {
    const gazebo = directives.filter((d) => d.title.includes("Gazebos"));
    expect(gazebo).toHaveLength(1);
    expect(gazebo[0].description).toContain("4 reported gazebos queries");
    expect(gazebo[0].description).toContain("Knoxville");
  });

  it("quotes the real query text, not the tracked phrase", () => {
    expect(find("Gazebos")!.description).toContain("gazebo contractor knoxville tn");
    expect(find("Gazebos")!.description).not.toContain("gazebo knoxville,");
  });

  it("ranks the closest gazebo query first in the description", () => {
    const description = find("Gazebos")!.description;
    expect(description.indexOf("#27")).toBeGreaterThan(-1);
    expect(description.indexOf("#27")).toBeLessThan(description.indexOf("#36"));
  });

  it("sets priority from the best position, not the worst", () => {
    // Best gazebo position is 27, so this is a Medium opportunity.
    expect(find("Gazebos")!.priority).toBe("Medium");
    expect(find("Gazebos")!.impact).toContain("#27");
  });

  it("ignores a cluster with too little evidence to justify a directive", () => {
    // Carpentry has a single query with one impression.
    expect(titles.some((t) => t.includes("Carpentry"))).toBe(false);
  });

  it("does not turn the off-brand queries into an opportunity", () => {
    for (const title of titles) {
      expect(title).not.toContain("ever");
    }
  });

  it("raises the brand ranking as a finding, not as a directive", () => {
    expect(titles.some((t) => t.includes("Branded"))).toBe(false);
    expect(findings.some((f) => f.includes("Branded search") && f.includes("#3"))).toBe(true);
  });

  it("reports the unmatched competitor queries without acting on them", () => {
    const unmatched = findings.find((f) => f.startsWith("Unmatched queries"));
    expect(unmatched).toBeDefined();
    expect(unmatched).toContain("3");
  });

  it("does not count a competitor's name as one of our page-1 rankings", () => {
    // "ever construction" ranks #6, which is top 10, but it is not our service
    // and not our brand, so claiming it would overstate performance.
    expect(findings).toContain("Page-1 rankings: 1 query ranking in the top 10.");
    expect(findings.some((f) => f.startsWith("Page-1 rankings"))).toBe(true);
  });

  it("counts only relevant queries as striking distance", () => {
    expect(findings).toContain("Striking distance: 5 queries on pages 2–5, worth 18 impressions.");
  });

  it("explains targets with no demand honestly instead of blaming indexing", () => {
    const directive = find("no searches for")!;
    expect(directive).toBeDefined();
    expect(directive.priority).toBe("Low");
    expect(directive.description).toContain("not an indexing problem");
    expect(directive.description).toContain("3 tracked targets");
  });

  it("keeps directive titles stable so repeats do not pile up", () => {
    const later = analyzeKeywordOpportunities([
      ...REAL_DATA.map((k) => ({ ...k, position: k.position > 0 ? k.position + 2 : 0 })),
    ]);
    const stableTitles = later.directives.map((d) => d.title);

    expect(stableTitles).toEqual(titles);
  });
});

describe("analyzeKeywordOpportunities — edge cases", () => {
  it("handles a site with no reported queries at all", () => {
    const { directives, findings } = analyzeKeywordOpportunities([
      trackedTarget("deck knoxville"),
      trackedTarget("gazebo knoxville"),
    ]);

    expect(findings).toContain(
      "Tracked targets with no reported demand: 2 in the last 28 days."
    );
    // Only the honest review nudge, and nothing that invents a ranking.
    expect(directives).toHaveLength(1);
    expect(directives[0].title).toContain("no searches for");
  });

  it("handles an empty keyword list without inventing findings", () => {
    const { directives, findings } = analyzeKeywordOpportunities([]);
    expect(directives).toHaveLength(0);
    expect(findings).toEqual(["Search Console reported no queries for this period."]);
  });

  it("flags a page-1 ranking that rarely gets clicked", () => {
    const { directives } = analyzeKeywordOpportunities([
      reportedQuery("deck builder knoxville tn", 5, 40, 0, 0),
    ]);
    const ctr = directives.find((d) => d.title.includes("click-through"));
    expect(ctr).toBeDefined();
    expect(ctr!.description).toContain("#5");
  });

  it("does not flag click-through when a page-1 ranking converts well", () => {
    const { directives } = analyzeKeywordOpportunities([
      reportedQuery("deck builder knoxville tn", 5, 40, 12, 30),
    ]);
    expect(directives.some((d) => d.title.includes("click-through"))).toBe(false);
  });

  it("tolerates a missing click-through figure", () => {
    const { directives } = analyzeKeywordOpportunities([
      { ...reportedQuery("deck builder knoxville tn", 5, 40, 0, 0), ctr: "--" },
    ]);
    expect(directives.some((d) => d.title.includes("click-through"))).toBe(true);
  });
});
