import { NextResponse } from "next/server";
import { getSeoAgentDashboardData } from "@/lib/seo-agent/orchestrator";

export async function GET() {
  try {
    const data = getSeoAgentDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching SEO agent data:", error);
    return NextResponse.json({ error: "Failed to fetch SEO agent data" }, { status: 500 });
  }
}
