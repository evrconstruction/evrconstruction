import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { SKILL_NAMES } from "../skill-names";
import {
  closeStaleDirectives,
  resolveDirectiveIfOpen,
} from "../directive-lifecycle";
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

  // A directive per post, so the ids still failing are collected and everything
  // else under the same prefix is closed: a post that was given alt text, or
  // deleted, must not leave an Open finding behind.
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const alt = (d.alt || "").trim();
    const caption = (d.caption || "").trim();
    const directiveId = `dir-post-alt-${doc.id}`;

    if (alt && alt.length > 10) {
      completeAltCount++;
      await resolveDirectiveIfOpen(directiveId);
      continue;
    }

    missingAltCount++;
    directives.push({
      id: directiveId,
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

  const closed = await closeStaleDirectives(
    "dir-post-alt-",
    directives.map((d) => d.id)
  );
  if (closed.length > 0) {
    findings.push(
      `Closed ${closed.length} earlier alt-text finding${closed.length === 1 ? "" : "s"} that ${closed.length === 1 ? "is" : "are"} now resolved.`
    );
  }

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
    // A post missing alt text is a finding about the posts, not a failure of
    // this run. "Error" made a successful audit read as a broken agent.
    status: missingAltCount === 0 ? "Success" : "Warning",
    durationMs: Date.now() - start,
    summary: `Audited all ${snapshot.docs.length} published portfolio posts in Firestore. ${completeAltCount} have descriptive alt text.`,
    findings,
  };

  return { runLog, directives };
}
