"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrowseHeader } from "@/components/browse/browse-header";
import {
  BrowseSortMenu,
  type BrowseSortOption,
} from "@/components/browse/browse-sort-menu";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import { CategoryDiscoveryStrip } from "@/components/market/category-discovery-strip";
import {
  BrowseFilters,
  matchesBrowseCondition,
  resolveBrowsePriceBounds,
  type BrowseFilterCondition,
} from "@/components/market/browse-filters";
import { EmptyState } from "@/components/market/empty-state";
import { SearchField } from "@/components/market/search-field";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import type { CategoryDiscoveryItem } from "@/lib/categories/discovery";
import { categoryOverviewHref } from "@/lib/categories/discovery";
import { REGION_LABEL, SEARCH_PLACEHOLDER } from "@/lib/constants/brand";
import {
  getCategoryName,
  normalizeCategorySlug,
} from "@/lib/constants/categories";
import type { Listing, LocationTreeState } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type BrowsePageClientProps = {
  initialListings: Listing[];
  discoveryCategories: CategoryDiscoveryItem[];
  locationTree: LocationTreeState[];
};

export function BrowsePageClient({
  initialListings,
  discoveryCategories,
  locationTree,
}: BrowsePageClientProps) {
  return (
    <Suspense fallback={<BrowsePageFallback />}>
      <BrowsePageContent
        initialListings={initialListings}
        discoveryCategories={discoveryCategories}
        locationTree={locationTree}
      />
    </Suspense>
  );
}

function BrowsePageFallback() {
  return (
    <main className="market-browse">
      <div className="h-10 w-24 rounded skeleton" />
      <div className="mt-3 h-11 rounded-app skeleton" />
      <div className="mt-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[4.1rem] w-[4.1rem] shrink-0 rounded-[0.8rem] skeleton" />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <div className="h-3 w-16 rounded-full skeleton" />
        <div className="h-3 w-20 rounded-full skeleton" />
      </div>
      <section className="market-product-grid mt-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </section>
    </main>
  );
}

function BrowsePageContent({
  initialListings,
  discoveryCategories,
  locationTree,
}: BrowsePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<string | "All">("All");
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [condition, setCondition] = useState<BrowseFilterCondition>("All");
  const [priceIndex, setPriceIndex] = useState(0);
  const [sort, setSort] = useState<BrowseSortOption>("newest");
  const [viewMode, setViewMode] = useListingViewMode("grid");
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    const param =
      searchParams.get("expand") ??
      searchParams.get("cat") ??
      searchParams.get("category");
    if (param) {
      const normalized = normalizeCategorySlug(param) ?? param;
      router.replace(categoryOverviewHref(normalized));
      return;
    }

    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }

    const sortParam = searchParams.get("sort");
    if (
      sortParam === "newest" ||
      sortParam === "popular" ||
      sortParam === "price-asc" ||
      sortParam === "price-desc"
    ) {
      setSort(sortParam);
    }

    const viewParam = searchParams.get("view");
    if (viewParam === "list" || viewParam === "grid") {
      setViewMode(viewParam);
    }
  }, [router, searchParams]);

  const filteredListings = useMemo(() => {
    const priceFilter = resolveBrowsePriceBounds(priceIndex);
    const normalizedQuery = query.trim().toLowerCase();

    return initialListings.filter((listing) => {
      const attributeText = listing.attributes
        ? JSON.stringify(listing.attributes).toLowerCase()
        : "";
      const categoryLabel = (
        listing.categoryName ?? getCategoryName(listing.category)
      ).toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        listing.title.toLowerCase().includes(normalizedQuery) ||
        listing.area.toLowerCase().includes(normalizedQuery) ||
        listing.city.toLowerCase().includes(normalizedQuery) ||
        categoryLabel.includes(normalizedQuery) ||
        attributeText.includes(normalizedQuery);
      const matchesState = state === "All" || listing.state === state;
      const matchesCity = city === "All" || listing.city === city;
      const matchesArea = area === "All" || listing.area === area;
      const matchesCondition = matchesBrowseCondition(listing.condition, condition);
      const matchesPrice =
        listing.price >= priceFilter.min && listing.price <= priceFilter.max;

      return (
        matchesQuery &&
        matchesState &&
        matchesCity &&
        matchesArea &&
        matchesCondition &&
        matchesPrice
      );
    });
  }, [area, city, condition, initialListings, priceIndex, query, state]);

  const sortedListings = useMemo(() => {
    const next = [...filteredListings];

    switch (sort) {
      case "price-asc":
        return next.sort((first, second) => first.price - second.price);
      case "price-desc":
        return next.sort((first, second) => second.price - first.price);
      case "popular":
        return next.sort((first, second) => second.views - first.views);
      default:
        return next.sort(
          (first, second) => (second.createdAtMs ?? 0) - (first.createdAtMs ?? 0),
        );
    }
  }, [filteredListings, sort]);

  const regionLabel =
    area !== "All"
      ? area
      : city !== "All"
        ? city
        : state !== "All"
          ? state
          : REGION_LABEL;

  function triggerFilterMotion() {
    setIsFiltering(true);
    window.setTimeout(() => setIsFiltering(false), 180);
  }

  return (
    <main className="market-browse">
      <BrowseHeader
        regionLabel={regionLabel}
        onRegionClick={() => setLocationSheetOpen(true)}
      />

      <div className="market-browse-search">
        <SearchField
          value={query}
          onChange={(value) => {
            triggerFilterMotion();
            setQuery(value);
          }}
          onClear={() => {
            triggerFilterMotion();
            setQuery("");
          }}
          placeholder={SEARCH_PLACEHOLDER}
        />
      </div>

      <div className="market-browse-categories">
        <CategoryDiscoveryStrip categories={discoveryCategories} />
      </div>

      <div className="market-browse-filters">
        <BrowseFilters
          locationTree={locationTree}
          state={state}
          city={city}
          area={area}
          condition={condition}
          priceIndex={priceIndex}
          locationSheetOpen={locationSheetOpen}
          onLocationSheetClose={() => setLocationSheetOpen(false)}
          onLocationChange={({ state: nextState, city: nextCity, area: nextArea }) => {
            triggerFilterMotion();
            setState(nextState);
            setCity(nextCity);
            setArea(nextArea);
          }}
          onConditionChange={(next) => {
            triggerFilterMotion();
            setCondition(next);
          }}
          onPriceChange={(index) => {
            triggerFilterMotion();
            setPriceIndex(index);
          }}
        />
      </div>

      <div className="market-results-bar">
        <p className="market-results-count">
          {sortedListings.length} result{sortedListings.length === 1 ? "" : "s"}
        </p>
        <div className="market-results-actions">
          <ViewToggle value={viewMode} onToggle={setViewMode} />
          <BrowseSortMenu value={sort} onChange={setSort} />
        </div>
      </div>

      <section
        className={cn(viewMode === "grid" ? "market-product-grid" : "market-product-list")}
      >
        {isFiltering
          ? Array.from({ length: 6 }).map((_, index) => (
              <ListingCardSkeleton key={index} variant={viewMode} />
            ))
          : sortedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant={viewMode} />
            ))}
      </section>

      {!isFiltering && sortedListings.length === 0 ? (
        <div className="market-browse-empty">
          <EmptyState
            title="No listings found"
            description="Try another search or widen your filters."
          />
        </div>
      ) : null}
    </main>
  );
}
