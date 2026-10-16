import { NextResponse } from "next/server";
import { indexNowKey } from "@/lib/integrations/indexnow";

/**
 * Publishes the IndexNow key so search engines can verify we own this host.
 *
 * Search engines fetch this at `/<key>.txt`, which the proxy rewrites here; the
 * path below is not the address they are given. Reading the key from the
 * environment rather than committing a static file means it can be rotated
 * without a code change. Publishing it is the ownership proof, not a leak.
 */
export async function GET() {
  const key = indexNowKey();

  if (!key) {
    return new NextResponse("IndexNow is not configured.", { status: 404 });
  }

  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
