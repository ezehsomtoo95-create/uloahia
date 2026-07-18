"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, Home, MessageCircle, PlusCircle, Search, User } from "lucide-react";
import { useEngagementBadges } from "@/components/layout/engagement-badges-provider";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { BRAND_TAGLINE } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, emphasized: true },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function MarketplaceDesktopSidebar() {
  const pathname = usePathname();
  const { count, isAuthenticated } = useSavedListings();
  const { messageUnread, notificationUnread } = useEngagementBadges();

  return (
    <aside
      className="marketplace-desktop-sidebar relative z-30 hidden h-full min-h-0 w-[15.5rem] shrink-0 flex-col justify-between overflow-hidden border-r border-neutral-200/70 bg-[#FAF7F0] dark:border-neutral-800 dark:bg-[#121212] lg:flex"
      aria-label="Main navigation"
    >
      <nav className="marketplace-desktop-sidebar-nav flex h-full min-h-0 w-full flex-1 flex-col justify-between gap-4 overflow-y-auto py-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isEmphasized = "emphasized" in item && item.emphasized;
          const badgeCount =
            item.href === "/saved" && isAuthenticated
              ? count
              : item.href === "/messages" && isAuthenticated
                ? messageUnread
                : item.href === "/notifications" && isAuthenticated
                  ? notificationUnread
                  : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "marketplace-desktop-sidebar-link box-border flex w-full max-w-none shrink-0 items-center gap-3 self-stretch px-6 py-3 text-[0.875rem] font-medium text-neutral-600 transition-colors dark:text-neutral-400",
                isActive &&
                  !isEmphasized &&
                  "is-active bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary",
                !isActive &&
                  !isEmphasized &&
                  "hover:bg-neutral-900/[0.04] hover:text-neutral-950 dark:hover:bg-white/[0.06] dark:hover:text-neutral-50",
                isEmphasized &&
                  "is-emphasized bg-primary text-primary-foreground shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_28%,transparent)] hover:bg-primary/90",
              )}
            >
              <span className="marketplace-desktop-sidebar-link-icon relative grid size-5 shrink-0 place-items-center">
                <Icon size={isEmphasized ? 18 : 17} strokeWidth={2.1} />
                {badgeCount > 0 ? (
                  <span className="marketplace-desktop-sidebar-badge absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </span>
              <span className="marketplace-desktop-sidebar-link-label min-w-0 flex-1 truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="marketplace-desktop-sidebar-footer w-full shrink-0 border-t border-neutral-200/70 px-6 py-4 dark:border-neutral-800">
        <p className="marketplace-desktop-sidebar-tagline m-0 text-left text-xs font-medium leading-snug text-neutral-600 dark:text-neutral-400">
          {BRAND_TAGLINE}
        </p>
      </div>
    </aside>
  );
}
