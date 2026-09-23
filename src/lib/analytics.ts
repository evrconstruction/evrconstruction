/**
 * Google Analytics 4 event helpers.
 *
 * gtag.js is loaded in `src/app/layout.tsx` with `afterInteractive`, so it may
 * not exist yet when a user interacts immediately after load. Every helper here
 * no-ops instead of throwing, and never sends personally identifiable data.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Measurement ID configured in `src/app/layout.tsx`. */
export const GA_MEASUREMENT_ID = "G-19DRNQBM8T";

/**
 * Send a GA4 event. Safe during SSR and before gtag.js has loaded.
 *
 * @param name GA4 event name, e.g. `generate_lead`.
 * @param params Event parameters. Do not include names, emails or phone numbers.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", name, params);
}
