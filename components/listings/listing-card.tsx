"use client";

import Link from "next/link";
import { memo } from "react";
import { BadgeCheck, Eye, MapPin } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { ListingCardSaveButton } from "@/components/listings/listing-card-save-button";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { LazyAvatar } from "@/components/ui/lazy-avatar";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  formatListingLocation,
  formatNaira,
  formatViewCount,
  getSellerInitials,
  sanitizeListingTitle,
} from "@/lib/utils/format";

function SellerAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <span className="listing-card-seller-avatar" aria-hidden>
      {avatarUrl ? (
        <LazyAvatar src={avatarUrl} size={28} className="size-full rounded-full" />
      ) : (
        <span className="listing-card-seller-initials">{getSellerInitials(name)}</span>
      )}
    </span>
  );
}

export const ListingCard = memo(function ListingCard({
  listing,
  onSaveChange,
  variant = "grid",
  hideSeller = false,
  hideSave = false,
}: {
  listing: Listing;
  onSaveChange?: (saved: boolean) => void;
  variant?: "grid" | "list";
  hideSeller?: boolean;
  hideSave?: boolean;
}) {
  const { t } = useLocale();
  const displayTitle = sanitizeListingTitle(listing.title);
  const storeHref = listing.sellerId ? `/store/${listing.sellerId}` : null;
  const sellerLabel = listing.sellerName || t("card.seller");
  const isList = variant === "list";

  return (
    <article className={cn("listing-card", isList && "listing-card--list")}>
      <Link
        href={`/listing/${listing.id}`}
        className={cn("listing-card-link", isList && "listing-card-link--list")}
      >
        <div
          className={cn(
            "product-media listing-card-photo",
            isList ? "product-media--sm" : "product-media--flush-top",
          )}
        >
          {listing.imageUrl ? (
            <ListingListImage
              src={listing.imageUrl}
              alt={displayTitle}
              variant={isList ? "row" : "grid"}
              className="product-media-img listing-card-photo-img"
            />
          ) : (
            <div className="listing-card-photo-empty">
              <span>No photo</span>
            </div>
          )}
          {listing.verified ? (
            <span className="listing-card-badge">
              <BadgeCheck size={9} strokeWidth={2.2} />
              {t("card.verified")}
            </span>
          ) : null}
          {listing.condition ? (
            <span className="listing-card-condition bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              {listing.condition}
            </span>
          ) : null}
        </div>
        <div className="listing-card-body text-neutral-950 dark:text-neutral-50">
          <div className="listing-card-price-block">
            <p className="type-card-price text-neutral-950 dark:text-neutral-50">
              {formatNaira(listing.price)}
            </p>
            <p
              className="listing-card-location"
              title={`${listing.area}, ${listing.city}`}
            >
              <MapPin size={10} strokeWidth={1.8} className="shrink-0" aria-hidden />
              <span className="truncate">
                {formatListingLocation(listing.area, listing.city, isList ? 32 : 24)}
              </span>
            </p>
          </div>
          <h3 className="type-card-title line-clamp-2 text-neutral-950 dark:text-neutral-50">
            {displayTitle}
          </h3>
          <div className="listing-card-footer text-neutral-600 dark:text-neutral-400">
            <span className="listing-card-meta-row inline-flex min-w-0 items-center gap-2">
              <span className="truncate">{listing.createdAt}</span>
              <span
                className="inline-flex shrink-0 items-center gap-0.5 tabular-nums"
                title={`${listing.views ?? 0} views`}
              >
                <Eye size={11} strokeWidth={2} className="opacity-70" aria-hidden />
                {formatViewCount(listing.views ?? 0)}
              </span>
            </span>
          </div>
        </div>
      </Link>

      {!hideSeller ? (
        storeHref ? (
          <Link
            href={storeHref}
            className="listing-card-seller-link"
            title={sellerLabel}
            onClick={(event) => event.stopPropagation()}
          >
            <SellerAvatar name={sellerLabel} avatarUrl={listing.sellerAvatarUrl} />
            {listing.sellerVerified ? (
              <BadgeCheck size={9} strokeWidth={2.2} className="shrink-0 text-primary" />
            ) : null}
            <span className="truncate">{sellerLabel}</span>
          </Link>
        ) : (
          <span className="listing-card-seller-link listing-card-seller-link--muted">
            <SellerAvatar name={sellerLabel} avatarUrl={listing.sellerAvatarUrl} />
            <span className="truncate">{sellerLabel}</span>
          </span>
        )
      ) : null}

      {!hideSave ? (
        <ListingCardSaveButton
          listing={listing}
          variant={variant}
          onSaveChange={onSaveChange}
        />
      ) : null}
    </article>
  );
});

export function ListingCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="listing-card listing-card--list listing-card--skeleton" aria-hidden="true">
        <div className="product-media product-media--sm listing-card-photo skeleton" />
        <div className="listing-card-body space-y-2 p-2.5">
          <div className="space-y-1">
            <div className="h-3.5 w-16 skeleton rounded" />
            <div className="h-2.5 w-20 skeleton rounded" />
          </div>
          <div className="h-3 w-full skeleton rounded" />
          <div className="h-3 w-[75%] skeleton rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="listing-card listing-card--skeleton" aria-hidden="true">
      <div className="product-media product-media--flush-top listing-card-photo skeleton" />
      <div className="listing-card-body space-y-2 p-2.5">
        <div className="space-y-1">
          <div className="h-3.5 w-16 skeleton rounded" />
          <div className="h-2.5 w-20 skeleton rounded" />
        </div>
        <div className="h-3 w-full skeleton rounded" />
        <div className="h-3 w-[75%] skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}
