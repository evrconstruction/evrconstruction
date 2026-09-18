import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
const mockGetCookie = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockGetCookie,
  })),
}));

// Mock firebase-admin
const mockVerifySessionCookie = vi.fn();
const mockVerifyIdToken = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

import { verifyAdminSession } from "@/lib/auth-guard";

describe("verifyAdminSession Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 'Not authenticated' if session cookie is missing", async () => {
    mockGetCookie.mockReturnValue(undefined);

    await expect(verifyAdminSession()).rejects.toThrow("Not authenticated");
  });

  it("throws 'Unauthorized' if email does not match admin email", async () => {
    mockGetCookie.mockReturnValue({ value: "valid-cookie-token" });
    mockVerifySessionCookie.mockResolvedValue({
      email: "intruder@malicious.com",
      email_verified: true,
      uid: "user-123",
    });

    await expect(verifyAdminSession()).rejects.toThrow("Unauthorized");
  });

  it("throws 'Unauthorized' if email matches but email_verified is false", async () => {
    mockGetCookie.mockReturnValue({ value: "valid-cookie-token" });
    mockVerifySessionCookie.mockResolvedValue({
      email: "contact@evrconstructions.com",
      email_verified: false,
      uid: "user-123",
    });

    await expect(verifyAdminSession()).rejects.toThrow("Unauthorized");
  });

  it("succeeds when email matches contact@evrconstructions.com and email_verified is true", async () => {
    mockGetCookie.mockReturnValue({ value: "valid-cookie-token" });
    mockVerifySessionCookie.mockResolvedValue({
      email: "contact@evrconstructions.com",
      email_verified: true,
      uid: "admin-uid-1",
    });

    const session = await verifyAdminSession();
    expect(session).toEqual({
      email: "contact@evrconstructions.com",
      uid: "admin-uid-1",
    });
  });

  it("falls back to verifyIdToken if verifySessionCookie fails and validates successfully", async () => {
    mockGetCookie.mockReturnValue({ value: "id-token-fallback" });
    mockVerifySessionCookie.mockRejectedValue(new Error("Invalid session cookie"));
    mockVerifyIdToken.mockResolvedValue({
      email: "contact@evrconstructions.com",
      email_verified: true,
      uid: "admin-uid-1",
    });

    const session = await verifyAdminSession();
    expect(session).toEqual({
      email: "contact@evrconstructions.com",
      uid: "admin-uid-1",
    });
  });
});
