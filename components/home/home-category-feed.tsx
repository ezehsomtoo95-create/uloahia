"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ListingCard } from "@/components/listings/listing-card";
import { CategoryDiscoveryStrip } from "@/components/market/category-discovery-strip";
import { EmptyState } from "@/components/market/empty-state";
import { useLocale } from "@/components/i18n/locale-provider";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import { toCategoryDiscoveryItems } from "@/lib/categories/discovery";
import { BRAND_NAME } from "@/lib/constants/brand";
import type { CategoryWithCount, Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type HomeCategoryFeedProps = {
  categories: CategoryWithCount[];
  listings: Listing[];
};

export function HomeCategoryFeed({ categories, listings }: HomeCategoryFeedProps) {
  const { t } = useLocale();
  const [viewMode, setViewMode] = useListingViewMode("grid");

  const featuredListings = useMemo(
    () => listings.filter((item) => item.isFeatured).slice(0, 8),
    [listings],
  );

  const exploreListings = useMemo(() => {
    const featuredIds = new Set(featuredListings.map((item) => item.id));
    const rest = listings.filter((item) => !featuredIds.has(item.id));
    return (rest.length > 0 ? rest : listings).slice(0, 24);
  }, [listings, featuredListings]);

  const discoveryCategories = useMemo(
    () => toCategoryDiscoveryItems(categories),
    [categories],
  );

  return (
    <div className="market-home-body">
      <section className="market-block market-block--categories">
        <div className="market-block-head market-block-head--tight">
          <h2 className="market-block-title">{t("home.shopByCategory")}</h2>
        </div>
        <CategoryDiscoveryStrip categories={discoveryCategories} />
      </section>

      {featuredListings.length > 0 ? (
        <section className="market-block">
          <div className="market-block-head">
            <div>
              <h2 className="market-block-title">{t("home.featured")}</h2>
              <p className="market-block-sub">{t("home.featuredSub")}</p>
            </div>
            <div className="market-block-actions">
              <ViewToggle
                value={viewMode}
                onToggle={setViewMode}
                aria-label="Featured listings layout"
              />
            </div>
          </div>
          <div
            className={cn(
              viewMode === "grid" ? "market-product-grid" : "market-product-list",
            )}
          >
            {featuredListings.map((listing) => (
              <ListingCard
                key={`featured-${listing.id}`}
                listing={listing}
                variant={viewMode}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="market-block">
        <div className="market-block-head">
          <div>
            <h2 className="market-block-title">{t("home.explore")}</h2>
            <p className="market-block-sub">{t("home.exploreSub")}</p>
          </div>
          <div className="market-block-actions">
            <ViewToggle
              value={viewMode}
              onToggle={setViewMode}
              aria-label="Explore listings layout"
            />
            <Link href="/browse" className="market-block-link">
              {t("home.seeMore")}
            </Link>
          </div>
        </div>

        {exploreListings.length > 0 ? (
          <div
            className={cn(
              viewMode === "grid" ? "market-product-grid" : "market-product-list",
            )}
          >
            {exploreListings.map((listing) => (
              <ListingCard
                key={`explore-${listing.id}`}
                listing={listing}
                variant={viewMode}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description={`Be the first to list something on ${BRAND_NAME}.`}
          />
        )}
      </section>
    </div>
  );
}
