"use client";

import { ListingCard } from "@/components/listings/listing-card";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type ListingCatalogProps = {
  listings: Listing[];
  title: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyCopy?: string;
  emptyAction?: React.ReactNode;
  className?: string;
};

/**
 * Shared catalog used by Saved, Store, and Shop — same grid/list toggle
 * and market-product-* classes as Home / Browse.
 */
export function ListingCatalog({
  listings,
  title,
  subtitle,
  emptyTitle = "No listings",
  emptyCopy,
  emptyAction,
  className,
}: ListingCatalogProps) {
  const [viewMode, setViewMode] = useListingViewMode("grid");

  return (
    <section className={cn("market-block", className)}>
      <div className="market-block-head">
        <div>
          <h2 className="market-block-title">{title}</h2>
          {subtitle ? <p className="market-block-sub">{subtitle}</p> : null}
        </div>
        {listings.length > 0 ? (
          <div className="market-block-actions">
            <ViewToggle value={viewMode} onToggle={setViewMode} aria-label="Catalog layout" />
          </div>
        ) : null}
      </div>

      {listings.length > 0 ? (
        <div
          className={cn(
            viewMode === "grid" ? "market-product-grid" : "market-product-list",
          )}
        >
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant={viewMode} />
          ))}
        </div>
      ) : (
        <div className="market-empty">
          <p className="market-empty-title">{emptyTitle}</p>
          {emptyCopy ? <p className="market-empty-copy">{emptyCopy}</p> : null}
          {emptyAction}
        </div>
      )}
    </section>
  );
}
