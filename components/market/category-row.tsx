"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/constants/categories";
import type { ListingCategorySlug } from "@/lib/types";
import { Chip, ChipRow, BrowseScrollRow } from "@/components/ui/chip";
import { cn } from "@/lib/utils/cn";

export function CategoryRow({
  active = "All",
  onSelect,
  showAll = false,
  variant = "market",
}: {
  active?: ListingCategorySlug | "All";
  onSelect?: (slug: ListingCategorySlug | "All") => void;
  showAll?: boolean;
  variant?: "default" | "browse" | "market";
}) {
  const interactive = Boolean(onSelect);

  if (variant === "market") {
    return (
      <div className="market-hscroll">
        <div className="market-hscroll-inner">
          {interactive && showAll ? (
            <MarketCategoryChip
              active={active === "All"}
              onClick={() => onSelect?.("All")}
            >
              All
            </MarketCategoryChip>
          ) : null}
          {CATEGORIES.map((category) =>
            interactive ? (
              <MarketCategoryChip
                key={category.slug}
                active={active === category.slug}
                onClick={() => onSelect?.(category.slug)}
              >
                {category.name}
              </MarketCategoryChip>
            ) : (
              <Link
                key={category.slug}
                href={`/browse?category=${category.slug}`}
                className="market-category-chip snap-start"
              >
                {category.name}
              </Link>
            ),
          )}
        </div>
      </div>
    );
  }

  const chipSize = variant === "browse" ? "category" : "default";
  const Row = variant === "browse" ? BrowseScrollRow : ChipRow;

  return (
    <Row>
      {interactive && showAll ? (
        <Chip active={active === "All"} size={chipSize} onClick={() => onSelect?.("All")}>
          All
        </Chip>
      ) : null}
      {CATEGORIES.map((category) =>
        interactive ? (
          <Chip
            key={category.slug}
            size={chipSize}
            active={active === category.slug}
            onClick={() => onSelect?.(category.slug)}
          >
            {category.name}
          </Chip>
        ) : (
          <Chip key={category.slug} size={chipSize} href={`/browse?category=${category.slug}`}>
            {category.name}
          </Chip>
        ),
      )}
    </Row>
  );
}

/** Interactive category row for Browse — same styling as homepage CategoryRow. */
export function BrowseCategoryRow({
  active = "All",
  onSelect,
}: {
  active?: ListingCategorySlug | "All";
  onSelect: (slug: ListingCategorySlug | "All") => void;
}) {
  return (
    <CategoryRow active={active} showAll onSelect={onSelect} variant="market" />
  );
}

function MarketCategoryChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("market-category-chip snap-start", active && "is-active")}
    >
      {children}
    </button>
  );
}
