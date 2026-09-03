import type { Metadata, Viewport } from "next";
import { Rubik, Open_Sans } from "next/font/google";
import Script from "next/script";
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
  title: {
    default:
      "EVR Construction LLC | Decks, Gazebos & Carpentry in Knoxville, TN",
    template: "%s | EVR Construction LLC",
  },
  description:
    "Licensed & insured deck, gazebo, railing and carpentry contractor serving Knoxville, Farragut, Hardin Valley and East Tennessee. Free estimates.",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white font-body text-charcoal">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-19DRNQBM8T"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-19DRNQBM8T');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
