import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
        404
      </p>
      <h1 className="mt-4 font-heading text-4xl font-bold text-charcoal sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
        >
          Back to Home
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-sm border-2 border-charcoal px-7 py-3 font-heading text-sm font-semibold text-charcoal transition-colors hover:border-amber-brand hover:text-amber-dark"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}
