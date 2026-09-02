"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AdminNotification } from "@/lib/notifications";

function formatTimeAgo(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    const diffMs = Math.max(0, Date.now() - timestamp);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return "Recently";
  }
}

export function AdminTopbar() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifs() {
      try {
        const res = await fetch("/api/admin/notifications");
        if (res.ok && isMounted) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    }

    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (notif: AdminNotification) => {
    if (!notif.read) {
      try {
        await fetch("/api/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark-read", id: notif.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
    setIsOpen(false);
  };

  return (
    <header className="border-b border-[#dfe2dd] bg-white px-6 py-3.5 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search keywords, posts, analytics..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#f4b400] focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
        >
          <span>View Site</span>
          <span className="text-slate-400">↗</span>
        </Link>

        {/* Interactive Notifications Center */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`relative inline-flex items-center justify-center rounded-lg border p-2 text-slate-700 transition cursor-pointer shadow-2xs ${
              isOpen
                ? "border-[#f4b400] bg-[#f4b400]/10 text-slate-900"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
            title="Notifications & Agent Alerts"
          >
            <svg className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notifications &amp; Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.2 text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-[#0284c7] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active notifications or alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.actionHref}
                      onClick={() => handleNotificationClick(notif)}
                      className={`block p-3.5 transition hover:bg-slate-50 ${
                        !notif.read ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${
                            notif.type === "alert"
                              ? "bg-rose-50 text-rose-600"
                              : notif.type === "success"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {notif.type === "alert" ? (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : notif.type === "success" ? (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4
                              className={`text-xs font-bold truncate ${
                                !notif.read ? "text-slate-900 font-semibold" : "text-slate-700"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                            {notif.message}
                          </p>

                          {/* Email Dispatched & Category Badges */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {notif.priority === "high" && (
                              <span className="rounded bg-rose-50 text-rose-700 border border-rose-200/60 px-1.5 py-0.2 text-[9px] font-bold">
                                High Priority
                              </span>
                            )}
                            {notif.emailDispatched && (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-medium">
                                <span>📧 Email Dispatched</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 text-center text-[10px] font-medium text-slate-500 flex items-center justify-between px-4">
                <span className="text-[10px] text-slate-500">Alerts sent to:</span>
                <span className="font-mono text-[10px] text-slate-600 font-semibold">
                  contact@evrconstructions.com
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
