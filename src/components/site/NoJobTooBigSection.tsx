import Link from "next/link";

const FEATURES = [
  {
    title: "Quality Craftsmanship",
    description:
      "Every cut, joint, and finish held to the same standard — the kind of work we put our own name on.",
    icon: "M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8L12 3z",
  },
  {
    title: "Licensed & Insured",
    description:
      "Fully licensed and insured in Tennessee, so your home and your investment are protected from day one.",
    icon: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3zM9 12l2 2 4-4",
  },
  {
    title: "Free Estimates, Clear Timelines",
    description:
      "On-site assessments at no cost, transparent pricing up front, and a schedule we actually keep.",
    icon: "M8 3v3m8-3v3M4 8h16M5 6h14v14H5V6zm4 7h6m-6 4h4",
  },
];

function FeatureIcon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8 text-charcoal"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function NoJobTooBigSection() {
  return (
    <>
      <section className="bg-cloud py-20">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[7fr_5fr] lg:px-8">
          <div>
            <h2 className="font-heading text-3xl font-bold leading-tight text-charcoal sm:text-4xl">
              No Project Too Big Or Too Small
            </h2>
            <div className="mt-4 h-1 w-24 rounded-full bg-amber-brand" />
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
              Whether it&apos;s a brand-new deck for summer cookouts or a
              single rotted board that needs replacing, EVR Construction shows
              up with the same standard: do it right, do it on time, and leave
              the site clean. We&apos;ve built our name in Knoxville and the
              surrounding communities one job at a time.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              From the first phone call to the final walkthrough, you deal
              directly with the people building your project — clear
              communication in English or Spanish, honest pricing, and
              workmanship we&apos;re proud to sign.
            </p>
          </div>

          <ul className="flex flex-col gap-8">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="mt-0.5 flex-none">
                  <FeatureIcon path={feature.icon} />
                </span>
                <div>
                  <h3 className="font-heading text-base font-semibold text-charcoal">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="bg-charcoal-deep py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">
            Get Free Consultation
          </h2>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold uppercase tracking-wide text-charcoal-deep transition-colors hover:bg-amber-dark"
          >
            Online Estimate Form
          </Link>
        </div>
      </section>
    </>
  );
}
