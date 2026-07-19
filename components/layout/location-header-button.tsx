"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  LocationExplorerModal,
  type LocationSelection,
} from "@/components/location/location-explorer-modal";
import { NigeriaRegionLabel } from "@/components/layout/nigeria-region-label";
import { REGION_LABEL } from "@/lib/constants/brand";
import type { LocationTreeState } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function LocationHeaderButton({
  locationTree,
  className,
}: {
  locationTree: LocationTreeState[];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<LocationSelection>({
    state: "All",
    city: "All",
    area: "All",
  });

  function apply(next: LocationSelection) {
    setSelection(next);
    setOpen(false);
    const params = new URLSearchParams();
    if (next.state !== "All") params.set("state", next.state);
    if (next.city !== "All") params.set("city", next.city);
    if (next.area !== "All") params.set("area", next.area);
    const query = params.toString();
    router.push(query ? `/browse?${query}` : "/browse");
  }

  const hasFilter =
    selection.state !== "All" || selection.city !== "All" || selection.area !== "All";
  const label =
    selection.area !== "All"
      ? selection.area
      : selection.city !== "All"
        ? selection.city
        : selection.state !== "All"
          ? selection.state
          : null;

  return (
    <>
      <button
        type="button"
        className={cn("market-chrome-btn market-chrome-btn--selector", className)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={REGION_LABEL}
        onClick={() => setOpen(true)}
      >
        {hasFilter && label ? (
          <span className="market-chrome-btn-text">{label}</span>
        ) : (
          <NigeriaRegionLabel className="market-chrome-region-label" />
        )}
        <ChevronDown size={12} strokeWidth={2.25} className="shrink-0 opacity-70" aria-hidden />
      </button>

      <LocationExplorerModal
        open={open}
        onClose={() => setOpen(false)}
        locationTree={locationTree}
        value={selection}
        onApply={apply}
      />
    </>
  );
}
