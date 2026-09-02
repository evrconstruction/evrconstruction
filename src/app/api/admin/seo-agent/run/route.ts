import { NextResponse } from "next/server";
import { runAgentExecution } from "@/lib/seo-agent/orchestrator";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { skillId } = body;

    const result = await runAgentExecution(skillId);

    if (!result.success) {
      return NextResponse.json(result, { status: 423 }); // 423 Locked or Bad Request
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error executing SEO agent:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during agent run" },
      { status: 500 }
    );
  }
}
