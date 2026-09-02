import { NextResponse } from "next/server";
import { fetchGA4Analytics } from "@/lib/integrations/google-analytics";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const data = await fetchGA4Analytics(days);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load analytics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
