"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomSheet, BottomSheetOption } from "@/components/ui/bottom-sheet";

export type BrowseSortOption = "newest" | "popular" | "price-asc" | "price-desc";

const SORT_OPTIONS: { id: BrowseSortOption; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Popular" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
];

export function BrowseSortMenu({
  value,
  onChange,
}: {
  value: BrowseSortOption;
  onChange: (value: BrowseSortOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel =
    SORT_OPTIONS.find((option) => option.id === value)?.label ?? "Newest";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="market-sort-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{activeLabel}</span>
        <ChevronDown size={14} className="shrink-0 opacity-70" aria-hidden />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Sort by">
        {SORT_OPTIONS.map((option) => (
          <BottomSheetOption
            key={option.id}
            label={option.label}
            selected={value === option.id}
            onSelect={() => {
              onChange(option.id);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}
