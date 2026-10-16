/**
 * Shared shape and constraints for project posts.
 *
 * This is the single definition of what a post is, which categories exist, and
 * what the upload endpoint accepts. Those three things were previously repeated
 * across the API routes and the Posts Manager page, held together by a comment
 * asking maintainers to keep the copies aligned.
 */

/** Service categories a post can belong to. */
export const POST_CATEGORIES = [
  "Decks",
  "Gazebos",
  "Restoration",
  "Remodeling",
  "Carpentry",
  "Patios",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

/**
 * Largest image the upload endpoint will accept, as decoded bytes.
 *
 * The client checks the same value before uploading. Compression usually shrinks
 * a photo well below this, but the browser falls back to the original file when it
 * cannot decode one — so the limit has to hold for the uncompressed case too, or
 * the picker accepts files the server then rejects.
 */
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Image formats the upload endpoint accepts. */
export const POST_IMAGE_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** A project post, as stored in the `posts` collection. */
export interface ProjectPost {
  id: string;
  category: PostCategory;
  src: string;
  alt: string;
  caption: string;
  createdAt: string;
  published: boolean;
}
