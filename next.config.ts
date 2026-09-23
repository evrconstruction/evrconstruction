import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "**.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.app",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Report-only so it cannot break the live site while the policy is
            // validated. Enforce by renaming the key to "Content-Security-Policy"
            // once the browser console reports no violations.
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "upgrade-insecure-requests",
              // 'unsafe-inline'/'unsafe-eval' are required by Next.js hydration and dev tooling.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.gstatic.com https://apis.google.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.googleadservices.com https://googleads.g.doubleclick.net https://*.firebaseio.com wss://*.firebaseio.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://storage.googleapis.com",
              // Keyless Google Maps embed on /contact plus Firebase auth and reCAPTCHA frames.
              "frame-src 'self' https://maps.google.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/admin/posts/:filename(.*\\.(?:jpg|jpeg|png|webp|avif))",
        destination: "/images/:filename",
      },
      {
        source: "/brand/:filename",
        destination: "/images/:filename",
      },
      {
        source: "/posts/:filename(.*\\.(?:jpg|jpeg|png|webp|avif))",
        destination: "/images/:filename",
      },
    ];
  },
};

export default nextConfig;
