"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { BadgeCheck, Bookmark, Eye, MapPin, Store } from "lucide-react";
import { SaveAuthPrompt } from "@/components/auth/save-auth-prompt";
import { useLocale } from "@/components/i18n/locale-provider";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { useSaveToast } from "@/components/listings/save-toast";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  formatListingLocation,
  formatNaira,
  formatViewCount,
  sanitizeListingTitle,
} from "@/lib/utils/format";

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
  const { isSaved, toggleSave } = useSavedListings();
  const { showSaveToast } = useSaveToast();
  const saved = isSaved(listing.id);
  const [isSaving, setIsSaving] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  async function handleSave(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    setIsSaving(true);
    const result = await toggleSave(listing);
    setIsSaving(false);

    if ("requiresAuth" in result && result.requiresAuth) {
      setAuthPromptOpen(true);
      return;
    }

    if ("failed" in result && result.failed) {
      showSaveToast("Could not save");
      return;
    }

    if ("saved" in result) {
      const nextSaved = Boolean(result.saved);
      onSaveChange?.(nextSaved);
      showSaveToast(nextSaved ? "Saved" : "Removed from saved");
    }
  }

  const displayTitle = sanitizeListingTitle(listing.title);
  const storeHref = listing.sellerId ? `/store/${listing.sellerId}` : null;
  const sellerLabel = listing.sellerName || t("card.seller");
  const isList = variant === "list";

  return (
    <>
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
                <BadgeCheck size={11} strokeWidth={2.2} />
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
            <p className="type-card-price text-neutral-950 dark:text-neutral-50">
              {formatNaira(listing.price)}
            </p>
            <h3 className="type-card-title line-clamp-2 text-neutral-950 dark:text-neutral-50">
              {displayTitle}
            </h3>
            <p
              className="type-card-meta listing-card-location text-neutral-600 dark:text-neutral-400"
              title={`${listing.area}, ${listing.city}`}
            >
              <MapPin size={11} strokeWidth={2} className="shrink-0 opacity-70" />
              <span className="truncate">
                {formatListingLocation(listing.area, listing.city, isList ? 32 : 24)}
              </span>
            </p>
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
              <span className="listing-card-seller-avatar" aria-hidden>
                {listing.sellerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.sellerAvatarUrl} alt="" />
                ) : (
                  <Store size={11} strokeWidth={2} />
                )}
              </span>
              {listing.sellerVerified ? (
                <BadgeCheck size={11} strokeWidth={2.2} className="shrink-0 text-primary" />
              ) : null}
              <span className="truncate">{sellerLabel}</span>
            </Link>
          ) : (
            <span className="listing-card-seller-link listing-card-seller-link--muted">
              <span className="listing-card-seller-avatar" aria-hidden>
                <Store size={11} strokeWidth={2} />
              </span>
              <span className="truncate">{sellerLabel}</span>
            </span>
          )
        ) : null}

        {!hideSave ? (
          <button
            type="button"
            aria-label={saved ? "Remove from saved" : "Save listing"}
            aria-pressed={saved}
            disabled={isSaving}
            onClick={handleSave}
            className={cn("listing-card-save", isList && "listing-card-save--row", saved && "is-saved")}
          >
            <Bookmark size={14} strokeWidth={2.2} fill={saved ? "currentColor" : "none"} />
          </button>
        ) : null}
      </article>
      <SaveAuthPrompt open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
    </>
  );
});

export function ListingCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="listing-card listing-card--list listing-card--skeleton" aria-hidden="true">
        <div className="product-media product-media--sm listing-card-photo skeleton" />
        <div className="listing-card-body space-y-2 p-2.5">
          <div className="h-3.5 w-16 skeleton rounded" />
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
        <div className="h-3.5 w-16 skeleton rounded" />
        <div className="h-3 w-full skeleton rounded" />
        <div className="h-3 w-[75%] skeleton rounded" />
        <div className="h-3 w-1/2 skeleton rounded" />
      </div>
    </div>
  );
}
