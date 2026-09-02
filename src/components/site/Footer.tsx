import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, SITE } from "@/lib/site";
import { SERVICES } from "@/lib/services";

export function Footer() {
  return (
    <footer className="bg-charcoal-deep text-white">
      <div className="mx-auto grid max-w-7xl justify-items-center gap-10 px-4 py-14 text-center sm:px-6 md:grid-cols-4 md:justify-items-start md:text-left lg:px-8">
        <div>
          <Image
            src="/brand/logo.png"
            alt={`${SITE.name} logo`}
            width={512}
            height={332}
            className="mx-auto h-32 w-auto md:mx-0"
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
          <ul className="mt-4 flex flex-col items-center gap-2.5 md:items-start">
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
            <li>
              <Link
                href="/admin/login"
                className="text-sm text-white/70 transition-colors hover:text-amber-brand"
              >
                Admin
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Project types">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-amber-brand">
            Projects
          </h2>
          <ul className="mt-4 flex flex-col items-center gap-2.5 md:items-start">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/projects/${service.slug}`}
                  className="text-sm text-white/70 transition-colors hover:text-amber-brand"
                >
                  {service.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-amber-brand">
            Get in touch
          </h2>
          <ul className="mt-4 flex flex-col items-center gap-2.5 md:items-start">
            <li className="flex items-center gap-2.5">
              <MapPinIcon />
              <span className="italic">Serving Knoxville, TN and East Tennessee</span>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon />
              <a href={SITE.phone.englishHref} className="transition-colors hover:text-amber-brand">
                English: {SITE.phone.english}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon />
              <a href={SITE.phone.spanishHref} className="transition-colors hover:text-amber-brand">
                Español: {SITE.phone.spanish}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MailIcon />
              <a
                href="mailto:contact@evrconstructions.com"
                className="transition-colors hover:text-amber-brand"
              >
                contact@evrconstructions.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </div>
    </footer>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-none text-amber-brand"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const MapPinIcon = () => (
  <Icon path="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
);
const PhoneIcon = () => (
  <Icon path="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
);
const MailIcon = () => (
  <Icon path="M3 5h18v14H3V5zm0 1l9 7 9-7" />
);
