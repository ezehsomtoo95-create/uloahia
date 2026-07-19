"use client";

import { memo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useSaveToast } from "@/components/listings/save-toast";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import type { Listing } from "@/lib/types";
import { buildAuthHref } from "@/lib/utils/auth-redirect";
import { cn } from "@/lib/utils/cn";

/** Isolated save control so bookmark toggles don't re-render every listing card. */
export const ListingCardSaveButton = memo(function ListingCardSaveButton({
  listing,
  variant = "grid",
  onSaveChange,
}: {
  listing: Listing;
  variant?: "grid" | "list";
  onSaveChange?: (saved: boolean) => void;
}) {
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
      const nextSaved = Boolean(result.saved);
      onSaveChange?.(nextSaved);
      showSaveToast(nextSaved ? "Saved" : "Removed from saved");
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
      disabled={isSaving}
      onClick={handleSave}
      className={cn(
        "listing-card-save",
        variant === "list" && "listing-card-save--row",
        saved && "is-saved",
      )}
    >
      <Bookmark size={14} strokeWidth={2.2} fill={saved ? "currentColor" : "none"} />
    </button>
  );
});
