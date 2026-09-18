import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { SITE } from "@/lib/site";

export async function runThursdayGeoAioSkill(): Promise<SkillResult> {
  const start = Date.now();
  const directives: AgentDirective[] = [];
  const findings: string[] = [];

  const snapshot = await adminDb.collection("posts").get();
  const posts = snapshot.docs.map((d) => d.data());

  const serviceAreas = SITE.serviceAreas;
  const coverageMap = new Map<string, number>();

  for (const area of serviceAreas) {
    coverageMap.set(area, 0);
  }

  // Count localized mentions across captions and alt texts
  for (const post of posts) {
    const text = `${post.caption || ""} ${post.alt || ""}`.toLowerCase();
    for (const area of serviceAreas) {
      if (text.includes(area.toLowerCase())) {
        coverageMap.set(area, (coverageMap.get(area) || 0) + 1);
      }
    }
  }

  const coveredAreas: string[] = [];
  const missingAreas: string[] = [];

  coverageMap.forEach((count, area) => {
    if (count > 0) {
      coveredAreas.push(`${area} (${count})`);
    } else {
      missingAreas.push(area);
    }
  });

  const coveragePercent = Math.round((coveredAreas.length / serviceAreas.length) * 100);

  findings.push(`Regional Portfolio Coverage: ${coveragePercent}% of target East TN service areas have published project posts.`);
  if (coveredAreas.length > 0) {
    findings.push(`Active Coverage Areas: ${coveredAreas.join(", ")}.`);
  }

  if (missingAreas.length > 0) {
    findings.push(`Unrepresented Target Markets: ${missingAreas.slice(0, 5).join(", ")} have 0 published job photos.`);
    
    // Generate directive for the top missing markets
    const targetCity = missingAreas[0];
    directives.push({
      id: `dir-geo-${Date.now()}`,
      skillId: "skill-thursday",
      title: `Publish Project Work in ${targetCity}`,
      description: `${targetCity} is a primary target market in East Tennessee with 0 portfolio posts in Firestore. Tagging a project post in ${targetCity} strengthens AI and local search citation authority.`,
      impact: `Expands local search footprint to ${targetCity}, TN`,
      priority: "High",
      category: "AIO_GEO",
      actionLabel: "Create Post",
      actionHref: "/admin/posts",
      status: "Open",
      createdAt: new Date().toISOString(),
    });
  } else {
    findings.push("Complete Coverage: All 12 East Tennessee service municipalities have active portfolio representations.");
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-thu`,
    timestamp: new Date().toISOString(),
    skillId: "skill-thursday",
    skillName: "AIO & Local GEO Optimizer",
    status: "Success",
    durationMs: Date.now() - start,
    summary: `Analyzed ${posts.length} portfolio items across ${serviceAreas.length} East Tennessee service areas. Current regional post coverage: ${coveragePercent}%.`,
    findings,
  };

  return { runLog, directives };
}
