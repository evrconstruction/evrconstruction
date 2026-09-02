"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Overview",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/admin/keywords",
    label: "Keywords",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
  {
    href: "/admin/seo-agent",
    label: "SEO Agent",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: "/admin/backlinks",
    label: "Backlinks",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    href: "/admin/posts",
    label: "Posts Manager",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

import { useAuth } from "@/lib/firebase/auth-context";

export function AdminSidebar() {
  const pathname = usePathname();
  const { logOut } = useAuth();

  return (
    <aside className="border-b border-[#dfe2dd] bg-[#1f2521] text-white lg:sticky lg:top-0 lg:h-screen lg:w-68 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-white/10 flex flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-6 lg:px-7 lg:py-8 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="font-heading text-xl font-bold tracking-tight text-white">
              EVR<span className="text-[#f4b400]">.</span>
            </span>
            <span className="rounded-md bg-[#f4b400]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#f4b400]">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation List */}
        <nav aria-label="Admin Navigation" className="p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#f4b400] text-[#1f2521] shadow-sm font-bold"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className={isActive ? "text-[#1f2521]" : "text-white/50"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Account Footer with Sign Out */}
      <div className="border-t border-white/10 p-4 mx-2 mb-2 rounded-xl bg-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f4b400] text-xs font-bold text-[#1f2521]">
            EV
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">EVR Admin</p>
            <p className="truncate text-[10px] text-white/45 font-mono">contact@evrconstructions.com</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logOut()}
          title="Sign Out"
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
