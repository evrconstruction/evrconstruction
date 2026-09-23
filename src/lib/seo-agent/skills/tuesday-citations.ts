import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";

const CITATION_DIRECTIVE_PREFIX = "dir-cit-lost-";

export async function runTuesdayCitationsSkill(): Promise<SkillResult> {
  const start = Date.now();
  const snapshot = await adminDb.collection("backlinks").get();

  const findings: string[] = [];
  const directives: AgentDirective[] = [];
  let activeCount = 0;
  let missingCount = 0;
  let unverifiedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const sourceUrl = data.sourceUrl;
    if (!sourceUrl) continue;

    const title = data.title || sourceUrl;
    const verification = await verifyBacklinkUrl(sourceUrl);

    await doc.ref.update({
      status: verification.status,
      type: verification.type,
      lastVerified: verification.lastVerified,
    });

    if (verification.status === "Active") {
      activeCount++;
      findings.push(`${title}: Verified active (${verification.type}).`);
      await resolveCitationDirective(doc.id);
      continue;
    }

    // Only a 404/410 means the listing is gone. Anything else means the page
    // could not be read, which is not evidence that the link is broken.
    if (verification.status === "Missing") {
      missingCount++;
      findings.push(`${title}: Listing is gone (HTTP ${verification.httpStatus}).`);
      directives.push({
        id: `${CITATION_DIRECTIVE_PREFIX}${doc.id}`,
        skillId: "skill-tuesday",
        title: `Fix Broken Citation: ${title}`,
        description: `The directory listing at ${sourceUrl} returns HTTP ${verification.httpStatus} and no longer links to https://evrconstructions.com. Claim or rebuild the listing.`,
        impact: "Restores local citation trust signal",
        priority: "High",
        category: "Citations",
        actionLabel: "View Backlinks",
        actionHref: "/admin/backlinks",
        status: "Open",
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    unverifiedCount++;
    const reason =
      verification.status === "Blocked"
        ? `the directory refused the check (HTTP ${verification.httpStatus})`
        : `the request failed (HTTP ${verification.httpStatus})`;
    findings.push(`${title}: Could not be checked — ${reason}. Listing status unknown.`);
  }

  if (snapshot.docs.length === 0) {
    findings.push(
      "No tracked citations found in database. Add directory profiles (BBB, Yelp, Nextdoor) to enable live monitoring."
    );
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-tue`,
    timestamp: new Date().toISOString(),
    skillId: "skill-tuesday",
    skillName: "Citation & Backlink Verifier",
    status: missingCount === 0 ? "Success" : "Error",
    durationMs: Date.now() - start,
    summary: `Verified ${snapshot.docs.length} monitored citation profiles: ${activeCount} active, ${missingCount} missing, ${unverifiedCount} could not be checked.`,
    findings,
  };

  return { runLog, directives };
}

/**
 * Close a "Fix Broken Citation" directive once the listing verifies active again.
 *
 * The directive id is derived from the backlink document id, so it is addressed
 * directly rather than by title. Without this a directive raised while a listing
 * was down stays Open forever and the dashboard keeps reporting a fixed problem.
 */
async function resolveCitationDirective(backlinkId: string): Promise<void> {
  const ref = adminDb
    .collection("seo_agent_directives")
    .doc(`${CITATION_DIRECTIVE_PREFIX}${backlinkId}`);

  try {
    const snap = await ref.get();
    const existing = snap.data() as AgentDirective | undefined;
    if (snap.exists && existing?.status === "Open") {
      await ref.update({ status: "Resolved" });
    }
  } catch (err) {
    console.warn(`Could not resolve citation directive for ${backlinkId}:`, err);
  }
}
