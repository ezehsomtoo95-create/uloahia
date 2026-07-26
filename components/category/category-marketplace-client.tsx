"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BrowseSortMenu,
  type BrowseSortOption,
} from "@/components/browse/browse-sort-menu";
import { ListingCard, ListingCardSkeleton } from "@/components/listings/listing-card";
import {
  BrowseFilters,
  matchesBrowseCondition,
  resolveBrowsePriceBounds,
  type BrowseFilterCondition,
} from "@/components/market/browse-filters";
import { EmptyState } from "@/components/market/empty-state";
import { SearchField } from "@/components/market/search-field";
import { BottomSheet, BottomSheetOption } from "@/components/ui/bottom-sheet";
import { ViewToggle, useListingViewMode } from "@/components/ui/view-toggle";
import { CATEGORY_PAGE_SIZE } from "@/lib/constants/category-marketplace";
import {
  getCategoryName,
  listingMatchesCategoryInTree,
} from "@/lib/constants/categories";
import { listingMatchesAttributeFilters } from "@/lib/utils/category-attributes";
import { cn } from "@/lib/utils/cn";
import type {
  CategoryAttributeField,
  CategoryTreeNode,
  Listing,
  LocationTreeState,
} from "@/lib/types";

type CategoryMarketplaceClientProps = {
  category: CategoryTreeNode;
  categoryTree: CategoryTreeNode[];
  eyebrow: string;
  description: string;
  bannerImage: string | null;
  attributeFields: CategoryAttributeField[];
  initialListings: Listing[];
  locationTree: LocationTreeState[];
};

export function CategoryMarketplaceClient({
  category,
  categoryTree,
  eyebrow,
  description,
  bannerImage,
  attributeFields,
  initialListings,
  locationTree,
}: CategoryMarketplaceClientProps) {
  const [query, setQuery] = useState("");
  const [subCategory, setSubCategory] = useState<string | "All">("All");
  const [state, setState] = useState<string | "All">("All");
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [condition, setCondition] = useState<BrowseFilterCondition>("All");
  const [priceIndex, setPriceIndex] = useState(0);
  const [sort, setSort] = useState<BrowseSortOption>("newest");
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});
  const [activeAttributeKey, setActiveAttributeKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [viewMode, setViewMode] = useListingViewMode("grid");

  const activeCategorySlug = subCategory === "All" ? category.slug : subCategory;

  const attributeOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    for (const field of attributeFields) {
      if (field.fieldType === "select" && field.options.length > 0) {
        options[field.fieldKey] = field.options;
        continue;
      }
      if (field.fieldType === "boolean") {
        options[field.fieldKey] = ["Yes", "No"];
        continue;
      }
      const values = new Set<string>();
      for (const listing of initialListings) {
        if (
          !listingMatchesCategoryInTree(
            listing.categoryId,
            listing.category,
            category.slug,
            categoryTree,
          )
        ) {
          continue;
        }
        const raw = listing.attributes?.[field.fieldKey];
        if (raw != null && String(raw).trim()) {
          values.add(String(raw));
        }
      }
      options[field.fieldKey] = [...values].sort((a, b) => a.localeCompare(b)).slice(0, 40);
    }
    return options;
  }, [attributeFields, category.slug, categoryTree, initialListings]);

  const facetFields = useMemo(
    () =>
      attributeFields.filter(
        (field) => (attributeOptions[field.fieldKey]?.length ?? 0) > 0,
      ),
    [attributeFields, attributeOptions],
  );

  const filteredListings = useMemo(() => {
    const priceFilter = resolveBrowsePriceBounds(priceIndex);
    const normalizedQuery = query.trim().toLowerCase();

    return initialListings.filter((listing) => {
      const matchesCategory = listingMatchesCategoryInTree(
        listing.categoryId,
        listing.category,
        activeCategorySlug,
        categoryTree,
      );
      if (!matchesCategory) return false;

      const attributeText = listing.attributes
        ? JSON.stringify(listing.attributes).toLowerCase()
        : "";
      const categoryLabel = (
        listing.categoryName ?? getCategoryName(listing.category)
      ).toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        listing.title.toLowerCase().includes(normalizedQuery) ||
        (listing.sellerName?.toLowerCase().includes(normalizedQuery) ?? false) ||
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
      const matchesAttributes = listingMatchesAttributeFilters(
        listing.attributes,
        attributeFilters,
      );

      return (
        matchesQuery &&
        matchesState &&
        matchesCity &&
        matchesArea &&
        matchesCondition &&
        matchesPrice &&
        matchesAttributes
      );
    });
  }, [
    activeCategorySlug,
    area,
    attributeFilters,
    categoryTree,
    city,
    condition,
    initialListings,
    priceIndex,
    query,
    state,
  ]);

  const sortedListings = useMemo(() => {
    const next = [...filteredListings];
    switch (sort) {
      case "price-asc":
        return next.sort((a, b) => a.price - b.price);
      case "price-desc":
        return next.sort((a, b) => b.price - a.price);
      case "popular":
        return next.sort((a, b) => b.views - a.views);
      default:
        return next.sort(
          (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
        );
    }
  }, [filteredListings, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedListings.length / CATEGORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sortedListings.slice(
    (currentPage - 1) * CATEGORY_PAGE_SIZE,
    currentPage * CATEGORY_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [
    query,
    subCategory,
    state,
    city,
    area,
    condition,
    priceIndex,
    sort,
    attributeFilters,
  ]);

  function bumpFilter(action: () => void) {
    setIsFiltering(true);
    action();
    window.setTimeout(() => setIsFiltering(false), 160);
  }

  const activeAttributeField = facetFields.find(
    (field) => field.fieldKey === activeAttributeKey,
  );

  return (
    <main className="category-marketplace">
      <section className="category-marketplace-hero">
        <div className="category-marketplace-hero-media" aria-hidden>
          {bannerImage ? (
            <Image
              src={bannerImage}
              alt=""
              fill
              priority
              fetchPriority="high"
              decoding="async"
              sizes="(max-width: 1024px) 100vw, 72rem"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="category-marketplace-hero-fallback" />
          )}
          <div className="category-marketplace-hero-veil" />
        </div>
        <div className="category-marketplace-hero-copy">
          <p className="category-marketplace-eyebrow">
            <Link href="/">Home</Link>
            <span aria-hidden> / </span>
            <Link href="/categories">Categories</Link>
            <span aria-hidden> / </span>
            <span>{category.name}</span>
          </p>
          <p className="category-marketplace-kicker">{eyebrow}</p>
          <h1 className="category-marketplace-title">{category.name}</h1>
          <p className="category-marketplace-sub">{description}</p>
        </div>
      </section>

      <div className="category-marketplace-body">
        <SearchField
          value={query}
          onChange={(value) => bumpFilter(() => setQuery(value))}
          onClear={() => bumpFilter(() => setQuery(""))}
          placeholder={`Search in ${category.name}…`}
        />

        {category.children.length > 0 ? (
          <div className="category-marketplace-subs market-hscroll">
            <div className="market-hscroll-inner">
              <button
                type="button"
                className={cn(
                  "category-marketplace-chip",
                  subCategory === "All" && "is-active",
                )}
                onClick={() => bumpFilter(() => setSubCategory("All"))}
              >
                All {category.name}
              </button>
              {category.children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={cn(
                    "category-marketplace-chip",
                    subCategory === child.slug && "is-active",
                  )}
                  onClick={() => bumpFilter(() => setSubCategory(child.slug))}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <BrowseFilters
          locationTree={locationTree}
          state={state}
          city={city}
          area={area}
          condition={condition}
          priceIndex={priceIndex}
          showCondition={category.showCondition}
          onLocationChange={({ state: nextState, city: nextCity, area: nextArea }) => {
            bumpFilter(() => {
              setState(nextState);
              setCity(nextCity);
              setArea(nextArea);
            });
          }}
          onConditionChange={(next) => bumpFilter(() => setCondition(next))}
          onPriceChange={(index) => bumpFilter(() => setPriceIndex(index))}
        />

        {facetFields.length > 0 ? (
          <div className="category-marketplace-facets market-hscroll">
            <div className="market-hscroll-inner">
              {facetFields.map((field) => {
                const value = attributeFilters[field.fieldKey];
                const active = Boolean(value && value !== "All");
                return (
                  <button
                    key={field.fieldKey}
                    type="button"
                    className={cn("market-filter-btn", active && "is-active")}
                    onClick={() => setActiveAttributeKey(field.fieldKey)}
                  >
                    <span className="min-w-0 truncate">
                      {active ? `${field.label}: ${value}` : field.label}
                    </span>
                    <ChevronDown size={12} strokeWidth={2.25} className="shrink-0 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="market-results-bar">
          <p className="market-results-count">
            {sortedListings.length} result{sortedListings.length === 1 ? "" : "s"}
          </p>
          <div className="market-results-actions">
            <ViewToggle value={viewMode} onToggle={setViewMode} aria-label="Category layout" />
            <BrowseSortMenu value={sort} onChange={setSort} />
          </div>
        </div>

        <section
          className={cn(
            viewMode === "grid" ? "market-product-grid" : "market-product-list",
          )}
        >
          {isFiltering
            ? Array.from({ length: 6 }).map((_, index) => (
                <ListingCardSkeleton key={index} variant={viewMode} />
              ))
            : pageItems.map((listing) => (
                <ListingCard key={listing.id} listing={listing} variant={viewMode} />
              ))}
        </section>

        {!isFiltering && sortedListings.length === 0 ? (
          <EmptyState
            title={`No ${category.name.toLowerCase()} listings yet`}
            description="Try another filter, or browse everything across AhiaUlo."
          />
        ) : null}

        {sortedListings.length > CATEGORY_PAGE_SIZE ? (
          <div className="category-marketplace-pager">
            <button
              type="button"
              className="category-marketplace-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="category-marketplace-page-label">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="category-marketplace-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}

        <p className="category-marketplace-browse-link">
          Looking for everything?{" "}
          <Link href="/browse">Open full Browse</Link>
        </p>
      </div>

      <BottomSheet
        open={Boolean(activeAttributeField)}
        onClose={() => setActiveAttributeKey(null)}
        title={activeAttributeField?.label ?? "Filter"}
      >
        <BottomSheetOption
          label="Any"
          selected={
            !attributeFilters[activeAttributeField?.fieldKey ?? ""] ||
            attributeFilters[activeAttributeField?.fieldKey ?? ""] === "All"
          }
          onSelect={() => {
            if (!activeAttributeField) return;
            bumpFilter(() => {
              setAttributeFilters((prev) => {
                const next = { ...prev };
                delete next[activeAttributeField.fieldKey];
                return next;
              });
            });
            setActiveAttributeKey(null);
          }}
        />
        {(attributeOptions[activeAttributeField?.fieldKey ?? ""] ?? []).map((option) => (
          <BottomSheetOption
            key={option}
            label={option}
            selected={
              attributeFilters[activeAttributeField?.fieldKey ?? ""] === option
            }
            onSelect={() => {
              if (!activeAttributeField) return;
              bumpFilter(() => {
                setAttributeFilters((prev) => ({
                  ...prev,
                  [activeAttributeField.fieldKey]: option,
                }));
              });
              setActiveAttributeKey(null);
            }}
          />
        ))}
      </BottomSheet>
    </main>
  );
}
