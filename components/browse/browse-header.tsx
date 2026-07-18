"use client";

import { MapPin } from "lucide-react";

export function BrowseHeader({
  regionLabel,
  onRegionClick,
}: {
  regionLabel: string;
  onRegionClick?: () => void;
}) {
  return (
    <div className="market-browse-toolbar">
      <div className="min-w-0">
        <p className="market-browse-eyebrow">Marketplace</p>
        <h1 className="market-browse-title">Shop in {regionLabel}</h1>
      </div>
      <button type="button" onClick={onRegionClick} className="market-browse-region">
        <MapPin size={14} className="shrink-0 text-primary" />
        <span className="max-w-[8rem] truncate">{regionLabel}</span>
      </button>
    </div>
  );
}
