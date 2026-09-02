import { NextResponse } from "next/server";
import { getSeoAgentDashboardData } from "@/lib/seo-agent/orchestrator";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getSeoAgentDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching SEO agent data:", error);
    return NextResponse.json({ error: "Failed to fetch SEO agent data" }, { status: 500 });
  }
}
