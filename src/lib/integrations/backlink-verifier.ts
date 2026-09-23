import axios from "axios";
import ssrfFilter from "ssrf-req-filter";

export interface VerificationResult {
  status: "Active" | "Missing" | "Unreachable" | "Blocked";
  type: "DoFollow" | "NoFollow";
  httpStatus: number;
  lastVerified: string;
}

function isSafePublicUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isDirectoryHostname(hostname: string, targetDomain: string): boolean {
  return hostname === targetDomain || hostname.endsWith(`.${targetDomain}`);
}

/**
 * Directory sites often answer automated requests with an interstitial
 * challenge instead of the listing. That response proves the request was
 * blocked; it is not evidence about whether the listing still exists, so it is
 * reported as "Blocked" rather than assumed to be active.
 */
function looksLikeBotChallenge(html: string): boolean {
  return (
    html.includes("Client Challenge") ||
    html.includes("JavaScript is disabled") ||
    html.includes("cf-browser-verification") ||
    html.includes("challenge-platform")
  );
}

export async function verifyBacklinkUrl(sourceUrl: string): Promise<VerificationResult> {
  const today = new Date().toLocaleDateString("en-US");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return { status: "Unreachable", type: "NoFollow", httpStatus: 400, lastVerified: today };
  }

  if (!isSafePublicUrl(parsedUrl.href)) {
    return {
      status: "Unreachable",
      type: "NoFollow",
      httpStatus: 400,
      lastVerified: today,
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isYelp = isDirectoryHostname(hostname, "yelp.com");
  const isBbb = isDirectoryHostname(hostname, "bbb.org");
  const isNextdoor = isDirectoryHostname(hostname, "nextdoor.com");
  const isHouzz = isDirectoryHostname(hostname, "houzz.com");
  const isThumbtack = isDirectoryHostname(hostname, "thumbtack.com");
  const isBizapedia = isDirectoryHostname(hostname, "bizapedia.com");
  const isKnownDirectory = isBbb || isYelp || isNextdoor || isHouzz || isThumbtack || isBizapedia;

  try {
    const sanitizedUrl = new URL(
      `${parsedUrl.pathname}${parsedUrl.search}`,
      `${parsedUrl.protocol}//${parsedUrl.hostname}`
    ).href;

    // Use axios with ssrf-req-filter for true socket-level DNS rebinding protection
    const res = await axios.get(sanitizedUrl, {
      httpAgent: ssrfFilter(sanitizedUrl),
      httpsAgent: ssrfFilter(sanitizedUrl),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 8000,
      validateStatus: () => true, // Don't throw on 4xx/5xx
    });

    if (res.status >= 200 && res.status < 300) {
      const html = typeof res.data === "string" ? res.data : "";

      if (looksLikeBotChallenge(html)) {
        return {
          status: "Blocked",
          type: directoryLinkType(isYelp, isBbb, isHouzz),
          httpStatus: res.status,
          lastVerified: today,
        };
      }

      const hasBrand =
        html.toLowerCase().includes("evr construction") ||
        html.toLowerCase().includes("evrconstruction") ||
        html.toLowerCase().includes("evrconstructions.com") ||
        html.toLowerCase().includes("evrconstruction.llc") ||
        html.toLowerCase().includes("henry ramirez");

      const isNoFollow =
        html.includes('rel="nofollow"') ||
        html.includes("nofollow") ||
        html.includes('rel="ugc"') ||
        isYelp ||
        isBbb ||
        isHouzz;

      return {
        status: hasBrand ? "Active" : "Missing",
        type: isNoFollow ? "NoFollow" : "DoFollow",
        httpStatus: res.status,
        lastVerified: today,
      };
    }

    if (res.status === 403 && isKnownDirectory) {
      // The directory refused the request. The listing was never served, so its
      // state is unknown — this is not evidence that it is active.
      return {
        status: "Blocked",
        type: directoryLinkType(isYelp, isBbb, isHouzz),
        httpStatus: res.status,
        lastVerified: today,
      };
    }

    if (res.status === 404 || res.status === 410) {
      return {
        status: "Missing",
        type: "NoFollow",
        httpStatus: res.status,
        lastVerified: today,
      };
    }

    return {
      status: "Unreachable",
      type: "NoFollow",
      httpStatus: res.status,
      lastVerified: today,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn("Backlink verification warning. URL:", sourceUrl, "Error:", errorMsg);

    return {
      status: "Unreachable",
      type: "NoFollow",
      httpStatus: 500,
      lastVerified: today,
    };
  }
}

/** Link type used when a known directory cannot be read to inspect the anchor. */
function directoryLinkType(isYelp: boolean, isBbb: boolean, isHouzz: boolean): "DoFollow" | "NoFollow" {
  return isYelp || isBbb || isHouzz ? "NoFollow" : "DoFollow";
}
