import type { Metadata } from "next";
import { Rubik, Open_Sans } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rubik",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: {
    default:
      "EVR Construction LLC | Decks, Gazebos & Carpentry in Knoxville, TN",
    template: "%s | EVR Construction LLC",
  },
  description:
    "Licensed & insured deck, gazebo, railing and carpentry contractor serving Knoxville, Farragut, Hardin Valley and East Tennessee. Free estimates.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white font-body text-charcoal">
        {children}
      </body>
    </html>
  );
}
