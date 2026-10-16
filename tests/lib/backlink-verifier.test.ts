import { describe, it, expect } from "vitest";
import { detectBrandLinkRel } from "@/lib/integrations/backlink-verifier";

/**
 * Covers the link-type reading that decides whether a backlink passes ranking
 * credit. The previous implementation searched the whole document for the word
 * "nofollow", so any page that mentioned the term reported our link as NoFollow
 * while the dashboard showed it as a verified fact.
 */
describe("detectBrandLinkRel", () => {
  it("reads the rel of the link that actually points at this site", () => {
    const html = `<a href="https://evrconstructions.com/projects" rel="nofollow">EVR Construction</a>`;

    expect(detectBrandLinkRel(html)).toBe("NoFollow");
  });

  it("treats a brand link with no rel as followed", () => {
    const html = `<a href="https://evrconstructions.com">EVR Construction</a>`;

    expect(detectBrandLinkRel(html)).toBe("DoFollow");
  });

  it("ignores the word nofollow when it is not on our own link", () => {
    // The exact false positive the document-wide substring check produced: a page
    // discussing the term, and a partner link carrying it, both counted against us.
    const html = `
      <article>Editorial policy: paid placements are marked nofollow.</article>
      <a href="https://example.com" rel="nofollow">Partner</a>
      <a href="https://evrconstructions.com/decks">EVR Construction decks</a>
    `;

    expect(detectBrandLinkRel(html)).toBe("DoFollow");
  });

  it("treats sponsored and ugc as non-following too", () => {
    expect(
      detectBrandLinkRel(`<a href="https://evrconstructions.com" rel="sponsored">x</a>`)
    ).toBe("NoFollow");

    expect(
      detectBrandLinkRel(`<a href="https://evrconstructions.com" rel="ugc nofollow">x</a>`)
    ).toBe("NoFollow");
  });

  it("returns null when no anchor points at this site", () => {
    // Directory listings are often script-rendered, so the business can be named
    // without the link appearing. That is unknown, not nofollow.
    const html = `
      <p>EVR Construction serves Knoxville, TN.</p>
      <a href="https://example.com" rel="nofollow">Directory home</a>
    `;

    expect(detectBrandLinkRel(html)).toBeNull();
  });

  it("does not mistake a URL that merely mentions the domain for a backlink", () => {
    const html = `<a href="https://example.com/redirect?to=evrconstructions.com" rel="nofollow">x</a>`;

    expect(detectBrandLinkRel(html)).toBeNull();
  });

  it("accepts a subdomain as a link back to this site", () => {
    const html = `<a href="https://www.evrconstructions.com/contact">EVR Construction</a>`;

    expect(detectBrandLinkRel(html)).toBe("DoFollow");
  });

  it("handles single-quoted attributes", () => {
    const html = `<a class='brand' href='https://evrconstructions.com' rel='nofollow noopener'>x</a>`;

    expect(detectBrandLinkRel(html)).toBe("NoFollow");
  });
});
