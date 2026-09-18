import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";

export async function runSundayDigestSkill(): Promise<SkillResult> {
  const start = Date.now();
  const directives: AgentDirective[] = [];
  const findings: string[] = [];

  let activeBacklinks = 0;
  let totalTrackedKeywords = 0;
  let openDirectivesCount = 0;
  let recentRunsCount = 0;
  let successfulRunsCount = 0;

  try {
    const [backlinkSnap, keywordSnap, runSnap, directiveSnap] = await Promise.all([
      adminDb.collection("backlinks").where("status", "==", "Active").get(),
      adminDb.collection("tracked_keywords").get(),
      adminDb.collection("seo_agent_runs").orderBy("timestamp", "desc").limit(30).get(),
      adminDb.collection("seo_agent_directives").where("status", "==", "Open").get(),
    ]);

    activeBacklinks = backlinkSnap.size;
    totalTrackedKeywords = keywordSnap.size;
    openDirectivesCount = directiveSnap.size;
    recentRunsCount = runSnap.size;
    successfulRunsCount = runSnap.docs.filter((d) => d.data().status === "Success").length;
  } catch (err) {
    console.warn("Failed to query live Firestore metrics in Sunday digest:", err);
  }

  const healthScore = recentRunsCount > 0 ? Math.round((successfulRunsCount / recentRunsCount) * 100) : 100;

  findings.push(`Weekly Operational Health: ${healthScore}% pass rate across ${recentRunsCount} automated skill executions.`);
  findings.push(`Directory Citations: ${activeBacklinks} verified active contractor listings.`);
  findings.push(`Monitored Keywords: ${totalTrackedKeywords} search terms actively tracked.`);
  findings.push(`Open Action Items: ${openDirectivesCount} pending directives.`);

  if (openDirectivesCount > 0) {
    directives.push({
      id: `dir-sun-${Date.now()}`,
      skillId: "skill-sunday",
      title: `Resolve ${openDirectivesCount} Open SEO Directives`,
      description: `There are currently ${openDirectivesCount} open action items across keywords, citations, and technical audits. Addressing high-priority items will improve East Tennessee search visibility.`,
      impact: "Improves overall local search and citation rankings",
      priority: "High",
      category: "Digest",
      actionLabel: "View All Directives",
      actionHref: "/admin/seo-agent",
      status: "Open",
      createdAt: new Date().toISOString(),
    });
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-sun`,
    timestamp: new Date().toISOString(),
    skillId: "skill-sunday",
    skillName: "Weekly Digest & Action Synthesizer",
    status: "Success",
    durationMs: Date.now() - start,
    summary: `Compiled weekly executive briefing from live telemetry. System health: ${healthScore}%. ${activeBacklinks} active citations, ${totalTrackedKeywords} tracked terms, ${openDirectivesCount} open directives.`,
    findings,
  };

  return { runLog, directives };
}
