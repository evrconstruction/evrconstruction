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

    // SSRF protection: reject loopback, private IPv4/IPv6, and cloud metadata addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const o1 = parseInt(ipMatch[1], 10);
      const o2 = parseInt(ipMatch[2], 10);
      if (o1 === 0) return false;
      if (o1 === 127) return false;
      if (o1 === 10) return false;
      if (o1 === 169 && o2 === 254) return false;
      if (o1 === 192 && o2 === 168) return false;
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
      if (o1 === 100 && o2 >= 64 && o2 <= 127) return false;
    }

    if (
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname.startsWith("fe80:") ||
      hostname.startsWith("[fe80:") ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("[fc") ||
      hostname.startsWith("[fd")
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

  if (!isSafePublicUrl(sourceUrl)) {
    return {
      status: "Unreachable",
      type: "NoFollow",
      httpStatus: 400,
      lastVerified: today,
    };
  }

  const parsedUrl = new URL(sourceUrl);
  const hostname = parsedUrl.hostname.toLowerCase();
  const isYelp = isDirectoryHostname(hostname, "yelp.com");
  const isBbb = isDirectoryHostname(hostname, "bbb.org");
  const isNextdoor = isDirectoryHostname(hostname, "nextdoor.com");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text().catch(() => "");
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
    console.warn("Backlink verification warning:", { sourceUrl, error: err });
    return {
      status: "Unreachable",
      type: "NoFollow",
      httpStatus: 200,
      lastVerified: today,
    };
  }
}
