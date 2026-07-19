"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_NAV, getAdminActiveSection } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils/cn";

export function AdminDesktopSidebar() {
  const [activeSection, setActiveSection] = useState("admin-dashboard");

  useEffect(() => {
    setActiveSection(getAdminActiveSection());

    function handleHashChange() {
      setActiveSection(getAdminActiveSection());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <aside className="admin-sidebar hidden h-full shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="admin-topbar-block admin-sidebar__head shrink-0 border-b border-border bg-surface px-5">
        <p className="admin-topbar-block__eyebrow">AhiaUlo</p>
        <p className="admin-topbar-block__title">Admin Console</p>
      </div>
      <nav
        className="admin-sidebar__nav flex min-h-0 flex-1 flex-col justify-between overflow-y-auto px-3 py-4"
        aria-label="Admin sections"
      >
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.section;

          return (
            <Link
              key={item.section}
              href={item.href}
              aria-current={active ? "true" : undefined}
              className={cn(
                "admin-sidebar__link flex min-h-10 w-full shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-background hover:text-foreground",
              )}
            >
              <Icon size={16} className="shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
