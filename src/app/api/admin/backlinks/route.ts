import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";
import { verifyAdminSession } from "@/lib/auth-guard";

export interface BacklinkItem {
  id: string;
  sourceUrl: string;
  title: string;
  status: BacklinkStatus;
  type: "DoFollow" | "NoFollow";
  lastVerified: string;
}

/**
 * `Pending` means the listing has never been checked.
 * `Blocked` means the directory refused the check, so the listing state is
 * unknown — it is not evidence that the citation is missing.
 */
export type BacklinkStatus = "Active" | "Missing" | "Unreachable" | "Blocked" | "Pending";

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let backlinksList: BacklinkItem[] = [];

  try {
    // A GET reads. An earlier version seeded a starter list here when the
    // collection was empty, which meant a read could write, and the list it
    // restored had gone stale. Listings are added deliberately from the
    // dashboard, which is the only path that should create them.
    const snapshot = await adminDb.collection("backlinks").get();

    backlinksList = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        sourceUrl: d.sourceUrl || "",
        title: d.title || "",
        status: (d.status as BacklinkStatus) || "Pending",
        type: d.type || "DoFollow",
        lastVerified: d.lastVerified || new Date().toLocaleDateString("en-US"),
      };
    });
  } catch (err) {
    console.warn("Firestore fetch error on backlinks:", err);
  }

  const total = backlinksList.length;
  const active = backlinksList.filter((b) => b.status === "Active").length;
  const needsAttention = backlinksList.filter(
    (b) => b.status === "Missing" || b.status === "Unreachable"
  ).length;
  const noFollow = backlinksList.filter((b) => b.type === "NoFollow").length;

  return NextResponse.json({
    metrics: {
      total,
      active,
      needsAttention,
      noFollow,
    },
    backlinks: backlinksList,
  });
}

export async function POST(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sourceUrl, title, type } = body;

    if (!sourceUrl) {
      return NextResponse.json({ error: "Source URL is required" }, { status: 400 });
    }

    const trimmedUrl = sourceUrl.trim();
    const verification = await verifyBacklinkUrl(trimmedUrl);

    const newBacklink = {
      sourceUrl: trimmedUrl,
      title: (title || trimmedUrl).trim(),
      status: verification.status,
      type: type || verification.type,
      lastVerified: verification.lastVerified,
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
      return NextResponse.json({ error: "Missing backlink ID" }, { status: 400 });
    }

    await adminDb.collection("backlinks").doc(id).delete();

    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete backlink";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
