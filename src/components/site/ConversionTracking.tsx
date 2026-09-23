"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Records phone-number taps as a `click_to_call` conversion.
 *
 * Uses a single delegated document listener rather than adding `onClick` to each
 * call button, so every `tel:` link — including ones added later — is measured
 * without touching any markup or visual styling.
 */
export function ConversionTracking() {
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const phoneLink = target.closest<HTMLAnchorElement>('a[href^="tel:"]');
      if (!phoneLink) {
        return;
      }

      trackEvent("click_to_call", {
        phone_number: phoneLink.getAttribute("href")?.replace("tel:", "") ?? "",
        link_text: phoneLink.textContent?.trim() ?? "",
        page_location: window.location.pathname,
      });
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  return null;
}
