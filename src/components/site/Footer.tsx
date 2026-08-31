import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-charcoal-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Image
            src="/brand/logo.png"
            alt={`${SITE.name} logo`}
            width={320}
            height={213}
            className="h-28 w-auto"
          />
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            Specializing in decks, gazebos, railings, and all types of
            carpentry work. Licensed and insured, with free estimates.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-amber-brand">
            Explore
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 transition-colors hover:text-amber-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-amber-brand">
            Get in touch
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/70">
            <li>
              <a href={SITE.phone.englishHref} className="transition-colors hover:text-amber-brand">
                English: {SITE.phone.english}
              </a>
            </li>
            <li>
              <a href={SITE.phone.spanishHref} className="transition-colors hover:text-amber-brand">
                Español: {SITE.phone.spanish}
              </a>
            </li>
          </ul>
          <h2 className="mt-6 font-heading text-sm font-semibold uppercase tracking-wider text-amber-brand">
            Service areas
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            {SITE.serviceAreas.join(" · ")} and surrounding {SITE.region}.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </div>
    </footer>
  );
}
