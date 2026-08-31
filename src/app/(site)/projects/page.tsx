import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Recent decks, gazebos, and carpentry projects by EVR Construction across Knoxville, Farragut, Hardin Valley, and East Tennessee.",
};

const PROJECTS = [
  {
    title: "Two-Story Redwood Deck in Farragut",
    category: "Decks",
    location: "Farragut, TN",
    image: "/images/project-1.jpg",
    summary:
      "A two-level redwood deck with recessed lighting and glass railings, connecting the living room straight to the garden.",
  },
  {
    title: "Backyard Gazebo in Hardin Valley",
    category: "Gazebos",
    location: "Hardin Valley, TN",
    image: "/images/project-2.jpg",
    summary:
      "An octagonal gazebo with wrap-around seating — a four-season gathering roof for the whole family.",
  },
];

export default function ProjectsPage() {
  return (
    <div>
      {/* Page hero */}
      <section className="bg-charcoal-deep py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
            Our Work
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl">
            Recent Projects
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
            A sample of recent decks, gazebos, and carpentry work across East
            Tennessee. Your project could be next.
          </p>
        </div>
      </section>

      {/* Project grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          {PROJECTS.map((p) => (
            <article
              key={p.title}
              className="group overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-sm bg-charcoal-deep/85 px-3 py-1 font-heading text-xs font-semibold text-amber-brand">
                  {p.category}
                </span>
              </div>
              <div className="p-6">
                <p className="text-xs text-muted">{p.location}</p>
                <h2 className="mt-1.5 font-heading text-lg font-bold text-charcoal group-hover:text-amber-dark">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{p.summary}</p>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col items-center rounded-sm bg-cloud p-10 text-center">
          <h2 className="font-heading text-2xl font-bold text-charcoal">
            Have a project in mind?
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            Tell us what you&apos;re dreaming up — we&apos;ll come out, take a
            look, and give you a free estimate.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
          >
            Start Your Project
          </Link>
        </div>
      </section>
    </div>
  );
}
