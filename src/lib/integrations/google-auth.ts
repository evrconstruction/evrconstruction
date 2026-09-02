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

/**
 * Mint a scoped Google OAuth access token for GA4 or Search Console
 */
export async function getGoogleAccessToken(scopes: string[]): Promise<string | null> {
  const creds = getCredentials();
  if (!creds) return null;

  try {
    const client = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes,
    });

    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token || null;
  } catch (err) {
    console.warn("Google token exchange error:", err);
    return null;
  }
}
