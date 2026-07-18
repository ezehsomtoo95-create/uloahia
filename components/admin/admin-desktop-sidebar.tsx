"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Flag,
  FolderTree,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/admin#admin-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "admin-dashboard" },
  { href: "/admin#admin-listings", label: "Listings", icon: Package, section: "admin-listings" },
  { href: "/admin#admin-categories", label: "Categories", icon: FolderTree, section: "admin-categories" },
  { href: "/admin#admin-locations", label: "Locations", icon: MapPin, section: "admin-locations" },
  { href: "/admin#admin-users", label: "Users", icon: Users, section: "admin-users" },
  { href: "/admin#admin-reports", label: "Reports", icon: Flag, section: "admin-reports" },
  { href: "/admin#admin-analytics", label: "Analytics", icon: BarChart3, section: "admin-analytics" },
  { href: "/admin#admin-settings", label: "Settings", icon: Settings, section: "admin-settings" },
] as const;

function getActiveSection() {
  if (typeof window === "undefined") {
    return "admin-dashboard";
  }

  return window.location.hash.replace("#", "") || "admin-dashboard";
}

export function AdminDesktopSidebar() {
  const [activeSection, setActiveSection] = useState("admin-dashboard");

  useEffect(() => {
    setActiveSection(getActiveSection());

    function handleHashChange() {
      setActiveSection(getActiveSection());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <aside className="admin-sidebar hidden shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="border-b border-border px-5 py-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
          AhiaUlo
        </p>
        <p className="mt-1 text-[16px] font-semibold">Admin Console</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.section;

          return (
            <Link
              key={item.section}
              href={item.href}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium",
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
