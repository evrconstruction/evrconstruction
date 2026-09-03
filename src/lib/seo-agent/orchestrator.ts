import {
  AgentConfig,
  AgentDirective,
  AgentRunLog,
  AgentSkill,
  SeoAgentDashboardData,
} from "./types";
import { runMondayKeywordsSkill } from "./skills/monday-keywords";
import { runTuesdayCitationsSkill } from "./skills/tuesday-citations";
import { runWednesdayTechnicalSkill } from "./skills/wednesday-technical";
import { runThursdayGeoAioSkill } from "./skills/thursday-geo-aio";
import { runFridayConversionsSkill } from "./skills/friday-conversions";
import { runSaturdayPostEnhancerSkill } from "./skills/saturday-post-enhancer";
import { runSundayDigestSkill } from "./skills/sunday-digest";
import { addNotification } from "@/lib/notifications";
import { adminDb } from "@/lib/firebase-admin";

// Clean Fresh Skills Configuration
export const SKILLS_CONFIG: AgentSkill[] = [
  {
    id: "skill-monday",
    name: "Keywords & Ranking Tracker",
    day: "Monday",
    category: "Keywords",
    description: "Monitors GSC search performance & identifies high-opportunity Page-2 local terms (Pos 11–25).",
    status: "Idle",
    findingsCount: 0,
  },
  {
    id: "skill-tuesday",
    name: "48h Citation & Backlink Verifier",
    day: "Tuesday",
    category: "Citations",
    description: "Verifies contractor directory listings (Chamber, BBB, TN Registry) and crawls for active backlink status.",
    status: "Idle",
    findingsCount: 0,
  },
  {
    id: "skill-wednesday",
    name: "Technical & On-Page Schema Auditor",
    day: "Wednesday",
    category: "Technical",
    description: "Audits public pages, JSON-LD LocalBusiness & Project schema, meta tags, and mobile accessibility.",
    status: "Idle",
    findingsCount: 0,
  },
  {
    id: "skill-thursday",
    name: "AIO & Local GEO Optimizer",
    day: "Thursday",
    category: "AIO_GEO",
    description: "Evaluates Generative Engine Optimization readiness across 12 East Tennessee service areas.",
    status: "Idle",
    findingsCount: 0,
  },
  {
    id: "skill-friday",
    name: "Conversion & Traffic Synthesizer",
    day: "Friday",
    category: "Conversions",
    description: "Synthesizes GA4 visitor sessions, click-to-call taps, and contact form leads.",
    status: "Idle",
    findingsCount: 0,
  },
  {
    id: "skill-saturday",
    name: "Project Post Geo-Enhancer",
    day: "Saturday",
    category: "Posts",
    description: "Scans project posts for localized East TN keywords, alt tag descriptions, and photo tags.",
    status: "Idle",
    findingsCount: 0,
  },
  {
    id: "skill-sunday",
    name: "Weekly Digest & Strategy Executive",
    day: "Sunday",
    category: "Digest",
    description: "Compiles weekly audit findings into an executive briefing and updates high-priority directives.",
    status: "Idle",
    findingsCount: 0,
  },
];

interface AgentStore {
  config: AgentConfig;
  skills: AgentSkill[];
  directives: AgentDirective[];
  recentRuns: AgentRunLog[];
  isRunningLock: boolean;
}

const globalAgentStore = global as unknown as { __EVR_SEO_AGENT_STORE__?: AgentStore };

function getStore(): AgentStore {
  if (!globalAgentStore.__EVR_SEO_AGENT_STORE__) {
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setUTCHours(8, 0, 0, 0);

    globalAgentStore.__EVR_SEO_AGENT_STORE__ = {
      config: {
        autonomousActive: true,
        scheduleHourUtc: 8,
        nextScheduledRun: nextRun.toISOString(),
      },
      skills: [...SKILLS_CONFIG],
      directives: [],
      recentRuns: [],
      isRunningLock: false,
    };
  }
  return globalAgentStore.__EVR_SEO_AGENT_STORE__;
}

export async function getSeoAgentDashboardData(): Promise<SeoAgentDashboardData> {
  const store = getStore();

  // 1. Fetch real counts from Firestore
  let activeBacklinks = 0;
  let trackedKeywords = 0;
  try {
    const [backlinkSnap, keywordSnap, dirSnap, runSnap] = await Promise.all([
      adminDb.collection("backlinks").where("status", "==", "Active").get(),
      adminDb.collection("tracked_keywords").get(),
      adminDb.collection("seo_agent_directives").get(),
      adminDb.collection("seo_agent_runs").orderBy("timestamp", "desc").limit(20).get(),
    ]);

    activeBacklinks = backlinkSnap.size;
    trackedKeywords = keywordSnap.size;

    if (!dirSnap.empty && store.directives.length === 0) {
      store.directives = dirSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AgentDirective, "id">),
      }));
    }

    if (!runSnap.empty && store.recentRuns.length === 0) {
      store.recentRuns = runSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AgentRunLog, "id">),
      }));
    }
  } catch (err) {
    console.warn("Firestore fetch in getSeoAgentDashboardData:", err);
  }

  const totalRuns = store.recentRuns.length;
  const passedRuns = store.recentRuns.filter((r) => r.status === "Success").length;
  const healthScore = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;

  return {
    healthScore,
    config: store.config,
    skills: store.skills,
    directives: store.directives,
    recentRuns: store.recentRuns,
    stats: {
      activeBacklinks,
      trackedKeywords,
      page2Opportunities: 0,
      geoCoverageScore: 100,
    },
  };
}

export async function toggleAutonomousEngine(active?: boolean): Promise<AgentConfig> {
  const store = getStore();
  store.config.autonomousActive = active !== undefined ? active : !store.config.autonomousActive;
  return store.config;
}

export const toggleAutonomousAgent = toggleAutonomousEngine;

export async function runSkill(skillId: string): Promise<{ success: boolean; log: AgentRunLog; directives: AgentDirective[] }> {
  const store = getStore();

  if (store.isRunningLock) {
    throw new Error("Agent is currently executing a task. Please wait for the current run to finish.");
  }

  store.isRunningLock = true;
  let log: AgentRunLog;
  let newDirectives: AgentDirective[] = [];

  try {
    let result: { runLog: AgentRunLog; directives: AgentDirective[] };
    switch (skillId) {
      case "skill-monday":
        result = await runMondayKeywordsSkill();
        break;
      case "skill-tuesday":
        result = await runTuesdayCitationsSkill();
        break;
      case "skill-wednesday":
        result = await runWednesdayTechnicalSkill();
        break;
      case "skill-thursday":
        result = await runThursdayGeoAioSkill();
        break;
      case "skill-friday":
        result = await runFridayConversionsSkill();
        break;
      case "skill-saturday":
        result = await runSaturdayPostEnhancerSkill();
        break;
      case "skill-sunday":
        result = await runSundayDigestSkill();
        break;
      default:
        throw new Error(`Unknown skill ID: ${skillId}`);
    }

    log = result.runLog;
    newDirectives = result.directives;

    const skillIndex = store.skills.findIndex((s) => s.id === skillId);
    if (skillIndex !== -1) {
      store.skills[skillIndex] = {
        ...store.skills[skillIndex],
        lastRun: log.timestamp,
        status: log.status === "Success" ? "Passed" : "Action Needed",
        findingsCount: newDirectives.length,
      };
    }

    store.recentRuns = [log, ...store.recentRuns].slice(0, 50);

    for (const directive of newDirectives) {
      const exists = store.directives.some((d) => d.title === directive.title);
      if (!exists) {
        store.directives.unshift(directive);
        await adminDb.collection("seo_agent_directives").doc(directive.id).set(directive).catch(() => {});
      }
    }

    await adminDb.collection("seo_agent_runs").add(log).catch(() => {});

    if (newDirectives.some((d) => d.priority === "High")) {
      addNotification({
        type: "alert",
        priority: "high",
        category: "seo_agent",
        title: `SEO Finding: ${log.skillName}`,
        message: log.summary,
        actionHref: "/admin/seo-agent",
      });
    }

    return {
      success: true,
      log,
      directives: store.directives,
    };
  } finally {
    store.isRunningLock = false;
  }
}

export async function runAllSkills(): Promise<{ success: boolean; totalRuns: number; logs: AgentRunLog[] }> {
  const store = getStore();
  if (!store.config.autonomousActive) {
    throw new Error("Cannot run skills while autonomous engine is paused (Kill Switch active).");
  }

  const logs: AgentRunLog[] = [];
  for (const skill of store.skills) {
    const res = await runSkill(skill.id);
    logs.push(res.log);
  }

  return { success: true, totalRuns: logs.length, logs };
}

export function getTodaysSkillId(): string {
  const dayIndex = new Date().getDay();
  const dayMap = [
    "skill-sunday",
    "skill-monday",
    "skill-tuesday",
    "skill-wednesday",
    "skill-thursday",
    "skill-friday",
    "skill-saturday",
  ];
  return dayMap[dayIndex];
}

export const runAgentExecution = async (skillId?: string) => {
  const targetId = (skillId === "today" || skillId === "auto") ? getTodaysSkillId() : skillId;
  if (targetId) {
    const res = await runSkill(targetId);
    return { success: true, logs: [res.log], totalRuns: 1 };
  }
  return runAllSkills();
};

export async function resolveDirective(directiveId: string, status: "Open" | "Resolved" | "Dismissed" = "Resolved"): Promise<AgentDirective[]> {
  const store = getStore();
  const index = store.directives.findIndex((d) => d.id === directiveId);
  if (index !== -1) {
    store.directives[index].status = status;
    await adminDb.collection("seo_agent_directives").doc(directiveId).update({ status }).catch(() => {});
  }
  return store.directives;
}

export const updateDirectiveStatus = resolveDirective;
