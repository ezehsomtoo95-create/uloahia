"use client";

import { BadgeCheck, IdCard, Store } from "lucide-react";
import {
  toVerificationTier,
  VERIFICATION_TIER_META,
  type VerificationTier,
} from "@/lib/types/engagement";
import { cn } from "@/lib/utils/cn";

/**
 * The single seller-trust badge, used on listing cards, the listing detail
 * page, store/shop pages and the seller dashboard.
 *
 * Replaces the old flat "Verified" chip, which only ever meant "a phone number
 * is on file" and was therefore true of nearly every seller.
 *
 * A seller with tier "none" renders nothing. There is deliberately no "Not
 * verified" state: a badge that appears to warn buyers about an unconfigured
 * seller reads as an accusation and would be wrong most of the time.
 */

const ICONS = {
  phone_verified: BadgeCheck,
  id_verified: IdCard,
  shop_verified: Store,
  business_verified: BadgeCheck,
} as const;

type SellerTierBadgeProps = {
  tier: VerificationTier | string | null | undefined;
  /** "sm" fits inside a listing card; "md" for standalone surfaces. */
  size?: "sm" | "md";
  /** Show the full label ("ID verified") rather than the short form ("ID"). */
  fullLabel?: boolean;
  className?: string;
};

export function SellerTierBadge({
  tier,
  size = "sm",
  fullLabel = false,
  className,
}: SellerTierBadgeProps) {
  const resolved = toVerificationTier(tier);
  if (resolved === "none") {
    return null;
  }

  const meta = VERIFICATION_TIER_META[resolved];
  const Icon = ICONS[resolved];
  const isId = resolved === "id_verified";

  return (
    <span
      // The exact tier is the point: buyers must be able to tell "phone" from
      // "ID", so the accessible name carries the full claim, not the icon.
      title={meta.description}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px]"
          : "px-2 py-1 text-[11px]",
        // ID verification is the stronger claim, so it gets the stronger
        // colour. Everything below it stays neutral so the badge cannot be
        // mistaken for a paid "premium" treatment.
        isId
          ? "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
        className,
      )}
    >
      <Icon size={size === "sm" ? 10 : 12} strokeWidth={2.2} aria-hidden />
      {fullLabel ? meta.label : meta.shortLabel}
    </span>
  );
}
