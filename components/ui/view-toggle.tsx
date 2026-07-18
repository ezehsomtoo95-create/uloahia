"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ListingViewMode = "grid" | "list";

export function useListingViewMode(initial: ListingViewMode = "grid") {
  return useState<ListingViewMode>(initial);
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
