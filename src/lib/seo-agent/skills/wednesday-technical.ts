import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";
import { SITE } from "@/lib/site";

const CRITICAL_ROUTES = [
  { path: "/", name: "Homepage" },
  { path: "/about", name: "About Us" },
  { path: "/projects", name: "Projects Gallery" },
  { path: "/contact", name: "Contact & Consultation" },
  { path: "/projects/decks", name: "Decks Service Page" },
  { path: "/projects/gazebo", name: "Gazebos Service Page" },
  { path: "/projects/restoration", name: "Restoration Service Page" },
  { path: "/projects/remodeling", name: "Remodeling Service Page" },
  { path: "/projects/carpentry", name: "Carpentry Service Page" },
  { path: "/projects/patios-pergolas", name: "Patios & Pergolas Service Page" },
  { path: "/robots.txt", name: "Robots Configuration" },
  { path: "/sitemap.xml", name: "XML Sitemap" },
];

const BASE_URL = "https://evrconstructions.com";

/** Fields a local business schema needs to be useful to search engines. */
const REQUIRED_BUSINESS_FIELDS = ["name", "telephone", "address", "geo", "url"] as const;

interface BusinessSchema {
  present: boolean;
  fields: Record<string, string>;
  missing: string[];
  areaServedNames: string[];
}

/** Read a field that may be a plain value or a nested object worth summarising. */
function describeField(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `${value.length} entries`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.streetAddress === "string") {
      const locality = [obj.addressLocality, obj.addressRegion, obj.postalCode]
        .filter((part): part is string => typeof part === "string")
        .join(", ");
      return `${obj.streetAddress}${locality ? ` — ${locality}` : ""}`;
    }
    if (typeof obj.latitude === "number" && typeof obj.longitude === "number") {
      return `${obj.latitude}, ${obj.longitude}`;
    }
    if (typeof obj.name === "string") return obj.name;
  }
  return "";
}

/** Pull every application/ld+json node out of a page. */
function extractJsonLd(html: string): unknown[] {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];

  const parsed: unknown[] = [];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
      if (Array.isArray(data)) {
        parsed.push(...data);
      } else if (Array.isArray((data as { "@graph"?: unknown[] })["@graph"])) {
        parsed.push(...((data as { "@graph": unknown[] })["@graph"] as unknown[]));
      } else {
        parsed.push(data);
      }
    } catch (err) {
      console.warn("Skipped an unparseable ld+json block:", err);
    }
  }
  return parsed;
}

function typesOf(node: Record<string, unknown>): string[] {
  const type = node["@type"];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) return type.filter((entry): entry is string => typeof entry === "string");
  return [];
}

/**
 * Find the local business node and report which fields it actually carries.
 *
 * This replaces a previous version that pushed a fixed string claiming the
 * schema "contains verified NAP and exact East TN GeoCoordinates" whether or
 * not that was true. Values are now read from the live page, and the
 * coordinates are surfaced verbatim so a mismatch with the street address can
 * be seen rather than asserted away.
 */
function inspectBusinessSchema(nodes: unknown[]): BusinessSchema {
  const businessNode = nodes.find((node) => {
    if (!node || typeof node !== "object") return false;
    return typesOf(node as Record<string, unknown>).some(
      (type) => type.includes("Business") || type.endsWith("Contractor")
    );
  }) as Record<string, unknown> | undefined;

  if (!businessNode) {
    return {
      present: false,
      fields: {},
      missing: [...REQUIRED_BUSINESS_FIELDS],
      areaServedNames: [],
    };
  }

  const fields: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of REQUIRED_BUSINESS_FIELDS) {
    const described = describeField(businessNode[key]);
    if (described) {
      fields[key] = described;
    } else {
      missing.push(key);
    }
  }

  const areaServed = Array.isArray(businessNode.areaServed) ? businessNode.areaServed : [];
  const areaServedNames = areaServed
    .map((entry) =>
      entry && typeof entry === "object"
        ? String((entry as { name?: unknown }).name ?? "")
        : ""
    )
    .filter(Boolean);

  return { present: true, fields, missing, areaServedNames };
}

export async function runWednesdayTechnicalSkill(): Promise<SkillResult> {
  const start = Date.now();
  const directives: AgentDirective[] = [];
  const findings: string[] = [];
  const timestamp = new Date().toISOString();

  let passedCount = 0;
  let failedCount = 0;
  let robotsHasSitemap = false;
  let sitemapUrlCount = 0;
  let homepageHtml: string | null = null;

  for (const route of CRITICAL_ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    const directiveId = `dir-tech-route-${route.path.replace(/[^a-z0-9]/gi, "-")}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "EVR-SEO-Audit-Agent/1.0 (+https://evrconstructions.com)",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 200) {
        passedCount++;

        if (route.path === "/robots.txt") {
          const bodyText = await res.text();
          robotsHasSitemap = bodyText.toLowerCase().includes("sitemap:");
        } else if (route.path === "/sitemap.xml") {
          const bodyText = await res.text();
          sitemapUrlCount = (bodyText.match(/<loc>/g) || []).length;
        } else if (route.path === "/") {
          homepageHtml = await res.text();
        }
      } else {
        failedCount++;
        findings.push(`${route.name} (${route.path}) returned HTTP ${res.status}.`);
        directives.push({
          id: directiveId,
          skillId: "skill-wednesday",
          title: `Repair unreachable route: ${route.name}`,
          description: `Route ${route.path} returned HTTP status ${res.status}. Inspect the route handler and server configuration.`,
          impact: "Prevents search engine crawler indexing drops",
          priority: "High",
          category: "Technical",
          actionLabel: "Test Route",
          actionHref: route.path,
          status: "Open",
          createdAt: timestamp,
        });
      }
    } catch (fetchErr) {
      failedCount++;
      const msg = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      findings.push(`${route.name} (${route.path}): unreachable (${msg}).`);
      directives.push({
        id: directiveId,
        skillId: "skill-wednesday",
        title: `Repair unreachable route: ${route.name}`,
        description: `Failed to connect to ${route.path}: ${msg}.`,
        impact: "Blocks visitors and search engine indexing",
        priority: "High",
        category: "Technical",
        actionLabel: "Verify Server",
        actionHref: route.path,
        status: "Open",
        createdAt: timestamp,
      });
    }
  }

  findings.push(
    failedCount === 0
      ? `Crawl check: all ${passedCount} critical routes returned HTTP 200.`
      : `Crawl check: ${failedCount} of ${CRITICAL_ROUTES.length} routes had problems.`
  );

  if (robotsHasSitemap) {
    findings.push("robots.txt points crawlers at the XML sitemap.");
  }
  if (sitemapUrlCount > 0) {
    findings.push(`Sitemap lists ${sitemapUrlCount} URLs.`);
  }

  // Structured data, actually inspected rather than asserted.
  if (homepageHtml) {
    const schema = inspectBusinessSchema(extractJsonLd(homepageHtml));

    if (!schema.present) {
      findings.push("No local business JSON-LD found on the homepage.");
      directives.push({
        id: "dir-tech-schema-missing",
        skillId: "skill-wednesday",
        title: "No local business schema found on the homepage",
        description:
          "The homepage carries no JSON-LD business node, so search engines must infer the business name, phone number and location from page text alone.",
        impact: "Weakens local business signals for search and AI answers",
        priority: "High",
        category: "Technical",
        actionLabel: "View Homepage",
        actionHref: "/",
        status: "Open",
        createdAt: timestamp,
      });
    } else {
      const found = REQUIRED_BUSINESS_FIELDS.filter((key) => schema.fields[key]);
      findings.push(
        `Local business schema: ${found.length} of ${REQUIRED_BUSINESS_FIELDS.length} expected fields present.`
      );
      if (schema.fields.address) {
        findings.push(`Schema address: ${schema.fields.address}.`);
      }
      if (schema.fields.geo) {
        // Reported verbatim rather than declared "exact". Nothing in this check
        // geocodes the street address, so it cannot confirm the two agree.
        findings.push(
          `Schema coordinates: ${schema.fields.geo} — compare against the street address above, which this check cannot geocode.`
        );
      }

      if (schema.missing.length > 0) {
        directives.push({
          id: "dir-tech-schema-fields",
          skillId: "skill-wednesday",
          title: "Complete the local business schema fields",
          description: `The homepage schema is missing: ${schema.missing.join(", ")}. These fields feed local pack and AI answer results.`,
          impact: "Improves local business entity matching",
          priority: "Medium",
          category: "Technical",
          actionLabel: "View Homepage",
          actionHref: "/",
          status: "Open",
          createdAt: timestamp,
        });
      }

      const published = SITE.serviceAreas.map((area) => area.toLowerCase());
      const unadvertised = schema.areaServedNames.filter(
        (name) => !published.includes(name.toLowerCase())
      );

      if (unadvertised.length > 0) {
        findings.push(
          `Schema advertises areas the site does not list: ${unadvertised.join(", ")}.`
        );
        directives.push({
          id: "dir-tech-schema-areas",
          skillId: "skill-wednesday",
          title: "Schema service areas do not match the published list",
          description:
            `The schema claims ${unadvertised.join(", ")}, which the service-areas section does not advertise. ` +
            `Search engines read these as conflicting signals about where the business works.`,
          impact: "Removes conflicting location signals",
          priority: "Medium",
          category: "Technical",
          actionLabel: "Review Service Areas",
          actionHref: "/admin/seo-agent",
          status: "Open",
          createdAt: timestamp,
        });
      }
    }
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-wed`,
    timestamp,
    skillId: "skill-wednesday",
    skillName: "Technical & On-Page Auditor",
    status: failedCount === 0 ? "Success" : "Error",
    durationMs: Date.now() - start,
    summary: `Checked ${CRITICAL_ROUTES.length} public routes (${passedCount} returned HTTP 200) and inspected the homepage structured data.`,
    findings,
  };

  return { runLog, directives };
}
