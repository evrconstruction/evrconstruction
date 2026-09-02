"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/firebase/auth-context";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!loading && (!user || !isAdmin) && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [user, loading, isAdmin, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1f2521] text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-7 w-7 text-[#f4b400]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs text-white/60 font-mono">Authenticating EVR Admin...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8faf7] text-[#1f2521] lg:flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 p-6 sm:p-8 lg:p-10 w-full">{children}</main>
      </div>
    </div>
  );
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </AuthProvider>
  );
}
