import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { ClickableImage } from "@/components/site/Gallery";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore recent decks, gazebos, and carpentry projects by EVR Construction across Knoxville and East Tennessee.",
};

export default function ProjectsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-charcoal-deep text-white">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/projects-hero.avif"
            alt="EVR Construction house and deck project"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_75%]"
          />
          <div className="absolute inset-0 bg-charcoal-deep/80" />
        </div>
        <div className="mx-auto flex min-h-[460px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
              Our Work
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight sm:text-6xl">
              Our Construction Projects
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
              From custom decks and gazebos to restoration and detailed
              carpentry, every EVR project is built with purpose and pride.
            </p>
          </div>
        </div>
      </section>

      {/* Project grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-dark">
            Selected work
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold text-charcoal sm:text-4xl">
            Built for real life
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
            A look at the kind of work we do for homeowners throughout East
            Tennessee.
          </p>
        </div>
        <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <article
              key={service.slug}
              className="group overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
            >
              <ClickableImage
                item={{
                  src: service.image,
                  alt: service.title,
                  caption: service.summary,
                }}
                className="aspect-[16/10] bg-cloud"
                imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
                overlay={
                  <span className="absolute left-4 top-4 rounded-sm bg-charcoal-deep/85 px-3 py-1 font-heading text-xs font-semibold text-amber-brand">
                    {service.category}
                  </span>
                }
              />
              <div className="p-6">
                <h2 className="mt-1.5 font-heading text-lg font-bold text-charcoal group-hover:text-amber-dark">
                  {service.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{service.summary}</p>
                <Link
                  href={`/projects/${service.slug}`}
                  className="mt-5 inline-flex font-heading text-xs font-semibold uppercase tracking-wide text-charcoal underline decoration-amber-brand decoration-2 underline-offset-4 hover:text-amber-dark"
                >
                  View Similar Projects →
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 grid gap-8 rounded-sm bg-charcoal-deep p-8 text-white sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
              Your project could be next
            </p>
            <h2 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">
              Have a project in mind?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
              Tell us what you&apos;re dreaming up — we&apos;ll come out, take a
              look, and give you a free estimate.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
          >
            Get a Free Quote
          </Link>
        </div>
      </section>
    </div>
  );
}
