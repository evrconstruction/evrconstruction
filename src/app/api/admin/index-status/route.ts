import { NextResponse } from "next/server";
import { fetchIndexStatusReport } from "@/lib/integrations/google-search-console-index";
import { publishedUrls } from "@/lib/site-urls";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Driven by the published route list, so a page can never be missing from
    // the coverage panel without also being missing from the sitemap.
    const data = await fetchIndexStatusReport(publishedUrls());
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load index status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
