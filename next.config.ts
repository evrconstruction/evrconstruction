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
