/**
 * Describes the SEO agent's run history for display.
 *
 * The score is the share of recent runs that finished **without reporting a
 * problem**. The Tuesday and Wednesday skills record `"Error"` when they
 * complete *and find something*, so this is a cleanliness rate for the agent's
 * own runs — not an SEO ranking score, and not a measure of how the site is
 * performing. A week of clean runs can sit on unchanged rankings.
 *
 * Kept in one place because both admin surfaces render the same metric; two
 * copies of the thresholds would drift the same way the labels already did.
 */
export interface RunHealth {
  /** Short factual description of what the score means right now. */
  label: string;
  /** Tailwind text colour for the label. */
  text: string;
  /** Tailwind background and text pair for the icon chip. */
  chip: string;
}

export function describeRunHealth(score: number | null): RunHealth {
  if (score === null) {
    return {
      label: "No run history yet",
      text: "text-slate-500",
      chip: "bg-slate-100 text-slate-500",
    };
  }

  if (score >= 90) {
    return {
      label: "Runs finishing cleanly",
      text: "text-emerald-600",
      chip: "bg-emerald-50 text-emerald-600",
    };
  }

  if (score >= 70) {
    return {
      label: "Some runs reported an issue",
      text: "text-amber-600",
      chip: "bg-amber-50 text-amber-600",
    };
  }

  return {
    label: "Several runs reported issues",
    text: "text-rose-600",
    chip: "bg-rose-50 text-rose-600",
  };
}
