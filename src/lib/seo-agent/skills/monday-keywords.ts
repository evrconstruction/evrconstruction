import { AgentDirective, AgentRunLog } from "../types";
import { fetchSearchConsoleKeywords } from "@/lib/integrations/google-search-console";

export interface SkillResult {
  runLog: AgentRunLog;
  directives: AgentDirective[];
}

export async function runMondayKeywordsSkill(): Promise<SkillResult> {
  const start = Date.now();
  const gscData = await fetchSearchConsoleKeywords();
  const keywords = gscData.keywords || [];

  const page2Queries = keywords.filter((k) => k.position >= 11 && k.position <= 25);
  const top10Queries = keywords.filter((k) => k.position > 0 && k.position <= 10);
  const pendingQueries = keywords.filter((k) => k.position === 0);

  const directives: AgentDirective[] = [];

  if (page2Queries.length > 0) {
    page2Queries.slice(0, 2).forEach((kw, i) => {
      directives.push({
        id: `dir-kw-page2-${Date.now()}-${i}`,
        skillId: "skill-monday",
        title: `Target Page-2 Query: '${kw.keyword}'`,
        description: `Currently ranked #${kw.position} with ${kw.volume} impressions in Google Search Console. Adding project posts with captions mentioning '${kw.keyword}' will help push this term onto Page 1.`,
        impact: `Rank #${kw.position} → Target Top 10`,
        priority: "High",
        category: "Keywords",
        actionLabel: "View in Keywords",
        actionHref: "/admin/keywords",
        status: "Open",
        createdAt: new Date().toISOString(),
      });
    });
  } else if (pendingQueries.length > 0) {
    const sample = pendingQueries[0];
    directives.push({
      id: `dir-kw-pending-${Date.now()}`,
      skillId: "skill-monday",
      title: `Publish Content for Target Keyword: '${sample.keyword}'`,
      description: `Target term '${sample.keyword}' is being tracked and awaiting initial Google crawler indexing. Publishing a project post or service gallery photo tagged with this term will accelerate indexation.`,
      impact: "Accelerates Google Search indexation",
      priority: "Medium",
      category: "Keywords",
      actionLabel: "Create Project Post",
      actionHref: "/admin/posts",
      status: "Open",
      createdAt: new Date().toISOString(),
    });
  }

  const findings: string[] = [];
  if (top10Queries.length > 0) {
    findings.push(`Top 10 Rankings: ${top10Queries.length} search queries actively ranking on Page 1.`);
  }
  if (page2Queries.length > 0) {
    findings.push(`Page 2 Opportunities: ${page2Queries.length} terms in positions 11–25.`);
  }
  if (pendingQueries.length > 0) {
    findings.push(`Tracked Target Queries: ${pendingQueries.length} terms monitored in East Tennessee.`);
  }
  if (findings.length === 0) {
    findings.push("Keywords database synchronized. Ready for Google Search Console crawler queries.");
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-mon`,
    timestamp: new Date().toISOString(),
    skillId: "skill-monday",
    skillName: "Keyword & Ranking Tracker",
    status: "Success",
    durationMs: Date.now() - start,
    summary: `Analyzed ${keywords.length} target search terms. Identified ${top10Queries.length} Page-1 rankings and ${page2Queries.length} high-opportunity terms.`,
    findings,
  };

  return { runLog, directives };
}
