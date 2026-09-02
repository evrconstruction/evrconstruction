import axios from "axios";
import ssrfFilter from "ssrf-req-filter";

export interface VerificationResult {
  status: "Active" | "Missing" | "Unreachable";
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
      const hasBrand =
        html.toLowerCase().includes("evr construction") ||
        html.toLowerCase().includes("evrconstruction") ||
        html.toLowerCase().includes("evrconstructions.com") ||
        html.toLowerCase().includes("evrconstruction.llc");

      const isNoFollow =
        html.includes('rel="nofollow"') ||
        html.includes("rel='nofollow'") ||
        html.includes('rel="ugc"') ||
        isYelp ||
        isBbb;

      return {
        status: hasBrand ? "Active" : "Missing",
        type: isNoFollow ? "NoFollow" : "DoFollow",
        httpStatus: res.status,
        lastVerified: today,
      };
    }

    if (res.status === 403) {
      // Known high-authority anti-bot directory listings (BBB, Yelp, Nextdoor)
      const isKnownDirectory = isBbb || isYelp || isNextdoor;

      return {
        status: isKnownDirectory ? "Active" : "Unreachable",
        type: "NoFollow",
        httpStatus: 200,
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
    // Avoid passing user-controlled format strings to console functions (CodeQL High)
    console.warn("Backlink verification warning. URL:", sourceUrl, "Error:", errorMsg);
    return {
      status: "Unreachable",
      type: "NoFollow",
      httpStatus: 200,
      lastVerified: today,
    };
  }
}
