import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

const ALLOWED_ADMIN_EMAIL = "contact@evrconstructions.com";

/**
 * Verify the current request has a valid admin session cookie.
 * Call at the top of every admin API route handler.
 *
 * @returns Decoded session claims including the admin email.
 * @throws Error if unauthenticated or unauthorized.
 */
export async function verifyAdminSession(): Promise<{ email: string; uid: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    throw new Error("Not authenticated");
  }

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const email = (decoded.email ?? "").toLowerCase();

  if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Unauthorized");
  }

  return { email, uid: decoded.uid };
}
