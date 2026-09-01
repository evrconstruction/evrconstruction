import type { MetadataRoute } from "next";
import { SERVICES } from "@/lib/services";

export const dynamic = "force-static";

const SITE_URL = "https://evrconstructions.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/about", "/contact", "/projects"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const projectRoutes = SERVICES.map((service) => ({
    url: `${SITE_URL}/projects/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...projectRoutes];
}
