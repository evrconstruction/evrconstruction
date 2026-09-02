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
    title: "Eco-friendly construction",
    description:
      "We choose durable materials and thoughtful building practices that respect your home and the land around it.",
  },
  {
    title: "Quality craftsmanship",
    description:
      "Skilled hands and proven techniques help us deliver precise work, dependable schedules, and a better finish.",
  },
  {
    title: "High-quality management",
    description:
      "Clear communication keeps your project organized from the first estimate through the final walkthrough.",
  },
];

const PRINCIPLES = [
  {
    title: "Our Mission",
    description:
      "To build dependable, beautiful spaces that make everyday life better for the families we serve.",
  },
  {
    title: "Our Vision",
    description:
      "To be East Tennessee’s trusted construction partner, known for honest work, lasting quality, and thoughtful craftsmanship.",
  },
  {
    title: "Our Values",
    description:
      "We lead with integrity, communicate clearly, respect every home, and take pride in doing the job right.",
  },
];

const STATS = [
  { value: "10+", label: "Years of experience" },
  { value: "100+", label: "Completed projects" },
  { value: "100%", label: "Licensed & insured" },
  { value: "2", label: "Languages supported" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-charcoal-deep text-white">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/about-deck.jpg"
            alt="EVR Construction raised deck project"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-charcoal-deep/80" />
        </div>
        <div className="mx-auto flex min-h-[500px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
              About Us
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight sm:text-6xl">
              About Our Construction Company
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
              Family-run carpentry contractor serving Knoxville and East
              Tennessee with thoughtful design, dependable workmanship, and a
              clean finish on every project.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
            >
              Get a Free Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-dark">
            Our Story
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-charcoal sm:text-4xl">
            Craftsman&apos;s hands, contractor&apos;s standards.
          </h2>
          <div className="mt-7 grid gap-5 text-left text-base leading-7 text-muted md:grid-cols-2 md:gap-10">
            <p>
              EVR Construction LLC serves Knoxville and the surrounding
              communities, specializing in decks, gazebos, railings, and all
              types of carpentry. We listen first, then build — with
              transparent quotes, honest timelines, and a clean site when we
              leave.
            </p>
            <p>
              As a licensed and insured Tennessee contractor, we back every
              project with free estimates, clear communication in English or
              Spanish, and workmanship we&apos;re proud to sign.
            </p>
          </div>
        </div>
      </section>

      {/* Mission, vision, and values */}
      <section className="border-t border-gray-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-dark">
              What guides us
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-charcoal sm:text-4xl">
              Built on more than craftsmanship.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((principle, index) => (
              <article
                key={principle.title}
                className="border-t-4 border-amber-brand bg-cloud p-7"
              >
                <span className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-amber-dark">
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-heading text-xl font-bold text-charcoal">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Values and stats */}
      <section className="bg-cloud py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:px-8">
          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-dark">
              Only the best
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-charcoal sm:text-4xl">
              Built around the way you live.
            </h2>
            <div className="mt-8 flex flex-col gap-6">
              {VALUES.map((value, index) => (
                <article key={value.title} className="flex gap-4">
                  <span className="font-heading text-2xl font-bold text-amber-dark">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-base font-bold text-charcoal">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted">
                      {value.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center rounded-sm bg-charcoal px-7 py-3.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-charcoal-deep"
            >
              Meet Us On Site — Free Estimate
            </Link>
          </div>

          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
              <Image
                src="/images/about-building.jpg"
                alt="Framed house under construction by EVR Construction"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-top"
              />
            </div>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4">
              {STATS.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`p-4 text-center ${index % 2 === 0 ? "bg-amber-brand" : "bg-charcoal"} ${index > 1 ? "mt-2 sm:mt-0" : ""}`}
                >
                  <p className={`font-heading text-2xl font-bold ${index % 2 === 0 ? "text-charcoal" : "text-white"}`}>
                    {stat.value}
                  </p>
                  <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${index % 2 === 0 ? "text-charcoal" : "text-white/75"}`}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <blockquote className="font-heading text-2xl font-medium leading-relaxed text-charcoal sm:text-3xl">
          “Every project starts with listening. We build spaces that feel like
          they belong at home from the very first day.”
        </blockquote>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
          EVR Construction LLC
        </p>
      </section>
    </div>
  );
}
