"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BadgeCheck, Eye } from "lucide-react";
import { SaveAuthPrompt } from "@/components/auth/save-auth-prompt";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { useSaveToast } from "@/components/listings/save-toast";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatNaira, formatViews } from "@/lib/utils/format";

export function BrowseListingRow({ listing }: { listing: Listing }) {
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
      showSaveToast(result.saved ? "Saved" : "Removed from saved");
    }
  }

  return (
    <>
      <article className="market-listing-card">
        <Link
          href={`/listing/${listing.id}`}
          className="flex min-w-0 flex-1 gap-3 pr-8"
        >
          <div className="market-listing-photo">
            {listing.imageUrl ? (
              <ListingListImage
                src={listing.imageUrl}
                alt={listing.title}
                variant="row"
                className="market-listing-photo-img"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <span className="type-meta">No photo</span>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-1.5">
                <p className="type-card-price leading-none">{formatNaira(listing.price)}</p>
                {listing.verified ? (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-background px-1 py-0.5 text-[8.5px] font-medium text-primary">
                    <BadgeCheck size={10} />
                    Verified
                  </span>
                ) : null}
              </div>
              <h3 className="market-listing-title line-clamp-2">{listing.title}</h3>
              <p className="type-card-meta truncate">
                {listing.area}, {listing.city}
              </p>
              <p className="type-card-meta truncate">
                {listing.condition} · {listing.createdAt}
              </p>
            </div>
            <p className="market-listing-views mt-1.5 flex items-center gap-0.5">
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
          className={cn(
            "absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full border border-border/70 bg-background/90 text-text-secondary transition duration-app active:scale-90",
            saved && "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
        </button>
      </article>
      <SaveAuthPrompt
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
      />
    </>
  );
}
