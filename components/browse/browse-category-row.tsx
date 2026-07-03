"use client";

import { CATEGORIES } from "@/lib/constants/categories";
import type { ListingCategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function BrowseCategoryRow({
  active = "All",
  onSelect,
}: {
  active?: ListingCategorySlug | "All";
  onSelect: (slug: ListingCategorySlug | "All") => void;
}) {
  return (
    <div className="market-hscroll">
      <div className="market-hscroll-inner">
        <CategoryChip
          active={active === "All"}
          onClick={() => onSelect("All")}
        >
          All
        </CategoryChip>
        {CATEGORIES.map((category) => (
          <CategoryChip
            key={category.slug}
            active={active === category.slug}
            onClick={() => onSelect(category.slug)}
          >
            {category.name}
          </CategoryChip>
        ))}
      </div>
    </div>
  );
}

function CategoryChip({
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
