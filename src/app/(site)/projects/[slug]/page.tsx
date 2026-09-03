import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { Gallery } from "@/components/site/Gallery";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams(): Array<{ slug: ServiceSlug }> {
  return SERVICES.map(({ slug }) => ({ slug }));
}

function getService(slug: string) {
  return SERVICES.find((service) => service.slug === slug);
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    return { title: "Project Collection" };
  }

  const pageUrl = `https://evrconstructions.com/projects/${slug}`;

  return {
    title: `${service.title} Projects`,
    description: service.summary,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${service.title} Projects | EVR Construction LLC`,
      description: service.summary,
      url: pageUrl,
      images: [
        {
          url: service.image,
          width: 1200,
          height: 800,
          alt: `${service.title} by EVR Construction LLC`,
        },
      ],
    },
  };
}

export default async function ServiceProjectsPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    notFound();
  }

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-charcoal-deep text-white">
        <div className="absolute inset-0 -z-10">
          <Image
            src={service.image}
            alt={service.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-charcoal-deep/75" />
        </div>
        <div className="mx-auto flex min-h-[430px] max-w-7xl items-end px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Link
              href="/projects"
              className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand hover:underline"
            >
              ← All Projects
            </Link>
            <p className="mt-8 font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
              {service.category}
            </p>
            <h1 className="mt-3 font-heading text-4xl font-bold leading-tight sm:text-6xl">
              {service.title} Projects
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {service.intro}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-dark">
            Project collection
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold text-charcoal sm:text-4xl">
            See our {service.title.toLowerCase()} work
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Browse examples of the detail, planning, and craftsmanship EVR
            Construction brings to every {service.title.toLowerCase()} project.
          </p>
        </div>

        <Gallery items={service.gallery} />

        <div className="mt-16 flex flex-col items-center rounded-sm bg-cloud p-10 text-center">
          <h2 className="font-heading text-2xl font-bold text-charcoal">
            Ready to start your {service.title.toLowerCase()} project?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Tell us what you have in mind. We&apos;ll listen to your goals, review
            the space, and provide a free estimate.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
          >
            Book a Free Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
