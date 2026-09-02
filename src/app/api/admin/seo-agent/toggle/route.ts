import { NextResponse } from "next/server";
import { toggleAutonomousAgent } from "@/lib/seo-agent/orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { active } = body;

    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "Invalid payload. 'active' must be a boolean." }, { status: 400 });
    }

    const updatedConfig = toggleAutonomousAgent(active);
    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error("Error toggling autonomous agent:", error);
    return NextResponse.json({ error: "Failed to toggle autonomous agent" }, { status: 500 });
  }
}
