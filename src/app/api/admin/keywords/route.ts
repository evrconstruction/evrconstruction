import { NextResponse } from "next/server";
import { fetchSearchConsoleKeywords, GSCKeywordItem } from "@/lib/integrations/google-search-console";
import { adminDb } from "@/lib/firebase-admin";

export type KeywordItem = GSCKeywordItem;
const TRACKED_KEYWORDS_COLLECTION = "tracked_keywords";

export async function GET() {
  try {
    const data = await fetchSearchConsoleKeywords();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load keywords";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const keyword = (body.keyword || "").trim().toLowerCase();
    const category = body.category || "General";
    const targetLocation = body.targetLocation || "Knoxville, TN";

    if (!keyword) {
      return NextResponse.json({ error: "Keyword phrase is required" }, { status: 400 });
    }

    // Check if keyword already exists
    const existing = await adminDb
      .collection(TRACKED_KEYWORDS_COLLECTION)
      .where("keyword", "==", keyword)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({
        status: "exists",
        id: existing.docs[0].id,
        message: "Keyword is already being tracked.",
      });
    }

    const docData = {
      keyword,
      category,
      targetLocation,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection(TRACKED_KEYWORDS_COLLECTION).add(docData);

    return NextResponse.json({
      status: "ok",
      keyword: {
        id: docRef.id,
        keyword,
        lang: "EN",
        position: 0,
        volume: 0,
        trend: "Target (Pending Indexing)",
        clicks: 0,
        impressions: 0,
        ctr: "--",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add target keyword";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing keyword ID" }, { status: 400 });
    }

    // If it's a Firestore document ID, delete it
    if (!id.startsWith("gsc-")) {
      await adminDb.collection(TRACKED_KEYWORDS_COLLECTION).doc(id).delete();
    }

    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete keyword";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
