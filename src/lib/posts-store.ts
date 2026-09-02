export interface ProjectPost {
  id: string;
  category: "Decks" | "Gazebos" | "Restoration" | "Remodeling" | "Carpentry" | "Patios";
  src: string;
  alt: string;
  caption: string;
  createdAt: string;
  published: boolean;
}

export const INITIAL_PROJECT_POSTS: ProjectPost[] = [
  {
    id: "post-1",
    category: "Decks",
    src: "/images/deck-4.jpg",
    alt: "Stained cedar deck with black cable railing built in Knoxville, TN",
    caption: "Stained cedar deck with black cable railing — custom deck construction by EVR Construction in Knoxville, TN.",
    createdAt: "2026-08-28",
    published: true,
  },
  {
    id: "post-2",
    category: "Decks",
    src: "/images/deck-5.jpg",
    alt: "Raised custom wood deck with white rail columns in East Tennessee",
    caption: "Raised wood deck with white rail columns — elevated deck design and build for year-round backyard living.",
    createdAt: "2026-08-25",
    published: true,
  },
  {
    id: "post-3",
    category: "Decks",
    src: "/images/deck-6.jpg",
    alt: "Backyard deck with pergola and outdoor living space in Knoxville",
    caption: "Backyard deck with pergola shade — outdoor living space construction by an experienced deck contractor.",
    createdAt: "2026-08-20",
    published: true,
  },
  {
    id: "post-4",
    category: "Gazebos",
    src: "/images/gazebo-1.jpg",
    alt: "Custom timber frame gazebo built for shade in Knoxville",
    caption: "Timber frame gazebo with cedar posts — outdoor shelter built to withstand East Tennessee weather.",
    createdAt: "2026-08-18",
    published: true,
  },
  {
    id: "post-5",
    category: "Restoration",
    src: "/images/restoration-1.jpg",
    alt: "Before and after wood deck restoration in Knoxville",
    caption: "Full deck board replacement, power sanding, and weather-seal stain application.",
    createdAt: "2026-08-16",
    published: true,
  },
  {
    id: "post-6",
    category: "Restoration",
    src: "/images/restoration-2.jpg",
    alt: "Deck board replacement and wood deck restoration in East Tennessee",
    caption: "Deck board replacement and sanding — wood deck restoration by experienced deck repair specialists.",
    createdAt: "2026-08-14",
    published: true,
  },
  {
    id: "post-7",
    category: "Remodeling",
    src: "/images/remodel-1.jpg",
    alt: "Home addition and exterior remodeling in Knoxville",
    caption: "Home addition and exterior remodel — general contracting and remodeling services in Knoxville, TN.",
    createdAt: "2026-08-12",
    published: true,
  },
  {
    id: "post-8",
    category: "Carpentry",
    src: "/images/carpentry-1.jpg",
    alt: "Custom finish carpentry and built-in woodwork in Knoxville Tennessee",
    caption: "Custom built-in woodwork — finish carpentry services by skilled carpenters in East Tennessee.",
    createdAt: "2026-08-10",
    published: true,
  },
  {
    id: "post-9",
    category: "Carpentry",
    src: "/images/carpentry-2.jpg",
    alt: "Deck railing and trim detail by East Tennessee carpentry contractors",
    caption: "Deck railing and trim detail — exterior carpentry built to last by East Tennessee carpentry contractors.",
    createdAt: "2026-08-08",
    published: true,
  },
  {
    id: "post-10",
    category: "Patios",
    src: "/images/project-1.jpg",
    alt: "Outdoor living patio space and pergola build in Knoxville",
    caption: "Attached pergola and patio living build providing shade and architectural beauty.",
    createdAt: "2026-08-05",
    published: true,
  },
];


