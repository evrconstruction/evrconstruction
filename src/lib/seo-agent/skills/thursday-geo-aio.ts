import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { adminDb } from "@/lib/firebase-admin";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/lib/services";
import { generateJson, VERTEX_MODEL_NAME } from "@/lib/integrations/vertex-ai";
import type { AiResult } from "@/lib/integrations/vertex-ai";
import { fetchSearchConsoleKeywords } from "@/lib/integrations/google-search-console";
import { summarizeCityDemand } from "../keyword-opportunities";
import type { CityDemand } from "../keyword-opportunities";
import { SKILL_NAMES } from "../skill-names";
import { closeStaleDirectives, resolveDirectiveIfOpen } from "../directive-lifecycle";

const SKILL_ID = "skill-thursday";
const SKILL_NAME = SKILL_NAMES[SKILL_ID];

/** Collection holding one reusable posting brief per city. */
export const CONTENT_BRIEFS_COLLECTION = "content_briefs";

/**
 * Drafts generated per run. Each is a separate model call, so the cap keeps a
 * weekly run bounded; cities without a brief yet are picked up on later runs
 * until every one has a draft.
 */
const MAX_DRAFTS_PER_RUN = 4;

interface PostingBrief {
  captionBrief: string;
  captionTemplate: string;
  photoIdeas: string[];
  whyItHelps: string;
}

interface CityCoverage {
  city: string;
  postCount: number;
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

/**
 * Local project coverage, plus a reusable posting brief for each city that has
 * none.
 *
 * Coverage counts a city only when a *published* post names it, matching the
 * filter the public gallery uses. An earlier version counted every row in the
 * collection, so a saved draft that was not visible on the site still counted
 * as coverage.
 *
 * The city names themselves are already on the homepage service-area list and
 * in the site's `areaServed` structured data, so a city is never "missing from
 * the site" — what it can be missing is published project work. Findings and
 * directives are worded to say only that.
 */
export async function runThursdayGeoAioSkill(): Promise<SkillResult> {
  const start = Date.now();
  const directives: AgentDirective[] = [];
  const findings: string[] = [];

  const snapshot = await adminDb.collection("posts").where("published", "==", true).get();
  const posts = snapshot.docs.map((d) => d.data());

  const coverage: CityCoverage[] = SITE.serviceAreas.map((city) => ({
    city,
    postCount: countPostsNaming(posts, city),
  }));

  const covered = coverage.filter((entry) => entry.postCount > 0);
  const uncovered = coverage.filter((entry) => entry.postCount === 0);
  const coveragePercent = Math.round((covered.length / coverage.length) * 100);

  // Demand decides which gaps are worth reporting. A city nobody searches for
  // cannot be helped by publishing a post there, and recommending it is advice
  // that can never be completed — which is how eleven unclosable "publish work
  // in <city>" directives accumulated.
  let demand = new Map<string, CityDemand>();
  let demandReadable = false;
  try {
    const keywordReport = await fetchSearchConsoleKeywords();
    demand = summarizeCityDemand(keywordReport.keywords);
    demandReadable = true;
  } catch (err) {
    console.warn("Thursday skill could not read search demand:", err);
  }

  const demandFor = (city: string) => demand.get(city);
  const wanted = uncovered
    .filter((entry) => (demandFor(entry.city)?.impressions ?? 0) > 0)
    .sort(
      (a, b) =>
        (demandFor(b.city)?.impressions ?? 0) -
        (demandFor(a.city)?.impressions ?? 0)
    );
  const noDemand = uncovered.filter((entry) => !demandFor(entry.city));

  findings.push(
    `Project post coverage: ${covered.length} of ${coverage.length} advertised service areas have a published post naming them (${coveragePercent}%).`
  );

  if (covered.length > 0) {
    findings.push(
      `Cities with published work: ${covered.map((e) => `${e.city} (${e.postCount})`).join(", ")}.`
    );
  }

  if (uncovered.length > 0) {
    findings.push(
      `${uncovered.length} advertised service area${uncovered.length === 1 ? "" : "s"} have no published project post: ${uncovered.map((e) => e.city).join(", ")}. These cities are already named on the homepage and in the site's structured data — what is absent is project work showing EVR building there.`
    );

    if (!demandReadable) {
      findings.push(
        "Search demand could not be read, so the cities below are listed without it and no priority was assigned."
      );
    } else if (noDemand.length > 0) {
      // Deliberately not a directive. There is no search demand to serve, so
      // there is nothing to act on, and a post written for a city nobody looks
      // for would earn nothing.
      findings.push(
        `No search demand found for ${noDemand.map((e) => e.city).join(", ")} — Google reported no queries naming these cities in the last 28 days, so no action is proposed for them. This is a market observation, not a to-do item.`
      );
    }
  } else {
    findings.push(
      `Complete coverage: every advertised service area has at least one published post naming it.`
    );
  }

  if (wanted.length > 0) {
    findings.push(
      `Cities with real search demand and no published work, most searched first: ${wanted
        .map(
          (e) =>
            `${e.city} (${demandFor(e.city)?.impressions} impressions, best position #${demandFor(e.city)?.bestPosition || "—"})`
        )
        .join(", ")}.`
    );
  }

  const existingBriefs = await loadPostingBriefs();
  // Briefs are only drafted for cities with demand, since a brief for a city
  // nobody searches for would cost a model call and never be used.
  const awaitingDraft = wanted.filter((entry) => !existingBriefs.has(citySlug(entry.city)));
  const toDraft = awaitingDraft.slice(0, MAX_DRAFTS_PER_RUN);

  const generated = await generateBriefs(toDraft.map((entry) => entry.city));

  if (toDraft.length > 0) {
    const succeeded = toDraft.map((e) => e.city).filter((city) => generated.ok.has(city));
    const failed = toDraft.map((e) => e.city).filter((city) => !generated.ok.has(city));

    if (succeeded.length > 0) {
      findings.push(
        `Posting brief${succeeded.length === 1 ? "" : "s"} drafted for ${succeeded.join(", ")} — kept in Firestore for reuse when the matching photo is posted.`
      );
    }
    if (failed.length > 0) {
      findings.push(
        `No brief could be drafted for ${failed.join(", ")}: ${generated.error ?? "the model call did not succeed"}. The coverage gap above still stands.`
      );
    }
  }

  if (awaitingDraft.length > toDraft.length) {
    findings.push(
      `${awaitingDraft.length - toDraft.length} more cit${awaitingDraft.length - toDraft.length === 1 ? "y" : "ies"} still need a brief; up to ${MAX_DRAFTS_PER_RUN} are drafted per run.`
    );
  }

  // One directive per city that people actually search for, ordered by how
  // often they search it. Cities with no demand are reported as a finding but
  // deliberately left off the action list.
  for (const entry of wanted) {
    const slug = citySlug(entry.city);
    const brief = generated.ok.get(entry.city) ?? existingBriefs.get(slug);
    const cityDemand = demandFor(entry.city);
    const impressions = cityDemand?.impressions ?? 0;
    const bestPosition = cityDemand?.bestPosition ?? 0;

    directives.push({
      id: `dir-geo-missing-city-${slug}`,
      skillId: SKILL_ID,
      title: `Publish project work in ${entry.city}`,
      description:
        `${impressions} impressions in the last 28 days came from searches naming ${entry.city}` +
        (bestPosition > 0
          ? `, with a best position of #${bestPosition}`
          : "") +
        `, and no published project post names the city yet. ` +
        describeGap(entry.city, brief),
      impact: `Adds published project work for ${entry.city}, TN, where ${impressions} impressions are already being served`,
      // Ranked by how much demand is actually waiting, so the top of the list
      // is where effort pays first rather than an arbitrary city order.
      priority: impressions >= 10 ? "High" : "Medium",
      category: "AIO_GEO",
      actionLabel: "Create Post",
      actionHref: "/admin/posts",
      status: "Open",
      createdAt: new Date().toISOString(),
    });
  }

  // A city that gained a post, or fell out of demand, must not leave its
  // directive Open: left behind it blocks a fresh report if the gap returns.
  const closedCities = await closeStaleDirectives(
    "dir-geo-missing-city-",
    directives.map((d) => d.id)
  );
  if (closedCities.length > 0) {
    findings.push(
      `Closed ${closedCities.length} earlier city finding${closedCities.length === 1 ? "" : "s"} that ${closedCities.length === 1 ? "is" : "are"} no longer open.`
    );
  }
  for (const entry of covered) {
    await resolveDirectiveIfOpen(`dir-geo-missing-city-${citySlug(entry.city)}`);
  }

  const briefedCount = wanted.filter((entry) => existingBriefs.has(citySlug(entry.city))).length;
  const draftedCount = generated.ok.size;

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-thu`,
    timestamp: new Date().toISOString(),
    skillId: SKILL_ID,
    skillName: SKILL_NAME,
    status: wanted.length === 0 ? "Success" : "Warning",
    durationMs: Date.now() - start,
    summary:
      `Reviewed ${posts.length} published posts against ${coverage.length} advertised service areas: ${coveragePercent}% have published work naming them. ` +
      `${wanted.length} uncovered cit${wanted.length === 1 ? "y" : "ies"} ${wanted.length === 1 ? "has" : "have"} search demand` +
      (noDemand.length > 0 ? `, and ${noDemand.length} have none and were not raised as actions` : "") +
      `. ${draftedCount} brief${draftedCount === 1 ? "" : "s"} drafted this run, ${briefedCount} already on file.`,
    findings,
  };

  return { runLog, directives };
}

/** True when a city's name appears in a post's caption or alt text. */
function countPostsNaming(posts: Record<string, unknown>[], city: string): number {
  const needle = city.toLowerCase();
  return posts.filter((post) => {
    const text = `${post.caption ?? ""} ${post.alt ?? ""}`.toLowerCase();
    return text.includes(needle);
  }).length;
}

/** Read every stored posting brief, keyed by city slug. */
async function loadPostingBriefs(): Promise<Map<string, PostingBrief>> {
  const briefs = new Map<string, PostingBrief>();

  try {
    const snapshot = await adminDb.collection(CONTENT_BRIEFS_COLLECTION).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (typeof data.captionBrief !== "string" || !data.captionBrief) continue;

      briefs.set(doc.id, {
        captionBrief: data.captionBrief,
        captionTemplate: typeof data.captionTemplate === "string" ? data.captionTemplate : "",
        photoIdeas: Array.isArray(data.photoIdeas) ? data.photoIdeas.filter(isNonEmptyString) : [],
        whyItHelps: typeof data.whyItHelps === "string" ? data.whyItHelps : "",
      });
    }
  } catch (err) {
    console.warn("Could not read content briefs from Firestore:", err);
  }

  return briefs;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Draft briefs for the given cities, in parallel, and persist the ones that
 * succeed. A model failure is reported rather than papered over, and no brief
 * is written for a city whose call failed.
 */
async function generateBriefs(
  cities: string[]
): Promise<{ ok: Map<string, PostingBrief>; error?: string }> {
  const ok = new Map<string, PostingBrief>();
  if (cities.length === 0) return { ok };

  const results = await Promise.allSettled(cities.map((city) => draftBrief(city)));
  let firstError: string | undefined;

  for (let index = 0; index < results.length; index++) {
    const city = cities[index];
    const result = results[index];

    if (result.status !== "fulfilled") {
      firstError ??= result.reason instanceof Error ? result.reason.message : "unknown error";
      continue;
    }
    if (!result.value.ok) {
      firstError ??= result.value.error;
      continue;
    }

    const brief = result.value.data;
    if (!isNonEmptyString(brief.captionBrief) || !isNonEmptyString(brief.captionTemplate)) {
      firstError ??= "the model returned an incomplete brief";
      continue;
    }

    ok.set(city, brief);

    try {
      await adminDb
        .collection(CONTENT_BRIEFS_COLLECTION)
        .doc(citySlug(city))
        .set({
          city,
          captionBrief: brief.captionBrief,
          captionTemplate: brief.captionTemplate,
          photoIdeas: brief.photoIdeas,
          whyItHelps: brief.whyItHelps,
          generatedAt: new Date().toISOString(),
          model: VERTEX_MODEL_NAME,
        });
    } catch (err) {
      console.warn(`Could not persist posting brief for ${city}:`, err);
    }
  }

  return { ok, error: firstError };
}

/**
 * Ask the model for one posting brief.
 *
 * The prompt forbids asserting completed work in the city. The brief is written
 * before any matching photo exists, so presenting it as a finished project
 * would be a fabricated claim; the placeholders are dropped only when the post
 * is created against a real photo.
 */
async function draftBrief(city: string): Promise<AiResult<PostingBrief>> {
  const prompt = `You write posting briefs for EVR Construction LLC, a licensed deck and outdoor-living contractor in Knoxville, East Tennessee.

SERVICE AREAS: ${SITE.serviceAreas.join(", ")}
SERVICES OFFERED: ${SERVICES.map((service) => service.category).join(", ")}

Write a posting brief for a future project photo taken in ${city}, TN.

RULES, all strict:
- The brief is a reusable starting point for a caption to be written later, beside a real photo. Never state or imply that EVR has already built, quoted, scheduled, or finished any work in ${city}.
- Name only the cities listed above and "East Tennessee". Do not name counties, neighborhoods, or neighbouring towns — those are not verified for this business, and a wrong one would be published as fact.
- Never invent customer names, street names, prices, dates, project counts, or awards.
- Leave real job specifics as square-bracket placeholders, for example [deck size] or [material], so the person posting fills them in from the actual job.
- Use American English. No markdown, and no bullet characters inside any string value.

Return JSON only:
{
  "captionBrief": "2-3 sentences telling the caption writer exactly what to include in a ${city} post",
  "captionTemplate": "one example caption, written as a reusable template naming ${city}",
  "photoIdeas": ["a photo worth capturing for this city", "another", "another"],
  "whyItHelps": "one sentence on why publishing a ${city} project post is worth doing"
}`;

  return generateJson<PostingBrief>([{ text: prompt }], { temperature: 0.7 });
}

/** Human-readable directive body: the coverage fact, then the draft if one exists. */
function describeGap(city: string, brief: PostingBrief | undefined): string {
  const opening = `No published project post names ${city}. The city is already listed on the homepage and in the site's areaServed structured data, so what is missing is work shown from there rather than the city being absent from the site.`;

  if (!brief) {
    return `${opening} A posting brief has not been drafted for this city yet; the next automated run will attempt one.`;
  }

  const ideas = brief.photoIdeas.map((idea) => `- ${idea}`).join("\n");

  return [
    opening,
    "",
    `BRIEF: ${brief.captionBrief}`,
    "",
    `CAPTION STARTING POINT: ${brief.captionTemplate}`,
    "",
    "PHOTOS THAT WOULD FIT:",
    ideas,
    "",
    `WHY IT HELPS: ${brief.whyItHelps}`,
    "",
    "Fill the bracketed placeholders from the real job before publishing.",
  ].join("\n");
}
