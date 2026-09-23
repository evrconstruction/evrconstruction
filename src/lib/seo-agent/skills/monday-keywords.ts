import { AgentDirective, AgentRunLog } from "../types";
import { fetchSearchConsoleKeywords } from "@/lib/integrations/google-search-console";
import { analyzeKeywordOpportunities } from "../keyword-opportunities";

export interface SkillResult {
  runLog: AgentRunLog;
  directives: AgentDirective[];
}

const SKILL_ID = "skill-monday";
const SKILL_NAME = "Keywords & Ranking Tracker";

/**
 * Reads real Search Console performance and raises directives for the terms
 * worth acting on.
 *
 * The analysis lives in ../keyword-opportunities.ts and is deliberately driven
 * by queries Google actually reported. An earlier version advised publishing
 * content for tracked targets that had no impressions, describing them as
 * "awaiting Google crawler indexing" — a claim that was both untrue and
 * unhelpful, since nothing can be written that makes a phrase get searched.
 */
export async function runMondayKeywordsSkill(): Promise<SkillResult> {
  const start = Date.now();
  const gscData = await fetchSearchConsoleKeywords();
  const keywords = gscData.keywords || [];

  const { directives, findings } = analyzeKeywordOpportunities(keywords);

  const reportedCount = keywords.filter((k) => k.position > 0).length;
  const pageOneCount = keywords.filter(
    (k) => k.position > 0 && k.position <= 10
  ).length;

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-mon`,
    timestamp: new Date().toISOString(),
    skillId: SKILL_ID,
    skillName: SKILL_NAME,
    status: "Success",
    durationMs: Date.now() - start,
    summary: `Reviewed ${keywords.length} tracked targets against ${reportedCount} queries Google reported. ${pageOneCount} ranking in the top 10.`,
    findings,
  };

  return { runLog, directives };
}
