import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  CORE_WEB_VITALS,
  fetchCoreWebVitals,
  rateVital,
} from "@/lib/integrations/crux";
import {
  indexNowKeyPath,
  isValidIndexNowKey,
} from "@/lib/integrations/indexnow";
import { proxy } from "@/proxy";

describe("rateVital", () => {
  it("rates Google's published thresholds inclusively at the boundary", () => {
    // At the threshold is still a pass; the failure starts one unit above.
    expect(rateVital("largest_contentful_paint", 2500)).toBe("good");
    expect(rateVital("largest_contentful_paint", 2501)).toBe("needs-improvement");
    expect(rateVital("largest_contentful_paint", 4000)).toBe("needs-improvement");
    expect(rateVital("largest_contentful_paint", 4001)).toBe("poor");
  });

  it("applies the tighter INP and CLS thresholds rather than the LCP ones", () => {
    // 3000ms would be fine for LCP but is poor for INP, which is capped at 500.
    expect(rateVital("interaction_to_next_paint", 3000)).toBe("poor");
    expect(rateVital("interaction_to_next_paint", 200)).toBe("good");
    expect(rateVital("cumulative_layout_shift", 0.1)).toBe("good");
    expect(rateVital("cumulative_layout_shift", 0.3)).toBe("poor");
  });

  it("covers every metric it claims to score", () => {
    for (const metric of CORE_WEB_VITALS) {
      expect(rateVital(metric, 0)).toBe("good");
    }
  });
});

describe("isValidIndexNowKey", () => {
  it("accepts the shape IndexNow requires", () => {
    expect(isValidIndexNowKey("a1b2c3d4e5f6")).toBe(true);
    expect(isValidIndexNowKey("3f2a1b4c-9d8e-4f7a-b6c5-d4e3f2a1b0c9")).toBe(true);
  });

  it("rejects keys the protocol would reject, rather than submitting them", () => {
    expect(isValidIndexNowKey("short")).toBe(false);
    expect(isValidIndexNowKey("has spaces in it")).toBe(false);
    expect(isValidIndexNowKey("has_underscore")).toBe(false);
  });
});

describe("indexNowKeyPath", () => {
  it("places the key file at the root, where it authorises the whole site", () => {
    expect(indexNowKeyPath("a1b2c3d4e5f6")).toBe("/a1b2c3d4e5f6.txt");
  });

  it("never nests the key under a directory, which would limit its scope", () => {
    // The protocol scopes a key to its file's directory, so /api/<key>.txt would
    // authorise only /api/ URLs and every real page would be rejected.
    const segments = indexNowKeyPath("a1b2c3d4e5f6")
      .split("/")
      .filter(Boolean);
    expect(segments).toHaveLength(1);
  });
});

describe("the IndexNow key rewrite", () => {
  const KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";

  function requestFor(path: string): NextRequest {
    return new NextRequest(`https://evrconstructions.com${path}`);
  }

  it("serves the key file that search engines fetch, from the root", () => {
    process.env.INDEXNOW_KEY = KEY;
    const rewrite = proxy(requestFor(`/${KEY}.txt`)).headers.get(
      "x-middleware-rewrite"
    );
    expect(rewrite).toContain("/api/indexnow/key");
  });

  it("does not answer an unrelated .txt path with our key", () => {
    process.env.INDEXNOW_KEY = KEY;
    const response = proxy(requestFor("/something-else.txt"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("stays inert while no key is configured", () => {
    delete process.env.INDEXNOW_KEY;
    const response = proxy(requestFor(`/${KEY}.txt`));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("fetchCoreWebVitals against a key Google refuses", () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  function respondWith(status: number, body: unknown = {}): void {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
  }

  beforeEach(() => {
    process.env.CRUX_API_KEY = "a-key-google-will-refuse";
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    delete process.env.CRUX_API_KEY;
  });

  it.each([400, 401, 403])(
    "reports HTTP %i as a configuration problem instead of throwing",
    async (status) => {
      // This is the measured production state: a key that is set but rejected.
      // Throwing here used to escape the skill and lose the entire weekly audit,
      // so the whole point is that it must resolve, not reject.
      respondWith(status, { error: { status: "INVALID_ARGUMENT" } });

      const report = await fetchCoreWebVitals("https://evrconstructions.com");

      expect(report.configured).toBe(false);
      expect(report.measurements).toEqual([]);
      expect(report.reason).toContain(`HTTP ${status}`);
      expect(report.reason).toContain("Replace it");
    }
  );

  it("still treats 404 as a missing-data state, not a rejection", async () => {
    respondWith(404);

    const report = await fetchCoreWebVitals("https://evrconstructions.com");

    // 404 means a real key on a site with too little traffic — the opposite of
    // a rejection, and the two must not be collapsed into one message.
    expect(report.configured).toBe(true);
    expect(report.hasData).toBe(false);
  });

  it("still throws on a server fault, so a real break stays visible", async () => {
    respondWith(500);

    await expect(
      fetchCoreWebVitals("https://evrconstructions.com")
    ).rejects.toThrow(/HTTP 500/);
  });
});
