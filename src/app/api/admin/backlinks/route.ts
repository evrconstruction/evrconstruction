import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export interface BacklinkItem {
  id: string;
  sourceUrl: string;
  title: string;
  status: "Active" | "Lost" | "Pending";
  type: "DoFollow" | "NoFollow";
  lastVerified: string;
}

export interface OutreachDraft {
  id: string;
  targetDomain: string;
  opportunity: string;
  suggestedAnchor: string;
  status: "Draft" | "Sent" | "Accepted";
}

export async function GET() {
  let backlinksList: BacklinkItem[] = [];

  try {
    const snapshot = await adminDb.collection("backlinks").get();
    if (!snapshot.empty) {
      backlinksList = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          sourceUrl: d.sourceUrl || "",
          title: d.title || "",
          status: d.status || "Active",
          type: d.type || "DoFollow",
          lastVerified: d.lastVerified || new Date().toLocaleDateString("en-US"),
        };
      });
    }
  } catch (err) {
    console.warn("Firestore fetch error on backlinks:", err);
  }

  const total = backlinksList.length;
  const active = backlinksList.filter((b) => b.status === "Active").length;
  const lost = backlinksList.filter((b) => b.status === "Lost").length;
  const noFollow = backlinksList.filter((b) => b.type === "NoFollow").length;

  return NextResponse.json({
    metrics: {
      total,
      active,
      lost,
      noFollow,
    },
    backlinks: backlinksList,
    outreach: [],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceUrl, title, type } = body;

    if (!sourceUrl) {
      return NextResponse.json({ error: "Source URL is required" }, { status: 400 });
    }

    const newBacklink = {
      sourceUrl: sourceUrl.trim(),
      title: (title || sourceUrl).trim(),
      status: "Active" as const,
      type: (type || "DoFollow") as "DoFollow" | "NoFollow",
      lastVerified: new Date().toLocaleDateString("en-US"),
    };

    const docRef = await adminDb.collection("backlinks").add(newBacklink);

    return NextResponse.json({
      status: "ok",
      backlink: { id: docRef.id, ...newBacklink },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add backlink";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
