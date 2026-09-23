import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";

const RATE_LIMITS_COLLECTION = "rate_limits";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller's window resets. Only set when `allowed` is false. */
  retryAfterSeconds?: number;
}

interface RateLimitDocument {
  count: number;
  resetTime: number;
}

/**
 * Pseudonymise a caller identifier so raw IP addresses are never persisted.
 *
 * This is privacy minimisation, not cryptographic protection: IPv4 space is
 * small enough to enumerate, so treat stored keys as pseudonymous rather than
 * anonymous.
 */
function hashIdentifier(identifier: string): string {
  const salt = process.env.RATE_LIMIT_SALT || "evr-construction-rate-limit";
  return createHash("sha256").update(`${salt}:${identifier}`).digest("hex").slice(0, 32);
}

/**
 * Atomically consume one request from a caller's budget.
 *
 * State is kept in Firestore rather than module memory because App Hosting runs
 * up to 10 Cloud Run instances. An in-process Map would give every instance its
 * own separate budget, silently multiplying the effective limit.
 *
 * @param identifier Stable per-caller key, typically a client IP address.
 * @param maxRequests Requests permitted per window.
 * @param windowMs Window length in milliseconds.
 */
export async function consumeRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const ref = adminDb.collection(RATE_LIMITS_COLLECTION).doc(hashIdentifier(identifier));
  const now = Date.now();

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data() as RateLimitDocument | undefined;
      const windowIsActive = data && now <= data.resetTime;

      if (!windowIsActive) {
        transaction.set(ref, { count: 1, resetTime: now + windowMs });
        return { allowed: true };
      }

      if (data.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((data.resetTime - now) / 1000)),
        };
      }

      transaction.update(ref, { count: data.count + 1 });
      return { allowed: true };
    });
  } catch (err) {
    // Fail open: a Firestore outage must not stop genuine customers reaching us.
    // The honeypot and server-side validation still apply.
    console.error("Rate limit check failed, allowing request:", err);
    return { allowed: true };
  }
}

/**
 * Attempt to claim an exclusive short-lived lock.
 *
 * Returns false when another instance already holds it, so concurrent callers
 * (cron plus an admin click) cannot run the same job twice.
 *
 * @param name Lock identifier.
 * @param ttlMs How long the claim stays valid if never released.
 */
export async function acquireLock(name: string, ttlMs: number): Promise<boolean> {
  const ref = adminDb.collection("locks").doc(name);
  const now = Date.now();

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const lockedUntil = snapshot.data()?.lockedUntil;

      if (typeof lockedUntil === "number" && lockedUntil > now) {
        return false;
      }

      transaction.set(ref, { lockedUntil: now + ttlMs, acquiredAt: now });
      return true;
    });
  } catch (err) {
    console.error(`Failed to acquire lock "${name}", treating as held:`, err);
    return false;
  }
}

/** Release a lock previously taken with {@link acquireLock}. */
export async function releaseLock(name: string): Promise<void> {
  try {
    await adminDb.collection("locks").doc(name).set({ lockedUntil: 0 }, { merge: true });
  } catch (err) {
    console.warn(`Failed to release lock "${name}":`, err);
  }
}
