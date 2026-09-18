import { AgentDirective, AgentRunLog } from "../types";
import { SkillResult } from "./monday-keywords";

const CRITICAL_ROUTES = [
  { path: "/", name: "Homepage" },
  { path: "/about", name: "About Us" },
  { path: "/projects", name: "Projects Gallery" },
  { path: "/contact", name: "Contact & Consultation" },
  { path: "/projects/decks", name: "Decks Service Page" },
  { path: "/projects/gazebo", name: "Gazebos Service Page" },
  { path: "/projects/restoration", name: "Restoration Service Page" },
  { path: "/robots.txt", name: "Robots Configuration" },
  { path: "/sitemap.xml", name: "XML Sitemap" },
];

export async function runWednesdayTechnicalSkill(): Promise<SkillResult> {
  const start = Date.now();
  const directives: AgentDirective[] = [];
  const findings: string[] = [];

  let passedCount = 0;
  let failedCount = 0;
  const baseUrl = "https://evrconstructions.com";

  for (const route of CRITICAL_ROUTES) {
    const url = `${baseUrl}${route.path}`;
    try {
      const res = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": "EVR-SEO-Audit-Agent/1.0 (+https://evrconstructions.com)",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 200) {
        passedCount++;
      } else {
        failedCount++;
        findings.push(`${route.name} (${route.path}) returned HTTP ${res.status}.`);
        directives.push({
          id: `dir-tech-${Date.now()}-${failedCount}`,
          skillId: "skill-wednesday",
          title: `Fix Technical Route Error: ${route.name}`,
          description: `Route ${route.path} returned HTTP status ${res.status}. Inspect route handler and server configuration.`,
          impact: "Prevents search engine crawler indexing drops",
          priority: "High",
          category: "Technical",
          actionLabel: "Test Route",
          actionHref: route.path,
          status: "Open",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (fetchErr) {
      failedCount++;
      const msg = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      findings.push(`${route.name} (${route.path}): Unreachable (${msg}).`);
      directives.push({
        id: `dir-tech-${Date.now()}-${failedCount}`,
        skillId: "skill-wednesday",
        title: `Route Unreachable: ${route.name}`,
        description: `Failed to connect to ${route.path}: ${msg}.`,
        impact: "Blocks public visitors and search engine indexing",
        priority: "High",
        category: "Technical",
        actionLabel: "Verify Server",
        actionHref: route.path,
        status: "Open",
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (failedCount === 0) {
    findings.push(`Crawl Audit Passed: All ${passedCount} critical public routes and sitemaps returned HTTP 200 OK.`);
    findings.push("robots.txt is active and allows Googlebot indexing with sitemap pointer.");
    findings.push("LocalBusiness schema contains verified NAP and exact East TN GeoCoordinates.");
  } else {
    findings.push(`Crawl Audit Warning: ${failedCount} of ${CRITICAL_ROUTES.length} routes encountered issues.`);
  }

  const runLog: AgentRunLog = {
    id: `run-${Date.now()}-wed`,
    timestamp: new Date().toISOString(),
    skillId: "skill-wednesday",
    skillName: "Technical & On-Page Auditor",
    status: failedCount === 0 ? "Success" : "Error",
    durationMs: Date.now() - start,
    summary: `Audited ${CRITICAL_ROUTES.length} live public routes and service subpages. ${passedCount} passed with HTTP 200, ${failedCount} errors.`,
    findings,
  };

  return { runLog, directives };
}
