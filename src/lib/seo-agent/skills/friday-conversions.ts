import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { fetchGA4Analytics, fetchGA4EventCounts } from "@/lib/integrations/google-analytics";

/** Conversion events fired by the site, read from GA4. */
const CONVERSION_EVENTS = ["generate_lead", "click_to_call"];

export async function runFridayConversionsSkill(): Promise<SkillResult> {
  const start = Date.now();

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activitySnap = await adminDb
    .collection("activity_logs")
    .where("timestamp", ">=", thirtyDaysAgo)
    .get();
  const formSubmits = activitySnap.docs.filter((d) => d.data().event === "form_submit").length;

  let visitors = "0";
  let ga4Connected = false;
  try {
    const gaData = await fetchGA4Analytics(30);
    if (gaData.connected) {
      ga4Connected = true;
      visitors = gaData.metrics?.visitors || "0";
    }
  } catch (err) {
    console.warn("GA4 fetch inside Friday skill:", err);
  }

  // Call and lead events are recorded by the browser in GA4 only — the
  // click-to-call handler has no server component — so GA4 is the only source.
  // An earlier version counted `event: "click"` rows in activity_logs, which
  // nothing ever writes, so it reported 0 clicks regardless of reality.
  let conversions: Record<string, number> = {};
  let eventsConnected = false;
  try {
    const eventResult = await fetchGA4EventCounts(CONVERSION_EVENTS, 30);
    eventsConnected = eventResult.connected;
    conversions = eventResult.counts;
  } catch (err) {
    console.warn("GA4 event fetch inside Friday skill:", err);
  }

  const findings: string[] = [];
  findings.push(`Lead Inquiries: ${formSubmits} consultation submissions recorded.`);

  if (eventsConnected) {
    findings.push(
      `Tracked Conversions (GA4, 30 days): ${conversions.generate_lead ?? 0} form submissions and ` +
        `${conversions.click_to_call ?? 0} phone-number taps.`
    );
  } else {
    findings.push(
      "Conversion events could not be read from Google Analytics, so call and form event counts are unavailable for this run."
    );
  }

  if (ga4Connected) {
    findings.push(`GA4 Active Users: ${visitors} verified users over 30 days.`);
  } else {
    findings.push("Google Analytics 4 could not be reached for traffic figures.");
  }

  const directives: AgentDirective[] = [];

  if (formSubmits > 0 && eventsConnected && (conversions.click_to_call ?? 0) === 0) {
    directives.push({
      id: "dir-conv-call-tracking",
      skillId: "skill-friday",
      title: "No phone-number taps recorded alongside live form submissions",
      description:
        `${formSubmits} form submissions arrived in 30 days, but GA4 recorded no click_to_call events. ` +
        `Either visitors are not tapping the phone number on mobile, or the tel: link is not reachable from ` +
        `where the number is displayed. Worth checking the mobile layout on /contact.`,
      impact: "Recovers a conversion path that may be undiscoverable",
      priority: "Medium",
      category: "Conversions",
      actionLabel: "View Analytics",
      actionHref: "/admin/analytics",
      status: "Open",
      createdAt: new Date().toISOString(),
    });
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-fri`,
    timestamp: new Date().toISOString(),
    skillId: "skill-friday",
    skillName: "Conversion & Traffic Synthesizer",
    status: "Success",
    durationMs: Date.now() - start,
    summary:
      `${formSubmits} lead inquiries in 30 days` +
      (eventsConnected
        ? `, with ${conversions.click_to_call ?? 0} phone taps and ${conversions.generate_lead ?? 0} tracked form events in GA4.`
        : ". GA4 conversion events were unavailable for this run."),
    findings,
  };

  return { runLog, directives };
}
