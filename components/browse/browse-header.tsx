"use client";

import { BROWSE_PAGE_TITLE, BRAND_TAGLINE, REGION_LABEL } from "@/lib/constants/brand";

export function BrowseHeader({
  regionLabel,
}: {
  regionLabel: string;
}) {
  const hasLocalFilter =
    Boolean(regionLabel) &&
    regionLabel !== REGION_LABEL &&
    regionLabel !== "Nigeria";
  const title = hasLocalFilter ? regionLabel : BROWSE_PAGE_TITLE;

  return (
    <div className="market-browse-toolbar">
      <div className="min-w-0">
        <p className="market-browse-eyebrow">{BRAND_TAGLINE}</p>
        <h1 className="market-browse-title">{title}</h1>
      </div>
    </div>
  );
}
