import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "EVR Construction LLC is a licensed and insured contractor in Knoxville, TN specializing in decks, gazebos, railings, and all types of carpentry.",
};

const VALUES = [
  {
    title: "Listen first",
    description:
      "Every project starts with your ideas, your budget, and your timeline — not our catalog.",
  },
  {
    title: "Build it right",
    description:
      "Code-compliant framing, quality materials, and details that hold up to East Tennessee weather.",
  },
  {
    title: "Leave it clean",
    description:
      "We treat your yard like our own. Nails picked up, sawdust swept, and the site ready to enjoy.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Page hero */}
      <section className="bg-charcoal-deep py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
            About Us
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">
            We&apos;ve Been Building For Over 20 Years
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
            Family-run carpentry contractor serving Knoxville and East
            Tennessee — one deck, one gazebo, one satisfied homeowner at a time.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
          <Image
            src="/images/about.jpg"
            alt="EVR Construction craftsmanship"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
            Our Story
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-snug text-charcoal">
            Craftsman&apos;s hands, contractor&apos;s standards.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted">
            EVR Construction LLC serves Knoxville and the surrounding
            communities, specializing in decks, gazebos, railings, and all
            types of carpentry. We listen first, then build — with transparent
            quotes, honest timelines, and a clean site when we leave.
          </p>
          <p className="mt-4 text-base leading-7 text-muted">
            As a licensed and insured Tennessee contractor, we back every
            project with free estimates, clear communication in English or
            Spanish, and workmanship we&apos;re proud to sign.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
          >
            Meet Us On Site — Free Estimate
          </Link>
        </div>
      </section>

      {/* Values */}
      <section className="bg-cloud py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-3xl font-bold text-charcoal">
            How We Work
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <article
                key={v.title}
                className="rounded-sm border border-gray-100 bg-white p-7 shadow-sm"
              >
                <span className="font-heading text-4xl font-bold text-amber-brand">
                  0{i + 1}
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold text-charcoal">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {v.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
