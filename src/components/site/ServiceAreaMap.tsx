import { SITE } from "@/lib/site";

/**
 * Self-contained SVG map of the East Tennessee service area.
 * No tiles, no external requests — renders identically everywhere.
 * Dot positions are projected from real town coordinates.
 */

const LON_MIN = -84.55;
const LON_MAX = -83.15;
const LAT_MIN = 35.55;
const LAT_MAX = 36.42;

function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 100,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100,
  };
}

const TOWNS: { name: string; lat: number; lon: number }[] = [
  { name: "Knoxville", lat: 35.9606, lon: -83.9207 },
  { name: "Clinton", lat: 36.0537, lon: -84.1307 },
  { name: "Maynardville", lat: 36.2437, lon: -83.8085 },
  { name: "Powell", lat: 36.0234, lon: -83.9377 },
  { name: "Gatlinburg", lat: 35.7143, lon: -83.5102 },
  { name: "Morristown", lat: 36.2134, lon: -83.2943 },
  { name: "Oak Ridge", lat: 36.0104, lon: -84.2696 },
  { name: "Maryville", lat: 35.7595, lon: -83.9707 },
  { name: "Alcoa", lat: 35.8012, lon: -83.9702 },
  { name: "Lenoir City", lat: 35.7957, lon: -84.3535 },
  { name: "Seymour", lat: 35.8887, lon: -83.7657 },
  { name: "Sevierville", lat: 35.8719, lon: -83.4584 },
];

export function ServiceAreaMap() {
  return (
    <svg
      viewBox="0 0 100 62"
      className="h-auto w-full"
      role="img"
      aria-label={`Map of ${SITE.region} showing the communities EVR Construction serves`}
    >
      {/* Land background */}
      <rect width="100" height="62" rx="2" className="fill-cloud" />

      {/* Stylized rivers (Tennessee River / Holston / French Broad) */}
      <path
        d="M 0 38 C 14 36, 20 42, 31 41 C 40 40, 44 34, 52 33 C 60 32, 63 26, 71 24 C 79 22, 84 18, 100 15"
        className="fill-none stroke-sky-300/70"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M 52 33 C 55 40, 60 46, 58 54 C 57 58, 60 61, 62 62"
        className="fill-none stroke-sky-300/70"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Stylized Smokies ridge (southeast) */}
      <path
        d="M 52 62 C 60 55, 70 52, 80 51 C 88 50.5, 95 52, 100 54 L 100 62 Z"
        className="fill-charcoal/10"
      />

      {/* Town dots + labels */}
      {TOWNS.map((t) => {
        const { x, y } = project(t.lat, t.lon);
        const isKnoxville = t.name === "Knoxville";
        return (
          <g key={t.name}>
            {isKnoxville ? (
              <circle cx={x} cy={y} r={1.6} className="fill-amber-brand stroke-charcoal" strokeWidth="0.4" />
            ) : (
              <circle cx={x} cy={y} r={1.05} className="fill-charcoal" />
            )}
            <text
              x={x}
              y={isKnoxville ? y - 2.6 : y - 1.9}
              textAnchor="middle"
              className={
                isKnoxville
                  ? "fill-charcoal font-heading text-[2.6px] font-bold"
                  : "fill-charcoal/80 text-[2.2px]"
              }
            >
              {t.name}
            </text>
          </g>
        );
      })}

      {/* Caption */}
      <text x="50" y="60" textAnchor="middle" className="fill-muted text-[2.4px]">
        {SITE.region} — Service Area
      </text>
    </svg>
  );
}
