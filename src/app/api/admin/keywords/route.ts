import { NextResponse } from "next/server";
import { fetchSearchConsoleKeywords, GSCKeywordItem } from "@/lib/integrations/google-search-console";

export type KeywordItem = GSCKeywordItem;

export async function GET() {
  try {
    const data = await fetchSearchConsoleKeywords();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load keywords";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
