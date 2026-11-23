import { describe, expect, it } from "vitest";
import { inspectBusinessSchema } from "@/lib/seo-agent/skills/wednesday-technical";

/**
 * The business is a service-area operation with no public storefront, and its
 * registered address is the owner's home. The schema therefore publishes a
 * locality without a street address — which must read as complete, not missing.
 */
const serviceAreaBusiness = {
  "@context": "https://schema.org",
  "@type": ["HomeAndConstructionBusiness", "DeckContractor"],
  name: "EVR Construction LLC",
  url: "https://evrconstructions.com",
  telephone: "(865) 221-7275",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Knoxville",
    addressRegion: "TN",
    postalCode: "37918",
    addressCountry: "US",
  },
  areaServed: [{ "@type": "Place", name: "Knoxville" }],
};

describe("inspectBusinessSchema", () => {
  it("accepts a locality-only address and reports it without a street", () => {
    const schema = inspectBusinessSchema([serviceAreaBusiness]);

    expect(schema.present).toBe(true);
    expect(schema.hasStreetAddress).toBe(false);
    expect(schema.fields.address).toBe("Knoxville, TN, 37918");
    expect(schema.missing).toEqual([]);
  });

  it("does not demand coordinates from a business with no premises", () => {
    const schema = inspectBusinessSchema([serviceAreaBusiness]);

    expect(schema.missing).not.toContain("geo");
    expect(schema.fields.geo).toBeUndefined();
  });

  it("still reports coordinates when a schema does publish them", () => {
    const withGeo = {
      ...serviceAreaBusiness,
      geo: { "@type": "GeoCoordinates", latitude: 35.9606, longitude: -83.9207 },
    };

    // Read, but never required — so a future schema that adds them is surfaced.
    expect(inspectBusinessSchema([withGeo]).fields.geo).toBe("35.9606, -83.9207");
  });

  it("renders a street address when one is published, and flags it as such", () => {
    const withStreet = {
      ...serviceAreaBusiness,
      address: { ...serviceAreaBusiness.address, streetAddress: "1 Example St" },
    };

    const schema = inspectBusinessSchema([withStreet]);
    expect(schema.hasStreetAddress).toBe(true);
    expect(schema.fields.address).toBe("1 Example St — Knoxville, TN, 37918");
  });

  it("still reports a genuinely absent address as missing", () => {
    const withoutAddress = { ...serviceAreaBusiness, address: undefined };
    const schema = inspectBusinessSchema([withoutAddress]);

    expect(schema.missing).toContain("address");
    expect(schema.hasStreetAddress).toBe(false);
  });
});
