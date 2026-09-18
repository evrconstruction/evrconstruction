import { JWT } from "google-auth-library";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function getCredentials(): ServiceAccountCredentials | null {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!envKey) return null;
  try {
    const parsed = JSON.parse(envKey);
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        project_id: parsed.project_id,
      };
    }
  } catch (err) {
    console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY for Google Auth:", err);
  }
  return null;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Mint a scoped Google OAuth access token for GA4 or Search Console,
 * with in-memory caching to avoid redundant round-trips.
 */
export async function getGoogleAccessToken(scopes: string[]): Promise<string | null> {
  const cacheKey = scopes.slice().sort().join(" ");
  const cached = tokenCache.get(cacheKey);

  // Return cached token if it has at least 5 minutes of validity remaining
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const creds = getCredentials();
  if (!creds) return null;

  try {
    const client = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes,
    });

    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token || null;

    if (token) {
      // Tokens are typically valid for 3600 seconds (1 hour); cache for 55 minutes
      tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + 55 * 60 * 1000,
      });
    }

    return token;
  } catch (err) {
    console.warn("Google token exchange error:", err);
    return null;
  }
}
