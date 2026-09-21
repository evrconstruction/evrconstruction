import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Junk paths that Google discovered (spam referrers / URL artifacts).
 * Returning 410 Gone tells Google these never existed — drop them fast.
 */
const GONE_PATHS = new Set(["/$", "/&"]);

export function middleware(request: NextRequest) {
  if (GONE_PATHS.has(request.nextUrl.pathname)) {
    return new NextResponse(null, {
      status: 410,
      statusText: "Gone",
      headers: { "X-Robots-Tag": "noindex" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/%24", "/%26"],
};
