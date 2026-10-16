import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { SKILL_NAMES } from "../skill-names";
export { generatePostGeoEnhancements, type GeoTagSuggestion } from "@/lib/geo-enhancements";

export async function runSaturdayPostEnhancerSkill(): Promise<SkillResult> {
  const start = Date.now();

  // Published only, matching the filter the public gallery uses. Counting drafts
  // made the findings claim things about "published posts" that were not true: a
  // saved draft could decide the percentage in either direction.
  const snapshot = await adminDb.collection("posts").where("published", "==", true).get();

  const findings: string[] = [];
  const directives: AgentDirective[] = [];
  let completeAltCount = 0;
  let missingAltCount = 0;

  snapshot.docs.forEach((doc) => {
    const d = doc.data();
    const alt = (d.alt || "").trim();
    const caption = (d.caption || "").trim();

    if (alt && alt.length > 10) {
      completeAltCount++;
    } else {
      missingAltCount++;
      directives.push({
        id: `dir-post-alt-${doc.id}`,
        skillId: "skill-saturday",
        title: `Enhance Image Alt Text for Post: ${d.category}`,
        description: `Project post '${caption.substring(0, 50)}...' is missing descriptive East Tennessee localized alt text. Updating this helps Google Images and Local Search indexing.`,
        impact: "Improves Google Image & Local SEO visibility",
        priority: "Medium",
        category: "Posts",
        actionLabel: "Edit in Posts Manager",
        actionHref: "/admin/posts",
        status: "Open",
        createdAt: new Date().toISOString(),
      });
    }
  });

  findings.push(`Total published project posts: ${snapshot.docs.length} audited in Firestore.`);
  findings.push(`Alt-Text & Descriptions: ${completeAltCount} posts have complete descriptive metadata.`);
  if (missingAltCount > 0) {
    findings.push(`Optimization Opportunities: ${missingAltCount} posts can be upgraded with local East TN city tags.`);
  } else {
    findings.push("100% of published posts have descriptive alt-text configured.");
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-sat`,
    timestamp: new Date().toISOString(),
    skillId: "skill-saturday",
    skillName: SKILL_NAMES["skill-saturday"],
    status: "Success",
    durationMs: Date.now() - start,
    summary: `Audited all ${snapshot.docs.length} published portfolio posts in Firestore. ${completeAltCount} have descriptive alt text.`,
    findings,
  };

  return { runLog, directives };
}
