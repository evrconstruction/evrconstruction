import { describe, it, expect } from "vitest";
import {
  assignQueries,
  compactPhrase,
  matchKeyword,
  normalizePhrase,
  phraseWords,
  sharedWordCount,
} from "@/lib/keyword-matching";

/**
 * Fixtures are the real tracked keywords and the real query strings Google
 * reported for evrconstructions.com over 28 days, so these tests describe the
 * behaviour that actually matters rather than invented examples.
 */
const TRACKED = [
  "evrconstructions",
  "gazebo knoxville",
  "deck knoxville",
  "custom deck builder maryville",
  "cedar gazebo builder farragut",
  "custom finish carpentry knoxville tn",
  "deck contractor bearden tn",
  "attached pergola construction bearden tn",
];

const REPORTED = [
  "evr construction",
  "ever construction",
  "evs construction",
  "evers construction lawrenceburg tn",
  "gazebo builder knoxville tn",
  "gazebo builders knoxville tn",
  "gazebo contractor knoxville tn",
  "gazebo contractors knoxville tn",
  "deck repair lenoir city tn",
  "rough carpentry knoxville",
];

/** Queries a tracked keyword should claim, as [tracked, expected kind]. */
const EXPECTED_MATCHES: Array<[string, string, "exact" | "variant"]> = [
  ["evrconstructions", "evr construction", "variant"],
  ["gazebo knoxville", "gazebo contractor knoxville tn", "variant"],
  ["deck knoxville", "deck knoxville", "exact"],
  ["custom deck builder maryville", "custom deck builders maryville tn", "variant"],
];

describe("normalizePhrase", () => {
  it("folds case, punctuation and spacing to one comparable form", () => {
    expect(normalizePhrase("EVR Construction, LLC")).toBe("evr construction llc");
    expect(normalizePhrase("deck   builder")).toBe("deck builder");
    expect(normalizePhrase(" gazebo-knoxville ")).toBe("gazebo knoxville");
  });
});

describe("compactPhrase", () => {
  it("recognises a brand Google splits or joins", () => {
    expect(compactPhrase("evrconstructions")).toBe(compactPhrase("evr construction"));
  });

  it("folds plural so decks and deck compare equally", () => {
    expect(compactPhrase("decks")).toBe(compactPhrase("deck"));
  });

  it("leaves double-s words intact rather than mangling them", () => {
    expect(phraseWords("glass")).toEqual(["glass"]);
    expect(phraseWords("business")).toEqual(["business"]);
  });

  it("drops filler words that carry no search intent", () => {
    expect(phraseWords("patio and pergola the builder")).toEqual([
      "patio",
      "pergola",
      "builder",
    ]);
  });
});

describe("matchKeyword — real matches", () => {
  for (const [tracked, reported, kind] of EXPECTED_MATCHES) {
    it(`matches "${tracked}" to "${reported}" as ${kind}`, () => {
      expect(matchKeyword(tracked, reported)).toBe(kind);
    });
  }

  it("treats case and punctuation differences as an exact match", () => {
    expect(matchKeyword("Gazebo Knoxville", "gazebo knoxville")).toBe("exact");
    expect(matchKeyword("deck builder, knoxville", "Deck Builder Knoxville")).toBe("exact");
  });
});

describe("matchKeyword — false positives it must refuse", () => {
  it("does not claim a differently-spelled competitor brand", () => {
    expect(matchKeyword("evrconstructions", "ever construction")).toBeNull();
    expect(matchKeyword("evrconstructions", "evs construction")).toBeNull();
    expect(matchKeyword("evrconstructions", "ev construction")).toBeNull();
    expect(
      matchKeyword("evrconstructions", "evers construction lawrenceburg tn")
    ).toBeNull();
  });

  it("does not match a different service in the same city", () => {
    expect(matchKeyword("gazebo knoxville", "deck repair lenoir city tn")).toBeNull();
  });

  it("does not match a different city for the same service", () => {
    expect(matchKeyword("deck contractor bearden tn", "deck contractor knoxville tn")).toBeNull();
  });

  it("does not match on a shared adjective alone", () => {
    expect(matchKeyword("custom finish carpentry knoxville tn", "rough carpentry knoxville")).toBeNull();
  });

  it("does not match an unrelated target to unrelated traffic", () => {
    expect(matchKeyword("cedar gazebo builder farragut", "deck repair lenoir city tn")).toBeNull();
    expect(matchKeyword("attached pergola construction bearden tn", "rough carpentry knoxville")).toBeNull();
  });

  it("refuses a single-word overlap as too weak to attribute traffic", () => {
    expect(matchKeyword("knoxville", "gazebo builder knoxville tn")).toBeNull();
    expect(phraseWords("knoxville")).toHaveLength(1);
  });
});

describe("matchKeyword — full matrix over the real data", () => {
  it("claims only the intended queries and never double-claims", () => {
    const found = new Map<string, string[]>();
    for (const tracked of TRACKED) {
      const matches = REPORTED.filter((query) => matchKeyword(tracked, query) !== null);
      found.set(tracked, matches);
    }

    // The brand term must reach its real spelling, which is where the clicks are.
    expect(found.get("evrconstructions")).toEqual(["evr construction"]);

    // Broader gazebo queries are recognised...
    expect(found.get("gazebo knoxville")).toEqual(
      expect.arrayContaining(["gazebo contractor knoxville tn", "gazebo builders knoxville tn"])
    );

    // ...while targets with no reported traffic stay unmatched rather than
    // borrowing someone else's numbers.
    expect(found.get("cedar gazebo builder farragut")).toEqual([]);
    expect(found.get("custom finish carpentry knoxville tn")).toEqual([]);
    expect(found.get("attached pergola construction bearden tn")).toEqual([]);
  });
});

describe("sharedWordCount", () => {
  it("ranks the closest of several candidate queries first", () => {
    const tracked = "gazebo knoxville";
    const closest = sharedWordCount(tracked, "gazebo builder knoxville tn");
    const looser = sharedWordCount(tracked, "gazebo tn");

    expect(closest).toBeGreaterThan(looser);
    expect(closest).toBe(2);
  });
});

/** The 27 keywords actually tracked in Firestore for this site. */
const ALL_TRACKED = [
  "attached pergola construction bearden tn",
  "attached pergola construction knoxville tn",
  "cedar gazebo builder farragut",
  "covered patio and deck builder oak ridge",
  "custom deck builder bearden",
  "custom deck builder farragut",
  "custom deck builder hardin valley",
  "custom deck builder maryville",
  "custom finish carpentry bearden tn",
  "custom finish carpentry hardin valley tn",
  "custom finish carpentry knoxville tn",
  "custom finish carpentry powell tn",
  "deck contractor bearden tn",
  "deck contractor oak ridge tn",
  "deck contractor powell tn",
  "deck knoxville",
  "deck restoration and staining powell",
  "evrconstructions",
  "exterior carpentry and trim farragut",
  "exterior carpentry and trim hardin valley",
  "exterior home addition builders lenoir city tn",
  "exterior home addition builders oak ridge tn",
  "gazebo knoxville",
  "patio and pergola builder lenoir city",
  "patio and pergola builder maryville",
  "wood deck board replacement lenoir city tn",
  "wood deck board replacement knoxville tn",
];

/** The 10 queries Google actually reported for this site over 28 days. */
const ALL_REPORTED = [
  "deck repair lenoir city tn",
  "ever construction",
  "evers construction lawrenceburg tn",
  "evr construction",
  "evs construction",
  "gazebo builder knoxville tn",
  "gazebo builders knoxville tn",
  "gazebo contractor knoxville tn",
  "gazebo contractors knoxville tn",
  "rough carpentry knoxville",
];

const asTracked = (keywords: string[]) =>
  keywords.map((keyword, index) => ({ id: `t${index}`, keyword }));

describe("assignQueries — real site data", () => {
  const tracked = asTracked(ALL_TRACKED);
  const assigned = assignQueries(tracked, ALL_REPORTED);
  const byKeyword = new Map(
    [...assigned.entries()].map(([id, match]) => [
      tracked.find((t) => t.id === id)!.keyword,
      match,
    ])
  );

  it("finds the brand query despite the spacing difference", () => {
    expect(byKeyword.get("evrconstructions")).toEqual({
      query: "evr construction",
      kind: "variant",
    });
  });

  it("finds the gazebo traffic and picks the closest query", () => {
    expect(byKeyword.get("gazebo knoxville")).toEqual({
      query: "gazebo builder knoxville tn",
      kind: "variant",
    });
  });

  it("leaves targets with no reported traffic unassigned", () => {
    expect(byKeyword.has("cedar gazebo builder farragut")).toBe(false);
    expect(byKeyword.has("custom deck builder maryville")).toBe(false);
    expect(byKeyword.has("deck knoxville")).toBe(false);
    expect(byKeyword.has("custom finish carpentry knoxville tn")).toBe(false);
  });

  it("assigns only the two targets that genuinely had traffic", () => {
    expect(assigned.size).toBe(2);
    for (const keyword of byKeyword.keys()) {
      expect(["evrconstructions", "gazebo knoxville"]).toContain(keyword);
    }
  });

  it("never lets two keywords share one query, which would double-count", () => {
    const queries = [...assigned.values()].map((match) => match.query);
    expect(new Set(queries).size).toBe(queries.length);
  });

  it("never attributes a competitor brand to our own target", () => {
    for (const match of assigned.values()) {
      expect(match.query).not.toContain("evers");
      expect(match.query).not.toContain("ever construction");
      expect(match.query).not.toContain("evs");
    }
  });
});

describe("assignQueries — precedence", () => {
  it("gives an exact match priority over a variant competing for the same query", () => {
    const tracked = asTracked(["gazebo knoxville", "gazebo builder knoxville tn"]);
    const assigned = assignQueries(tracked, ["gazebo builder knoxville tn"]);

    // The exact match takes it; the looser variant must not steal it.
    expect(assigned.get("t1")).toEqual({
      query: "gazebo builder knoxville tn",
      kind: "exact",
    });
    expect(assigned.has("t0")).toBe(false);
  });

  it("lets a variant take a different query when the exact one is gone", () => {
    const tracked = asTracked(["gazebo knoxville", "gazebo builder knoxville tn"]);
    const assigned = assignQueries(tracked, [
      "gazebo builder knoxville tn",
      "gazebo contractor knoxville tn",
    ]);

    expect(assigned.get("t1")!.kind).toBe("exact");
    expect(assigned.get("t0")).toEqual({
      query: "gazebo contractor knoxville tn",
      kind: "variant",
    });
  });

  it("returns nothing when there is no reported traffic at all", () => {
    expect(assignQueries(asTracked(["deck knoxville"]), []).size).toBe(0);
  });
});
