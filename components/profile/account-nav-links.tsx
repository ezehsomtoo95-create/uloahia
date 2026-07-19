"use client";

import Link from "next/link";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import { useEngagementBadges } from "@/components/layout/engagement-badges-provider";
import { cn } from "@/lib/utils/cn";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="account-nav-badge">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AccountNavLinks({
  storeHref,
}: {
  storeHref: string;
}) {
  const { messageUnread, notificationUnread } = useEngagementBadges();
  const { count: savedCount } = useSavedListings();

  return (
    <nav className="account-nav" aria-label="Account links">
      <Link href="/messages" className="account-nav-link">
        <span>Messages</span>
        <NavBadge count={messageUnread} />
      </Link>
      <Link href="/notifications" className="account-nav-link">
        <span>Notifications</span>
        <NavBadge count={notificationUnread} />
      </Link>
      <Link href="/saved" className="account-nav-link">
        <span>Saved listings</span>
        <NavBadge count={savedCount} />
      </Link>
      <Link href={storeHref} className={cn("account-nav-link")}>
        <span>My public store</span>
      </Link>
    </nav>
  );
}
