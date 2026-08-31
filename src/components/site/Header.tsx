import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal-deep/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/brand/logo.png"
            alt="EVR Construction LLC logo"
            width={200}
            height={133}
            className="h-16 w-auto"
            priority
          />
          <span className="sr-only">{SITE.name}</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-heading text-sm font-medium text-white/80 transition-colors hover:text-amber-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href={SITE.phone.englishHref}
          className="hidden md:inline-flex items-center gap-2 rounded-sm bg-amber-brand px-5 py-2.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
        >
          {SITE.phone.english}
        </a>

        <MobileNav />
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <details className="md:hidden relative">
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
              <Link href={link.href} className="font-heading text-sm text-white/80 hover:text-amber-brand">
                {link.label}
              </Link>
            </li>
          ))}
          <li className="border-t border-white/10 pt-3">
            <a href={SITE.phone.englishHref} className="font-heading text-sm font-semibold text-amber-brand">
              {SITE.phone.english}
            </a>
          </li>
          <li>
            <a href={SITE.phone.spanishHref} className="font-heading text-sm font-semibold text-amber-brand">
              {SITE.phone.spanish} (Español)
            </a>
          </li>
        </ul>
      </nav>
    </details>
  );
}
