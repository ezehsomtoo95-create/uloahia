"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, PlusCircle, Search, User } from "lucide-react";
import { useEngagementBadges } from "@/components/layout/engagement-badges-provider";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, emphasized: true },
  { href: "/messages", label: "Chat", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { count, isAuthenticated } = useSavedListings();
  const { messageUnread, notificationUnread } = useEngagementBadges();

  return (
    <nav
      className="marketplace-bottom-nav market-chrome-brand fixed inset-x-0 bottom-0 z-40 border-t border-emerald-400/15 bg-[#064E3B] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_28px_rgba(2,44,34,0.35)] lg:hidden"
      aria-label="Primary"
    >
      <div className="app-container relative z-10 grid h-[72px] grid-cols-5 items-center">
          {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isSell = "emphasized" in item && item.emphasized;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showMessageBadge =
            item.href === "/messages" && isAuthenticated && messageUnread > 0;
          const showProfileBadge =
            item.href === "/profile" &&
            isAuthenticated &&
            (notificationUnread > 0 || count > 0);
          const profileBadgeValue =
            notificationUnread > 0 ? notificationUnread : count;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "relative z-10 flex h-14 flex-col items-center justify-center gap-1 rounded-app text-[10.5px] font-medium text-emerald-50/70",
                isActive && "font-semibold text-emerald-50",
                isSell && "text-emerald-50",
              )}
            >
              <span
                className={cn(
                  "relative grid size-7 place-items-center text-emerald-50/80",
                  isActive && "text-emerald-50",
                  isSell && "size-9 rounded-full bg-emerald-400 text-emerald-950 shadow-[0_4px_14px_rgba(52,211,153,0.35)]",
                )}
              >
                <Icon size={isSell ? 18 : 17} strokeWidth={2.2} />
                {showMessageBadge ? (
                  <span className="absolute -right-1 -top-1 z-20 grid min-w-[16px] place-items-center rounded-full bg-emerald-300 px-1 text-[9px] font-semibold leading-4 text-emerald-950">
                    {messageUnread > 9 ? "9+" : messageUnread}
                  </span>
                ) : null}
                {showProfileBadge ? (
                  <span className="absolute -right-1 -top-1 z-20 grid min-w-[16px] place-items-center rounded-full bg-emerald-300 px-1 text-[9px] font-semibold leading-4 text-emerald-950">
                    {profileBadgeValue > 9 ? "9+" : profileBadgeValue}
                  </span>
                ) : null}
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
