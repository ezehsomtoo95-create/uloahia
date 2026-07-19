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

export const ADMIN_NAV = [
  { href: "/admin#admin-dashboard", label: "Dashboard", icon: LayoutDashboard, section: "admin-dashboard" },
  { href: "/admin#admin-listings", label: "Listings", icon: Package, section: "admin-listings" },
  { href: "/admin#admin-categories", label: "Categories", icon: FolderTree, section: "admin-categories" },
  { href: "/admin#admin-locations", label: "Locations", icon: MapPin, section: "admin-locations" },
  { href: "/admin#admin-users", label: "Users", icon: Users, section: "admin-users" },
  { href: "/admin#admin-reports", label: "Reports", icon: Flag, section: "admin-reports" },
  { href: "/admin#admin-analytics", label: "Analytics", icon: BarChart3, section: "admin-analytics" },
  { href: "/admin#admin-settings", label: "Settings", icon: Settings, section: "admin-settings" },
] as const;

export function getAdminActiveSection() {
  if (typeof window === "undefined") {
    return "admin-dashboard";
  }

  return window.location.hash.replace("#", "") || "admin-dashboard";
}
