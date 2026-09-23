import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminSession } from "@/lib/auth-guard";
import { generateJson } from "@/lib/integrations/vertex-ai";
import { SITE } from "@/lib/site";
import { CONTENT_BRIEFS_COLLECTION } from "@/lib/seo-agent/skills/thursday-geo-aio";

const CATEGORIES = ["Decks", "Gazebos", "Restoration", "Remodeling", "Carpentry", "Patios"] as const;

interface CaptionSuggestion {
  caption: string;
  category: string;
  altText: string;
}

interface PostingBrief {
  captionBrief: string;
  captionTemplate: string;
}

/**
 * Suggest a caption for a project photo, using Vertex AI (Gemini) through the
 * shared `generateJson` helper — the same path the keyword and brief features
 * use, so there is one place that talks to the model.
 *
 * A photo cannot reveal where the job was, so the model is never asked to guess
 * a city. The city comes from the caller, and a caption names a place only when
 * one was supplied.
 *
 * When a posting brief exists for that city, it is handed to the model as the
 * starting point so the caption follows the researched angle. Without a brief
 * the model writes from the photo alone.
 */
export async function POST(req: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { imageBase64, currentCategory, city } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data is required for visual analysis" },
        { status: 400 }
      );
    }

    const base64Data = imageBase64.includes("base64,")
      ? imageBase64.split("base64,")[1]
      : imageBase64;

    const mimeType = imageBase64.includes("data:")
      ? imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"))
      : "image/jpeg";

    const brief = typeof city === "string" && city ? await loadBrief(city) : null;

    const result = await generateJson<CaptionSuggestion>(
      [
        { text: buildPrompt({ city, currentCategory, brief }) },
        { inlineData: { mimeType, data: base64Data } },
      ],
      { temperature: 0.4 }
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const { caption, category, altText } = result.data;

    if (
      typeof caption !== "string" ||
      !caption.trim() ||
      typeof altText !== "string" ||
      !altText.trim()
    ) {
      return NextResponse.json(
        { error: "The model returned an incomplete caption." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      source: result.source,
      caption: caption.trim(),
      category: CATEGORIES.includes(category as (typeof CATEGORIES)[number])
        ? category
        : currentCategory || "Decks",
      altText: altText.trim(),
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json({ error: "Failed to analyze photo" }, { status: 500 });
  }
}

/** Read the stored posting brief for a city, keyed by the same slug Thursday writes. */
async function loadBrief(city: string): Promise<PostingBrief | null> {
  const docId = city.toLowerCase().replace(/[^a-z0-9]/g, "-");

  try {
    const doc = await adminDb.collection(CONTENT_BRIEFS_COLLECTION).doc(docId).get();
    if (!doc.exists) return null;

    const data = doc.data() ?? {};
    if (typeof data.captionBrief !== "string" || !data.captionBrief) return null;

    return {
      captionBrief: data.captionBrief,
      captionTemplate: typeof data.captionTemplate === "string" ? data.captionTemplate : "",
    };
  } catch (err) {
    console.warn(`Could not read the posting brief for ${city}:`, err);
    return null;
  }
}

function buildPrompt({
  city,
  currentCategory,
  brief,
}: {
  city?: string;
  currentCategory?: string;
  brief: PostingBrief | null;
}): string {
  const locationRule = city
    ? `- Name the city "${city}, TN" exactly once, spelled exactly that way.`
    : "- Do NOT name any city, town, county or neighbourhood. The poster did not say where this job was, so naming a place would be a guess.";

  const lines: string[] = [
    "You are writing a photo caption for EVR Construction LLC, a licensed deck and outdoor-living contractor in Knoxville, East Tennessee.",
    "",
    `SERVICE AREAS: ${SITE.serviceAreas.join(", ")}`,
    `SERVICES OFFERED: ${CATEGORIES.join(", ")}`,
    "",
    "Look at the photo and describe the actual work visible in it: the structure, the materials, and the finish.",
  ];

  if (brief) {
    lines.push(
      "",
      `A POSTING BRIEF is on file for ${city}. Follow its angle, and use its example caption as the shape of yours:`,
      `BRIEF: ${brief.captionBrief}`
    );
    if (brief.captionTemplate) {
      lines.push(`EXAMPLE CAPTION: ${brief.captionTemplate}`);
    }
    lines.push(
      "Fill a bracketed placeholder only where the photo actually shows it. Drop any placeholder you cannot determine from the photo rather than inventing a value."
    );
  }

  lines.push(
    "",
    "RULES, all strict:",
    locationRule,
    "- Describe only what is visible in the photo. Never invent measurements, materials, prices, dates, customer names, or project counts the photo does not show.",
    "- Use American English. No markdown, no emoji, no hashtags.",
    "",
    "Return JSON only:",
    "{",
    '  "caption": "1-2 sentence caption for the photo",',
    `  "category": one of ${JSON.stringify(CATEGORIES)},`,
    '  "altText": "concise alt text describing the photo for screen readers and image search"',
    "}"
  );

  if (currentCategory) {
    lines.push(
      "",
      `The poster pre-selected the category "${currentCategory}". Keep it only if it matches what the photo shows; otherwise return the accurate one.`
    );
  }

  return lines.join("\n");
}
