import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase-admin
const mockAddLead = vi.fn().mockResolvedValue({ id: "lead-test-123" });
const mockAddMail = vi.fn().mockResolvedValue({ id: "mail-test-123" });
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn((colName: string) => ({
      add: colName === "leads" ? mockAddLead : mockAddMail,
    })),
  },
}));

// Mock notifications
const mockAddNotification = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/notifications", () => ({
  addNotification: (...args: unknown[]) => mockAddNotification(...args),
}));

import { POST } from "@/app/api/contact/route";

describe("Contact API Route (/api/contact)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns HTTP 400 when required fields are missing", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.50",
      },
      body: JSON.stringify({
        firstName: "John",
        // missing lastName, city, email, message
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required contact fields");
    expect(mockAddLead).not.toHaveBeenCalled();
  });

  it("traps bots via honeypot without writing to database or queueing emails", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.51",
      },
      body: JSON.stringify({
        firstName: "Spam",
        lastName: "Bot",
        city: "Knoxville",
        email: "bot@spammer.com",
        message: "Buy cheap backlinks now",
        company_website: "http://spamwebsite.com", // Honeypot populated
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAddLead).not.toHaveBeenCalled();
    expect(mockAddNotification).not.toHaveBeenCalled();
  });

  it("processes valid submission and queues single email and notification", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.52",
      },
      body: JSON.stringify({
        firstName: "Henry",
        lastName: "Smith",
        city: "Maryville",
        phone: "865-555-0199",
        email: "henry.smith@example.com",
        message: "Interested in a custom cedar deck estimate.",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAddLead).toHaveBeenCalledTimes(1);
    expect(mockAddNotification).toHaveBeenCalledTimes(1);
    // Verify duplicate email is prevented (triggerEmail: false in notification)
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerEmail: false,
      })
    );
  });

  it("enforces rate limiting on repeated requests from the same IP", async () => {
    const testIp = "192.168.1.99";

    // Submit 5 valid requests
    for (let i = 0; i < 5; i++) {
      const req = new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({
          firstName: `User${i}`,
          lastName: "Tester",
          city: "Knoxville",
          email: `user${i}@example.com`,
          message: "Deck inquiry test",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 6th request from same IP must return HTTP 429
    const rateLimitedReq = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": testIp,
      },
      body: JSON.stringify({
        firstName: "User6",
        lastName: "Tester",
        city: "Knoxville",
        email: "user6@example.com",
        message: "This should be rate limited",
      }),
    });

    const rateLimitedRes = await POST(rateLimitedReq);
    const data = await rateLimitedRes.json();

    expect(rateLimitedRes.status).toBe(429);
    expect(data.error).toContain("Too many inquiries");
  });
});
