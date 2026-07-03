"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrowseCategoryRow } from "@/components/market/category-row";
import { BrowseHeader } from "@/components/browse/browse-header";
import {
  BrowseSortMenu,
  type BrowseSortOption,
} from "@/components/browse/browse-sort-menu";
import { BrowseListingRow } from "@/components/listings/browse-listing-row";
import {
  BrowseFilters,
  matchesBrowseCondition,
  resolveBrowsePriceBounds,
  type BrowseFilterCondition,
} from "@/components/market/browse-filters";
import { EmptyState } from "@/components/market/empty-state";
import { SearchField } from "@/components/market/search-field";
import {
  getCategoryName,
  listingMatchesCategory,
  normalizeCategorySlug,
} from "@/lib/constants/categories";
import type { EasternState, Listing, ListingCategorySlug } from "@/lib/types";

type BrowsePageClientProps = {
  initialListings: Listing[];
};

export function BrowsePageClient({ initialListings }: BrowsePageClientProps) {
  return (
    <Suspense fallback={<BrowsePageFallback />}>
      <BrowsePageContent initialListings={initialListings} />
    </Suspense>
  );
}

function BrowsePageFallback() {
  return (
    <main className="market-browse">
      <div className="h-10 w-24 rounded skeleton" />
      <div className="mt-3 h-11 rounded-app skeleton" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-11 w-24 rounded-[10px] skeleton" />
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-8 w-20 shrink-0 rounded-full skeleton" />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <div className="h-3 w-16 rounded-full skeleton" />
        <div className="h-3 w-20 rounded-full skeleton" />
      </div>
      <section className="market-feed mt-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <FeedSkeleton key={index} />
        ))}
      </section>
    </main>
  );
}

function BrowsePageContent({ initialListings }: BrowsePageClientProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<EasternState | "All">("All");
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [category, setCategory] = useState<ListingCategorySlug | "All">("All");
  const [condition, setCondition] = useState<BrowseFilterCondition>("All");
  const [priceIndex, setPriceIndex] = useState(0);
  const [sort, setSort] = useState<BrowseSortOption>("newest");
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    const param = searchParams.get("category");
    if (!param) {
      return;
    }

    const normalized = normalizeCategorySlug(param);
    if (normalized) {
      setCategory(normalized);
    }
  }, [searchParams]);

  const filteredListings = useMemo(() => {
    const priceFilter = resolveBrowsePriceBounds(priceIndex);
    const normalizedQuery = query.trim().toLowerCase();

    return initialListings.filter((listing) => {
      const matchesQuery =
        !normalizedQuery ||
        listing.title.toLowerCase().includes(normalizedQuery) ||
        listing.area.toLowerCase().includes(normalizedQuery) ||
        listing.city.toLowerCase().includes(normalizedQuery) ||
        getCategoryName(listing.category).toLowerCase().includes(normalizedQuery);
      const matchesState = state === "All" || listing.state === state;
      const matchesCity = city === "All" || listing.city === city;
      const matchesArea = area === "All" || listing.area === area;
      const matchesCategory = listingMatchesCategory(listing.category, category);
      const matchesCondition = matchesBrowseCondition(listing.condition, condition);
      const matchesPrice =
        listing.price >= priceFilter.min && listing.price <= priceFilter.max;

      return (
        matchesQuery &&
        matchesState &&
        matchesCity &&
        matchesArea &&
        matchesCategory &&
        matchesCondition &&
        matchesPrice
      );
    });
  }, [area, category, city, condition, initialListings, priceIndex, query, state]);

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
          : "Eastern NG";

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

      <div className="mt-3">
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
          placeholder="Search items, city, or area"
        />
      </div>

      <div className="mt-3">
        <BrowseFilters
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

      <div className="mt-3">
        <BrowseCategoryRow
          active={category}
          onSelect={(next) => {
            triggerFilterMotion();
            setCategory(next);
          }}
        />
      </div>

      <div className="market-results-bar mt-4">
        <p className="market-results-count">
          {sortedListings.length} result{sortedListings.length === 1 ? "" : "s"}
        </p>
        <BrowseSortMenu value={sort} onChange={setSort} />
      </div>

      <section className="market-feed mt-3">
        {isFiltering
          ? Array.from({ length: 4 }).map((_, index) => (
              <FeedSkeleton key={index} />
            ))
          : sortedListings.map((listing) => (
              <BrowseListingRow key={listing.id} listing={listing} />
            ))}
      </section>

      {!isFiltering && sortedListings.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No listings found."
            description="Try another category or widen your filters."
          />
        </div>
      ) : null}
    </main>
  );
}

function FeedSkeleton() {
  return (
    <div className="market-listing-card">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="market-listing-photo skeleton" />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded-full skeleton" />
            <div className="h-3.5 w-full rounded-full skeleton" />
            <div className="h-3 w-3/4 rounded-full skeleton" />
            <div className="h-3 w-1/2 rounded-full skeleton" />
          </div>
          <div className="mt-2 h-2.5 w-14 rounded-full skeleton" />
        </div>
      </div>
    </div>
  );
}
