import { NextResponse } from "next/server";
import {
  fetchSearchConsoleKeywords,
  GSCKeywordItem,
  NO_IMPRESSIONS_TREND,
} from "@/lib/integrations/google-search-console";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminSession } from "@/lib/auth-guard";

export type KeywordItem = GSCKeywordItem;
const TRACKED_KEYWORDS_COLLECTION = "tracked_keywords";

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        source: "tracked",
        keyword,
        lang: "EN",
        position: 0,
        volume: 0,
        trend: NO_IMPRESSIONS_TREND,
        clicks: 0,
        impressions: 0,
        ctr: "--",
        confidence: "none",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add target keyword";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing keyword ID" }, { status: 400 });
    }

    // Rows Google reported (`gsc-…`) are derived from Search Console rather than
    // stored here, so a row on screen can have no document behind it. Confirm the
    // document exists before reporting success, or the dashboard drops a row that
    // simply reappears on the next load.
    const docRef = adminDb.collection(TRACKED_KEYWORDS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        {
          error:
            "That row is a query Google reported, not a target keyword you added, " +
            "so there is nothing stored to delete. Add it as a target keyword first " +
            "if you want to manage it.",
        },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json({ status: "ok", deleted: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete keyword";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
