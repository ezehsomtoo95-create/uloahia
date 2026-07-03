"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, PlusCircle, Search, User } from "lucide-react";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, emphasized: true },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function MarketplaceDesktopSidebar() {
  const pathname = usePathname();
  const { count, isAuthenticated } = useSavedListings();

  return (
    <aside className="marketplace-desktop-sidebar hidden lg:flex" aria-label="Main navigation">
      <div className="marketplace-desktop-sidebar-brand">
        <Link href="/" className="marketplace-desktop-sidebar-logo">
          <span className="marketplace-desktop-sidebar-logo-title">{BRAND_NAME}</span>
          <span className="marketplace-desktop-sidebar-logo-sub">{BRAND_TAGLINE}</span>
        </Link>
      </div>

      <nav className="marketplace-desktop-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const showSavedCount =
            item.href === "/saved" && isAuthenticated && count > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "marketplace-desktop-sidebar-link",
                isActive && "is-active",
                "emphasized" in item && item.emphasized && "is-emphasized",
              )}
            >
              <span className="marketplace-desktop-sidebar-link-icon">
                <Icon
                  size={"emphasized" in item && item.emphasized ? 18 : 17}
                  strokeWidth={2.1}
                />
                {showSavedCount ? (
                  <span className="marketplace-desktop-sidebar-badge">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="marketplace-desktop-sidebar-footer">
        <p className="marketplace-desktop-sidebar-footer-copy">
          Premium marketplace for Eastern Nigeria
        </p>
      </div>
    </aside>
  );
}
