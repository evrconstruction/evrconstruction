import { describe, it, expect } from "vitest";
import {
  summarizeCityDemand,
  detectCity,
} from "@/lib/seo-agent/keyword-opportunities";
import type { GSCKeywordItem } from "@/lib/integrations/google-search-console";
import { isStale, STALE_DIRECTIVE_DAYS } from "@/lib/seo-agent/directive-lifecycle";
import { SITE } from "@/lib/site";

const query = (
  q: string,
  position: number,
  impressions: number,
  clicks = 0
): GSCKeywordItem => ({
  id: `gsc-${q}`,
  source: "reported",
  keyword: q,
  lang: "EN",
  position,
  volume: impressions,
  trend: "",
  clicks,
  impressions,
  ctr: "0.0%",
  confidence: impressions >= 10 ? "solid" : "thin",
});

/**
 * Every city-naming query Google reported in the real 28-day window ending
 * 2026-10-16. Measured, not invented: these are the queries the site actually
 * appeared for.
 */
const REAL_CITY_QUERIES: GSCKeywordItem[] = [
  query("gazebo contractors knoxville tn", 17, 7),
  query("gazebo builder knoxville tn", 23, 4),
  query("carpenter knoxville tn", 73, 4),
  query("carpenter knoxville", 80, 1),
  query("cable railing installers knoxville", 73, 1),
  query("rough carpentry knoxville", 31, 2),
  query("gazebo knoxville tn", 45, 1),
  query("deck repair lenoir city tn", 85, 4),
  query("deck replacement lenoir city tn", 41, 1),
  query("deck construction lenoir city tn", 41, 1),
  query("pergola lenoir city tn", 79, 1),
  query("deck builder oak ridge tn", 41, 1),
  query("deck building companies oak ridge tn", 41, 1),
  query("deck builders oak ridge tn", 92, 1),
  query("deck builder powell tn", 89, 2),
  // No advertised service area in the query text:
  query("evr construction", 6, 34, 5),
  query("deck building services", 1, 28),
  query("deck building", 11, 2),
  query("fence builder", 81, 1),
  query("gazebo builders near me", 74, 1),
  query("plainview deck builders", 2, 1),
];

describe("detectCity", () => {
  it("names the advertised area in a query", () => {
    expect(detectCity("deck builder oak ridge tn")).toBe("Oak Ridge");
    expect(detectCity("gazebo builders near me")).toBeNull();
  });

  it("does not match a city that is not advertised", () => {
    // "Plainview" is a real place but not one the business serves.
    expect(detectCity("plainview deck builders")).toBeNull();
  });
});

describe("summarizeCityDemand", () => {
  const demand = summarizeCityDemand(REAL_CITY_QUERIES);

  it("totals impressions across every query naming a city", () => {
    // Knoxville: 7 + 4 + 4 + 1 + 1 + 2 + 1 = 20
    expect(demand.get("Knoxville")?.impressions).toBe(20);
    // Lenoir City: 4 + 1 + 1 + 1 = 7
    expect(demand.get("Lenoir City")?.impressions).toBe(7);
    // Oak Ridge: 1 + 1 + 1 = 3
    expect(demand.get("Oak Ridge")?.impressions).toBe(3);
    expect(demand.get("Powell")?.impressions).toBe(2);
  });

  it("keeps the best position seen for a city", () => {
    expect(demand.get("Knoxville")?.bestPosition).toBe(17);
    expect(demand.get("Lenoir City")?.bestPosition).toBe(41);
  });

  it("counts how many distinct queries named each city", () => {
    expect(demand.get("Knoxville")?.queries).toBe(7);
    expect(demand.get("Lenoir City")?.queries).toBe(4);
  });

  it("reports nothing for a city no query names", () => {
    // This is the finding that made eleven directives unactionable: most of the
    // advertised areas are never searched for at all.
    for (const city of ["Clinton", "Maynardville", "Gatlinburg", "Morristown", "Alcoa", "Seymour", "Sevierville", "Farragut", "Bearden", "Hardin Valley", "Maryville"]) {
      expect(demand.has(city)).toBe(false);
    }
  });

  it("covers only advertised service areas", () => {
    const advertised = new Set<string>(SITE.serviceAreas);
    for (const city of demand.keys()) {
      expect(advertised.has(city)).toBe(true);
    }
  });
});

describe("isStale", () => {
  const now = new Date("2026-10-16T12:00:00.000Z");
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it("treats a directive older than the threshold as stale", () => {
    expect(isStale({ status: "Open", createdAt: daysAgo(STALE_DIRECTIVE_DAYS + 1) }, now)).toBe(true);
  });

  it("leaves a recent directive alone", () => {
    expect(isStale({ status: "Open", createdAt: daysAgo(3) }, now)).toBe(false);
  });

  it("never calls a closed directive stale", () => {
    expect(isStale({ status: "Resolved", createdAt: daysAgo(300) }, now)).toBe(false);
    expect(isStale({ status: "Dismissed", createdAt: daysAgo(300) }, now)).toBe(false);
  });

  it("ignores an unparseable date rather than guessing", () => {
    expect(isStale({ status: "Open", createdAt: "not a date" }, now)).toBe(false);
  });
});
