"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ListingViewMode = "grid" | "list";

const STORAGE_KEY = "ahiaulo-listing-view-mode";

function readStoredViewMode(fallback: ListingViewMode): ListingViewMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") {
      return stored;
    }
  } catch {
    // ignore storage failures
  }

  return fallback;
}

function writeStoredViewMode(mode: ListingViewMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore storage failures
  }
}

/** Shared Grid/List preference across Home, Browse, Related, Saved, etc. */
export function useListingViewMode(initial: ListingViewMode = "grid") {
  const [viewMode, setViewModeState] = useState<ListingViewMode>(initial);

  useEffect(() => {
    setViewModeState(readStoredViewMode(initial));
  }, [initial]);

  function setViewMode(mode: ListingViewMode) {
    setViewModeState(mode);
    writeStoredViewMode(mode);
  }

  return [viewMode, setViewMode] as const;
}

type ViewToggleProps = {
  value: ListingViewMode;
  onToggle: (mode: ListingViewMode) => void;
  className?: string;
  "aria-label"?: string;
};

export function ViewToggle({
  value,
  onToggle,
  className,
  "aria-label": ariaLabel = "Layout",
}: ViewToggleProps) {
  return (
    <div className={cn("market-view-toggle", className)} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={cn("market-view-toggle-btn", value === "grid" && "is-active")}
        aria-pressed={value === "grid"}
        onClick={() => onToggle("grid")}
      >
        <LayoutGrid size={14} strokeWidth={2.2} aria-hidden />
        <span className="market-view-toggle-label">Grid</span>
      </button>
      <button
        type="button"
        className={cn("market-view-toggle-btn", value === "list" && "is-active")}
        aria-pressed={value === "list"}
        onClick={() => onToggle("list")}
      >
        <List size={14} strokeWidth={2.2} aria-hidden />
        <span className="market-view-toggle-label">List</span>
      </button>
    </div>
  );
}
