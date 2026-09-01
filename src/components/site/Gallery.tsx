import Image from "next/image";
import type { ReactNode } from "react";

export type GalleryImage = {
  src: string;
  alt: string;
  caption: string;
};

function overlayId(src: string): string {
  return `photo-${src.replace(/[^a-z0-9]+/gi, "-")}`;
}

type OverlayProps = {
  item: GalleryImage;
  id: string;
};

/**
 * Fullscreen viewer shown purely via the CSS :target pseudo-class.
 * No JavaScript: the thumbnail links to #<id>, the ✕ links back to #.
 */
function ImageOverlay({ item, id }: OverlayProps) {
  return (
    <div
      id={id}
      className="fixed inset-0 z-50 hidden items-center justify-center bg-charcoal-deep/95 p-4 target:flex sm:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={item.alt}
    >
      {/* Backdrop click closes (link back to a non-existent fragment — unsets
          :target without scrolling the page back to the top) */}
      <a
        href="#close"
        aria-label="Close image viewer"
        className="absolute inset-0 cursor-zoom-out"
        tabIndex={-1}
      />
      <figure className="relative z-10 flex max-h-full max-w-5xl flex-col">
        <Image
          src={item.src}
          alt={item.alt}
          width={1600}
          height={1200}
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="mx-auto max-h-[80vh] w-auto max-w-full rounded-sm object-contain"
        />
        <figcaption className="mt-4 text-center text-sm leading-6 text-white/80">
          {item.caption}
        </figcaption>
      </figure>
      <a
        href="#close"
        aria-label="Close image viewer"
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white transition-colors hover:bg-white/30"
      >
        &times;
      </a>
    </div>
  );
}

type GalleryProps = {
  items: ReadonlyArray<GalleryImage>;
  className?: string;
};

/**
 * Gallery grid: clicking an image opens a fullscreen viewer in the same tab
 * (CSS :target only — no JavaScript). The ✕ closes it.
 */
export function Gallery({
  items,
  className = "grid gap-8 md:grid-cols-3",
}: GalleryProps) {
  return (
    <>
      <div className={className}>
        {items.map((project) => (
          <figure
            key={project.src}
            className="group overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-gray-100"
          >
            <a
              href={`#${overlayId(project.src)}`}
              aria-label={`View larger image: ${project.alt}`}
              className="relative block aspect-[4/3] w-full overflow-hidden bg-cloud"
            >
              <Image
                src={project.src}
                alt={project.alt}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-0 bg-charcoal-deep/0 transition-colors duration-300 group-hover:bg-charcoal-deep/10" />
            </a>
            <figcaption className="p-5 text-sm leading-6 text-muted">
              {project.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      {items.map((project) => (
        <ImageOverlay
          key={project.src}
          item={project}
          id={overlayId(project.src)}
        />
      ))}
    </>
  );
}

type SingleImageProps = {
  item: GalleryImage;
  className?: string;
  imageClassName?: string;
  overlay?: ReactNode;
};

/** A single image that opens a fullscreen viewer in the same tab (CSS :target). */
export function ClickableImage({
  item,
  className,
  imageClassName,
  overlay,
}: SingleImageProps) {
  const id = overlayId(item.src);

  return (
    <>
      <a
        href={`#${id}`}
        aria-label={`View larger image: ${item.alt}`}
        className={`relative block w-full overflow-hidden ${className ?? ""}`}
      >
        <Image
          src={item.src}
          alt={item.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={imageClassName}
        />
        {overlay}
      </a>
      <ImageOverlay item={item} id={id} />
    </>
  );
}
