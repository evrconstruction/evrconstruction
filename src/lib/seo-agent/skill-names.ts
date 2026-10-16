/**
 * Canonical display name for each agent skill.
 *
 * Both the dashboard config (`orchestrator.ts`) and each skill's own run log read
 * from here. They previously held separate copies, and three of the seven drifted
 * — so a run-history entry named a skill differently from the card reporting it,
 * and a fix applied to one name never reached the other.
 */

import type { AgentSkill } from "./types";

export const SKILL_NAMES = {
  "skill-monday": "Keywords & Ranking Tracker",
  "skill-tuesday": "Citation & Backlink Verifier",
  "skill-wednesday": "Technical & On-Page Auditor",
  "skill-thursday": "Local Coverage & Content Drafts",
  "skill-friday": "Conversion & Traffic Synthesizer",
  "skill-saturday": "Project Post Geo-Enhancer",
  "skill-sunday": "Weekly Digest & Action Synthesizer",
} as const satisfies Record<AgentSkill["id"], string>;

export type SkillId = keyof typeof SKILL_NAMES;
