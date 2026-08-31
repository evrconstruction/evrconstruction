import Link from "next/link";

type Service = {
  title: string;
  description: string;
  icon: "deck" | "gazebo" | "restore" | "remodel" | "carpentry" | "patio";
};

const SERVICES: Service[] = [
  {
    title: "Decks",
    description:
      "Custom wood and composite decks, built to code and made for East Tennessee summers.",
    icon: "deck",
  },
  {
    title: "Gazebos",
    description:
      "Freestanding gazebos that turn an open yard into a shaded gathering place.",
    icon: "gazebo",
  },
  {
    title: "Deck & Gazebo Restoration",
    description:
      "Sanding, sealing, and board replacement that bring older structures back to life.",
    icon: "restore",
  },
  {
    title: "Remodeling",
    description:
      "Interior and exterior updates, from new trim to a full outdoor-living refresh.",
    icon: "remodel",
  },
  {
    title: "Carpentry",
    description:
      "Framing, built-ins, and one-off woodwork. If it can be drawn, we can build it.",
    icon: "carpentry",
  },
  {
    title: "Patios & Pergolas",
    description:
      "Patio covers and pergolas that add shade, structure, and value to your home.",
    icon: "patio",
  },
];

function ServiceIcon({ icon }: { icon: Service["icon"] }) {
  const paths: Record<Service["icon"], string> = {
    deck: "M3 16h18M5 16v-3m14 3v-3M3 10h18M7 10V7m10 3V7M9 7V4h6v3",
    gazebo: "M12 3l9 7h-4v9h-3v-5h-4v5H7v-9H3l9-7z",
    restore:
      "M4 20l6-6m0 0a4.5 4.5 0 106.4-6.4M10 14l-2-2 6.4-6.4a4.5 4.5 0 016.4 6.4L14 18l-2-2z",
    remodel: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h.01M15 11h.01",
    carpentry: "M14 4l6 6-8 8-6-6 8-8zM4 20l4-4",
    patio: "M4 21V10l8-6 8 6v11M4 14h16M9 21v-7m6 7v-7",
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-9 text-charcoal"
      aria-hidden="true"
    >
      <path d={paths[icon]} />
    </svg>
  );
}

export function ServicesSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-14 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {SERVICES.map((service) => (
          <article key={service.title} className="flex flex-col gap-4">
            <ServiceIcon icon={service.icon} />
            <div>
              <h3 className="font-heading text-base font-semibold text-charcoal">
                {service.title}
              </h3>
              <p className="mt-1.5 max-w-xs text-sm leading-6 text-muted">
                {service.description}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/contact"
          className="inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
        >
          Get a Free Estimate
        </Link>
      </div>
    </section>
  );
}
