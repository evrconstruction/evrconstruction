import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { ServicesSection } from "@/components/site/ServicesSection";
import { NoJobTooBigSection } from "@/components/site/NoJobTooBigSection";

const REVIEWS = [
  {
    name: "Miny Alexander",
    text: "From measurement to completion in just one week — the deck turned out better than we imagined. The crew cleaned up every day and the details are flawless.",
  },
  {
    name: "Chris D.",
    text: "Transparent quote, no surprise charges mid-project. The railing craftsmanship is rock solid — neighbors keep asking who built it.",
  },
  {
    name: "Sandra M.",
    text: "The gazebo has become the gathering spot for the whole family. The team was on time, professional, and communicated clearly throughout.",
  },
];

const FAQS = [
  {
    q: "How do I schedule a service?",
    a: "Call us or send a message through the contact form. We reply within one business day and schedule a free on-site assessment and estimate.",
  },
  {
    q: "Are your contractors experienced and insured?",
    a: "Yes. EVR Construction is fully licensed and insured, and every crew member has years of experience in carpentry and structural work.",
  },
  {
    q: "What are your rates for services?",
    a: "Every project is quoted individually based on size and materials. On-site assessments and estimates are completely free, and the price never changes after you approve it.",
  },
  {
    q: "What types of services do you offer?",
    a: "Decks, gazebos, railings, and all types of carpentry work — from design through construction, handled end to end.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function HomePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero — text left, portrait image filling the full right side edge-to-edge */}
      <section className="relative overflow-hidden bg-white lg:min-h-[680px]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-12 pb-12 sm:px-6 sm:pb-8 lg:grid-cols-[1fr_1fr] lg:gap-4 lg:px-8 lg:pb-0">
          {/* Text column */}
          <div className="relative z-10 max-w-xl lg:pt-[110px]">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-dark">
              Licensed &amp; Insured · Free Estimates
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-charcoal sm:text-5xl">
              Decks, Gazebos &amp; Carpentry,{" "}
              <span className="text-amber-dark">Built to Last.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-muted">
              High-quality decks, gazebos, railings, and all types of
              carpentry. Craftsmanship and attention to detail —
              that&apos;s what has kept EVR trusted across East Tennessee for
              years.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
              >
                Book a Free Consultation
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center rounded-sm border-2 border-charcoal px-7 py-3 font-heading text-sm font-semibold text-charcoal transition-colors hover:border-amber-brand hover:text-amber-dark"
              >
                View Projects
              </Link>
            </div>
          </div>
        </div>

        {/* Full-bleed image: absolute right half, top-to-bottom of the section (desktop) */}
        <div className="relative h-[420px] sm:h-[520px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-1/2">
          <Image
            src="/images/hero.jpg"
            alt="Custom wooden deck built by EVR Construction"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-top"
          />
          {/* White fade: top edge blends into the white section above (mobile only) */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent lg:hidden" />
          {/* White fade: left edge blends into page background (desktop only) */}
          <div className="absolute inset-y-0 left-0 hidden w-1/4 bg-gradient-to-r from-white via-white/60 to-transparent lg:block" />
          {/* White fade: bottom edge blends into next section (mobile only) */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent lg:hidden" />
        </div>
      </section>

      {/* Services */}
      <ServicesSection />

      {/* No job too big or too small */}
      <NoJobTooBigSection />

      {/* Reviews */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
          Reviews
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold text-charcoal">
          What Homeowners Say
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure
              key={r.name}
              className="flex flex-col rounded-sm border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="text-amber-brand" aria-label="Five star review">
                ★★★★★
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-6 text-charcoal">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-5 font-heading text-sm font-semibold text-muted">
                — {r.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cloud py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-center font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
            FAQ
          </p>
          <h2 className="mt-3 text-center font-heading text-3xl font-bold text-charcoal">
            Common Questions
          </h2>
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-sm border border-gray-200 bg-white px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-heading text-sm font-semibold text-charcoal [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-amber-brand transition-transform group-open:rotate-45">
                    ＋
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Service areas + CTA */}
      <section className="bg-charcoal-deep py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
                Service Areas
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold">
                Communities We Serve
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                EVR Construction proudly serves communities across {SITE.region}.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {SITE.serviceAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-sm border border-white/20 px-3.5 py-1.5 text-xs text-white/85"
                  >
                    {area}
                  </span>
                ))}
              </div>
              <a
                href={SITE.directionsUrl}
                className="mt-6 inline-flex font-heading text-sm font-semibold text-amber-brand hover:underline"
              >
                Get Directions →
              </a>
            </div>
            <div className="flex flex-col justify-center rounded-sm bg-white/5 p-8">
              <h2 className="font-heading text-2xl font-bold">
                Book a Free Consultation
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Use the contact form or call us. We&apos;ll listen to your
                ideas, discuss your goals, and turn your vision into a plan
                and a timeline.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={SITE.phone.englishHref}
                  className="inline-flex items-center justify-center rounded-sm bg-amber-brand px-6 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
                >
                  English: {SITE.phone.english}
                </a>
                <a
                  href={SITE.phone.spanishHref}
                  className="inline-flex items-center justify-center rounded-sm border border-white/30 px-6 py-3.5 font-heading text-sm font-semibold text-white transition-colors hover:border-amber-brand hover:text-amber-brand"
                >
                  Español: {SITE.phone.spanish}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
