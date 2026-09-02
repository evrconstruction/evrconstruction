import { NextResponse } from "next/server";
import { updateDirectiveStatus } from "@/lib/seo-agent/orchestrator";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !["Open", "Resolved", "Dismissed"].includes(status)) {
      return NextResponse.json({ error: "Invalid directive update payload" }, { status: 400 });
    }

    const success = updateDirectiveStatus(id, status);
    if (!success) {
      return NextResponse.json({ error: "Directive not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error("Error updating directive status:", error);
    return NextResponse.json({ error: "Failed to update directive status" }, { status: 500 });
  }
}
