import { describe, expect, it } from "vitest";
import {
  analyzeCrawl,
  extractPageFacts,
  type PageFacts,
} from "@/lib/seo-agent/site-audit";

const PAGE_URL = "https://evrconstructions.com/projects/decks";

function page(overrides: Partial<PageFacts> = {}): PageFacts {
  return {
    path: "/projects/decks",
    url: PAGE_URL,
    status: 200,
    title: "Deck Building in Knoxville | EVR Construction",
    canonical: PAGE_URL,
    h1Count: 1,
    hasDescription: true,
    internalLinks: [],
    ...overrides,
  };
}

describe("extractPageFacts", () => {
  it("reads the facts a crawler would see", () => {
    const html = `<!doctype html><html><head>
      <title>  Deck Building   in Knoxville </title>
      <meta name="description" content="Custom decks built to last." />
      <link rel="canonical" href="${PAGE_URL}" />
      </head><body>
      <h1>Deck Building</h1>
      <a href="/contact">Contact</a>
      <a href="/contact">Contact again</a>
      <a href="https://facebook.com/evr">Facebook</a>
      <a href="#top">Top</a>
      <a href="mailto:contact@evrconstructions.com">Email</a>
      </body></html>`;

    const facts = extractPageFacts("/projects/decks", PAGE_URL, 200, html);

    expect(facts.title).toBe("Deck Building in Knoxville");
    expect(facts.canonical).toBe(PAGE_URL);
    expect(facts.h1Count).toBe(1);
    expect(facts.hasDescription).toBe(true);
    // Same-page, external and non-http links are not crawl targets, and the
    // repeated contact link is counted once.
    expect(facts.internalLinks).toEqual(["https://evrconstructions.com/contact"]);
  });

  it("matches canonical when the attribute order differs", () => {
    const html = `<link href="${PAGE_URL}" rel="canonical">`;
    expect(extractPageFacts("/projects/decks", PAGE_URL, 200, html).canonical).toBe(PAGE_URL);
  });

  it("reports absence rather than inventing values", () => {
    const facts = extractPageFacts("/about", "https://evrconstructions.com/about", 200, "<html></html>");

    expect(facts.title).toBe("");
    expect(facts.canonical).toBeNull();
    expect(facts.h1Count).toBe(0);
    expect(facts.hasDescription).toBe(false);
  });
});

describe("analyzeCrawl", () => {
  it("stays silent on a clean site", () => {
    expect(analyzeCrawl([page()], new Map()).map((f) => f.id)).toEqual([]);
  });

  it("flags a canonical pointing at a different page as High", () => {
    const findings = analyzeCrawl(
      [page({ canonical: "https://evrconstructions.com/projects" })],
      new Map()
    );

    const finding = findings.find((f) => f.id === "dir-audit-canonical-mismatch-projects-decks");
    expect(finding?.priority).toBe("High");
  });

  it("accepts a trailing-slash difference on the homepage", () => {
    // The same false positive that was fixed in the index-coverage panel: a
    // bare origin and that origin with a slash are the same page.
    const findings = analyzeCrawl(
      [
        page({
          path: "",
          url: "https://evrconstructions.com",
          canonical: "https://evrconstructions.com/",
        }),
      ],
      new Map()
    );

    expect(findings.map((f) => f.id)).not.toContain("dir-audit-canonical-mismatch-home");
  });

  it("flags a title reused across pages", () => {
    const findings = analyzeCrawl(
      [
        page({ path: "/projects/gazebo", url: "https://evrconstructions.com/projects/gazebo" }),
        page({ path: "/projects/pergolas", url: "https://evrconstructions.com/projects/pergolas" }),
      ],
      new Map()
    );

    expect(findings.some((f) => f.id.startsWith("dir-audit-title-duplicate"))).toBe(true);
  });

  it("flags broken internal links, counting the unreachable ones too", () => {
    const findings = analyzeCrawl(
      [page()],
      new Map([
        ["https://evrconstructions.com/gone", 404],
        // 0 is what an unreachable link records, and must not read as healthy.
        ["https://evrconstructions.com/offline", 0],
      ])
    );

    const finding = findings.find((f) => f.id === "dir-audit-broken-links");
    expect(finding?.priority).toBe("High");
    expect(finding?.title).toBe("2 broken internal links");
  });

  it("treats a non-200 page as unreachable and checks nothing else about it", () => {
    const findings = analyzeCrawl(
      [page({ status: 500, title: "", canonical: null, h1Count: 0, hasDescription: false })],
      new Map()
    );

    expect(findings.map((f) => f.id)).toEqual(["dir-audit-unreachable-projects-decks"]);
  });

  it("reports a fetch failure with its reason instead of a status code", () => {
    const findings = analyzeCrawl(
      [page({ status: 0, error: "The operation was aborted due to timeout" })],
      new Map()
    );

    expect(findings[0].description).toContain("timeout");
  });

  it("gives each finding a stable id so a rerun updates rather than duplicates", () => {
    const first = analyzeCrawl([page()], new Map()).map((f) => f.id);
    const second = analyzeCrawl([page({ title: "Too short" })], new Map()).map((f) => f.id);

    expect(first).toEqual([]);
    expect(second.length).toBeGreaterThan(0);
    expect(second).toContain("dir-audit-title-short-projects-decks");
  });
});
