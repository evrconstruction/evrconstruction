export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export type SkillCategory = "Keywords" | "Citations" | "Technical" | "AIO_GEO" | "Conversions" | "Posts" | "Digest";

export type DirectivePriority = "High" | "Medium" | "Low";

export interface AgentSkill {
  id: string;
  name: string;
  day: DayOfWeek;
  category: SkillCategory;
  description: string;
  lastRun?: string;
  status: "Passed" | "Action Needed" | "Running" | "Idle";
  findingsCount: number;
}

export interface AgentDirective {
  id: string;
  skillId: string;
  title: string;
  description: string;
  impact: string;
  priority: DirectivePriority;
  category: SkillCategory;
  actionLabel: string;
  actionHref: string;
  status: "Open" | "Resolved" | "Dismissed";
  createdAt: string;
}

export interface AgentRunLog {
  id: string;
  timestamp: string;
  skillId: string;
  skillName: string;
  status: "Success" | "Warning" | "Error";
  durationMs: number;
  summary: string;
  findings: string[];
}

export interface AgentConfig {
  autonomousActive: boolean;
  scheduleHourUtc: number;
  lastRun?: string;
  nextScheduledRun?: string;
}

export interface SeoAgentDashboardData {
  config: AgentConfig;
  healthScore: number;
  stats: {
    trackedKeywords: number;
    activeBacklinks: number;
    page2Opportunities: number;
    geoCoverageScore: number;
  };
  skills: AgentSkill[];
  directives: AgentDirective[];
  recentRuns: AgentRunLog[];
}
