"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, PlusCircle, Search, User } from "lucide-react";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, emphasized: true },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count, isAuthenticated } = useSavedListings();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-12px_30px_rgba(20,20,22,0.08)] backdrop-blur lg:hidden",
      )}
    >
      <div className="app-container grid h-[72px] grid-cols-5 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const showSavedCount =
            item.href === "/saved" && isAuthenticated && count > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-1 rounded-app text-[10.5px] font-medium text-muted transition duration-app active:scale-95",
                isActive && "text-primary",
                item.emphasized && "text-primary",
              )}
            >
              <span
                className={cn(
                  "relative grid size-7 place-items-center rounded-full transition duration-app",
                  isActive && !item.emphasized && "bg-surface-raised shadow-soft",
                  item.emphasized && "size-9 bg-primary text-primary-foreground shadow-soft",
                  item.emphasized && isActive && "scale-105",
                )}
              >
                <Icon size={item.emphasized ? 18 : 17} strokeWidth={2.2} />
                {showSavedCount ? (
                  <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
