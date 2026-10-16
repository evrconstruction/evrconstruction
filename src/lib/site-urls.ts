import { SERVICES } from "./services";

export const SITE_URL = "https://evrconstructions.com";

export interface PublishedRoute {
  /** Path only; empty string for the homepage. */
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}

/**
 * Every page we publish. Both the sitemap we hand Google and the admin's
 * index-coverage panel read this, so a page added here is submitted for
 * indexing and audited in the dashboard without a second edit.
 */
export const PUBLISHED_ROUTES: PublishedRoute[] = [
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/projects", changeFrequency: "weekly", priority: 0.85 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  // The 6 core service landing pages
  ...SERVICES.map((service) => ({
    path: `/projects/${service.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  })),
];

/** Absolute URLs of every published page, in sitemap order. */
export function publishedUrls(): string[] {
  return PUBLISHED_ROUTES.map((route) => `${SITE_URL}${route.path}`);
}
