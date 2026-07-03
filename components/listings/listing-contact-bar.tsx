"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { SaveAuthPrompt } from "@/components/auth/save-auth-prompt";
import { useSaveToast } from "@/components/listings/save-toast";
import { useSavedListings } from "@/components/listings/saved-listings-provider";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type ListingContactBarProps = {
  listing: Listing;
};

export function ListingContactBar({ listing }: ListingContactBarProps) {
  const { isSaved, toggleSave } = useSavedListings();
  const { showSaveToast } = useSaveToast();
  const saved = isSaved(listing.id);
  const [isSaving, setIsSaving] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  async function handleSave() {
    if (isSaving) {
      return;
    }

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
      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 px-3 py-2 backdrop-blur">
        <div className="app-container">
          <button
            type="button"
            aria-label={saved ? "Remove from saved" : "Save listing"}
            aria-pressed={saved}
            disabled={isSaving}
            onClick={handleSave}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-[13px] font-medium text-foreground transition duration-app active:scale-[0.98]",
              saved && "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            <Heart
              size={16}
              strokeWidth={2}
              fill={saved ? "currentColor" : "none"}
              className="shrink-0"
            />
            Save
          </button>
        </div>
      </div>

      <SaveAuthPrompt open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
    </>
  );
}
