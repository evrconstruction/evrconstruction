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

  // Share of runs that finished without reporting a problem. The Tuesday and
  // Wednesday skills record "Error" when they complete and find something, so
  // this is a cleanliness rate, not an uptime rate, and it is not an SEO score:
  // a week of clean runs can still sit on unchanged rankings. Earlier versions
  // reported it as "System health" and "Global SEO/GEO health score", which
  // overstated what it measures.
  const passRate = recentRunsCount > 0 ? Math.round((successfulRunsCount / recentRunsCount) * 100) : 100;

  findings.push(
    `Clean runs: ${passRate}% of the last ${recentRunsCount} automated runs finished without reporting a problem.`
  );
  findings.push(`Directory Citations: ${activeBacklinks} listings currently marked active.`);
  findings.push(`Monitored Keywords: ${totalTrackedKeywords} search terms actively tracked.`);
  findings.push(`Open Action Items: ${openDirectivesCount} pending directives.`);

  if (openDirectivesCount > 0) {
    directives.push({
      id: "dir-weekly-digest",
      skillId: "skill-sunday",
      title: "Weekly SEO Action Items Review",
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
    summary: `${passRate}% of the last ${recentRunsCount} skill runs finished without reporting a problem. ${activeBacklinks} active citations, ${totalTrackedKeywords} tracked terms, ${openDirectivesCount} open directives.`,
    findings,
  };

  return { runLog, directives };
}
