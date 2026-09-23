import type { Metadata, Viewport } from "next";
import { Rubik, Open_Sans } from "next/font/google";
import { HOME_TITLE, HOME_META_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const SITE_URL = "https://evrconstructions.com";

export const viewport: Viewport = {
  themeColor: "#1f2521",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "./",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  title: {
    default: `${HOME_TITLE} | EVR Construction LLC`,
    template: "%s | EVR Construction LLC",
  },
  description: HOME_META_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "EVR Construction LLC",
    locale: "en_US",
    url: SITE_URL,
    images: [{ url: "/images/hero.jpg", width: 1600, height: 1200, alt: "EVR Construction deck project" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "EVR Construction LLC",
  url: SITE_URL,
  inLanguage: "en-US",
  publisher: {
    "@id": `${SITE_URL}/#business`,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${openSans.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white font-body text-charcoal">
        {children}
      </body>
    </html>
  );
}
