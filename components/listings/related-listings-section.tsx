"use client";

import Link from "next/link";
import { ListingCard } from "@/components/listings/listing-card";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function RelatedListingsSection({
  listings,
}: {
  listings: Listing[];
}) {
  const [viewMode, setViewMode] = useListingViewMode("grid");

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="market-pdp-related">
      <div className="market-block-head">
        <div>
          <h2 className="market-block-title">Related listings</h2>
          <p className="market-block-sub">More to explore nearby</p>
        </div>
        <div className="market-block-actions">
          <ViewToggle
            value={viewMode}
            onToggle={setViewMode}
            aria-label="Related listings layout"
          />
          <Link href="/browse" className="market-block-link">
            Browse more
          </Link>
        </div>
      </div>
      <div
        className={cn(
          viewMode === "grid" ? "market-product-grid" : "market-product-list",
        )}
      >
        {listings.map((related) => (
          <ListingCard key={related.id} listing={related} variant={viewMode} />
        ))}
      </div>
    </section>
  );
}
