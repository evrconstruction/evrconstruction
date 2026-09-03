import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SITE } from "@/lib/site";
import { SERVICES } from "@/lib/services";
import type { ReactNode } from "react";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "@id": "https://evrconstructions.com/#business",
  name: SITE.name,
  url: "https://evrconstructions.com",
  telephone: SITE.phone.english,
  email: "contact@evrconstructions.com",
  image: "https://evrconstructions.com/images/hero.jpg",
  priceRange: "$$",
  areaServed: SITE.serviceAreas.map((city) => ({
    "@type": "City",
    name: city,
  })),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "EVR Construction Services",
    itemListElement: SERVICES.map((service, index) => ({
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.summary,
        url: `https://evrconstructions.com/projects/${service.slug}`,
      },
    })),
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: SITE.phone.english,
      contactType: "customer service",
      language: "en",
    },
    {
      "@type": "ContactPoint",
      telephone: SITE.phone.spanish,
      contactType: "customer service",
      language: "es",
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressRegion: "TN",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 35.9606,
    longitude: -83.9207,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "07:00",
      closes: "18:00",
    },
  ],
};

const siteNavigationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: SERVICES.map((service, index) => ({
    "@type": "SiteNavigationElement",
    position: index + 1,
    name: service.title,
    description: service.summary,
    url: `https://evrconstructions.com/projects/${service.slug}`,
  })),
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationJsonLd) }}
      />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
