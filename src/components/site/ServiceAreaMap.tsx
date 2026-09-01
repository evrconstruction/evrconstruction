"use client";

import { useEffect, useRef } from "react";

/** Knoxville area center for the service-area map. */
const CENTER: [number, number] = [35.86, -84.2];
const ZOOM = 7;

export function ServiceAreaMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      // Fix default icon paths (bundlers lose Leaflet's relative image URLs)
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      map = L.map(container, {
        center: CENTER,
        zoom: ZOOM,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.marker([35.9606, -83.9207])
        .addTo(map)
        .bindTooltip("Knoxville, TN", { permanent: true, direction: "top" });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full [&_a]:text-amber-dark"
      role="img"
      aria-label="Map of East Tennessee service area"
    />
  );
}
