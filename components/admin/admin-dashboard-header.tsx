"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Menu, RefreshCw } from "lucide-react";
import { ADMIN_NAV, getAdminActiveSection } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AdminNotification } from "@/lib/data/admin-stats";
import { cn } from "@/lib/utils/cn";

export function AdminDashboardHeader({
  notifications,
}: {
  notifications: AdminNotification[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("admin-dashboard");
  const notificationsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((item) => item.unread).length;

  useEffect(() => {
    setActiveSection(getAdminActiveSection());

    function handleHashChange() {
      setActiveSection(getAdminActiveSection());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!notificationsRef.current?.contains(target)) {
        setNotificationsOpen(false);
      }
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <header className="admin-dashboard-header sticky top-0 z-30">
      <div className="admin-dashboard-header__inner flex items-center justify-between gap-3">
        <div className="admin-topbar-block min-w-0 justify-center">
          <p className="admin-topbar-block__eyebrow">Operations</p>
          <h1 className="admin-topbar-block__title truncate">Admin Dashboard</h1>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle className="admin-dashboard-header__action" />

          <button
            type="button"
            onClick={refresh}
            disabled={isPending}
            className="admin-dashboard-header__action"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={14} className={cn(isPending && "animate-spin")} />
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setMenuOpen(false);
              }}
              className="admin-dashboard-header__action relative"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell size={14} />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-9 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[12px] border border-border bg-surface shadow-soft">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-[12px] font-semibold">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-[12px] text-muted">All caught up</p>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "border-b border-border px-3 py-2.5 last:border-b-0",
                          item.unread && "bg-primary/5",
                        )}
                      >
                        <p className="text-[12px] leading-snug">{item.text}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{item.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={menuRef} className="relative lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((value) => !value);
                setNotificationsOpen(false);
              }}
              className="admin-dashboard-header__action"
              aria-label="Admin sections"
              aria-expanded={menuOpen}
            >
              <Menu size={14} aria-hidden />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-9 z-50 w-[min(14rem,calc(100vw-2rem))] overflow-hidden rounded-[12px] border border-border bg-surface shadow-soft">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-[12px] font-semibold">Sections</p>
                </div>
                <nav className="max-h-72 overflow-y-auto py-1" aria-label="Admin sections">
                  {ADMIN_NAV.map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.section;

                    return (
                      <Link
                        key={item.section}
                        href={item.href}
                        aria-current={active ? "true" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-background",
                        )}
                      >
                        <Icon size={15} className="shrink-0" aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
