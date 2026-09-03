import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS, SITE } from "@/lib/site";
import { MobileNav } from "@/components/site/MobileNav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal-deep/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/evr-clean-cropped.png"
            alt="EVR Construction LLC logo"
            width={512}
            height={250}
            className="h-16 w-auto"
            priority
            unoptimized
          />
          <span className="sr-only">{SITE.name}</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-heading text-base font-medium text-white/80 transition-colors hover:text-amber-brand"
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
