import { NextResponse } from "next/server";
import { generatePostGeoEnhancements } from "@/lib/seo-agent/skills/saturday-post-enhancer";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { imageBase64, currentCategory } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data is required for visual analysis" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Clean base64 string
    const base64Data = imageBase64.includes("base64,")
      ? imageBase64.split("base64,")[1]
      : imageBase64;

    const mimeType = imageBase64.includes("data:")
      ? imageBase64.substring(imageBase64.indexOf(":") + 1, imageBase64.indexOf(";"))
      : "image/jpeg";

    if (apiKey) {
      try {
        const prompt = `You are the lead SEO & GEO copywriter for EVR Construction LLC (a licensed general contractor in Knoxville, East Tennessee serving Farragut, Maryville, Hardin Valley, Oak Ridge, Sevierville, Powell).

Analyze this construction project photo:
1. Identify the specific construction work visible (e.g. composite decking, cedar gazebo, framing, screened porch, patio, railing).
2. Note the materials, colors, and craftsmanship shown in the photo.
3. Generate a concise, compelling 1-2 sentence caption describing the actual job in the photo, naturally incorporating local East TN intent.
4. Select the best category from: ["Decks", "Gazebos", "Restoration", "Remodeling", "Carpentry", "Patios"].

Output valid JSON ONLY in this format:
{
  "caption": "Your descriptive caption here",
  "category": "Decks",
  "altText": "SEO alt text describing photo"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return NextResponse.json({
              success: true,
              source: "gemini-vision",
              caption: parsed.caption,
              category: parsed.category,
              altText: parsed.altText,
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini vision call fallback to heuristic enhancer:", geminiErr);
      }
    }

    // Heuristic fallback if offline or API key limit
    const fallbackCategory = currentCategory || "Decks";
    const enhanced = generatePostGeoEnhancements(fallbackCategory, `${fallbackCategory} job in Knoxville`);

    return NextResponse.json({
      success: true,
      source: "seo-heuristics",
      caption: `Custom ${fallbackCategory.toLowerCase()} project completed with precision craftsmanship by EVR Construction LLC in Knoxville, TN.`,
      category: fallbackCategory,
      altText: enhanced.altText,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze photo" },
      { status: 500 }
    );
  }
}
