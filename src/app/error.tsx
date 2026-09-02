"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-brand">
        Something went wrong
      </p>
      <h1 className="mt-4 font-heading text-3xl font-bold text-charcoal sm:text-4xl">
        We hit an unexpected error
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-muted">
        Please try again. If the problem persists, contact us and we&apos;ll
        help you out.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-sm bg-amber-brand px-7 py-3.5 font-heading text-sm font-semibold text-charcoal-deep transition-colors hover:bg-amber-dark"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-sm border-2 border-charcoal px-7 py-3 font-heading text-sm font-semibold text-charcoal transition-colors hover:border-amber-brand hover:text-amber-dark"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
