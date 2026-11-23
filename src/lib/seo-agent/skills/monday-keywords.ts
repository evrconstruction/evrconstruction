import { AgentDirective, AgentRunLog } from "../types";
import { fetchSearchConsoleKeywords } from "@/lib/integrations/google-search-console";
import { analyzeKeywordOpportunities } from "../keyword-opportunities";
import { SKILL_NAMES } from "../skill-names";

export interface SkillResult {
  runLog: AgentRunLog;
  directives: AgentDirective[];
}

const SKILL_ID = "skill-monday";
const SKILL_NAME = SKILL_NAMES[SKILL_ID];

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

  const { directives, findings, stats } = analyzeKeywordOpportunities(keywords);

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-mon`,
    timestamp: new Date().toISOString(),
    skillId: SKILL_ID,
    skillName: SKILL_NAME,
    status: "Success",
    durationMs: Date.now() - start,
    // Counts come from the analysis, not recomputed here: a local count also
    // picked up competitor and misspelling queries, so the summary and the
    // findings below it disagreed.
    summary: `Reviewed ${keywords.length} tracked targets against ${stats.reportedCount} queries Google reported. ${stats.pageOneCount} of our own queries ranking in the top 10.`,
    findings,
  };

  return { runLog, directives };
}
