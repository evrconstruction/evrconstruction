"use client";

import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";
import { useRef } from "react";

/**
 * Mobile navigation built on native <details> so it works without JavaScript.
 * Links close the menu on tap so it doesn't overlay the page after navigating.
 */
export function MobileNav() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => detailsRef.current?.removeAttribute("open");

  return (
    <details ref={detailsRef} className="md:hidden relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-sm text-white hover:bg-white/10 [&::-webkit-details-marker]:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
        <span className="sr-only">Open menu</span>
      </summary>
      <nav aria-label="Mobile navigation" className="absolute right-0 top-12 w-56 rounded-sm border border-white/10 bg-charcoal-deep p-4 shadow-lg">
        <ul className="flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMenu}
                className="font-heading text-sm text-white/80 hover:text-amber-brand"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="border-t border-white/10 pt-3">
            <a href={SITE.phone.englishHref} onClick={closeMenu} className="font-heading text-sm font-semibold text-amber-brand">
              {SITE.phone.english}
            </a>
          </li>
          <li>
            <a href={SITE.phone.spanishHref} onClick={closeMenu} className="font-heading text-sm font-semibold text-amber-brand">
              {SITE.phone.spanish} (Español)
            </a>
          </li>
        </ul>
      </nav>
    </details>
  );
}
