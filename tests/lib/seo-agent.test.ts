import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mockGetDoc,
        set: vi.fn().mockResolvedValue(undefined),
      })),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
      })),
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
        })),
      })),
      get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    })),
  },
}));

import { runSkill, runAllSkills, toggleAutonomousEngine } from "@/lib/seo-agent/orchestrator";

describe("SEO Agent Kill Switch & Orchestrator Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks runSkill when Kill Switch is active (autonomousActive is false)", async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({ autonomousActive: false }),
    });

    await expect(runSkill("skill-monday")).rejects.toThrow(
      "Cannot run skill while autonomous engine is paused (Kill Switch active)."
    );
  });

  it("blocks runAllSkills when Kill Switch is active", async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({ autonomousActive: false }),
    });

    // Ensure store is toggled to false
    await toggleAutonomousEngine(false);

    await expect(runAllSkills()).rejects.toThrow(
      "Cannot run skills while autonomous engine is paused (Kill Switch active)."
    );
  });

  it("throws error for unknown skill IDs when engine is active", async () => {
    mockGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({ autonomousActive: true }),
    });

    await toggleAutonomousEngine(true);

    await expect(runSkill("skill-nonexistent")).rejects.toThrow("Unknown skill ID: skill-nonexistent");
  });
});
