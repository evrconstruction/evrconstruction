import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminSession } from "@/lib/auth-guard";

const ACTIVITY_COLLECTION = "activity_logs";

export interface ActivityEvent {
  id: string;
  event: "form_submit" | "click" | "page_view" | "user_engagement";
  label: string;
  detail: string;
  location: string;
  device: string;
  page: string;
  timestamp: number;
  timeAgo?: string;
}

function formatTimeAgo(timestamp: number): string {
  const diffSecs = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export async function GET(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const snapshot = await adminDb
      .collection(ACTIVITY_COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const events: ActivityEvent[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const ts = data.timestamp || Date.now();
      return {
        id: doc.id,
        event: data.event || "page_view",
        label: data.label || "Page Visit",
        detail: data.detail || "",
        location: data.location || "East Tennessee",
        device: data.device || "Desktop",
        page: data.page || "/",
        timestamp: ts,
        timeAgo: formatTimeAgo(ts),
      };
    });

    const filtered = filter === "all" ? events : events.filter((e) => e.event === filter);

    // Counts cover whatever event types are actually present rather than a fixed
    // set of four. Only `form_submit` is ever written to this collection today, so
    // naming the others produced permanently-zero figures that read as "no
    // activity" rather than "not measured here".
    const counts: Record<string, number> = {};
    for (const item of events) {
      counts[item.event] = (counts[item.event] ?? 0) + 1;
    }

    return NextResponse.json({
      events: filtered,
      total: filtered.length,
      counts,
      source: "firestore",
    });
  } catch (err) {
    console.error("Failed to load activity logs:", err);
    return NextResponse.json({
      events: [],
      total: 0,
      counts: {},
      source: "firestore",
    });
  }
}
