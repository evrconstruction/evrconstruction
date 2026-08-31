---
applyTo: "**"
---

# EVR Construction — Design & Workflow Rules (MANDATORY)

These rules exist because work was started without the correct Figma reference data.
They are non-negotiable for this repo.

## 1. Figma is the single source of truth for ALL visual design

- NEVER invent colors, spacing, typography, section layouts, or copy from memory or
  "extracted tokens" alone. Tokens extracted via API are a starting point only — the
  rendered frame is the authority.
- Before implementing ANY section or page, render the exact Figma frame at high
  resolution (Figma API `/images` endpoint, scale ≥ 0.75) AND view the image. Then
  extract the node structure (layout, order, exact text) via `/files/nodes`.
- Implementation must match the Figma frame's section ORDER, layout pattern, and copy
  structure. EVR-specific text replaces lorem ipsum only — never re-order or drop
  sections on my own judgment.

## 2. Ask before acting when anything is unclear

- If the Figma data is ambiguous, missing, or conflicts with earlier work: STOP and ask.
- If a section seems to need adaptation (e.g. template says "Demolition" but EVR does
  decks): propose the adaptation IN WORDS first, get approval, then implement.
- Never treat a request as blanket approval to redesign other sections.

## 3. Approval gates

- Each page/section gets implemented → screenshotted in the browser → shown to the user
  for explicit approval BEFORE moving to the next item.
- One deliverable at a time. No batch-implementing multiple pages without approval of
  the first.

## 4. User screenshots

- The user's pasted screenshots DO NOT reach the model (arrive empty). The reliable
  channel is: user saves images into the `pics/` (or `design/`) folder — the model views
  them with the image tool. When the user says "I sent a screenshot", check the folder
  first.

## 5. Scope guardrails

- Only Home, About, Projects, Contact pages exist. No Services/Portfolio/Blog template
  pages (explicit user decision 2026-08-31).
- English-only content.
- Do not create new pages, routes, or components that were not requested.

## 6. Figma access

- Token lives in `.env.local` as FIGMA_TOKEN (gitignored). File key:
  0HXYUT1FcP815Hph1zSOrs. Key frames: Home=3:732, About=3:658, Contact=3:493,
  Blog=3:417, Services=3:911, Services section=3:751, FAQ=3:324, Main component=105:718.
- Workflow per section: render frame → view image → read node tree for exact text/layout
  → implement → screenshot → get approval.
