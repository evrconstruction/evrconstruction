import { adminDb } from "@/lib/firebase-admin";
import type { AgentDirective } from "./types";

const DIRECTIVES_COLLECTION = "seo_agent_directives";

/**
 * Close a directive once the problem it reported is gone.
 *
 * Without this, only a human closing the card by hand clears it. A fixed
 * problem then stays Open forever, and because the orchestrator suppresses a new
 * directive only while an Open one with the same title exists, a recurrence is
 * never raised again — the real problem goes silent.
 *
 * A directive a person already Resolved or Dismissed is left alone: reopening it
 * here would override a deliberate decision.
 */
export async function resolveDirectiveIfOpen(
  directiveId: string
): Promise<boolean> {
  try {
    const ref = adminDb.collection(DIRECTIVES_COLLECTION).doc(directiveId);
    const snap = await ref.get();
    if (!snap.exists) return false;

    const existing = snap.data() as AgentDirective | undefined;
    if (existing?.status !== "Open") return false;

    await ref.update({
      status: "Resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: "auto",
    });
    return true;
  } catch (err) {
    console.warn(`Could not resolve directive ${directiveId}:`, err);
    return false;
  }
}

/**
 * Close every Open directive with this id prefix whose subject is not in
 * `stillFailing`.
 *
 * Used where a skill raises one directive per item it audits. The subject ids
 * present in a run are the ones still failing, so anything else carrying the
 * prefix describes something that has since been fixed or deleted.
 *
 * `@returns` the ids that were closed, for the run log.
 */
export async function closeStaleDirectives(
  idPrefix: string,
  stillFailing: Iterable<string>
): Promise<string[]> {
  const failing = new Set(stillFailing);

  try {
    const snap = await adminDb
      .collection(DIRECTIVES_COLLECTION)
      .where("status", "==", "Open")
      .get();

    const stale = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as AgentDirective }))
      .filter((entry) => entry.id.startsWith(idPrefix) && !failing.has(entry.id));

    const closed: string[] = [];
    for (const entry of stale) {
      const ok = await resolveDirectiveIfOpen(entry.id);
      if (ok) closed.push(entry.id);
    }
    return closed;
  } catch (err) {
    console.warn(`Could not sweep stale directives for prefix ${idPrefix}:`, err);
    return [];
  }
}

/**
 * How long an Open directive may sit before it is treated as stale.
 *
 * A finding nobody has acted on in a month is no longer news. Left Open it
 * keeps the dashboard count climbing and, because Open directives suppress
 * repeats, it also blocks a fresh report if the problem gets worse.
 */
export const STALE_DIRECTIVE_DAYS = 30;

/** Whether a directive has been Open longer than the stale threshold. */
export function isStale(
  directive: Pick<AgentDirective, "status" | "createdAt">,
  now: Date = new Date()
): boolean {
  if (directive.status !== "Open") return false;

  const created = new Date(directive.createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const ageMs = now.getTime() - created.getTime();
  return ageMs > STALE_DIRECTIVE_DAYS * 24 * 60 * 60 * 1000;
}
