"use client";

import { cn } from "@/lib/utils/cn";

type CategoryChipItem = {
  slug: string;
  name: string;
  icon?: string | null;
};

export function BrowseCategoryRow({
  categories,
  active = "All",
  onSelect,
}: {
  categories: CategoryChipItem[];
  active?: string | "All";
  onSelect: (slug: string | "All") => void;
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
        {categories.map((category) => (
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
