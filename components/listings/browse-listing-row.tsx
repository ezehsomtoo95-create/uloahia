"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, BadgeCheck, Eye, MapPin } from "lucide-react";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { useSaveToast } from "@/components/listings/save-toast";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import type { Listing } from "@/lib/types";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";
import { formatListingLocation, formatNaira, formatViews } from "@/lib/utils/format";

export const BrowseListingRow = memo(function BrowseListingRow({ listing }: { listing: Listing }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSaved, toggleSave } = useSavedListings();
  const { showSaveToast } = useSaveToast();
  const saved = isSaved(listing.id);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    setIsSaving(true);
    const result = await toggleSave(listing);
    setIsSaving(false);

    if ("requiresAuth" in result && result.requiresAuth) {
      router.push(buildAuthHref("login", pathname || `/listing/${listing.id}`));
      return;
    }

    if ("failed" in result && result.failed) {
      showSaveToast("Could not save");
      return;
    }

    if ("saved" in result) {
      showSaveToast(result.saved ? "Saved" : "Removed from saved");
    }
  }

  return (
      <article className="market-listing-card">
        <Link href={`/listing/${listing.id}`} className="flex min-w-0 flex-1 gap-3 pr-9">
          <div className="product-media product-media--md market-listing-photo">
            {listing.imageUrl ? (
              <ListingListImage
                src={listing.imageUrl}
                alt={listing.title}
                variant="row"
                className="product-media-img market-listing-photo-img"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <span className="type-meta">No photo</span>
              </div>
            )}
          </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5 text-neutral-950 dark:text-neutral-50">
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="listing-card-price-block min-w-0">
                  <p className="type-card-price leading-none text-neutral-950 dark:text-neutral-50">
                    {formatNaira(listing.price)}
                  </p>
                  <p
                    className="listing-card-location"
                    title={`${listing.area}, ${listing.city}`}
                  >
                    <MapPin size={10} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    <span className="truncate">
                      {formatListingLocation(listing.area, listing.city)}
                    </span>
                  </p>
                </div>
                {listing.verified ? (
                  <span className="listing-card-badge listing-card-badge--inline">
                    <BadgeCheck size={9} />
                    Verified
                  </span>
                ) : null}
              </div>
              <h3 className="market-listing-title line-clamp-2 text-neutral-950 dark:text-neutral-50">
                {listing.title}
              </h3>
              <p className="type-card-meta truncate text-neutral-600 dark:text-neutral-400">
                <span className="rounded-sm bg-neutral-100 px-1.5 py-0.5 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  {listing.condition}
                </span>
                {" · "}
                {listing.createdAt}
              </p>
            </div>
            <p className="market-listing-views mt-1.5 flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <Eye size={11} className="shrink-0 opacity-75" />
              {formatViews(listing.views)}
            </p>
          </div>
        </Link>
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save listing"}
          aria-pressed={saved}
          disabled={isSaving}
          onClick={handleSave}
          className={cn("listing-card-save listing-card-save--row", saved && "is-saved")}
        >
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
        </button>
      </article>
  );
});
