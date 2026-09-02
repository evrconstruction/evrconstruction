import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Dashboard | EVR Construction",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
