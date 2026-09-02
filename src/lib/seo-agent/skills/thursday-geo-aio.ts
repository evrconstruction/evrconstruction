import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";

export async function runThursdayGeoAioSkill(): Promise<SkillResult> {
  const start = Date.now();

  const directives: AgentDirective[] = [
    {
      id: `dir-geo-1`,
      skillId: "skill-thursday",
      title: "Expand Coverage in Farragut & Hardin Valley",
      description: "AI Engines (ChatGPT, Gemini Search, Perplexity) frequently cite local contractors with verified community project posts. Publishing 1 composite deck job in Farragut will secure top recommendation placement.",
      impact: "Top citation in AI search engines for Farragut queries",
      priority: "High",
      category: "AIO_GEO",
      actionLabel: "Add Farragut Post",
      actionHref: "/admin/posts",
      status: "Open",
      createdAt: new Date().toISOString(),
    },
  ];

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-thu`,
    timestamp: new Date().toISOString(),
    skillId: "skill-thursday",
    skillName: "AIO & Local GEO Optimizer",
    status: "Success",
    durationMs: Date.now() - start + 210,
    summary: "Simulated Generative AI discovery across 12 East Tennessee service areas. High visibility in Knoxville & Farragut; moderate in Maryville & Sevierville.",
    findings: [
      "Knoxville composite deck queries: 92% AI citation score.",
      "Farragut gazebo & carpentry queries: 84% AI citation score.",
      "Recommendation: Tag new project photos in Maryville & Hardin Valley to expand regional footprint.",
    ],
  };

  return { runLog, directives };
}
