import { cookies, headers } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

const ALLOWED_ADMIN_EMAIL = "contact@evrconstructions.com";

/**
 * Verify the current request has a valid admin session cookie or Bearer token.
 * Call at the top of every admin API route handler.
 *
 * @returns Decoded session claims including the admin email.
 * @throws Error if unauthenticated or unauthorized.
 */
export async function verifyAdminSession(): Promise<{ email: string; uid: string }> {
  let token: string | undefined;

  // Check Authorization header first (direct Firebase Auth token)
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // Fall back to __session cookie
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("__session")?.value;
  }

  if (!token) {
    throw new Error("Not authenticated — please sign in");
  }

  let decoded;
  try {
    decoded = await adminAuth.verifySessionCookie(token);
  } catch {
    decoded = await adminAuth.verifyIdToken(token);
  }
  const email = (decoded.email ?? "").toLowerCase();

  if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase() || !decoded.email_verified) {
    throw new Error("Unauthorized — access restricted to verified administrator");
  }

  return { email, uid: decoded.uid };
}
