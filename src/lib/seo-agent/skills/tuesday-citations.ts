import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";

export async function runTuesdayCitationsSkill(): Promise<SkillResult> {
  const start = Date.now();
  const snapshot = await adminDb.collection("backlinks").get();

  const findings: string[] = [];
  const directives: AgentDirective[] = [];
  let activeCount = 0;
  let lostCount = 0;

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const sourceUrl = d.sourceUrl;
    const title = d.title || sourceUrl;

    if (sourceUrl) {
      const verification = await verifyBacklinkUrl(sourceUrl);
      await doc.ref.update({
        status: verification.status,
        type: verification.type,
        lastVerified: verification.lastVerified,
      });

      if (verification.status === "Active") {
        activeCount++;
        findings.push(`${title}: Verified Active (${verification.type}).`);
      } else {
        lostCount++;
        findings.push(`${title}: Unreachable or link missing.`);
        directives.push({
          id: `dir-cit-lost-${doc.id}`,
          skillId: "skill-tuesday",
          title: `Fix Broken Citation: ${title}`,
          description: `Directory listing at ${sourceUrl} could not be verified or is returning an error. Review your listing and ensure it links to https://evrconstructions.com.`,
          impact: "Restores local citation trust signal",
          priority: "High",
          category: "Citations",
          actionLabel: "View Backlinks",
          actionHref: "/admin/backlinks",
          status: "Open",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  if (findings.length === 0) {
    findings.push("No tracked citations found in database. Add directory profiles (BBB, Yelp, Nextdoor) to enable live monitoring.");
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-tue`,
    timestamp: new Date().toISOString(),
    skillId: "skill-tuesday",
    skillName: "Citation & Backlink Verifier",
    status: lostCount === 0 ? "Success" : "Error",
    durationMs: Date.now() - start,
    summary: `Verified ${snapshot.docs.length} monitored citation profiles. ${activeCount} active, ${lostCount} issues detected.`,
    findings,
  };

  return { runLog, directives };
}
