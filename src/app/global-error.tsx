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
    console.error("Fatal root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "#E0A75E",
              margin: 0,
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              marginTop: "1rem",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#1f2521",
              lineHeight: 1.2,
            }}
          >
            We hit an unexpected error
          </h1>
          <p
            style={{
              marginTop: "1rem",
              maxWidth: "28rem",
              fontSize: "1rem",
              lineHeight: "1.75",
              color: "#4b5563",
            }}
          >
            Please try again. If the problem persists, contact EVR Construction
            and we will assist you.
          </p>
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "2px",
                backgroundColor: "#E0A75E",
                padding: "0.875rem 1.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#1f2521",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "2px",
                border: "2px solid #1f2521",
                padding: "0.75rem 1.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#1f2521",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
