"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Bookmark, Eye } from "lucide-react";
import { SaveAuthPrompt } from "@/components/auth/save-auth-prompt";
import { ListingListImage } from "@/components/listings/listing-list-image";
import { useSaveToast } from "@/components/listings/save-toast";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatNaira, formatViews } from "@/lib/utils/format";

export function ListingCard({
  listing,
  onSaveChange,
}: {
  listing: Listing;
  onSaveChange?: (saved: boolean) => void;
}) {
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

  return (
    <>
      <article className="group relative overflow-hidden rounded-3xl border border-border bg-surface shadow-soft transition duration-app hover:-translate-y-0.5 hover:border-primary/40 active:scale-[0.99]">
        <Link href={`/listing/${listing.id}`} className="block">
          <div className="listing-card-photo">
            {listing.imageUrl ? (
              <ListingListImage
                src={listing.imageUrl}
                alt={listing.title}
                variant="grid"
                className="listing-card-photo-img"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted">
                <span className="text-[10px] font-medium">No photo</span>
              </div>
            )}
          </div>
          <div className="space-y-1 p-2.5">
            <div className="flex items-start justify-between gap-1.5">
              <p className="type-card-price">{formatNaira(listing.price)}</p>
              {listing.verified ? (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-background px-1 py-0.5 text-[8.5px] font-medium text-primary">
                  <BadgeCheck size={10} />
                  Verified
                </span>
              ) : null}
            </div>
            <h3 className="type-card-title line-clamp-2 min-h-7">
              {listing.title}
            </h3>
            <div className="type-card-meta flex items-center justify-between gap-2">
              <span className="truncate">
                {listing.area}, {listing.city}
              </span>
              <span className="shrink-0">{listing.createdAt}</span>
            </div>
            <div className="type-card-meta flex items-center justify-between gap-2">
              <span className="truncate">{listing.condition}</span>
              <span className="flex shrink-0 items-center gap-1">
                <Eye size={11} />
                {formatViews(listing.views)}
              </span>
            </div>
          </div>
        </Link>
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save listing"}
          aria-pressed={saved}
          disabled={isSaving}
          onClick={handleSave}
          className={cn(
            "absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full border border-border bg-background/90 text-muted shadow-soft transition duration-app active:scale-90",
            saved && "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          <Bookmark
            size={14}
            fill={saved ? "currentColor" : "none"}
            className={cn(saved && "animate-[save-pop_220ms_ease-out]")}
          />
        </button>
      </article>
      <SaveAuthPrompt
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
      />
    </>
  );
}
