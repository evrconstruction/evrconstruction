import { describe, it, expect } from "vitest";
import {
  buildKeywordReport,
  rankConfidence,
  type ReportedQueryMetrics,
  type TrackedKeywordDoc,
} from "@/lib/integrations/google-search-console";

const metrics = (
  position: number,
  impressions: number,
  clicks = 0,
  ctr = 0
): ReportedQueryMetrics => ({ position, impressions, clicks, ctr });

const tracked = (id: string, keyword: string): TrackedKeywordDoc => ({
  id,
  keyword,
  createdAt: "2026-09-03T00:00:00.000Z",
});

/**
 * The real 28-day Search Console window for evrconstructions.com, taken
 * 2026-10-16 — all 24 queries Google reported, with positions as the dashboard
 * rounds them. Using measured data rather than invented rows is what makes
 * these tests describe the behaviour the dashboard actually has to get right.
 */
const REAL_REPORTED = new Map<string, ReportedQueryMetrics>([
  ["evr construction", metrics(6, 34, 5, 0.147)],
  ["deck building services", metrics(1, 28)],
  ["evr", metrics(4, 9)],
  ["gazebo contractors knoxville tn", metrics(17, 7)],
  ["gazebo builder knoxville tn", metrics(23, 4)],
  ["carpenter knoxville tn", metrics(73, 4)],
  ["deck repair lenoir city tn", metrics(85, 4)],
  ["deck building", metrics(11, 2)],
  ["deck repair", metrics(31, 2)],
  ["rough carpentry knoxville", metrics(31, 2)],
  ["evs construction", metrics(78, 2)],
  ["deck builder powell tn", metrics(89, 2)],
  ["plainview deck builders", metrics(2, 1)],
  ["deck builder oak ridge tn", metrics(41, 1)],
  ["deck building companies oak ridge tn", metrics(41, 1)],
  ["deck construction lenoir city tn", metrics(41, 1)],
  ["deck replacement lenoir city tn", metrics(41, 1)],
  ["gazebo knoxville tn", metrics(45, 1)],
  ["cable railing installers knoxville", metrics(73, 1)],
  ["gazebo builders near me", metrics(74, 1)],
  ["pergola lenoir city tn", metrics(79, 1)],
  ["carpenter knoxville", metrics(80, 1)],
  ["fence builder", metrics(81, 1)],
  ["deck builders oak ridge tn", metrics(92, 1)],
]);

/** The targets the owner had added, including the ones Google never reported. */
const REAL_TRACKED = [
  tracked("t1", "evrconstructions"),
  tracked("t2", "gazebo builder knoxville tn"),
  tracked("t3", "carpenter knoxville tn"),
  tracked("t4", "deck repair lenoir city tn"),
  tracked("t5", "deck repair knoxville tn"),
  tracked("t6", "deck builder oak ridge tn"),
  tracked("t7", "deck replacement lenoir city tn"),
  tracked("t8", "attached pergola construction bearden tn"),
  tracked("t9", "custom finish carpentry powell tn"),
];

describe("rankConfidence", () => {
  it("does not call a position solid on a handful of impressions", () => {
    // "plainview deck builders" reported position 2 from a single impression.
    // Presenting that beside a real ranking is how noise gets read as a #2.
    expect(rankConfidence(1)).toBe("thin");
    expect(rankConfidence(9)).toBe("thin");
  });

  it("calls a position solid once there are enough impressions to average", () => {
    expect(rankConfidence(10)).toBe("solid");
    expect(rankConfidence(28)).toBe("solid");
  });
});

describe("buildKeywordReport", () => {
  const report = buildKeywordReport(REAL_TRACKED, REAL_REPORTED);

  it("gives a tracked keyword the numbers from the query it matches", () => {
    const row = report.keywords.find((k) => k.keyword === "gazebo builder knoxville tn");

    expect(row?.source).toBe("tracked");
    expect(row?.position).toBe(23);
    expect(row?.impressions).toBe(4);
    expect(row?.matchedQuery).toBe("gazebo builder knoxville tn");
  });

  it("pairs the brand spelled without a space to the query spelled with one", () => {
    const row = report.keywords.find((k) => k.keyword === "evrconstructions");

    expect(row?.position).toBe(6);
    expect(row?.matchedQuery).toBe("evr construction");
    expect(row?.trend).toContain("evr construction");
  });

  it("reports no impressions for a target Google never returned", () => {
    const row = report.keywords.find(
      (k) => k.keyword === "attached pergola construction bearden tn"
    );

    expect(row?.position).toBe(0);
    expect(row?.confidence).toBe("none");
    expect(row?.impressions).toBe(0);
  });

  it("never lists a claimed query as untracked", () => {
    const queried = report.untrackedQueries.map((q) => q.query);

    expect(queried).not.toContain("evr construction");
    expect(queried).not.toContain("gazebo builder knoxville tn");
    expect(queried).not.toContain("carpenter knoxville tn");
  });

  it("lists the queries Google already serves that nobody tracks", () => {
    const queried = report.untrackedQueries.map((q) => q.query);

    expect(queried).toContain("deck building services");
    expect(queried).toContain("gazebo builders near me");
    expect(queried).toContain("fence builder");
    // 24 reported less the 7 these targets claimed.
    expect(queried).toHaveLength(17);
  });

  it("orders untracked queries by how often Google showed the site", () => {
    const impressions = report.untrackedQueries.map((q) => q.impressions);
    const sorted = [...impressions].sort((a, b) => b - a);

    expect(impressions).toEqual(sorted);
  });

  it("counts stats from ranked rows only", () => {
    // 9 tracked + the reported queries no target claimed.
    expect(report.stats.total).toBe(report.keywords.length);
    expect(report.stats.top10).toBe(
      report.keywords.filter((k) => k.position > 0 && k.position <= 10).length
    );
  });

  it("handles an empty Search Console response without inventing rows", () => {
    const empty = buildKeywordReport(REAL_TRACKED, new Map());

    expect(empty.untrackedQueries).toEqual([]);
    expect(empty.keywords).toHaveLength(REAL_TRACKED.length);
    expect(empty.keywords.every((k) => k.confidence === "none")).toBe(true);
  });
});
