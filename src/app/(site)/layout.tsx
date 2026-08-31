import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
