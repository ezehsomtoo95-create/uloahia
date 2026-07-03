"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { BRAND_NAME } from "@/lib/constants/brand";

export function BrowseHeader({
  regionLabel = "Eastern NG",
  onRegionClick,
}: {
  regionLabel?: string;
  onRegionClick?: () => void;
}) {
  return (
    <header className="market-browse-header">
      <Link href="/" className="type-brand leading-none">
        {BRAND_NAME}
      </Link>
      <button
        type="button"
        onClick={onRegionClick}
        className="market-browse-region"
      >
        <MapPin size={14} className="shrink-0 text-primary" />
        <span className="max-w-[7.5rem] truncate">{regionLabel}</span>
      </button>
    </header>
  );
}
