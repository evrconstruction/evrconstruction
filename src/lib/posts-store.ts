export interface ProjectPost {
  id: string;
  category: "Decks" | "Gazebos" | "Restoration" | "Remodeling" | "Carpentry" | "Patios";
  src: string;
  alt: string;
  caption: string;
  createdAt: string;
  published: boolean;
}



