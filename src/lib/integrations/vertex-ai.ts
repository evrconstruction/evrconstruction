import { getGoogleAccessToken } from "./google-auth";

/**
 * Google Cloud Vertex AI (Gemini) access.
 *
 * Billing goes to the Firebase project's Google Cloud credit through the
 * compute service account, so no API key is needed. Shared by the caption
 * suggester and keyword discovery so there is one place that knows how to talk
 * to the model and one honest failure shape for callers to handle.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "evrconstruction-5f7bd";

/**
 * Verified reachable on this project (a plain text prompt returns HTTP 200).
 * `gemini-2.0-flash` returns 404 here, so do not swap it in without testing.
 */
const MODEL = "gemini-3.7-flash";

const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/google/models/${MODEL}:generateContent`;

/** Default cap so a slow model cannot hold an admin request open indefinitely. */
const REQUEST_TIMEOUT_MS = 45_000;

export const VERTEX_MODEL_NAME = MODEL;

export type AiResult<T> =
  | { ok: true; data: T; source: string }
  | { ok: false; error: string };

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/**
 * Ask Gemini for JSON and return it parsed.
 *
 * Never throws and never returns partial data: callers must handle the failure
 * case explicitly. That matters because the alternative — quietly substituting
 * a non-AI result — is how a feature ends up labelled "AI" while doing no
 * reasoning at all.
 */
export async function generateJson<T>(
  parts: Part[],
  options: { temperature?: number; timeoutMs?: number } = {}
): Promise<AiResult<T>> {
  let token: string | null;
  try {
    token = await getGoogleAccessToken([
      "https://www.googleapis.com/auth/cloud-platform",
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { ok: false, error: `Could not obtain a Google access token: ${message}` };
  }

  if (!token) {
    return {
      ok: false,
      error:
        "No Google Cloud credentials available to this runtime, so Vertex AI cannot be called.",
    };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          ...(options.temperature !== undefined
            ? { temperature: options.temperature }
            : {}),
        },
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.warn(`Vertex AI returned HTTP ${response.status}:`, detail.slice(0, 500));
      return {
        ok: false,
        error: `Vertex AI returned HTTP ${response.status} for model ${MODEL}.`,
      };
    }

    const payload = await response.json();
    const text: string | undefined =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      const finishReason = payload?.candidates?.[0]?.finishReason;
      return {
        ok: false,
        error: `Vertex AI returned no text${finishReason ? ` (finishReason: ${finishReason})` : ""}.`,
      };
    }

    try {
      return { ok: true, data: JSON.parse(text) as T, source: `vertex:${MODEL}` };
    } catch {
      console.warn("Vertex AI returned unparseable JSON:", text.slice(0, 300));
      return { ok: false, error: "Vertex AI returned a response that was not valid JSON." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? `Vertex AI did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`
        : `Vertex AI request failed: ${message}`,
    };
  }
}
