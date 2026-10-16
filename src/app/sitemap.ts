import type { MetadataRoute } from "next";
import { PUBLISHED_ROUTES, SITE_URL } from "@/lib/site-urls";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLISHED_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
