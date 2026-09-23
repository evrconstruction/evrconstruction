import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth-guard";
import { adminDb } from "@/lib/firebase-admin";
import { generateJson, VERTEX_MODEL_NAME } from "@/lib/integrations/vertex-ai";
import { fetchSearchConsoleKeywords } from "@/lib/integrations/google-search-console";
import { SERVICES } from "@/lib/services";
import { SERVICE_AREA_TAGS } from "@/lib/site";

/** How many suggestions to keep once the model has answered. */
const MAX_SUGGESTIONS = 8;

/** Categories must match the Posts Manager list. */
const CATEGORIES: string[] = SERVICES.map((service) => service.category);

interface AiKeywordPayload {
  keyword?: unknown;
  category?: unknown;
  location?: unknown;
  rationale?: unknown;
}

interface KeywordSuggestion {
  keyword: string;
  category: string;
  location: string;
  rationale: string;
}

/**
 * The prompt is grounded in what the site actually ranks for, because a model
 * asked to brainstorm local keywords in isolation produces exactly the generic
 * template output this endpoint previously returned without any model at all.
 *
 * It is explicitly forbidden from inventing search volumes: it has no data for
 * them, and a made-up number is worse than no number.
 */
function buildPrompt(reportedQueries: string, trackedKeywords: string[]): string {
  return `You are an SEO analyst for EVR Construction LLC, a licensed general contractor in Knoxville, Tennessee.

SERVICES OFFERED: ${CATEGORIES.join(", ")}

SERVICE AREAS (the only places the business advertises): ${SERVICE_AREA_TAGS.join(", ")}

QUERIES THE SITE ALREADY APPEARS FOR IN GOOGLE (28 days, exact text people typed):
${reportedQueries}

KEYWORDS ALREADY BEING TRACKED (do not repeat any of these):
${trackedKeywords.join(", ")}

TASK
Propose up to ${MAX_SUGGESTIONS} keyword phrases this business should target next. Rank them by how winnable and how valuable they are.

REQUIREMENTS
- Only propose phrases a real homeowner would plausibly type. Do not invent hyper-specific phrases that stack an adjective, a service and a small neighbourhood.
- Prefer realistic search terms over long qualified ones. Good: "gazebo builder knoxville". Bad: "cedar gazebo builder farragut".
- Place names must come from the SERVICE AREAS list above.
- Do not repeat anything in the tracked list, and do not propose our own brand name.
- Base your choices only on the information above. You have NO search-volume data, so never state or estimate a numeric volume, and never invent statistics.
- The rationale is one sentence explaining the opportunity.

OUTPUT valid JSON only, no prose, in exactly this shape:
{
  "suggestions": [
    {
      "keyword": "gazebo builder knoxville",
      "category": "Gazebos",
      "location": "Knoxville, TN",
      "rationale": "One sentence on why this is worth targeting."
    }
  ]
}`;
}

/** Coerce the model's JSON into the shape the dashboard consumes. */
function normalize(raw: unknown): KeywordSuggestion[] {
  const maybe = raw as { suggestions?: unknown };
  const list = Array.isArray(maybe?.suggestions) ? (maybe.suggestions as AiKeywordPayload[]) : [];

  const results: KeywordSuggestion[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;

    const keyword = typeof item.keyword === "string" ? item.keyword.trim() : "";
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const category =
      typeof item.category === "string" && CATEGORIES.includes(item.category)
        ? item.category
        : CATEGORIES[0];

    results.push({
      keyword,
      category,
      location:
        typeof item.location === "string" ? item.location : SERVICE_AREA_TAGS[0],
      rationale: typeof item.rationale === "string" ? item.rationale.trim() : "",
    });

    if (results.length >= MAX_SUGGESTIONS) break;
  }

  return results;
}

export async function POST() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gather real context first. Without Search Console the model would be
  // guessing, which is the behaviour being replaced, so refuse instead.
  let reportedQueries: string;
  let reportedCount = 0;
  try {
    const gsc = await fetchSearchConsoleKeywords();
    const queries = gsc.keywords
      .filter((item) => item.position > 0)
      .map(
        (item) =>
          `${item.matchedQuery ?? item.keyword} (#${item.position}, ${item.impressions} impressions)`
      );
    reportedCount = queries.length;
    reportedQueries = queries.length > 0 ? queries.join("\n") : "None reported yet.";
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Keyword discovery could not read Search Console:", err);
    return NextResponse.json(
      {
        error:
          "Search Console could not be read, so there is no real ranking data to reason from. " +
          `This would be guesswork rather than analysis. (${message})`,
      },
      { status: 503 }
    );
  }

  const storedKeywords = await adminDb
    .collection("tracked_keywords")
    .get()
    .then((snap) => snap.docs.map((d) => String(d.data().keyword || "")).filter(Boolean))
    .catch((err) => {
      console.warn("Could not read tracked_keywords for de-duplication:", err);
      return [] as string[];
    });

  const trackedList = [...new Set(storedKeywords)];

  const result = await generateJson<unknown>(
    [{ text: buildPrompt(reportedQueries, trackedList) }],
    { temperature: 0.6 }
  );

  if (!result.ok) {
    // No template fallback. Presenting canned phrases as AI output is exactly
    // the problem this endpoint is being fixed for.
    console.error("Keyword discovery AI call failed:", result.error);
    return NextResponse.json(
      { error: `AI keyword discovery is unavailable right now. ${result.error}` },
      { status: 503 }
    );
  }

  const suggestions = normalize(result.data);
  if (suggestions.length === 0) {
    return NextResponse.json(
      { error: "The model returned no usable suggestions. Try again." },
      { status: 502 }
    );
  }

  // Drop anything already tracked so every suggestion is actionable.
  const trackedSet = new Set(trackedList.map((keyword) => keyword.toLowerCase()));
  const actionable = suggestions.filter(
    (suggestion) => !trackedSet.has(suggestion.keyword.toLowerCase())
  );

  return NextResponse.json({
    suggestions: actionable,
    model: VERTEX_MODEL_NAME,
    source: result.source,
    consideredQueries: reportedCount,
  });
}
